# able-T-FE

Able-T の Next.js フロントエンドです。

## 技術スタック

- Next.js
- TypeScript
- openapi-typescript
- openapi-fetch
- Zod
- Tailwind CSS
- Vitest
- ESLint / typescript-eslint
- eslint-plugin-boundaries
- lefthook

## 設計方針

- OpenAPI schema を API 契約の source of truth にする。
- API client は `infrastructure` / `shared/api` に閉じ込める。
- `fetch` の直呼びは禁止する。
- View は domain model を直接受け取らない。
- View は ViewModel を props として受け取る。
- Laravel API response は View に直接流さない。
- フロントエンド domain はバックエンド domain の複製にしない。
- 機械的に判断できるアーキテクチャ違反は ESLint / custom rule で検出する。

## ドキュメント

最初に読むもの:

- [Frontend AI Working Rules](docs/ai/frontend-ai-working-rules.md)
- [Frontend Quality Stack](docs/plan/lib/frontend-quality-stack-final.md)
- [Frontend DDD / MVVM Architecture](docs/plan/architecture/frontend-ddd-mvvm-architecture.md)
- [Frontend Test Strategy](docs/plan/testing/frontend-test-strategy.md)

AI に実装を依頼する場合は、まず Frontend AI Working Rules を読ませてから、関連する設計ドキュメントを参照してください。

草案:

- [Deprecated Frontend Quality Stack Draft](docs/plan/lib/frontend-quality-stack.md)

## 開発コマンド

```bash
npm run dev
npm run build
npm run lint
```

導入予定:

```bash
npm run api:generate
npm run api:check
npm run typecheck
npm run test
npm run ci
```

## Dependency 管理

本番 runtime で必要なものは `dependencies`、型生成・lint・test・build 補助だけで使うものは `devDependencies` に置く。

```bash
npm ci --omit=dev
```

ただし Next.js を本番環境で直接 build する場合は、TypeScript や Tailwind などの devDependencies も必要になる。推奨は CI/build stage で build し、runtime stage には成果物を配信する構成です。
