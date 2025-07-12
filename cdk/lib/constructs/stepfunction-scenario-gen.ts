import * as cdk from 'aws-cdk-lib';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as stepfunctionsTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import { Construct } from 'constructs';

export interface StepFunctionScenarioGenProps extends cdk.StackProps {
  readonly bucketName?: string;
}

export class StepFunctionScenarioGen extends Construct {
  public readonly stateMachine: stepfunctions.StateMachine;
  public readonly scenarioGeneratorLambda: lambda.Function;
  public readonly scenarioAnalyzerLambda: lambda.Function;
  public readonly templateBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: StepFunctionScenarioGenProps) {
    super(scope, id);

    // S3バケットの作成（テンプレート用）
    this.templateBucket = new s3.Bucket(this, 'TemplateBucket', {
      bucketName: props?.bucketName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // テンプレートファイルをS3にアップロード
    new s3deploy.BucketDeployment(this, 'DeployTemplates', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../../templates'))],
      destinationBucket: this.templateBucket,
      destinationKeyPrefix: 'templates/',
    });

    // Lambda関数のIAMロール
    const lambdaExecutionRole = new iam.Role(this, 'ScenarioGeneratorRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Bedrock呼び出し権限
    lambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
        ],
        resources: [
          `arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
          `arn:aws:bedrock:*::foundation-model/anthropic.claude-v2*`,
        ],
      })
    );

    // S3読み取り権限
    lambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:ListBucket',
        ],
        resources: [
          this.templateBucket.bucketArn,
          `${this.templateBucket.bucketArn}/*`,
        ],
      })
    );

    // Lambda関数の作成
    this.scenarioGeneratorLambda = new lambda.Function(this, 'ScenarioGeneratorLambda', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambdas/scenario-generator')),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      role: lambdaExecutionRole,
      environment: {
        BUCKET_NAME: this.templateBucket.bucketName,
        TEMPLATE_KEY: 'templates/scenario-template.json',
      },
    });

    // Scenario Analyzer Lambda 関数の IAM ロール
    const scenarioAnalyzerRole = new iam.Role(this, 'ScenarioAnalyzerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // S3 読み取り・書き込み権限
    scenarioAnalyzerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:ListBucket',
        ],
        resources: [
          this.templateBucket.bucketArn,
          `${this.templateBucket.bucketArn}/*`,
        ],
      })
    );

    // CloudFormation 読み取り権限（必要に応じて）
    scenarioAnalyzerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudformation:DescribeStacks',
          'cloudformation:ListStacks',
        ],
        resources: ['*'],
      })
    );

    // Scenario Analyzer Lambda 関数の作成
    this.scenarioAnalyzerLambda = new lambda.Function(this, 'ScenarioAnalyzerLambda', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambdas/scenario-analyzer')),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      role: scenarioAnalyzerRole,
      environment: {
        BUCKET_NAME: this.templateBucket.bucketName,
      },
    });

    // Step Functions State Machineの定義
    const scenarioGeneratorTask = new stepfunctionsTasks.LambdaInvoke(this, 'InvokeScenarioGenerator', {
      lambdaFunction: this.scenarioGeneratorLambda,
      outputPath: '$.Payload',
      payload: stepfunctions.TaskInput.fromObject({
        bucket_name: this.templateBucket.bucketName,
        template_key: 'templates/scenario-template.json',
      }),
      retryOnServiceExceptions: true,
    });

    // Scenario Analyzer タスクの定義
    const scenarioAnalyzerTask = new stepfunctionsTasks.LambdaInvoke(this, 'InvokeScenarioAnalyzer', {
      lambdaFunction: this.scenarioAnalyzerLambda,
      outputPath: '$.Payload',
      payload: stepfunctions.TaskInput.fromObject({
        'scenario.$': '$.scenario',
        'bucket_name': this.templateBucket.bucketName,
      }),
      retryOnServiceExceptions: true,
    });

    // 成功処理
    const successState = new stepfunctions.Succeed(this, 'ScenarioAnalysisSuccess', {
      comment: 'シナリオ生成と分析が成功しました',
    });

    // 失敗処理
    const failState = new stepfunctions.Fail(this, 'ScenarioProcessingFailed', {
      comment: 'シナリオ生成または分析が失敗しました',
      cause: 'Lambda function failed or timed out',
    });

    // リトライ設定
    scenarioGeneratorTask.addRetry({
      errors: ['Lambda.ServiceException', 'Lambda.AWSLambdaException', 'Lambda.SdkClientException'],
      interval: cdk.Duration.seconds(5),
      maxAttempts: 3,
      backoffRate: 2.0,
    });

    scenarioAnalyzerTask.addRetry({
      errors: ['Lambda.ServiceException', 'Lambda.AWSLambdaException', 'Lambda.SdkClientException'],
      interval: cdk.Duration.seconds(5),
      maxAttempts: 3,
      backoffRate: 2.0,
    });

    // Catch設定
    scenarioGeneratorTask.addCatch(failState, {
      errors: ['States.TaskFailed'],
      resultPath: '$.errorInfo',
    });

    scenarioAnalyzerTask.addCatch(failState, {
      errors: ['States.TaskFailed'],
      resultPath: '$.errorInfo',
    });

    // State Machineの定義（シナリオ生成 → 分析 → 成功）
    const definition = scenarioGeneratorTask
      .next(scenarioAnalyzerTask)
      .next(successState);

    // State Machineの作成
    this.stateMachine = new stepfunctions.StateMachine(this, 'ScenarioGeneratorStateMachine', {
      definition,
      timeout: cdk.Duration.minutes(10),
      comment: 'Bedrockを使用してカオスエンジニアリングシナリオを生成するState Machine',
    });

    // アウトプット
    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: this.stateMachine.stateMachineArn,
      description: 'Scenario Generator State Machine ARN',
    });

    new cdk.CfnOutput(this, 'ScenarioGeneratorLambdaArn', {
      value: this.scenarioGeneratorLambda.functionArn,
      description: 'Scenario Generator Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'ScenarioAnalyzerLambdaArn', {
      value: this.scenarioAnalyzerLambda.functionArn,
      description: 'Scenario Analyzer Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'TemplateBucketName', {
      value: this.templateBucket.bucketName,
      description: 'Template S3 Bucket Name',
    });
  }
} 