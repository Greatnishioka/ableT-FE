# able-T-FE Docs

フロントエンドの設計、品質管理、テスト戦略をまとめるドキュメントです。

## 確定版

- [Frontend AI Working Rules](ai/frontend-ai-working-rules.md)
- [Frontend Quality Stack](plan/lib/frontend-quality-stack-final.md)
- [Frontend DDD / MVVM Architecture](plan/architecture/frontend-ddd-mvvm-architecture.md)
- [Frontend Test Strategy](plan/testing/frontend-test-strategy.md)

## 草案

- [Deprecated Frontend Quality Stack Draft](plan/lib/frontend-quality-stack.md)

## 読む順番

1. [Frontend Quality Stack](plan/lib/frontend-quality-stack-final.md)
2. [Frontend DDD / MVVM Architecture](plan/architecture/frontend-ddd-mvvm-architecture.md)
3. [Frontend Test Strategy](plan/testing/frontend-test-strategy.md)
4. [Frontend AI Working Rules](ai/frontend-ai-working-rules.md)

AI に実装を依頼する場合は、まず [Frontend AI Working Rules](ai/frontend-ai-working-rules.md) を読ませてから、関連する設計ドキュメントを参照してください。

## 主要方針

- OpenAPI schema を API 契約の source of truth にする。
- ランタイムライブラリは腐敗防止層に閉じ込める。
- View は Entity / Value Object を直接扱わない。
- フロントエンド domain はバックエンド domain の複製にしない。
- 仕様は先にテストで固定する。
- アーキテクチャ違反は ESLint / custom rule で機械的に検出する。
