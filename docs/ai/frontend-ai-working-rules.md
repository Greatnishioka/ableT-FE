# Frontend AI Working Rules

このドキュメントは、AI に Able-T フロントエンドの実装、リファクタリング、テスト、ドキュメント更新を依頼するときの作業ルールです。

目的:

- AI がアーキテクチャ境界を壊さないようにする。
- AI が不要な依存を追加しないようにする。
- AI が生成型や OpenAPI 契約を無視しないようにする。
- AI の完了報告をレビューしやすくする。

## Must Follow

AI は以下を守る。

- layer responsibilities に従う。
- 振る舞いを変える場合は、先にテストを追加または更新する。
- Backend API の型は generated OpenAPI types を使う。
- Backend API access は `infrastructure` に置く。
- API client primitive は `shared/api` に置く。
- UI state は `presentation` に置く。
- View は pure rendering に保つ。
- View は ViewModel を props として受け取る。
- domain は React / Next.js から独立させる。
- DI provider は `src/di` に置く。
- 完了前に必要な check を実行するか、実行できなかった理由を書く。

## Must Not

AI は以下をしてはいけない。

- API response type を手書きしない。
- `fetch` を `shared/api` / `infrastructure` 以外で直接呼ばない。
- `openapi-fetch` を `shared/api` / `infrastructure` 以外で import しない。
- `view` から `domain` を import しない。
- `view` から `infrastructure` を import しない。
- `application` から `infrastructure` を import しない。
- `presentation` から `infrastructure` を import しない。
- `di` に business logic を置かない。
- `di` に mapping logic を置かない。
- `di` から API client を直接呼ばない。
- `di` を application use case を迂回する近道として使わない。
- React component に business rule を置かない。
- ViewModel logic を domain に置かない。
- Backend API response shape を View props に出さない。
- Zod を generated OpenAPI types の代替として使わない。
- generated files を手で編集しない。
- TypeScript strict settings を弱めない。
- ESLint rule を無効化または弱体化しない。
- backend-only business rule を frontend domain に複製しない。
- 明示的な承認なしに runtime dependency を追加しない。

## Lightweight Implementation Rule

小さい feature では各 layer を薄くしてよい。ただし、architecture boundary は省略しない。

Allowed:

- thin use case
- simple ViewModel mapper
- pass-through application service
- minimal domain model when no invariant exists
- no domain model for simple read-only display

Not allowed:

- direct API call from `presentation` or `view`
- passing Backend API response directly to `view`
- importing `infrastructure` from `application`
- importing `domain` entity into View props
- putting validation or business invariant in JSX
- skipping infrastructure mapper because the feature is small

## Feature Implementation Flow

新しい feature を実装するときは、次の順で進める。

1. Read the related specification memo or Gherkin story.
2. Identify affected layers.
3. Add or update tests first.
4. Implement domain only when invariant exists.
5. Implement application use case or query.
6. Implement infrastructure adapter and mapper.
7. Implement presentation ViewModel and presenter.
8. Implement view.
9. Run typecheck, lint, test, and build when relevant.
10. Summarize changed files by layer.

## Naming Convention

命名を揺らさない。

| target | pattern |
| --- | --- |
| View | `{feature}-view.tsx` |
| Presenter hook | `{feature}-presenter.ts` |
| ViewModel type | `{feature}-view-model.ts` |
| ViewModel mapper | `{feature}-view-model-mapper.ts` |
| Command mapper | `{feature}-command-mapper.ts` |
| Error presenter | `{feature}-error-presenter.ts` |
| Form draft mapper | `{feature}-form-draft-mapper.ts` |
| Use case factory | `create-{action}-{resource}-use-case.ts` |
| Use case group factory | `create-{context}-use-cases.ts` |
| Repository port | `{resource}-repository.ts` |
| API adapter | `{context}-api-adapter.ts` |
| API mapper | `{resource}-mapper.ts` |
| Test | same file name + `.test.ts` or `.test.tsx` |

例:

```txt
src/view/user-profile/user-profile-view.tsx
src/presentation/user-profile/user-profile-presenter.ts
src/presentation/user-profile/view-model/user-profile-view-model.ts
src/presentation/user-profile/mapper/user-profile-command-mapper.ts
src/presentation/user-profile/error/user-profile-error-presenter.ts
src/di/user/user-use-cases.ts
src/application/user/use-case-factory/create-get-current-user-use-case.ts
src/application/user/use-case-factory/create-user-use-cases.ts
src/application/user/ports/user-repository.ts
src/infrastructure/api/user/user-api-adapter.ts
src/infrastructure/api/user/mappers/user-mapper.ts
```

## Dependency Rule

AI は、task が明示的に依存追加を求めていない限り、新しい dependency を追加してはいけない。

新しい dependency が必要に見える場合、AI は実装前に以下を説明して承認を待つ。

1. Why the existing stack is insufficient.
2. Whether it belongs in `dependencies` or `devDependencies`.
3. Runtime impact.
4. Bundle / build impact.
5. Replacement or removal strategy.

特に以下を勝手に追加しない。

- date utility
- class name helper
- form helper
- API client
- state management library
- data fetching library
- lodash-style utility
- UI component library

## Checks

変更内容に応じて実行する。

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

OpenAPI schema や API mapping に触る場合:

```bash
npm run api:generate
npm run api:check
```

まだ script が存在しない場合は、実行できなかったことを完了報告に書く。

## Completion Report

AI は作業完了時に以下を報告する。

```txt
Changed files:
  - ...

Layer summary:
  view:
  presentation:
  application:
  domain:
  infrastructure:
  di:
  shared:

Tests:
  added/updated:
  executed:
  not executed:

Architecture rules considered:
  - ...

Remaining risks:
  - ...
```

小さい変更では簡潔にしてよい。ただし、テスト未実行や architecture 例外がある場合は必ず書く。
