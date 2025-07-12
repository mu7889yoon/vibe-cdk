import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StepFunctionScenarioGen } from './constructs/stepfunction-scenario-gen';
import { ApiGateway } from './constructs/api-gateway';
import { FrontendHosting } from './constructs/frontend-hosting';

export class Chaos100Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Bedrock シナリオ生成システムの作成
    const scenarioGenerator = new StepFunctionScenarioGen(this, 'ScenarioGenerator', {
      bucketName: `chaos-100-templates-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
    });

    // API Gateway + UI Handler Lambda の作成
    const apiGateway = new ApiGateway(this, 'ApiGateway', {
      templateBucket: scenarioGenerator.templateBucket,
      stateMachine: scenarioGenerator.stateMachine,
    });

    // フロントエンド静的ホスティングの作成
    const frontendHosting = new FrontendHosting(this, 'FrontendHosting', {
      apiGateway: apiGateway.api,
    });

    // 既存のアウトプット
    new cdk.CfnOutput(this, 'ScenarioGeneratorStateMachineArn', {
      value: scenarioGenerator.stateMachine.stateMachineArn,
      description: 'Scenario Generator State Machine ARN',
    });

    new cdk.CfnOutput(this, 'ScenarioGeneratorLambdaArn', {
      value: scenarioGenerator.scenarioGeneratorLambda.functionArn,
      description: 'Scenario Generator Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'ScenarioAnalyzerLambdaArn', {
      value: scenarioGenerator.scenarioAnalyzerLambda.functionArn,
      description: 'Scenario Analyzer Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'DeployerLambdaArn', {
      value: scenarioGenerator.deployerLambda.functionArn,
      description: 'Deployer Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'TemplateBucketName', {
      value: scenarioGenerator.templateBucket.bucketName,
      description: 'Template S3 Bucket Name',
    });

    // 新しいアウトプット
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: apiGateway.api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'UiHandlerLambdaArn', {
      value: apiGateway.uiHandlerLambda.functionArn,
      description: 'UI Handler Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: `https://${frontendHosting.distribution.distributionDomainName}`,
      description: 'Website URL',
    });
  }
}
