import json
import boto3
import logging
from botocore.exceptions import ClientError
from cdk_codegen import CDKCodeGenerator
from fis_template_generator import FISTemplateGenerator
import re
from typing import Dict, List, Any

# ロギングの設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Step 1 で生成されたシナリオ JSON を分析し、必要な AWS サービスを抽出
    CDK コードと FIS 実験テンプレートを生成して S3 に保存
    """
    try:
        # イベントからシナリオ JSON を取得
        scenario_json = event.get('scenario')
        if not scenario_json:
            raise ValueError("シナリオ JSON が見つかりません")
        
        logger.info(f"シナリオ分析を開始: {scenario_json.get('scenario_name', 'Unknown')}")
        
        # AWS サービスの抽出
        aws_services = extract_aws_services(scenario_json)
        logger.info(f"抽出されたAWSサービス: {aws_services}")
        
        # CDK コードの生成
        cdk_generator = CDKCodeGenerator()
        cdk_code = cdk_generator.generate_cdk_code(aws_services, scenario_json)
        
        # FIS 実験テンプレートの生成
        fis_generator = FISTemplateGenerator()
        fis_template = fis_generator.generate_fis_template(aws_services, scenario_json)
        
        # S3 への保存
        s3_client = boto3.client('s3')
        bucket_name = event.get('bucket_name')
        
        # CDK コードの保存
        cdk_key = 'generated/cdk/chaos-stack.ts'
        s3_client.put_object(
            Bucket=bucket_name,
            Key=cdk_key,
            Body=cdk_code,
            ContentType='text/typescript'
        )
        
        # FIS テンプレートの保存
        fis_key = 'generated/fis/experiment-template.json'
        s3_client.put_object(
            Bucket=bucket_name,
            Key=fis_key,
            Body=json.dumps(fis_template, indent=2),
            ContentType='application/json'
        )
        
        logger.info("CDK コードと FIS テンプレートの生成が完了しました")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'シナリオ分析が完了しました',
                'aws_services': aws_services,
                'cdk_code_key': cdk_key,
                'fis_template_key': fis_key,
                'scenario_name': scenario_json.get('scenario_name', 'Unknown')
            }, ensure_ascii=False)
        }
        
    except Exception as e:
        logger.error(f"シナリオ分析エラー: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'シナリオ分析エラーが発生しました',
                'details': str(e)
            }, ensure_ascii=False)
        }


def extract_aws_services(scenario_json: Dict[str, Any]) -> List[str]:
    """
    シナリオ JSON から AWS サービスを抽出
    """
    aws_services = set()
    
    # 明示的に指定されたサービスの抽出
    if 'target_services' in scenario_json:
        for service in scenario_json['target_services']:
            aws_services.add(service.upper())
    
    # テキストからサービス名を抽出
    text_content = json.dumps(scenario_json, ensure_ascii=False)
    
    # AWS サービス名のパターン
    service_patterns = {
        'EC2': r'(?i)\b(ec2|elastic\s+compute|virtual\s+machine|instance)\b',
        'RDS': r'(?i)\b(rds|database|mysql|postgresql|aurora)\b',
        'S3': r'(?i)\b(s3|simple\s+storage|bucket|object\s+storage)\b',
        'Lambda': r'(?i)\b(lambda|serverless|function)\b',
        'ELB': r'(?i)\b(elb|elastic\s+load\s+balancer|load\s+balancer)\b',
        'VPC': r'(?i)\b(vpc|virtual\s+private\s+cloud|network)\b',
        'IAM': r'(?i)\b(iam|identity|access\s+management|role|policy)\b',
        'CloudWatch': r'(?i)\b(cloudwatch|monitoring|metrics|logs)\b',
        'SNS': r'(?i)\b(sns|simple\s+notification|notification)\b',
        'SQS': r'(?i)\b(sqs|simple\s+queue|queue)\b',
        'DynamoDB': r'(?i)\b(dynamodb|nosql|document\s+database)\b',
        'ECS': r'(?i)\b(ecs|elastic\s+container|container)\b',
        'EKS': r'(?i)\b(eks|kubernetes|k8s)\b',
        'API Gateway': r'(?i)\b(api\s+gateway|api)\b',
        'Step Functions': r'(?i)\b(step\s+functions|state\s+machine|workflow)\b'
    }
    
    for service, pattern in service_patterns.items():
        if re.search(pattern, text_content):
            aws_services.add(service)
    
    return list(aws_services) 