# Next.js Frontend Quality Stack

このドキュメントは、`docs/frontend-quality-stack.md` を草案として、Able-T フロントエンドで最初に採用する品質管理スタックを確定版として整理したものです。

方針:

- 最初から大量のライブラリを入れない。
- ランタイムで動作する外部ライブラリは腐敗防止層に閉じ込める。
- Laravel API との通信は infrastructure 層の責務にする。
- フロントエンドにも DDD 的な依存方向を持たせる。
- アーキテクチャ保護とプロジェクト固有のカスタムルールは最初から導入する。
- 静的 export と Node.js server の両方を意識して設計する。

## 採用ライブラリ

| 目的 | 採用 |
| --- | --- |
| Framework | Next.js |
| Language | TypeScript |
| API 型生成 | openapi-typescript |
| API client | openapi-fetch |
| Schema validation | Zod |
| Styling | Tailwind CSS |
| Unit test | Vitest |
| Lint / custom rule | typescript-eslint |
| Architecture rule | eslint-plugin-boundaries |
| Git hook | lefthook |
| Project custom rules | local ESLint plugin |

## Dependency 管理

npm では Composer と同じように、本番実行時に必要な依存と開発時だけ必要な依存を分けられる。

```txt
dependencies
  本番 runtime で必要なもの

devDependencies
  build, lint, test, code generation, typecheck で必要なもの
```

このプロジェクトでの分類:

| package | 分類 | 理由 |
| --- | --- | --- |
| `next` | `dependencies` | 本番 runtime で Next.js server を動かす場合に必要 |
| `react` | `dependencies` | 本番 runtime で必要 |
| `react-dom` | `dependencies` | 本番 runtime で必要 |
| `openapi-fetch` | `dependencies` | browser / server runtime で API 通信に使用 |
| `zod` | `dependencies` | runtime validation に使用する場合がある |
| `tailwindcss` | `devDependencies` | CSS build tool。runtime では不要 |
| `@tailwindcss/postcss` | `devDependencies` | CSS build tool。runtime では不要 |
| `typescript` | `devDependencies` | typecheck / build 用 |
| `openapi-typescript` | `devDependencies` | 型生成用。runtime では不要 |
| `vitest` | `devDependencies` | test 用 |
| `eslint` | `devDependencies` | lint 用 |
| `typescript-eslint` | `devDependencies` | lint / custom rule 用 |
| `eslint-plugin-boundaries` | `devDependencies` | architecture lint 用 |
| `lefthook` | `devDependencies` | local hook 用 |

本番 install では、通常は以下のように devDependencies を省ける。

```bash
npm ci --omit=dev
```

ただし Next.js は build 時に TypeScript、Tailwind、lint、型生成などの devDependencies を使う。そのため、本番環境で直接 build する場合は devDependencies も必要になる。

推奨運用:

```txt
CI / build stage
  npm ci
  npm run api:generate
  npm run typecheck
  npm run lint
  npm run test
  npm run build

runtime stage
  static export の場合: out/ だけを配信
  Node.js server の場合: next build output を配信
```

Node.js server で Docker 等を使う場合は、`output: "standalone"` により runtime に必要なファイルだけを `.next/standalone` にまとめる運用を候補にする。

## Architecture

フロントエンドでは、バックエンド DDD をそのまま移植するのではなく、依存方向と境界を守るために DDD 的な考え方を薄く採用する。

推奨構成:

```txt
src/
  app/
  presentation/
  application/
  domain/
  infrastructure/
    laravel/
  shared/
    api/
    config/
    lib/
```

責務:

| layer | 責務 |
| --- | --- |
| `app` | Next.js route / layout / composition root |
| `presentation` | React component, UI state, view model |
| `application` | use case, command/query, port 定義 |
| `domain` | entity, value object, domain rule |
| `infrastructure` | Laravel API adapter, browser storage adapter |
| `shared` | 汎用 utility, config, API client primitive |

依存方向:

```txt
app
  -> presentation
  -> application
  -> infrastructure

presentation
  -> application
  -> domain
  -> shared

application
  -> domain
  -> shared

infrastructure
  -> application ports
  -> domain
  -> shared/api

domain
  -> shared の一部のみ

shared
  -> 他 layer に依存しない
```

禁止:

- `domain` から `react`, `next`, `openapi-fetch`, browser API を import しない。
- `application` から `presentation` を import しない。
- `domain` から `infrastructure` を import しない。
- `shared` から `app`, `presentation`, `application`, `domain`, `infrastructure` を import しない。
- `presentation` から `openapi-fetch` を直接 import しない。
- `fetch` を画面や use case から直接呼ばない。

## Anti-Corruption Layer

ランタイムで動作する外部ライブラリは、直接アプリ全体に広げない。

`openapi-fetch` は `shared/api` または `infrastructure/laravel` に閉じ込める。

```txt
presentation
  -> application use case
    -> application port
      -> infrastructure/laravel adapter
        -> shared/api/openapi-fetch client
```

例:

```ts
// src/application/ports/user-repository.ts
import type { User } from "@/src/domain/user/user";

export interface UserRepository {
  findMe(): Promise<User>;
}
```

```ts
// src/infrastructure/laravel/user-repository.ts
import type { UserRepository } from "@/src/application/ports/user-repository";
import { apiClient } from "@/src/shared/api/client";
import { toUser } from "./mappers/user-mapper";

export const laravelUserRepository: UserRepository = {
  async findMe() {
    const { data, error } = await apiClient.GET("/api/me");

    if (error) {
      throw error;
    }

    return toUser(data);
  },
};
```

この形にすると、`openapi-fetch` を別の API client に交換する場合も、影響範囲を `shared/api` と `infrastructure/laravel` に閉じられる。

## OpenAPI

Laravel 側で生成した OpenAPI schema から TypeScript 型を生成する。

採用:

- `openapi-typescript`
- `openapi-fetch`

方針:

- OpenAPI schema は API 契約の source of truth とする。
- API response の手書き型を禁止する。
- API path は OpenAPI に存在する literal path を使う。
- API client は infrastructure 層からのみ利用する。

想定 script:

```json
{
  "scripts": {
    "api:generate": "openapi-typescript ../ableTo/storage/api-docs/api-docs.json -o src/shared/api/schema.d.ts",
    "api:check": "npm run api:generate && git diff --exit-code src/shared/api/schema.d.ts"
  }
}
```

## TypeScript

`strict` に加えて、境界の曖昧さを減らす設定を有効にする。

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
- 外部入力は `unknown` として受け、境界で Zod または mapper により検証する。
- `as` は原則避ける。必要な場合は境界層に限定する。
- `// @ts-ignore` は禁止。必要な場合は理由付きの `// @ts-expect-error` のみ許可する。

## ESLint

採用:

- `eslint`
- `typescript-eslint`
- `eslint-config-next`
- `eslint-plugin-boundaries`
- local ESLint plugin

必須ルール:

- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-unsafe-assignment`
- `@typescript-eslint/no-unsafe-member-access`
- `@typescript-eslint/no-unsafe-call`
- `@typescript-eslint/no-floating-promises`
- `@typescript-eslint/switch-exhaustiveness-check`
- `@typescript-eslint/consistent-type-imports`

`typescript-eslint` は type-aware lint を使う。PHPStan に近い検出力を出すには型情報が必要になる。

## Architecture Protection

`eslint-plugin-boundaries` で layer import を守る。

最初に守る境界:

- `domain` は `react`, `next`, `openapi-fetch`, `infrastructure`, browser API に依存しない。
- `application` は `presentation` に依存しない。
- `shared` は他 layer に依存しない。
- `presentation` は API client 実装に依存しない。

`eslint-plugin-boundaries` で表現しづらいルールは local ESLint plugin に寄せる。

## Custom Rules

PHPStan のカスタムルールに相当する仕組みとして、local ESLint plugin を作る。

想定構成:

```txt
packages/eslint-plugin-ableto/
  src/
    rules/
      no-direct-api-fetch.ts
      no-openapi-fetch-outside-infra.ts
      no-domain-import-react.ts
      no-process-env-outside-config.ts
    index.ts
  tests/
    no-direct-api-fetch.test.ts
```

最初に作るルール:

| rule | 目的 |
| --- | --- |
| `ableto/no-direct-api-fetch` | `fetch` の直呼びを infrastructure/shared api 以外で禁止 |
| `ableto/no-openapi-fetch-outside-infra` | `openapi-fetch` の import を `shared/api` または `infrastructure` に限定 |
| `ableto/no-domain-import-react` | `domain` 層が React / Next.js に依存することを禁止 |
| `ableto/no-process-env-outside-config` | `process.env` の直読みを `shared/config/env.ts` に限定 |

追加候補:

| rule | 目的 |
| --- | --- |
| `ableto/no-api-type-assertion` | API response への `as` 型アサーションを禁止 |
| `ableto/no-manual-api-response-type` | 手書き API response 型を禁止 |
| `ableto/no-use-client-outside-presentation` | `"use client"` の利用場所を制限 |
| `ableto/no-raw-local-storage` | `localStorage` 直呼びを wrapper 経由にする |

## Zod

Zod は runtime validation が必要な境界でのみ使う。

主な用途:

- `process.env` の検証
- URL query / form input の検証
- Laravel API 以外から来る外部入力の検証
- localStorage 等に保存された値の復元時検証

OpenAPI response は型生成と mapper を基本とし、必要な箇所だけ Zod で runtime validation する。

## Tailwind CSS

Tailwind CSS は styling のために使う。

方針:

- UI component 自体は自作する。
- shadcn/ui や Radix UI は最初は採用しない。
- design token と component API はプロジェクト内で管理する。
- Tailwind class の乱用を避けるため、共通 component に寄せる。

## Vitest

Vitest は unit test に使う。

対象:

- domain rule
- value object
- mapper
- Zod schema
- application use case
- custom ESLint rule

最初から browser E2E は必須にしない。必要になった時点で Playwright を検討する。

## Static Export / Node.js Server

このプロジェクトは、静的 export と Node.js server の両方を意識して設計する。

### Static Export

`next.config.ts` で `output: "export"` を使う。

特徴:

- `out/` に HTML/CSS/JS を生成する。
- Nginx、S3、Apache など静的配信環境で動かせる。
- Laravel API へ browser から直接通信する。
- CORS、Cookie、CSRF、token 管理は Laravel 側の設計に依存する。

静的 export で避けるもの:

- Server Actions
- request に依存する Route Handlers
- `cookies()`
- `headers()`
- rewrites / redirects / headers config
- ISR
- default loader の `next/image`
- `generateStaticParams()` なしの dynamic routes

### Node.js Server

通常の `next start` または `output: "standalone"` を使う。

特徴:

- Next.js の server 機能を使える。
- BFF 的な設計が可能。
- httpOnly cookie や server-only env を扱いやすい。
- Static export より機能制限が少ない。

ただし、Node.js server 専用機能に依存しすぎると static export への切り替えが難しくなる。両対応したい場合、最初は server-only 機能を避ける。

## 採用しないもの

最初は以下を採用しない。

| package | 理由 |
| --- | --- |
| TanStack Query | API cache が必要になった時点で検討する |
| openapi-react-query | TanStack Query 採用時に再検討する |
| React Hook Form | 複雑なフォームが出てきた時点で検討する |
| next-safe-action | Server Actions 依存。static export と相性が悪い |
| @t3-oss/env-nextjs | Zod + `shared/config/env.ts` の自前実装で始める |
| Radix UI | UI は自作方針 |
| shadcn/ui | UI は自作方針 |
| Storybook | UI catalog が必要になった時点で検討する |
| Playwright | E2E が必要になった時点で検討する |
| MSW | API mock が必要になった時点で検討する |
| axe-core | 今回は品質ゲートに含めない |
| Renovate | 最初は採用しない |
| Knip | dead code 管理が必要になった時点で検討する |

## 導入順

1. `tsconfig.json` を strict に強化する。
2. `openapi-typescript` と `openapi-fetch` を入れる。
3. `shared/api` と `infrastructure/laravel` に API client を閉じ込める。
4. `typescript-eslint` の type-aware lint を入れる。
5. `eslint-plugin-boundaries` で layer import を制限する。
6. local ESLint plugin を作る。
7. `ableto/no-direct-api-fetch` を作る。
8. `ableto/no-openapi-fetch-outside-infra` を作る。
9. `ableto/no-domain-import-react` を作る。
10. `lefthook` で lint / typecheck を local hook に入れる。
11. `Vitest` で domain / mapper / custom rule の test を入れる。

## CI

最初の品質ゲート:

```json
{
  "scripts": {
    "api:generate": "openapi-typescript ../ableTo/storage/api-docs/api-docs.json -o src/shared/api/schema.d.ts",
    "api:check": "npm run api:generate && git diff --exit-code src/shared/api/schema.d.ts",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings=0",
    "test": "vitest run",
    "build": "next build",
    "ci": "npm run api:check && npm run typecheck && npm run lint && npm run test && npm run build"
  }
}
```

CI で落とすもの:

- OpenAPI 生成物の未更新
- 型エラー
- lint warning
- architecture 違反
- custom rule 違反
- unit test failure
- build failure

## Local Hook

lefthook でローカルにも品質ゲートを置く。

pre-commit:

```txt
npm run lint
```

pre-push:

```txt
npm run typecheck
npm run test
```

重い処理は CI 必須にし、ローカルでは必要に応じて実行する。
