import json
import boto3
import logging
from botocore.exceptions import ClientError

# ロギングの設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    BedrockでAIを使用してカオスエンジニアリングシナリオを生成する
    """
    try:
        # S3からテンプレートを読み取り
        s3_client = boto3.client('s3')
        bucket_name = event.get('bucket_name')
        template_key = event.get('template_key', 'templates/scenario-template.json')
        
        logger.info(f"S3からテンプレートを読み取り中: s3://{bucket_name}/{template_key}")
        
        response = s3_client.get_object(Bucket=bucket_name, Key=template_key)
        template_content = json.loads(response['Body'].read().decode('utf-8'))
        
        # Bedrock クライアントを初期化
        bedrock_client = boto3.client('bedrock-runtime')
        
        # プロンプトの準備
        prompt = template_content['template']['prompt']
        model_id = template_content['template']['model_id']
        max_tokens = template_content['template']['max_tokens']
        temperature = template_content['template']['temperature']
        
        # Bedrock API を呼び出し
        logger.info(f"Bedrock API を呼び出し中: {model_id}")
        
        # Claude 3 Haiku のリクエスト形式
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }
        
        response = bedrock_client.invoke_model(
            modelId=model_id,
            body=json.dumps(request_body),
            contentType='application/json'
        )
        
        # レスポンスを解析
        response_body = json.loads(response['body'].read().decode('utf-8'))
        generated_text = response_body['content'][0]['text']
        
        logger.info("シナリオの生成が完了しました")
        
        # JSON形式のシナリオを抽出
        try:
            # 生成されたテキストからJSON部分を抽出
            start_idx = generated_text.find('{')
            end_idx = generated_text.rfind('}') + 1
            
            if start_idx != -1 and end_idx != -1:
                json_str = generated_text[start_idx:end_idx]
                scenario = json.loads(json_str)
            else:
                raise ValueError("生成されたテキストにJSONが見つかりません")
                
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"JSONの解析に失敗しました: {e}")
            # フォールバック：生成されたテキストをそのまま返す
            scenario = {
                "scenario_name": "生成されたシナリオ",
                "purpose": "Bedrock による自動生成",
                "target_services": ["AWS"],
                "execution_steps": [generated_text],
                "expected_results": ["システムの障害耐性の確認"],
                "recovery_steps": ["システムの復旧"]
            }
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'scenario': scenario,
                'generated_text': generated_text
            }, ensure_ascii=False)
        }
        
    except ClientError as e:
        logger.error(f"AWS API エラー: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'AWS API エラーが発生しました',
                'details': str(e)
            }, ensure_ascii=False)
        }
        
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': '予期しないエラーが発生しました',
                'details': str(e)
            }, ensure_ascii=False)
        } 