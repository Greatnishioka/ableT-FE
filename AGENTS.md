<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 設計について

このアプリケーションは DDD に MVVM のエッセンスを加えたアーキテクチャで構成されています。

実装、リファクタリング、テスト、ドキュメント更新を行う前に以下を確認してください。

1. `docs/ai/frontend-ai-working-rules.md`
2. `docs/plan/architecture/frontend-ddd-mvvm-architecture.md`
3. `docs/plan/lib/frontend-quality-stack-final.md`
4. `docs/plan/testing/frontend-test-strategy.md`

重要なルール:

- API client は `shared/api` または `infrastructure` に閉じ込める。
- `fetch` を `view` / `presentation` / `application` から直接呼ばない。
- `view` は domain model を直接受け取らず、ViewModel を props として受け取る。
- `application` は `infrastructure` の具象実装を import しない。
- composition root は `src/composition` または `src/app/_composition` に置く。
- generated OpenAPI files を手で編集しない。
- 新しい dependency は明示的な依頼または承認なしに追加しない。
