# Chaos Engineering Knock

AWS CDKを使用したChaos Engineeringプラットフォームです。Bedrockによるシナリオ生成からFIS実行まで、エンドツーエンドの自動化を提供します。

## 🏗️ アーキテクチャ

### コンポーネント

1. **シナリオ生成** (`lambdas/scenario-generator/`)
   - Bedrock (Claude) を使用したカオスエンジニアリングシナリオの生成
   - S3テンプレートベースの構造化生成

2. **シナリオ分析** (`lambdas/scenario-analyzer/`)
   - 生成されたシナリオの分析とCDKコード生成
   - FISテンプレートの生成

3. **デプロイ自動化** (`lambdas/deployer/`)
   - CDKコードの自動デプロイ
   - FIS実験の実行

4. **ユーザーフェイシング体験環境** 🆕
   - **Web UI**: React + TypeScript + Tailwind CSS
   - **API Gateway**: RESTful API エンドポイント
   - **静的ホスティング**: S3 + CloudFront
   - **FIS ダッシュボード**: 実行状況の可視化

### インフラストラクチャ

![構成図](/docs/構成図.png)


## 🚀 クイックスタート

### 前提条件

- AWS CLI v2
- Node.js v18+
- CDK v2
- Docker（Lambda レイヤー用）
- jq（JSON処理用）

### 1. 依存関係のインストール

```bash
# CDK依存関係
cd cdk
npm install

# フロントエンド依存関係
cd ../src/frontend
npm install
```

### 2. 自動デプロイ

```bash
# 自動ビルド・デプロイスクリプトを実行
./scripts/build-and-deploy.sh
```

このスクリプトは以下を自動実行します：

1. **CDKインフラのデプロイ**
   - Lambda関数群
   - API Gateway
   - S3バケット
   - CloudFrontディストリビューション

2. **API Gateway URLの抽出**
   - CDKアウトプットから自動抽出

3. **フロントエンドのビルド**
   - 環境変数の自動設定
   - React アプリケーションのビルド

4. **静的ファイルのデプロイ**
   - S3へのアップロード
   - CloudFrontキャッシュの無効化

### 3. 手動デプロイ（開発用）

```bash
# CDKのみデプロイ
cd cdk
npm run deploy

# フロントエンドのみビルド
cd ../src/frontend
npm run build
```

## 🎯 使用方法

### Web UI

デプロイ完了後、以下のURLでアクセスできます：

- **Website URL**: `https://[cloudfront-domain].cloudfront.net`
- **API Gateway URL**: `https://[api-id].execute-api.[region].amazonaws.com`

#### 機能

1. **シナリオ一覧** (`/scenarios`)
   - 生成されたシナリオの一覧表示
   - 検索・フィルタリング機能

2. **シナリオ詳細** (`/scenarios/:id`)
   - シナリオの詳細情報表示
   - CDKコードの表示・コピー

3. **FIS ダッシュボード** (`/fis`)
   - FIS実験の実行状況表示
   - ログの確認

4. **実行履歴** (`/executions`)
   - Step Function実行履歴の確認

### API エンドポイント

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/scenarios` | GET | シナリオ一覧取得 |
| `/scenarios/{id}` | GET | シナリオ詳細取得 |
| `/fis/experiments` | GET | FIS実験一覧取得 |
| `/fis/experiments/{id}` | GET | FIS実験詳細取得 |
| `/executions` | GET | Step Function実行履歴取得 |
| `/health` | GET | ヘルスチェック |

## 🛠️ 開発

### フロントエンド開発

```bash
cd src/frontend

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 型チェック
npm run type-check
```

### Lambda関数開発

```bash
# 各Lambda関数ディレクトリで
pip install -r requirements.txt
python handler.py
```

### CDK開発

```bash
cd cdk

# 型チェック
npm run build

# テスト
npm run test

# デプロイ
npm run deploy
```

## 📁 ディレクトリ構造

[ディレクトリ構造](docs/ディレクトリ構造.md)

## 🔧 設定

### 環境変数

フロントエンド (`.env`):
```env
VITE_API_URL=https://your-api-gateway-url
VITE_ENV=production
```

### CDK設定

`cdk/cdk.json`:
```json
{
  "app": "npx ts-node --prefer-ts-exts bin/chaos-100.ts",
  "context": {
    "@aws-cdk/core:enableStackNameDuplicates": true
  }
}
```

## 🚨 トラブルシューティング

### よくある問題

1. **CDK デプロイエラー**
   ```bash
   # 権限確認
   aws sts get-caller-identity
   
   # CDK Bootstrap
   cdk bootstrap
   ```

2. **フロントエンドビルドエラー**
   ```bash
   # 依存関係の再インストール
   cd src/frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **API Gateway 404エラー**
   - Lambda関数のデプロイ確認
   - CORS設定の確認
   - API Gateway ステージの確認

### ログの確認

```bash
# Lambda関数のログ
aws logs tail /aws/lambda/[function-name] --follow

# API Gateway のログ
aws logs tail /aws/apigateway/[api-id] --follow
```

## 🤝 貢献

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 ライセンス

MIT License
