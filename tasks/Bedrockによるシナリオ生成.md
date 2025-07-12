# Bedrock によるシナリオ生成

1. Step Functions State Machine 定義

cdk/lib/constructs/stepfunction-scenario-gen.ts を作成

State Machine に以下の State を追加

Invoke ScenarioGeneratorLambda（LambdaInvoke タイプ）

成功時は次ステップへ、失敗時は Catch でリトライ

2. ScenarioGeneratorLambda 実装

lambdas/scenario-generator/handler.py

S3 から templates/scenario-template.json を読み込み

Bedrock TextGeneration API（anthropic.claude-v2 など）を呼び出し

JSON 形式のシナリオ出力を返却

3. Lambda IAM ロール設定

Bedrock 呼び出し権限、S3 読取権限を付与

CDK Construct で iam.PolicyStatement を定義

## タスク一覧（随時進捗更新）