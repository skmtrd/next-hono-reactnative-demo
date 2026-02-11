# Hono API Server

Hono を使用したシンプルな API サーバーです。

## セットアップ

```bash
npm install
```

## 開発サーバーの起動

```bash
npm run dev
```

サーバーは `http://localhost:8787` で起動します。

## エンドポイント

- `GET /` - ヘルスチェック
- `GET /api/hello` - Hello メッセージを返す
- `POST /api/greet` - 名前を受け取って挨拶を返す
  - Body: `{ "name": "Your Name" }`
