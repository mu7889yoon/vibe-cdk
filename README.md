# カオスエンジニアリング100本ノック

## 概要

**Chaos Engineering 100本ノック**：ランダムに生成されるシナリオを通じて、複数の障害パターンを実践的に学習できる演習環境を構築します。

## システム構成

- **シナリオ生成(Bedrock)**：ランダムにAWS上でのカオスエンジニアリングのシナリオを作成する
- **CDK生成(Bedrock)**：FIS 実験テンプレート、Lambda、Step Functions、API Gateway などのCDKテンプレートを生成する
- **デプロイ(CodePipeline)**：作成したCDKをデプロイする
