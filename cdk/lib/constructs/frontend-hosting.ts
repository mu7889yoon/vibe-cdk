import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import { Construct } from 'constructs';

export interface FrontendHostingProps {
  readonly apiGateway: apigateway.RestApi;
}

export class FrontendHosting extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendHostingProps) {
    super(scope, id);

    // S3バケットの作成（静的ホスティング用）
    this.bucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `chaos-ui-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Origin Access Identity の作成
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'OAI for Chaos Engineering UI',
    });

    // S3バケットにCloudFrontからのアクセスを許可
    this.bucket.grantRead(originAccessIdentity);

    // CloudFront ディストリビューションの作成
    this.distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      },
      additionalBehaviors: {
        // API Gateway へのプロキシ
        '/api/*': {
          origin: new origins.RestApiOrigin(props.apiGateway),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enableLogging: true,
      comment: 'Chaos Engineering UI CloudFront Distribution',
    });

    // フロントエンドファイルのデプロイ
    const frontendPath = path.join(__dirname, '../../../src/frontend/dist');
    
    // 条件付きデプロイ（distフォルダが存在する場合のみ）
    const deploymentExists = this.node.tryFindChild('DeployFrontend') === undefined;
    
    if (deploymentExists) {
      new s3deploy.BucketDeployment(this, 'DeployFrontend', {
        sources: [s3deploy.Source.asset(frontendPath)],
        destinationBucket: this.bucket,
        distribution: this.distribution,
        distributionPaths: ['/*'],
        prune: true,
        exclude: ['*.map'],
      });
    }

    // 出力
    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Frontend URL',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: this.bucket.bucketName,
      description: 'Frontend S3 Bucket Name',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });
  }
} 