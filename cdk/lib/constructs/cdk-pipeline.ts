import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface CdkPipelineProps extends cdk.StackProps {
  readonly sourceBucket: s3.Bucket;
  readonly sourceKey?: string;
  readonly stackName?: string;
}

export class CdkPipeline extends Construct {
  public readonly pipeline: codepipeline.Pipeline;
  public readonly buildProject: codebuild.Project;

  constructor(scope: Construct, id: string, props: CdkPipelineProps) {
    super(scope, id);

    const sourceKey = props.sourceKey || 'codegen-output/cdk-source.zip';
    const stackName = props.stackName || 'chaos-engineering-fis-stack';

    // Artifact用のS3バケット
    const artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // CodeBuildプロジェクト用のIAMロール
    const codeBuildRole = new iam.Role(this, 'CodeBuildRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
    });

    // CloudFormationデプロイ権限
    codeBuildRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudformation:CreateStack',
          'cloudformation:UpdateStack',
          'cloudformation:DeleteStack',
          'cloudformation:DescribeStacks',
          'cloudformation:DescribeStackEvents',
          'cloudformation:DescribeStackResources',
          'cloudformation:ValidateTemplate',
          'cloudformation:ListStacks',
        ],
        resources: [
          `arn:aws:cloudformation:*:${cdk.Aws.ACCOUNT_ID}:stack/${stackName}/*`,
        ],
      })
    );

    // S3アクセス権限
    codeBuildRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:ListBucket',
        ],
        resources: [
          props.sourceBucket.bucketArn,
          `${props.sourceBucket.bucketArn}/*`,
          artifactBucket.bucketArn,
          `${artifactBucket.bucketArn}/*`,
        ],
      })
    );

    // FIS関連権限
    codeBuildRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'fis:*',
        ],
        resources: ['*'],
      })
    );

    // IAM PassRole権限
    codeBuildRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'iam:PassRole',
        ],
        resources: [
          `arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:role/chaos-engineering-*`,
        ],
      })
    );

    // CodeBuildプロジェクト
    this.buildProject = new codebuild.Project(this, 'BuildProject', {
      role: codeBuildRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: '18',
            },
            commands: [
              'npm install -g aws-cdk',
              'npm install',
            ],
          },
          build: {
            commands: [
              'npm run build',
              'npm test',
              `cdk deploy --require-approval never --stack-name ${stackName}`,
            ],
          },
        },
        artifacts: {
          files: [
            '**/*',
          ],
        },
      }),
      artifacts: codebuild.Artifacts.s3({
        bucket: artifactBucket,
        includeBuildId: false,
        packageZip: true,
      }),
    });

    // CodePipeline用のIAMロール
    const pipelineRole = new iam.Role(this, 'PipelineRole', {
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
    });

    // パイプライン権限
    pipelineRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:ListBucket',
        ],
        resources: [
          props.sourceBucket.bucketArn,
          `${props.sourceBucket.bucketArn}/*`,
          artifactBucket.bucketArn,
          `${artifactBucket.bucketArn}/*`,
        ],
      })
    );

    pipelineRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'codebuild:BatchGetBuilds',
          'codebuild:StartBuild',
        ],
        resources: [
          this.buildProject.projectArn,
        ],
      })
    );

    // CodePipelineアーティファクト
    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();

    // CodePipeline
    this.pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      role: pipelineRole,
      artifactBucket: artifactBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipelineActions.S3SourceAction({
              actionName: 'S3Source',
              bucket: props.sourceBucket,
              bucketKey: sourceKey,
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipelineActions.CodeBuildAction({
              actionName: 'CodeBuild',
              project: this.buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
      ],
    });

    // アウトプット
    new cdk.CfnOutput(this, 'PipelineArn', {
      value: this.pipeline.pipelineArn,
      description: 'CDK Pipeline ARN',
    });

    new cdk.CfnOutput(this, 'BuildProjectArn', {
      value: this.buildProject.projectArn,
      description: 'CodeBuild Project ARN',
    });
  }
} 