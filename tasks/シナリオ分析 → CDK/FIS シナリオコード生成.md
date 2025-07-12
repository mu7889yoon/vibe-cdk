# シナリオ分析 → CDK/FIS シナリオコード生成

1. ScenarioAnalyzerLambda の追加

lambdas/scenario-analyzer/handler.py

Step 1 で生成されたシナリオ JSON を受け取り

必要な AWS サービス （EC2, RDS, S3, Lambda, etc.） を抽出

2. CDK コード自動生成モジュール

lambdas/scenario-analyzer/cdk-codegen.py

分析結果をもとに TypeScript の CDK Construct ソース（文字列）を組み立て

3. FIS 実験テンプレート JSON も同時に生成

出力アーティファクトの保存

S3 に以下をアップロード

generated/cdk/chaos-stack.ts

generated/fis/experiment-template.json

4. IAM ロール設計

この Lambda が S3 へ書き込む権限を付与

必要に応じて CloudFormation から読み込めるよう権限調整