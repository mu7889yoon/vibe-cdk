import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StepFunctionScenarioGen } from './constructs/stepfunction-scenario-gen';

export class Chaos100Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Bedrock シナリオ生成システムの作成
    const scenarioGenerator = new StepFunctionScenarioGen(this, 'ScenarioGenerator', {
      bucketName: `chaos-100-templates-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
    });

    // アウトプット
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
  }
}
