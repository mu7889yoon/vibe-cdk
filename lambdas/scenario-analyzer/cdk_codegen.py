import json
from typing import Dict, List, Any
import logging

logger = logging.getLogger()

class CDKCodeGenerator:
    """
    シナリオ分析結果をもとに TypeScript の CDK Construct ソースコードを生成
    """
    
    def __init__(self):
        self.imports = set()
        self.resources = []
        self.constructs = []
        
    def generate_cdk_code(self, aws_services: List[str], scenario_json: Dict[str, Any]) -> str:
        """
        CDK コードを生成
        """
        self.imports.clear()
        self.resources.clear()
        self.constructs.clear()
        
        # 基本的なインポート
        self.imports.add("import * as cdk from 'aws-cdk-lib';")
        self.imports.add("import { Construct } from 'constructs';")
        
        # AWS サービスごとのリソース生成
        for service in aws_services:
            self._generate_service_resources(service, scenario_json)
        
        # CDK スタックコードの組み立て
        return self._assemble_cdk_code(scenario_json)
    
    def _generate_service_resources(self, service: str, scenario_json: Dict[str, Any]):
        """
        サービス別のリソース生成
        """
        scenario_name = scenario_json.get('scenario_name', 'ChaosTest')
        safe_name = scenario_name.replace(' ', '').replace('-', '')
        
        if service == 'EC2':
            self._generate_ec2_resources(safe_name, scenario_json)
        elif service == 'RDS':
            self._generate_rds_resources(safe_name, scenario_json)
        elif service == 'S3':
            self._generate_s3_resources(safe_name, scenario_json)
        elif service == 'Lambda':
            self._generate_lambda_resources(safe_name, scenario_json)
        elif service == 'ELB':
            self._generate_elb_resources(safe_name, scenario_json)
        elif service == 'VPC':
            self._generate_vpc_resources(safe_name, scenario_json)
        elif service == 'CloudWatch':
            self._generate_cloudwatch_resources(safe_name, scenario_json)
        elif service == 'SNS':
            self._generate_sns_resources(safe_name, scenario_json)
        elif service == 'SQS':
            self._generate_sqs_resources(safe_name, scenario_json)
        elif service == 'DynamoDB':
            self._generate_dynamodb_resources(safe_name, scenario_json)
    
    def _generate_ec2_resources(self, safe_name: str, scenario_json: Dict[str, Any]):
        """EC2 リソースの生成"""
        self.imports.add("import * as ec2 from 'aws-cdk-lib/aws-ec2';")
        
        # VPC
        vpc_code = f"""
    // VPC for {safe_name}
    const vpc = new ec2.Vpc(this, '{safe_name}Vpc', {{
      maxAzs: 2,
      subnetConfiguration: [
        {{
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        }},
        {{
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }},
      ],
    }});"""
        self.resources.append(vpc_code)
        
        # Security Group
        sg_code = f"""
    // Security Group for {safe_name}
    const securityGroup = new ec2.SecurityGroup(this, '{safe_name}SecurityGroup', {{
      vpc,
      description: 'Security group for {safe_name} chaos engineering test',
      allowAllOutbound: true,
    }});
    
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'SSH access'
    );"""
        self.resources.append(sg_code)
        
        # EC2 Instance
        instance_code = f"""
    // EC2 Instance for {safe_name}
    const instance = new ec2.Instance(this, '{safe_name}Instance', {{
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux(),
      vpc,
      securityGroup,
      keyName: '{safe_name.lower()}-key',
      vpcSubnets: {{
        subnetType: ec2.SubnetType.PUBLIC,
      }},
    }});"""
        self.resources.append(instance_code)
    
    def _generate_rds_resources(self, safe_name: str, scenario_json: Dict[str, Any]):
        """RDS リソースの生成"""
        self.imports.add("import * as rds from 'aws-cdk-lib/aws-rds';")
        
        rds_code = f"""
    // RDS Database for {safe_name}
    const database = new rds.DatabaseInstance(this, '{safe_name}Database', {{
      engine: rds.DatabaseInstanceEngine.mysql({{
        version: rds.MysqlEngineVersion.VER_8_0,
      }}),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      credentials: rds.Credentials.fromGeneratedSecret('admin'),
      multiAz: false,
      allocatedStorage: 20,
      deleteAutomatedBackups: true,
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    }});"""
        self.resources.append(rds_code)
    
    def _generate_s3_resources(self, safe_name: str, scenario_json: Dict[str, Any]):
        """S3 リソースの生成"""
        self.imports.add("import * as s3 from 'aws-cdk-lib/aws-s3';")
        
        s3_code = f"""
    // S3 Bucket for {safe_name}
    const bucket = new s3.Bucket(this, '{safe_name}Bucket', {{
      bucketName: `{safe_name.lower()}-chaos-test-${{cdk.Aws.ACCOUNT_ID}}-${{cdk.Aws.REGION}}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    }});"""
        self.resources.append(s3_code)
    
    def _generate_lambda_resources(self, safe_name: str, scenario_json: Dict[str, Any]):
        """Lambda リソースの生成"""
        self.imports.add("import * as lambda from 'aws-cdk-lib/aws-lambda';")
        
        lambda_code = f"""
    // Lambda Function for {safe_name}
    const lambdaFunction = new lambda.Function(this, '{safe_name}Function', {{
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'index.lambda_handler',
      code: lambda.Code.fromInline(`
def lambda_handler(event, context):
    return {{
        'statusCode': 200,
        'body': 'Hello from {safe_name} chaos test!'
    }}
`),
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
    }});"""
        self.resources.append(lambda_code)
    
    def _generate_elb_resources(self, safe_name: str, scenario_json: Dict[str, Any]):
        """ELB リソースの生成"""
        self.imports.add("import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';")
        
        elb_code = f"""
    // Application Load Balancer for {safe_name}
    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, '{safe_name}LoadBalancer', {{
      vpc,
      internetFacing: true,
      loadBalancerName: '{safe_name.lower()}-alb',
    }});
    
    const listener = loadBalancer.addListener('{safe_name}Listener', {{
      port: 80,
      open: true,
    }});"""
        self.resources.append(elb_code)
    
    def _generate_vpc_resources(self, safe_name: str, scenario_json: Dict[str, Any]):
        """VPC リソースの生成"""
        # VPC は EC2 セクションで生成されるため、個別では生成しない
        pass
    
    def _generate_cloudwatch_resources(self, safe_name: str, scenario_json: Dict[str, Any]):
        """CloudWatch リソースの生成"""
        self.imports.add("import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';")
        
        cloudwatch_code = f"""
    // CloudWatch Dashboard for {safe_name}
    const dashboard = new cloudwatch.Dashboard(this, '{safe_name}Dashboard', {{
      dashboardName: '{safe_name.lower()}-chaos-dashboard',
    }});"""
        self.resources.append(cloudwatch_code)
    
    def _generate_sns_resources(self, safe_name: str, scenario_json: Dict[str, Any]):
        """SNS リソースの生成"""
        self.imports.add("import * as sns from 'aws-cdk-lib/aws-sns';")
        
        sns_code = f"""
    // SNS Topic for {safe_name}
    const topic = new sns.Topic(this, '{safe_name}Topic', {{
      topicName: '{safe_name.lower()}-chaos-notifications',
      displayName: '{safe_name} Chaos Engineering Notifications',
    }});"""
        self.resources.append(sns_code)
    
    def _generate_sqs_resources(self, safe_name: str, scenario_json: Dict[str, Any]):
        """SQS リソースの生成"""
        self.imports.add("import * as sqs from 'aws-cdk-lib/aws-sqs';")
        
        sqs_code = f"""
    // SQS Queue for {safe_name}
    const queue = new sqs.Queue(this, '{safe_name}Queue', {{
      queueName: '{safe_name.lower()}-chaos-queue',
      visibilityTimeout: cdk.Duration.seconds(300),
    }});"""
        self.resources.append(sqs_code)
    
    def _generate_dynamodb_resources(self, safe_name: str, scenario_json: Dict[str, Any]):
        """DynamoDB リソースの生成"""
        self.imports.add("import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';")
        
        dynamodb_code = f"""
    // DynamoDB Table for {safe_name}
    const table = new dynamodb.Table(this, '{safe_name}Table', {{
      tableName: '{safe_name.lower()}-chaos-table',
      partitionKey: {{
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      }},
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    }});"""
        self.resources.append(dynamodb_code)
    
    def _assemble_cdk_code(self, scenario_json: Dict[str, Any]) -> str:
        """
        CDK コードの組み立て
        """
        scenario_name = scenario_json.get('scenario_name', 'ChaosTest')
        safe_name = scenario_name.replace(' ', '').replace('-', '')
        
        # インポート部分
        imports_section = '\n'.join(sorted(self.imports))
        
        # リソース部分
        resources_section = '\n'.join(self.resources)
        
        # 完全なスタックコード
        cdk_code = f"""{imports_section}

export interface {safe_name}StackProps extends cdk.StackProps {{
  readonly environment?: string;
}}

export class {safe_name}Stack extends cdk.Stack {{
  constructor(scope: Construct, id: string, props?: {safe_name}StackProps) {{
    super(scope, id, props);
    
    // Generated resources for {scenario_name}
    {resources_section}
    
    // Tags for all resources
    cdk.Tags.of(this).add('Project', 'ChaosEngineering');
    cdk.Tags.of(this).add('Scenario', '{scenario_name}');
    cdk.Tags.of(this).add('Environment', props?.environment || 'test');
  }}
}}"""
        
        return cdk_code 