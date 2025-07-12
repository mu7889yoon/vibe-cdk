import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as path from 'path';
import { Construct } from 'constructs';

export interface ApiGatewayProps {
  readonly templateBucket: s3.Bucket;
  readonly stateMachine: stepfunctions.StateMachine;
}

export class ApiGateway extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly uiHandlerLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: ApiGatewayProps) {
    super(scope, id);

    // UI Handler Lambda 関数の IAM ロール
    const uiHandlerRole = new iam.Role(this, 'UiHandlerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // S3 読み取り権限
    uiHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:ListBucket',
        ],
        resources: [
          props.templateBucket.bucketArn,
          `${props.templateBucket.bucketArn}/*`,
        ],
      })
    );

    // Step Functions 読み取り権限
    uiHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'states:ListExecutions',
          'states:DescribeExecution',
        ],
        resources: [
          props.stateMachine.stateMachineArn,
        ],
      })
    );

    // FIS 読み取り権限
    uiHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'fis:ListExperiments',
          'fis:GetExperiment',
        ],
        resources: ['*'],
      })
    );

    // CloudWatch Logs 読み取り権限
    uiHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:DescribeLogGroups',
          'logs:DescribeLogStreams',
          'logs:GetLogEvents',
        ],
        resources: ['*'],
      })
    );

    // UI Handler Lambda 関数の作成
    this.uiHandlerLambda = new lambda.Function(this, 'UiHandlerLambda', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambdas/ui-handler')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      role: uiHandlerRole,
      environment: {
        BUCKET_NAME: props.templateBucket.bucketName,
        STATE_MACHINE_ARN: props.stateMachine.stateMachineArn,
      },
    });

    // API Gateway の作成
    this.api = new apigateway.RestApi(this, 'UiApi', {
      restApiName: 'Chaos Engineering UI API',
      description: 'API for Chaos Engineering UI',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // Lambda 統合の作成
    const lambdaIntegration = new apigateway.LambdaIntegration(this.uiHandlerLambda, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      proxy: true,
    });

    // API エンドポイントの定義
    // /scenarios
    const scenariosResource = this.api.root.addResource('scenarios');
    scenariosResource.addMethod('GET', lambdaIntegration);

    // /scenarios/{id}
    const scenarioDetailResource = scenariosResource.addResource('{id}');
    scenarioDetailResource.addMethod('GET', lambdaIntegration);

    // /fis
    const fisResource = this.api.root.addResource('fis');
    const experimentsResource = fisResource.addResource('experiments');
    experimentsResource.addMethod('GET', lambdaIntegration);

    // /fis/experiments/{id}
    const experimentDetailResource = experimentsResource.addResource('{id}');
    experimentDetailResource.addMethod('GET', lambdaIntegration);

    // /executions
    const executionsResource = this.api.root.addResource('executions');
    executionsResource.addMethod('GET', lambdaIntegration);

    // /health
    const healthResource = this.api.root.addResource('health');
    healthResource.addMethod('GET', lambdaIntegration);

    // 使用量プランの作成（レート制限）
    const plan = this.api.addUsagePlan('UiApiUsagePlan', {
      name: 'UI API Usage Plan',
      description: 'Usage plan for UI API',
      throttle: {
        rateLimit: 100,
        burstLimit: 200,
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.DAY,
      },
    });

    // API キーの作成
    const key = this.api.addApiKey('UiApiKey', {
      apiKeyName: 'UI API Key',
      description: 'API key for UI',
    });

    // 使用量プランとAPIキーの関連付け
    plan.addApiKey(key);
  }
} 