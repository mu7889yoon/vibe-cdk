import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as Chaos100 from '../lib/chaos-100-stack';

describe('Chaos100Stack', () => {
  let app: cdk.App;
  let stack: Chaos100.Chaos100Stack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new Chaos100.Chaos100Stack(app, 'MyTestStack');
    template = Template.fromStack(stack);
  });

  test('Step Functions State Machine Created', () => {
    template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      Comment: 'Bedrockを使用してカオスエンジニアリングシナリオを生成し、CloudFormationデプロイまで実行するState Machine',
    });
  });

  test('Scenario Generator Lambda Function Created', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.9',
      Handler: 'handler.lambda_handler',
      Timeout: 300,
      MemorySize: 512,
    });
  });

  test('Scenario Analyzer Lambda Function Created', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.9',
      Handler: 'handler.lambda_handler',
      Timeout: 300,
      MemorySize: 512,
    });
  });

  test('Deployer Lambda Function Created', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.9',
      Handler: 'handler.lambda_handler',
      Timeout: 1800, // 30分
      MemorySize: 512,
    });
  });

  test('Three Lambda Functions Created', () => {
    template.resourceCountIs('AWS::Lambda::Function', 3);
  });

  test('S3 Bucket Created', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
    });
  });

  test('IAM Role has Bedrock permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'bedrock:InvokeModel',
            Effect: 'Allow',
            Resource: [
              'arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0',
              'arn:aws:bedrock:*::foundation-model/anthropic.claude-v2*',
            ],
          },
        ],
      },
    });
  });

  test('IAM Role has S3 permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: ['s3:GetObject', 's3:ListBucket'],
            Effect: 'Allow',
          },
        ],
      },
    });
  });

  test('Scenario Analyzer IAM Role has S3 read/write permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: ['s3:GetObject', 's3:PutObject', 's3:ListBucket'],
            Effect: 'Allow',
          },
        ],
      },
    });
  });

  test('Scenario Analyzer IAM Role has CloudFormation permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: ['cloudformation:DescribeStacks', 'cloudformation:ListStacks'],
            Effect: 'Allow',
            Resource: '*',
          },
        ],
      },
    });
  });

  test('Deployer IAM Role has CloudFormation deploy permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'cloudformation:CreateStack',
              'cloudformation:UpdateStack',
              'cloudformation:DeleteStack',
              'cloudformation:DescribeStacks',
              'cloudformation:DescribeStackEvents',
              'cloudformation:DescribeStackResources',
              'cloudformation:ValidateTemplate',
              'cloudformation:ListStacks',
            ],
            Effect: 'Allow',
          },
        ],
      },
    });
  });

  test('Deployer IAM Role has FIS permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: ['fis:*'],
            Effect: 'Allow',
            Resource: '*',
          },
        ],
      },
    });
  });
});
