# Frontend DDD / MVVM Architecture Proposal

このドキュメントは、Able-T フロントエンドに DDD 的な依存方向、MVVM 的な ViewModel、Backend API への腐敗防止層を導入するための設計案です。

目的:

- View を domain model から切り離す。
- ランタイムライブラリを腐敗防止層に閉じ込める。
- Backend API との通信を infrastructure に隔離する。
- static export と Node.js server の両方で成立する構成にする。
- ESLint custom rule でアーキテクチャ違反を検出できる形にする。

## 結論

推奨ディレクトリ:

```txt
app/
  login/
    page.tsx

src/
  view/
  presentation/
  application/
  domain/
  infrastructure/
    api/
  di/
  shared/
    api/
    config/
    lib/
```

実行時の呼び出しイメージ:

```txt
view
  -> presentation
    -> application
      -> infrastructure
        -> Backend API
```

コード上の依存方向:

```txt
app
  -> presentation
  -> view
  -> di

presentation
  -> di
  -> view
  -> application
  -> domain
  -> shared

view
  -> presentation の ViewModel type
  -> shared

application
  -> domain
  -> shared

infrastructure
  -> application ports
  -> domain
  -> shared/api

di
  -> application
  -> infrastructure

domain
  -> shared の一部のみ

shared
  -> 他 layer に依存しない
```

重要なのは、実行時には application から infrastructure が呼ばれても、コード上は application が infrastructure の具象実装を import しないことです。application は port/interface だけを定義し、infrastructure がそれを実装します。

開発時は、画面単位で最初からこの layer set を用意することを標準にする。

理由:

- ファイル単位の責務が小さくなり、レビュー観点を絞りやすい。
- 差分が `view`, `presentation`, `application`, `infrastructure` のどこに属するか判断しやすい。
- 後から分割するより、最初から置き場を固定した方がディレクトリ構成の一貫性を保ちやすい。
- アーキテクチャ違反を ESLint で機械的に判定しやすい。

ただし、すべての layer に複雑な実装を入れる必要はない。単純な画面では各 layer を薄く保ち、責務の置き場だけを揃える。

## Lightweight Layer Criteria

標準では layer set を揃える。ただし、単純な read-only 画面では domain model を無理に作らない。

domain rule が存在しない単純な read-only 画面では、以下のように始めてよい。

```txt
Backend API response
  -> infrastructure mapper
    -> ViewModel
      -> view
```

この場合、`application` は薄い query function、`domain` は未作成でもよい。重要なのは、API response をそのまま View に流さず、ViewModel へ翻訳することです。

薄くしてよい条件:

- read-only 画面である。
- UI 操作上の不正状態が少ない。
- 複数画面で共有される判断がない。
- API response を表示用に整形するだけで足りる。
- domain invariant と呼べるルールがない。

domain / application を明確に分離する条件:

- 業務ルールが 2 つ以上ある。
- 複数画面で同じ判断を使う。
- 不正状態を防ぐ必要がある。
- API response をそのまま表示すると危険。
- form input から command への検証や変換がある。
- 権限、状態遷移、金額、日付範囲などの判断がある。

真面目に全てを重く作る必要はない。最初から置き場は揃えつつ、単純な画面では薄い pass-through を許可する。

## Layer Responsibilities

| layer | 責務 |
| --- | --- |
| `app` | Next.js route, layout |
| `view` | JSX, pure UI component, props rendering, user event callback |
| `presentation` | presenter hook, ViewModel 生成, UI state, event adapter |
| `application` | use case, command/query, port/interface |
| `domain` | entity, value object, domain service, domain rule |
| `infrastructure` | API adapter, storage adapter, external runtime library adapter |
| `di` | application port と infrastructure 実装の組み立て |
| `shared` | config, generic utility, generated API schema, primitive wrapper |

## Boundary Clarification

責務が膨らみやすい境界を明確にする。

### Presentation

`presentation` は View と application の接続点であり、UI state と event adapter を担当する。ただし、presenter hook に変換処理や表示判断を詰め込みすぎない。

以下は必要に応じて分離する。

- ViewModel mapper
- command mapper
- error presenter
- form draft mapper

presenter hook は、use case 呼び出しと UI state 遷移を中心に保つ。

### Frontend Domain

frontend domain は backend domain の複製ではない。最終的な業務判断は backend が保証する。

frontend domain は、UI 上で扱う業務概念を安全に表現し、画面間で重複する判断や不正状態を減らすために使う。

単純な表示だけのデータは無理に Entity / Value Object にしない。一方で、不正状態を防ぎたい値や複数画面で共有される概念は domain model として表現する。

### Zod

Zod は信用境界で runtime validation が必要な場合に使う。OpenAPI で管理されている Backend API response は、生成型と infrastructure mapper を基本とする。

Zod を domain model、mapper、TypeScript type の代替として乱用しない。特に OpenAPI schema、generated TypeScript type、Zod schema の三重管理は避ける。

## View

`view` は表示に徹する。

View が持ってよいもの:

- JSX
- layout
- CSS class
- props rendering
- click / input などの event callback 呼び出し
- ViewModel type への依存

View が持たないもの:

- domain entity
- value object
- use case 呼び出し
- API client
- `fetch`
- `openapi-fetch`
- env 参照
- 複雑な業務判断

例:

```tsx
// src/view/user/user-profile-view.tsx
import type { UserProfileViewModel } from "@/src/presentation/user-profile/view-model/user-profile-view-model";

type Props = {
  user: UserProfileViewModel | null;
  isLoading: boolean;
  errorMessage: string | null;
  onReload(): void;
};

export function UserProfileView({
  user,
  isLoading,
  errorMessage,
  onReload,
}: Props) {
  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (errorMessage) {
    return (
      <section>
        <p>{errorMessage}</p>
        <button type="button" onClick={onReload}>
          Retry
        </button>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <section>
      <h1>{user.displayName}</h1>
      <p>{user.statusLabel}</p>
      <button type="button" disabled={!user.canEdit}>
        Edit
      </button>
    </section>
  );
}
```

## Presentation

`presentation` は View と application の間に立つ。

責務:

- React state を持つ。
- Entity / Value Object を ViewModel に変換する。
- form draft / input model を管理する。
- View event を application command/query に変換する。
- application error を画面表示用 message に変換する。

```ts
// src/presentation/user-profile/view-model/user-profile-view-model.ts
export type UserProfileViewModel = {
  id: string;
  displayName: string;
  statusLabel: string;
  canEdit: boolean;
};
```

```ts
// src/presentation/user-profile/user-profile-presenter.ts
import { useCallback, useEffect, useState } from "react";
import type { User } from "@/src/domain/user/user";
import { getCurrentUser } from "@/src/di/user/user-use-cases";
import type { UserProfileViewModel } from "./view-model/user-profile-view-model";

type State = {
  user: UserProfileViewModel | null;
  isLoading: boolean;
  errorMessage: string | null;
};

export function useUserProfilePresenter() {
  const [state, setState] = useState<State>({
    user: null,
    isLoading: true,
    errorMessage: null,
  });

  const load = useCallback(async () => {
    setState((current) => ({
      ...current,
      isLoading: true,
      errorMessage: null,
    }));

    try {
      const user = await getCurrentUser();

      setState({
        user: toViewModel(user),
        isLoading: false,
        errorMessage: null,
      });
    } catch {
      setState({
        user: null,
        isLoading: false,
        errorMessage: "ユーザー情報を取得できませんでした。",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    onReload: load,
  };
}

function toViewModel(user: User): UserProfileViewModel {
  return {
    id: user.id.value,
    displayName: user.name.value,
    statusLabel: user.status.label,
    canEdit: user.permissions.canEditProfile,
  };
}
```

`presentation` は domain を読んで ViewModel に翻訳してよい。ただし、domain rule 自体を presentation に移さない。

### Presenter Split Criteria

`presentation` は太りやすい layer です。以下が 1 ファイルに集まり始めたら分割する。

```txt
useState / useEffect
API 呼び出しの起点
error 変換
ViewModel 変換
input 変換
権限表示判定
loading 制御
```

小さいうちは 1 presenter file でよい。肥大化したら、責務ごとに分ける。

```txt
src/presentation/user-profile/
  user-profile-presenter.ts
  view-model/
    user-profile-view-model.ts
  mapper/
    user-profile-view-model-mapper.ts
    user-profile-command-mapper.ts
  error/
    user-profile-error-presenter.ts
```

分割基準:

- ViewModel mapping が 20 行を超える。
- error 変換が 2 種類以上ある。
- form draft から command への変換がある。
- 権限や状態による表示判断が 2 つ以上ある。
- presenter test が setup だらけになっている。
- 同じ mapping / error 変換を別画面でも使う。

Presenter が新しい神クラスにならないように、`presentation` 内でも mapper、error presenter、command mapper を切り出す。

## ViewModel

ViewModel は表示のためのモデルです。

Entity を ViewModel に翻訳する理由:

- View を domain model の変更から守る。
- `statusLabel`, `canEdit`, `errorMessage` などの表示都合を domain に混ぜない。
- Value Object や domain behavior を View に漏らさない。
- 入力途中の不正な値を domain model に入れない。

ViewModel は基本的に scalar または表示用の単純な構造にする。

```ts
// domain
export type User = {
  id: UserId;
  name: UserName;
  status: UserStatus;
  permissions: UserPermissions;
};
```

```ts
// presentation
export type UserProfileViewModel = {
  id: string;
  displayName: string;
  statusLabel: string;
  canEdit: boolean;
};
```

Value Object をそのまま View に渡さない。View は `UserName` の validation rule や `UserStatus` の domain 表現を知る必要がない。

## FormDraft / InputModel / Command

フォーム入力中の値は domain entity ではない。

```txt
FormDraft
  入力途中の不完全な UI state

InputModel
  View に近い入力モデル

Command
  use case に渡す検証済み入力

Entity / Value Object
  domain invariant を満たす業務モデル
```

例:

```ts
// presentation
export type UserProfileFormDraft = {
  displayName: string;
};
```

```ts
// application
export type UpdateUserProfileCommand = {
  userId: string;
  displayName: string;
};
```

`FormDraft` には空文字や不正な文字列が入り得る。Value Object は原則として正しい値だけを表すため、入力途中の state に Value Object を使わない。

## Application

`application` は use case factory と port/interface を持つ。

application が知ってよいもの:

- domain entity
- value object
- command/query
- repository port
- application error

application が知らないもの:

- React
- Next.js
- `fetch`
- `openapi-fetch`
- Backend API response shape
- browser API

例:

```ts
// src/application/user/ports/user-repository.ts
import type { User } from "@/src/domain/user/user";

export interface UserRepository {
  findMe(): Promise<User>;
}
```

```ts
// src/application/user/use-case-factory/create-get-current-user-use-case.ts
import type { UserRepository } from "@/src/application/user/ports/user-repository";

export function createGetCurrentUserUseCase(userRepository: UserRepository) {
  return async function getCurrentUser() {
    return userRepository.findMe();
  };
}
```

配置:

```txt
src/application/{context}/
  ports/
    {resource}-repository.ts
  use-case-factory/
    create-{action}-{resource}-use-case.ts
    create-{context}-use-cases.ts
  error/
    {context}-errors.ts
```

`create-{action}-{resource}-use-case.ts` は単体 use case の factory を置く。`create-{context}-use-cases.ts` は複数 use case をまとめて生成する場合にだけ使う。

## Domain

`domain` は業務ルールを持つ。

フロントエンド domain は、バックエンド domain の完全な複製ではない。

主な目的:

- API response をそのまま UI に流さない。
- UI 操作上の不正状態を防ぐ。
- 複数画面で共有される表示・操作ルールを集約する。
- ViewModel や presenter に業務判断が散らばることを防ぐ。
- バックエンドの business rule を勝手に再実装しすぎない。

フロントエンド domain に持ち込まないもの:

- Backendでしか保証できない最終的な業務制約。
- DB 整合性に依存する判断。
- 権限の最終判定。
- 決済、契約、申請承認などの authoritative な状態変更ルール。

フロントエンド domain は、UI を安全に動かすための model です。バックエンドと同じ business rule を二重実装する場所ではない。最終的な正しさは Backend API 側で保証し、フロントエンドでは表示、入力、操作の不正状態を早めに防ぐ。

domain が持ってよいもの:

- Entity
- Value Object
- domain service
- domain error
- business invariant

domain が持たないもの:

- React
- Next.js
- CSS
- API response type
- localStorage
- `fetch`
- `openapi-fetch`
- Zod schema の乱用

Value Object は「正しい値」を表す。

```ts
export class UserName {
  private constructor(readonly value: string) {}

  static create(value: string): UserName {
    const normalized = value.trim();

    if (normalized.length === 0) {
      throw new Error("User name is required.");
    }

    if (normalized.length > 50) {
      throw new Error("User name must be 50 characters or less.");
    }

    return new UserName(normalized);
  }
}
```

## Infrastructure

`infrastructure` は external world と application port を接続する。

このプロジェクトでは、主な infrastructure は Backend API adapter です。

infrastructure が持ってよいもの:

- `openapi-fetch`
- generated OpenAPI type
- Backend API response mapping
- browser storage adapter
- external runtime library adapter

infrastructure が持たないもの:

- JSX
- ViewModel
- React state
- UI event

例:

```ts
// src/infrastructure/api/user/user-api-adapter.ts
import type { UserRepository } from "@/src/application/user/ports/user-repository";
import { apiClient } from "@/src/shared/api/client";
import { toUser } from "./mappers/user-mapper";

export const userApiAdapter: UserRepository = {
  async findMe() {
    const { data, error } = await apiClient.GET("/api/me");

    if (error) {
      throw error;
    }

    return toUser(data);
  },
};
```

```ts
// src/infrastructure/api/user/mappers/user-mapper.ts
import { UserName } from "@/src/domain/user/user-name";
import type { User } from "@/src/domain/user/user";
import type { components } from "@/src/shared/api/schema";

type UserResponse = components["schemas"]["User"];

export function toUser(response: UserResponse): User {
  return {
    id: { value: String(response.id) },
    name: UserName.create(response.name),
    status: {
      value: response.status,
      label: response.status === "active" ? "有効" : "無効",
    },
    permissions: {
      canEditProfile: Boolean(response.can_edit_profile),
    },
  };
}
```

## DI Providers

具象 implementation の組み立ては DI provider に寄せる。

候補:

- `src/di/**`

例:

```ts
// src/di/user/user-use-cases.ts
import { createGetCurrentUserUseCase } from "@/src/application/user/use-case-factory/create-get-current-user-use-case";
import { userApiAdapter } from "@/src/infrastructure/api/user/user-api-adapter";

export const getCurrentUser = createGetCurrentUserUseCase(userApiAdapter);
```

`presentation` は `infrastructure` を直接 import しない。DI provider だけが infrastructure の具象実装を知る。

AI に実装させる場合は例外を作らない。小規模な feature でも di は `src/di` に置く。

`shared` は他 layer に依存しない純粋な shared layer として保つ。DI provider は application と infrastructure に依存するため、`shared` 配下には置かない。

`presentation` は di から組み立て済み use case を import してよい。ただし、di を application use case の代替にしない。

di に置いてよいもの:

- application use case factory と infrastructure implementation の組み立て
- runtime context に応じた adapter 選択
- static export / Node.js server など実行環境ごとの di

di に置かないもの:

- business logic
- ViewModel mapping
- API response mapping
- validation
- API client の直接呼び出し

## Anti-Corruption Layer

外部ライブラリや外部システムの型を、アプリ全体に広げない。

閉じ込めるもの:

- `openapi-fetch`
- generated OpenAPI response type
- Backend API response shape
- browser storage API
- runtime validation library の具体 API

境界:

```txt
Backend API response
  -> infrastructure mapper
    -> domain entity / value object
      -> presentation mapper
        -> ViewModel
          -> view props
```

この流れにすると、Backend API の response shape や API client library を交換しても、影響範囲を infrastructure に閉じられる。

## Static Export / Node.js Server

この設計は static export と Node.js server の両方で使える。

### Static Export

static export では browser から Backend API に直接通信する。

避けるもの:

- Server Actions
- request に依存する Route Handlers
- `cookies()`
- `headers()`
- rewrites / redirects / headers config
- ISR
- default loader の `next/image`

認証、CORS、CSRF、Cookie、token 管理は Backend API 側の設計に依存する。

### Node.js Server

Node.js server では Next.js を BFF 的に使える。

使えるもの:

- server-only env
- httpOnly cookie
- request-aware server logic
- Route Handlers
- Server Components の runtime data fetching

ただし、static export との両対応を重視する場合は、Node.js server 専用機能を application/domain に漏らさない。

## ESLint Protection

守るべきルール:

```txt
view
  cannot import domain
  cannot import infrastructure
  cannot import openapi-fetch

presentation
  can import di
  can import view
  can import application
  can import domain for mapping
  cannot import openapi-fetch

application
  can import domain
  cannot import presentation
  cannot import infrastructure
  cannot import react / next

domain
  cannot import react / next
  cannot import infrastructure
  cannot import openapi-fetch
  cannot import generated API schema

infrastructure
  can import application ports
  can import domain
  can import shared/api
  cannot import view
  cannot import presentation

shared
  cannot import app / view / presentation / application / domain / infrastructure

di
  can import application
  can import infrastructure
  cannot import view
  cannot import presentation
```

custom rule 候補:

| rule | 目的 |
| --- | --- |
| `ableto/no-direct-api-fetch` | `fetch` の直呼びを infrastructure/shared api 以外で禁止 |
| `ableto/no-openapi-fetch-outside-infra` | `openapi-fetch` の import を `shared/api` または `infrastructure` に限定 |
| `ableto/no-domain-import-react` | `domain` 層が React / Next.js に依存することを禁止 |
| `ableto/no-view-import-domain` | `view` が domain entity/value object に依存することを禁止 |
| `ableto/no-generated-api-type-outside-infra` | generated OpenAPI type の利用を infrastructure/shared api に限定 |
| `ableto/no-process-env-outside-config` | `process.env` の直読みを `shared/config/env.ts` に限定 |

依存方向の保護には `eslint-plugin-boundaries` を使う。

`eslint-plugin-boundaries` でまず守るもの:

- layer 間 import の許可/禁止
- `view` から `domain` / `infrastructure` への import 禁止
- `application` から `presentation` / `infrastructure` への import 禁止
- `domain` から `react` / `next` / `infrastructure` への import 禁止
- `shared` から他 layer への import 禁止
- `di` 以外から `infrastructure` 具象実装への import 禁止

`eslint-plugin-boundaries` で表現しづらいものは、local ESLint plugin の custom rule として追加する。

custom rule に寄せるもの:

- `fetch()` の直呼び検出
- `openapi-fetch` の import 場所制限
- generated OpenAPI type の利用場所制限
- `"use client"` の利用場所制限
- `process.env` の直読み制限
- Entity / Value Object を View props に出すことの検出

より大きな依存グラフ検査や循環依存の可視化が必要になった場合は、`dependency-cruiser` を CI 専用で追加検討する。最初の導入では `eslint-plugin-boundaries` と local ESLint plugin を優先する。

## Practical Rules

最初から layer set は揃える。ただし、各 layer の実装量は画面の複雑さに合わせる。

必ず守る:

- View は Entity / Value Object を受け取らない。
- View は ViewModel を props で受け取る。
- API client は infrastructure に閉じ込める。
- domain は React / Next.js を知らない。
- application は infrastructure 実装を知らない。

緩く始めてよい:

- 小さい画面では presenter と ViewModel を薄くする。
- domain rule がない単純なデータは無理に Entity 化しない。
- application use case が薄い pass-through でも、置き場は application に揃える。
- DI provider は `src/di` に置く。
