import json
import boto3
import os
from typing import Dict, Any, List
from datetime import datetime
import logging

# ロギング設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS クライアント
s3_client = boto3.client('s3')
stepfunctions_client = boto3.client('stepfunctions')
fis_client = boto3.client('fis')
cloudwatch_logs_client = boto3.client('logs')

# 環境変数
BUCKET_NAME = os.environ.get('BUCKET_NAME')
STATE_MACHINE_ARN = os.environ.get('STATE_MACHINE_ARN')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    API Gateway からの各種リクエストを処理するメインハンドラー
    """
    try:
        # CORS ヘッダーの設定
        headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
        
        # OPTIONS リクエストの処理（プリフライト）
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'CORS preflight'})
            }
        
        # パスとメソッドの取得
        path = event.get('path', '')
        method = event.get('httpMethod', 'GET')
        
        logger.info(f"Request: {method} {path}")
        
        # ルーティング
        if path == '/scenarios' and method == 'GET':
            response_body = get_scenarios()
        elif path.startswith('/scenarios/') and method == 'GET':
            scenario_id = path.split('/')[-1]
            response_body = get_scenario_detail(scenario_id)
        elif path == '/fis/experiments' and method == 'GET':
            response_body = get_fis_experiments()
        elif path.startswith('/fis/experiments/') and method == 'GET':
            experiment_id = path.split('/')[-1]
            response_body = get_fis_experiment_detail(experiment_id)
        elif path == '/executions' and method == 'GET':
            response_body = get_step_function_executions()
        elif path == '/health' and method == 'GET':
            response_body = {'status': 'healthy', 'timestamp': datetime.now().isoformat()}
        else:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Not Found'})
            }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response_body)
        }
    
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal Server Error', 'message': str(e)})
        }

def get_scenarios() -> Dict[str, Any]:
    """
    S3バケットから生成されたシナリオ一覧を取得
    """
    try:
        response = s3_client.list_objects_v2(
            Bucket=BUCKET_NAME,
            Prefix='scenarios/'
        )
        
        scenarios = []
        for obj in response.get('Contents', []):
            if obj['Key'].endswith('.json'):
                # シナリオファイルの詳細を取得
                scenario_obj = s3_client.get_object(Bucket=BUCKET_NAME, Key=obj['Key'])
                scenario_data = json.loads(scenario_obj['Body'].read())
                
                scenarios.append({
                    'id': obj['Key'].split('/')[-1].replace('.json', ''),
                    'name': scenario_data.get('name', 'Unknown Scenario'),
                    'description': scenario_data.get('description', ''),
                    'created_at': obj['LastModified'].isoformat(),
                    'size': obj['Size'],
                    'type': scenario_data.get('type', 'unknown')
                })
        
        return {
            'scenarios': sorted(scenarios, key=lambda x: x['created_at'], reverse=True),
            'total': len(scenarios)
        }
    
    except Exception as e:
        logger.error(f"Error getting scenarios: {str(e)}")
        return {'scenarios': [], 'total': 0, 'error': str(e)}

def get_scenario_detail(scenario_id: str) -> Dict[str, Any]:
    """
    特定のシナリオの詳細情報を取得
    """
    try:
        key = f'scenarios/{scenario_id}.json'
        response = s3_client.get_object(Bucket=BUCKET_NAME, Key=key)
        scenario_data = json.loads(response['Body'].read())
        
        # CDKコードも取得（存在する場合）
        cdk_key = f'cdk-code/{scenario_id}.ts'
        cdk_code = None
        try:
            cdk_response = s3_client.get_object(Bucket=BUCKET_NAME, Key=cdk_key)
            cdk_code = cdk_response['Body'].read().decode('utf-8')
        except s3_client.exceptions.NoSuchKey:
            pass
        
        return {
            'id': scenario_id,
            'scenario': scenario_data,
            'cdk_code': cdk_code,
            'last_modified': response['LastModified'].isoformat()
        }
    
    except s3_client.exceptions.NoSuchKey:
        return {'error': 'Scenario not found'}
    except Exception as e:
        logger.error(f"Error getting scenario detail: {str(e)}")
        return {'error': str(e)}

def get_fis_experiments() -> Dict[str, Any]:
    """
    FIS実験の一覧を取得
    """
    try:
        response = fis_client.list_experiments()
        experiments = []
        
        for exp in response.get('experiments', []):
            experiments.append({
                'id': exp['id'],
                'state': exp.get('state', {}),
                'creation_time': exp.get('creationTime', '').isoformat() if exp.get('creationTime') else None,
                'tags': exp.get('tags', {})
            })
        
        return {
            'experiments': sorted(experiments, key=lambda x: x['creation_time'] or '', reverse=True),
            'total': len(experiments)
        }
    
    except Exception as e:
        logger.error(f"Error getting FIS experiments: {str(e)}")
        return {'experiments': [], 'total': 0, 'error': str(e)}

def get_fis_experiment_detail(experiment_id: str) -> Dict[str, Any]:
    """
    特定のFIS実験の詳細情報を取得
    """
    try:
        response = fis_client.get_experiment(id=experiment_id)
        experiment = response.get('experiment', {})
        
        # CloudWatch Logsからログを取得
        logs = get_experiment_logs(experiment_id)
        
        return {
            'id': experiment_id,
            'experiment': experiment,
            'logs': logs
        }
    
    except Exception as e:
        logger.error(f"Error getting FIS experiment detail: {str(e)}")
        return {'error': str(e)}

def get_experiment_logs(experiment_id: str) -> List[Dict[str, Any]]:
    """
    実験のCloudWatch Logsを取得
    """
    try:
        log_group_name = f'/aws/fis/{experiment_id}'
        
        # ログストリームの取得
        streams_response = cloudwatch_logs_client.describe_log_streams(
            logGroupName=log_group_name,
            orderBy='LastEventTime',
            descending=True,
            limit=10
        )
        
        logs = []
        for stream in streams_response.get('logStreams', []):
            # ログイベントの取得
            events_response = cloudwatch_logs_client.get_log_events(
                logGroupName=log_group_name,
                logStreamName=stream['logStreamName'],
                limit=100
            )
            
            for event in events_response.get('events', []):
                logs.append({
                    'timestamp': datetime.fromtimestamp(event['timestamp'] / 1000).isoformat(),
                    'message': event['message'],
                    'stream': stream['logStreamName']
                })
        
        return sorted(logs, key=lambda x: x['timestamp'], reverse=True)
    
    except Exception as e:
        logger.error(f"Error getting experiment logs: {str(e)}")
        return []

def get_step_function_executions() -> Dict[str, Any]:
    """
    Step Function実行履歴を取得
    """
    try:
        response = stepfunctions_client.list_executions(
            stateMachineArn=STATE_MACHINE_ARN,
            maxResults=50
        )
        
        executions = []
        for execution in response.get('executions', []):
            executions.append({
                'execution_arn': execution['executionArn'],
                'name': execution['name'],
                'status': execution['status'],
                'start_date': execution.get('startDate', '').isoformat() if execution.get('startDate') else None,
                'stop_date': execution.get('stopDate', '').isoformat() if execution.get('stopDate') else None,
            })
        
        return {
            'executions': executions,
            'total': len(executions)
        }
    
    except Exception as e:
        logger.error(f"Error getting step function executions: {str(e)}")
        return {'executions': [], 'total': 0, 'error': str(e)} 