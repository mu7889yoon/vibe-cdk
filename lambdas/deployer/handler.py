import json
import boto3
import os
import logging
import time
from botocore.exceptions import ClientError, NoCredentialsError
from typing import Dict, Any, Optional

# ロギングの設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS クライアントの初期化
s3_client = boto3.client('s3')
cloudformation_client = boto3.client('cloudformation')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    CloudFormation デプロイ用 Lambda ハンドラー
    
    Args:
        event: Lambda イベント
        context: Lambda コンテキスト
        
    Returns:
        デプロイ結果
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # 環境変数の取得
        bucket_name = event.get('bucket_name') or os.environ.get('BUCKET_NAME')
        codegen_key = event.get('codegen_key', 'codegen-output/cloudformation-template.json')
        stack_name = event.get('stack_name', 'chaos-engineering-fis-stack')
        
        if not bucket_name:
            raise ValueError("bucket_name is required")
        
        # S3からCodeGen出力を取得
        logger.info(f"Getting CodeGen output from S3: {bucket_name}/{codegen_key}")
        template_body = get_codegen_output_from_s3(bucket_name, codegen_key)
        
        # CloudFormationテンプレートのバリデーション
        validate_template(template_body)
        
        # CloudFormationデプロイの実行
        deployment_result = deploy_cloudformation_stack(
            stack_name=stack_name,
            template_body=template_body,
            parameters=event.get('parameters', [])
        )
        
        # デプロイ完了まで待機
        if deployment_result.get('wait_for_completion', True):
            wait_for_deployment_completion(stack_name, deployment_result['operation_type'])
        
        logger.info("CloudFormation deployment completed successfully")
        
        return {
            'statusCode': 200,
            'body': {
                'message': 'Deployment completed successfully',
                'stackName': stack_name,
                'stackId': deployment_result.get('stack_id'),
                'operationType': deployment_result.get('operation_type'),
                'deploymentTime': deployment_result.get('deployment_time')
            }
        }
        
    except Exception as e:
        logger.error(f"Error in CloudFormation deployment: {str(e)}")
        return {
            'statusCode': 500,
            'body': {
                'error': str(e),
                'message': 'CloudFormation deployment failed'
            }
        }

def get_codegen_output_from_s3(bucket_name: str, key: str) -> str:
    """
    S3からCodeGen出力を取得
    
    Args:
        bucket_name: S3バケット名
        key: S3オブジェクトキー
        
    Returns:
        CloudFormationテンプレートの内容
    """
    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=key)
        template_body = response['Body'].read().decode('utf-8')
        logger.info(f"Successfully retrieved template from S3: {len(template_body)} characters")
        return template_body
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            raise ValueError(f"CodeGen output not found in S3: {bucket_name}/{key}")
        else:
            raise ValueError(f"Error retrieving CodeGen output from S3: {str(e)}")

def validate_template(template_body: str) -> None:
    """
    CloudFormationテンプレートのバリデーション
    
    Args:
        template_body: CloudFormationテンプレートの内容
    """
    try:
        cloudformation_client.validate_template(TemplateBody=template_body)
        logger.info("Template validation successful")
        
    except ClientError as e:
        raise ValueError(f"Template validation failed: {str(e)}")

def deploy_cloudformation_stack(stack_name: str, template_body: str, parameters: list) -> Dict[str, Any]:
    """
    CloudFormationスタックのデプロイ
    
    Args:
        stack_name: スタック名
        template_body: CloudFormationテンプレートの内容
        parameters: スタックパラメータ
        
    Returns:
        デプロイ結果
    """
    try:
        # スタックの存在確認
        stack_exists = check_stack_exists(stack_name)
        
        if stack_exists:
            logger.info(f"Updating existing stack: {stack_name}")
            response = cloudformation_client.update_stack(
                StackName=stack_name,
                TemplateBody=template_body,
                Parameters=parameters,
                Capabilities=['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM']
            )
            operation_type = 'UPDATE'
        else:
            logger.info(f"Creating new stack: {stack_name}")
            response = cloudformation_client.create_stack(
                StackName=stack_name,
                TemplateBody=template_body,
                Parameters=parameters,
                Capabilities=['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM']
            )
            operation_type = 'CREATE'
        
        return {
            'stack_id': response['StackId'],
            'operation_type': operation_type,
            'deployment_time': time.time(),
            'wait_for_completion': True
        }
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'ValidationError' and 'No updates' in str(e):
            logger.info(f"No updates required for stack: {stack_name}")
            return {
                'stack_id': None,
                'operation_type': 'NO_CHANGE',
                'deployment_time': time.time(),
                'wait_for_completion': False
            }
        else:
            raise ValueError(f"CloudFormation deployment failed: {str(e)}")

def check_stack_exists(stack_name: str) -> bool:
    """
    スタックの存在確認
    
    Args:
        stack_name: スタック名
        
    Returns:
        スタックが存在するかどうか
    """
    try:
        cloudformation_client.describe_stacks(StackName=stack_name)
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == 'ValidationError':
            return False
        else:
            raise

def wait_for_deployment_completion(stack_name: str, operation_type: str) -> None:
    """
    デプロイ完了まで待機
    
    Args:
        stack_name: スタック名
        operation_type: 操作タイプ（CREATE/UPDATE）
    """
    if operation_type == 'CREATE':
        waiter = cloudformation_client.get_waiter('stack_create_complete')
        logger.info(f"Waiting for stack creation to complete: {stack_name}")
    elif operation_type == 'UPDATE':
        waiter = cloudformation_client.get_waiter('stack_update_complete')
        logger.info(f"Waiting for stack update to complete: {stack_name}")
    else:
        logger.info(f"No waiting required for operation type: {operation_type}")
        return
    
    try:
        waiter.wait(
            StackName=stack_name,
            WaiterConfig={
                'Delay': 30,
                'MaxAttempts': 60  # 最大30分間待機
            }
        )
        logger.info(f"Stack {operation_type.lower()} completed successfully: {stack_name}")
        
    except Exception as e:
        logger.error(f"Error waiting for stack {operation_type.lower()}: {str(e)}")
        raise ValueError(f"Stack {operation_type.lower()} failed or timed out: {str(e)}") 