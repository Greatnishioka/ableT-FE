# Frontend DDD / MVVM Architecture Proposal

このドキュメントは、Able-T フロントエンドに DDD 的な依存方向、MVVM 的な ViewModel、Laravel API への腐敗防止層を導入するための設計案です。

目的:

- View を domain model から切り離す。
- ランタイムライブラリを腐敗防止層に閉じ込める。
- Laravel API との通信を infrastructure に隔離する。
- static export と Node.js server の両方で成立する構成にする。
- ESLint custom rule でアーキテクチャ違反を検出できる形にする。

## 結論

推奨ディレクトリ:

```txt
src/
  app/
  view/
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

実行時の呼び出しイメージ:

```txt
view
  -> presentation
    -> application
      -> infrastructure
        -> Laravel API
```

コード上の依存方向:

```txt
app
  -> presentation
  -> view
  -> infrastructure

presentation
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

domain
  -> shared の一部のみ

shared
  -> 他 layer に依存しない
```

重要なのは、実行時には application から infrastructure が呼ばれても、コード上は application が infrastructure の具象実装を import しないことです。application は port/interface だけを定義し、infrastructure がそれを実装します。

## Layer Responsibilities

| layer | 責務 |
| --- | --- |
| `app` | Next.js route, layout, composition root |
| `view` | JSX, pure UI component, props rendering, user event callback |
| `presentation` | presenter hook, ViewModel 生成, UI state, event adapter |
| `application` | use case, command/query, port/interface |
| `domain` | entity, value object, domain service, domain rule |
| `infrastructure` | Laravel API adapter, storage adapter, external runtime library adapter |
| `shared` | config, generic utility, generated API schema, primitive wrapper |

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
import type { UserProfileViewModel } from "@/src/presentation/user/user-profile-view-model";

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
// src/presentation/user/user-profile-view-model.ts
export type UserProfileViewModel = {
  id: string;
  displayName: string;
  statusLabel: string;
  canEdit: boolean;
};
```

```ts
// src/presentation/user/user-profile-presenter.ts
import { useCallback, useEffect, useState } from "react";
import type { User } from "@/src/domain/user/user";
import { getCurrentUser } from "@/src/presentation/user/user-profile-use-case";
import type { UserProfileViewModel } from "./user-profile-view-model";

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

`application` は use case と port/interface を持つ。

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
- Laravel API response shape
- browser API

例:

```ts
// src/application/ports/user-repository.ts
import type { User } from "@/src/domain/user/user";

export interface UserRepository {
  findMe(): Promise<User>;
}
```

```ts
// src/application/user/get-current-user.ts
import type { UserRepository } from "@/src/application/ports/user-repository";

export function createGetCurrentUser(userRepository: UserRepository) {
  return async function getCurrentUser() {
    return userRepository.findMe();
  };
}
```

## Domain

`domain` は業務ルールを持つ。

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

このプロジェクトでは、主な infrastructure は Laravel API adapter です。

infrastructure が持ってよいもの:

- `openapi-fetch`
- generated OpenAPI type
- Laravel API response mapping
- browser storage adapter
- external runtime library adapter

infrastructure が持たないもの:

- JSX
- ViewModel
- React state
- UI event

例:

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

```ts
// src/infrastructure/laravel/mappers/user-mapper.ts
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

## Composition Root

具象 implementation の組み立ては composition root に寄せる。

候補:

- `src/app/**`
- `src/presentation/**/use-case.ts`
- `src/shared/composition/**`

例:

```ts
// src/presentation/user/user-profile-use-case.ts
import { createGetCurrentUser } from "@/src/application/user/get-current-user";
import { laravelUserRepository } from "@/src/infrastructure/laravel/user-repository";

export const getCurrentUser = createGetCurrentUser(laravelUserRepository);
```

小規模なうちは presentation 近くで組み立ててよい。規模が大きくなったら `shared/composition` などに分離する。

## Anti-Corruption Layer

外部ライブラリや外部システムの型を、アプリ全体に広げない。

閉じ込めるもの:

- `openapi-fetch`
- generated OpenAPI response type
- Laravel API response shape
- browser storage API
- runtime validation library の具体 API

境界:

```txt
Laravel API response
  -> infrastructure mapper
    -> domain entity / value object
      -> presentation mapper
        -> ViewModel
          -> view props
```

この流れにすると、Laravel API の response shape や API client library を交換しても、影響範囲を infrastructure に閉じられる。

## Static Export / Node.js Server

この設計は static export と Node.js server の両方で使える。

### Static Export

static export では browser から Laravel API に直接通信する。

避けるもの:

- Server Actions
- request に依存する Route Handlers
- `cookies()`
- `headers()`
- rewrites / redirects / headers config
- ISR
- default loader の `next/image`

認証、CORS、CSRF、Cookie、token 管理は Laravel API 側の設計に依存する。

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

## Practical Rules

最初からすべてを厳密にしすぎない。

必ず守る:

- View は Entity / Value Object を受け取らない。
- View は ViewModel を props で受け取る。
- API client は infrastructure に閉じ込める。
- domain は React / Next.js を知らない。
- application は infrastructure 実装を知らない。

緩く始めてよい:

- 小さい画面では presenter と ViewModel を薄くする。
- domain rule がない単純なデータは無理に Entity 化しない。
- composition root は最初は presentation 近くでもよい。
- 複雑になった use case から application に切り出す。
