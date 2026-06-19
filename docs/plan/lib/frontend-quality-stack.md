# Deprecated Draft

このファイルは履歴確認用の草案です。

実装判断には使用しないでください。
AI はこのファイルの内容を実装方針として採用してはいけません。

決定版は `docs/plan/lib/frontend-quality-stack-final.md` です。

# Next.js Frontend Quality Stack Proposal

このドキュメントは、Laravel 側と同じ温度感で Next.js フロントエンドの品質を強制するためのライブラリ候補とルール運用案をまとめたものです。

前提:

- フロントエンドは Next.js App Router + TypeScript を想定する。
- バックエンドは OpenAPI を生成しており、契約テストも実行している。
- 品質ゲートは「開発者の努力」ではなく CI とローカル hook で強制する。
- PHPStan のカスタムルールに近い仕組みとして、TypeScript/React では ESLint カスタムルールを第一候補にする。

## 結論

最初に入れるべき中核は以下です。

| 目的 | 推奨 |
| --- | --- |
| Framework | Next.js App Router |
| Language | TypeScript strict |
| API 型生成 | openapi-typescript |
| API client | openapi-fetch |
| Server state | TanStack Query / openapi-react-query |
| Form | react-hook-form + zod |
| UI primitive | Radix UI |
| UI composition | shadcn/ui |
| Styling | Tailwind CSS |
| Unit / component test | Vitest + Testing Library |
| E2E | Playwright |
| API mock | MSW |
| Component catalog | Storybook |
| Accessibility | eslint-plugin-jsx-a11y + axe |
| Architecture rule | eslint-plugin-boundaries / dependency-cruiser |
| Dead code | Knip |
| Dependency update | Renovate |
| Git hook | lefthook |
| Custom rules | Local ESLint plugin |

## API 品質

このプロジェクトでは OpenAPI をフロントエンド品質の中心に置くのが最も効果的です。

推奨:

- `php artisan l5-swagger:generate` で OpenAPI を生成する。
- `openapi-typescript` で TypeScript 型を生成する。
- `openapi-fetch` で typed API client を作る。
- React hooks は `openapi-react-query` か TanStack Query の薄い wrapper に閉じ込める。
- `fetch`, `axios`, 手書き API 型を禁止する。

例:

```json
{
  "scripts": {
    "api:generate": "openapi-typescript ../ableTo/storage/api-docs/api-docs.json -o src/shared/api/schema.d.ts",
    "api:check": "npm run api:generate && git diff --exit-code src/shared/api/schema.d.ts"
  }
}
```

強制ルール:

- `src/shared/api` 以外で `fetch` を直接呼ばない。
- OpenAPI に存在しない path を使わない。
- API response の手書き interface/type を禁止する。
- `as SomeResponse` のような API response 型アサーションを禁止する。
- API client は literal path を使い、動的 path 組み立てを禁止する。

## TypeScript 設定

`tsconfig.json` は最低限これを有効にします。

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noEmit": true
  }
}
```

方針:

- `any` は原則禁止。
- `unknown` は許可し、境界で zod などにより検証する。
- `as` は原則禁止。ただし `as const`, generated code, テストの一部は例外にする。
- `// @ts-ignore` は禁止。必要なら理由付きの `// @ts-expect-error` のみにする。

## ESLint

推奨 plugin:

```txt
@typescript-eslint/eslint-plugin
eslint-config-next
eslint-plugin-react-hooks
eslint-plugin-jsx-a11y
eslint-plugin-testing-library
eslint-plugin-playwright
eslint-plugin-boundaries
eslint-plugin-unused-imports
eslint-plugin-import-x
```

`typescript-eslint` は type checked config を使います。通常の lint より遅くなりますが、PHPStan に近い検出力を出すには型情報が必要です。

強めにしたい代表ルール:

```txt
@typescript-eslint/no-explicit-any
@typescript-eslint/no-unsafe-assignment
@typescript-eslint/no-unsafe-member-access
@typescript-eslint/no-unsafe-call
@typescript-eslint/no-floating-promises
@typescript-eslint/switch-exhaustiveness-check
@typescript-eslint/consistent-type-imports
react-hooks/rules-of-hooks
react-hooks/exhaustive-deps
jsx-a11y/alt-text
jsx-a11y/anchor-is-valid
unused-imports/no-unused-imports
```

## PHPStan のような独自ルール

TypeScript/React で PHPStan のカスタムルールに最も近い仕組みは、ローカル ESLint plugin です。

作成候補:

```txt
packages/eslint-plugin-ableto/
  src/
    rules/
      no-direct-api-fetch.ts
      no-manual-api-response-type.ts
      no-cross-layer-import.ts
      no-client-component-by-default.ts
      require-server-action-result.ts
      no-raw-date-format.ts
    index.ts
  tests/
    no-direct-api-fetch.test.ts
```

### 作るべき独自ルール

| ルール | 目的 |
| --- | --- |
| `ableto/no-direct-api-fetch` | `src/shared/api` 以外で `fetch` / `axios` / `ky` を禁止 |
| `ableto/no-manual-api-response-type` | `UserResponse`, `DashboardResponse` など手書き API response 型を禁止 |
| `ableto/no-api-type-assertion` | API 結果への `as` 型アサーションを禁止 |
| `ableto/no-cross-layer-import` | `shared -> features` など逆方向 import を禁止 |
| `ableto/no-client-component-by-default` | 安易な `"use client"` を禁止し、許可ディレクトリを限定 |
| `ableto/no-router-push-raw-path` | `router.push("/raw")` を禁止し typed route helper 経由にする |
| `ableto/require-error-boundary` | 特定 route segment に `error.tsx` を要求 |
| `ableto/require-loading-boundary` | data fetching route に `loading.tsx` を要求 |
| `ableto/no-raw-local-storage` | localStorage 直呼びを禁止し wrapper 経由にする |
| `ableto/no-raw-date-format` | `toLocaleString` 直書きを禁止し formatter 経由にする |

### 例: fetch 直呼び禁止ルール

```ts
import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/your-org/able-t-fe/tree/main/docs/eslint-rules/${name}`,
);

export const noDirectApiFetch = createRule({
  name: "no-direct-api-fetch",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct fetch calls outside src/shared/api.",
    },
    messages: {
      directFetch: "Use src/shared/api client instead of direct fetch.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename;
    const isApiLayer = filename.includes("/src/shared/api/");

    return {
      CallExpression(node) {
        if (isApiLayer) {
          return;
        }

        if (node.callee.type === "Identifier" && node.callee.name === "fetch") {
          context.report({
            node,
            messageId: "directFetch",
          });
        }
      },
    };
  },
});
```

### ESLint で厳しい場合

ESLint だけでは表現しづらい検査は、TypeScript Compiler API または ts-morph のカスタム checker script に逃がします。

候補:

- `scripts/check-generated-api-is-current.ts`
- `scripts/check-route-boundaries.ts`
- `scripts/check-public-env.ts`
- `scripts/check-design-token-usage.ts`
- `scripts/check-no-unapproved-dependencies.ts`

PHPStan のように「プロジェクト固有の品質ルール」を育てるなら、最初は ESLint plugin、複雑になったものだけ custom checker script に分離するのが現実的です。

## Architecture

推奨ディレクトリ:

```txt
src/
  app/
  features/
  entities/
  shared/
    api/
    config/
    lib/
    ui/
```

依存方向:

```txt
app -> features -> entities -> shared
```

禁止:

- `shared` から `features` を import する。
- `entities` から `features` を import する。
- `features/*` 同士を無制限に import する。
- `app` 以外で Next.js route concern を持つ。
- API client を feature 内に散らす。

強制方法:

- 軽め: `eslint-plugin-boundaries`
- 厳しめ: `dependency-cruiser`
- 独自要件が増えたら local ESLint rule

## Test

### Unit / Component

推奨:

- Vitest
- Testing Library
- jsdom / happy-dom
- MSW

対象:

- pure function
- formatter
- zod schema
- API wrapper
- hooks
- UI component の主要状態

### E2E

推奨:

- Playwright

必須シナリオ:

- login
- logout
- dashboard 表示
- CRUD の代表フロー
- 権限不足時の表示
- validation error
- 404 / 500 / network error

Playwright config 方針:

- CI で `forbidOnly: true`
- trace を保存
- screenshot/video は失敗時のみ保存
- Laravel server と Next.js server を `webServer` で起動

### Storybook

使いどころ:

- UI component の状態管理
- visual regression
- accessibility test
- design review

Storybook は「説明用」ではなく、コンポーネント状態のテストケースとして扱います。

## Security

推奨:

- `server-only` / `client-only` による境界明示
- `zod` による env validation
- `next-safe-action` または独自 wrapper による Server Action 境界
- `eslint-plugin-security` は必要に応じて導入
- public env は `NEXT_PUBLIC_` のみ許可
- token を localStorage に置かない方針を明文化

独自ルール候補:

- `process.env.X` の直読み禁止。`src/shared/config/env.ts` 経由にする。
- `NEXT_PUBLIC_` 以外の env を Client Component で参照禁止。
- `dangerouslySetInnerHTML` を原則禁止。

## Dependency 管理

推奨:

- Renovate で更新 PR を自動化
- `npm audit` はノイズが多いので、運用ルールを決めた上で入れる
- production dependency の承認リストを持つ
- `Knip` で未使用 dependencies / exports / files を検出

Laravel 側に `approved-production-dependencies.json` があるため、フロントも同じ思想で `approved-production-dependencies.json` を持つとよいです。

## CI

例:

```json
{
  "scripts": {
    "ci": "npm run api:check && npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build && npm run e2e && npm run knip",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings=0",
    "format:check": "prettier --check .",
    "test": "vitest run --coverage",
    "build": "next build",
    "e2e": "playwright test",
    "knip": "knip"
  }
}
```

CI で落とすもの:

- 型エラー
- lint warning
- format 差分
- test failure
- coverage threshold 未達
- OpenAPI 生成物の未更新
- direct fetch
- 手書き API 型
- architecture 違反
- 未使用 dependency
- `test.only`
- Storybook build failure

## Local Hook

すでに Laravel 側で lefthook を使っているため、フロントも lefthook に寄せます。

pre-commit:

```txt
eslint --fix
prettier --write
```

pre-push:

```txt
npm run typecheck
npm run lint
npm run test
```

重いもの:

```txt
npm run e2e
npm run build
npm run knip
```

重いものは CI 必須、ローカルでは任意または pre-push にするかをチームで決めます。

## 導入順

1. Next.js + TypeScript strict を作る。
2. OpenAPI 型生成と typed API client を入れる。
3. ESLint type checked config を入れる。
4. API 直呼び禁止、手書き API 型禁止を入れる。
5. Vitest + MSW を入れる。
6. Playwright で主要 user journey を固定する。
7. Storybook を UI 状態テストとして入れる。
8. Knip / Renovate / dependency approval を入れる。
9. local ESLint plugin を作り、プロジェクト固有ルールを増やす。

## 最初に作るべき独自ルール

優先度順:

1. `ableto/no-direct-api-fetch`
2. `ableto/no-manual-api-response-type`
3. `ableto/no-api-type-assertion`
4. `ableto/no-cross-layer-import`
5. `ableto/no-client-component-by-default`

この 5 つで、API 契約、型安全性、アーキテクチャの崩れをかなり早期に止められます。
