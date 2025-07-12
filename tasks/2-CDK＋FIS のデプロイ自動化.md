# CDK＋FIS のデプロイ自動化

1. CloudFormation デプロイ用 Lambda

lambdas/deployer/handler.py を実装

S3 から CodeGen 出力を取得

AWS SDK (cloudformation.createStack / updateStack) でデプロイ

2. Step Functions への統合

stepfunction-scenario-gen.ts に以下を追加

Invoke DeployerLambda State

デプロイ完了まで待機するよう設定

3. CDK Pipeline Construct（オプション）

cdk/lib/constructs/cdk-pipeline.ts で CodePipeline を定義し、

ソース取得 → ビルド（npm run build）→ CloudFormation デプロイ

4. IAM 設定

DeployerLambda に CloudFormation 操作権限を付与

CDK Pipeline 用の CodeBuild / CodePipeline ロールを定義

