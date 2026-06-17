# Frontend Test Strategy

このドキュメントは、Able-T フロントエンドで採用するテスト戦略の設計案です。

方針:

- TDD の思想は採用する。
- ただし `red -> green -> refactor` という手順名にはこだわらない。
- 実装前に「この仕様であることを期待する」テストを書き、仕様を固定する。
- 1 関数単位だけでなく、1 feature / 1 use case 単位でテストする。
- 機械的に検証できる仕様はテストに寄せ、レビューでは設計判断に集中する。
- Gherkin は最初から自動化しすぎず、ストーリー仕様の記述として軽く使う。

## 結論

最初に採用するテストの軸:

```txt
Specification-first test
  実装前に期待仕様をテストとして固定する

Use case test
  application layer の振る舞いを feature 単位で検証する

Domain test
  entity / value object / domain rule の不変条件を検証する

Mapper test
  Laravel API response -> domain model の翻訳を検証する

Presenter test
  domain model -> ViewModel の翻訳と UI state 遷移を検証する

Custom rule test
  ESLint custom rule の検出仕様を固定する

Gherkin story
  ユーザー視点の仕様を Given/When/Then で記述する
```

最初から E2E や browser automation を必須にはしない。必要になった時点で Playwright を追加検討する。

## Specification-first Testing

このプロジェクトでは、実装前に期待仕様をテストで固定する。

例:

```txt
正の整数配列を合計する機能

期待仕様:
  配列の要素数は 1 以上
  それぞれの要素は正の整数
  合計結果は必ず正の整数
  不正な入力は拒否される
```

テストは「実装の都合」ではなく「満たすべき仕様」を表現する。

```ts
import { describe, expect, it } from "vitest";

describe("sumPositiveIntegers", () => {
  it("returns a positive integer when all inputs are positive integers", () => {
    expect(sumPositiveIntegers([1, 2, 3])).toBe(6);
  });

  it("rejects an empty array", () => {
    expect(() => sumPositiveIntegers([])).toThrow();
  });

  it("rejects zero", () => {
    expect(() => sumPositiveIntegers([1, 0, 3])).toThrow();
  });

  it("rejects negative integers", () => {
    expect(() => sumPositiveIntegers([1, -2, 3])).toThrow();
  });

  it("rejects non-integers", () => {
    expect(() => sumPositiveIntegers([1, 1.5, 3])).toThrow();
  });
});
```

これは `red -> green -> refactor` を儀式として行うためではなく、先に仕様を固定して実装の自由度を安全に保つために行う。

## Test Target by Layer

### Domain

対象:

- Entity
- Value Object
- domain service
- business invariant

検証すること:

- 不正な値を生成できない。
- 正しい値を生成できる。
- domain rule が期待通りに働く。
- 境界値が壊れない。

例:

```txt
UserName
  空文字を拒否する
  50 文字を超える値を拒否する
  前後の空白を正規化する
```

### Application

対象:

- use case
- command/query
- port 経由の処理

検証すること:

- use case が期待する port を呼ぶ。
- domain rule に従って結果を返す。
- 不正な command を拒否する。
- infrastructure の具象実装に依存しない。

application test では repository を fake / stub にする。

### Infrastructure

対象:

- Laravel API adapter
- API response mapper
- storage adapter

検証すること:

- Laravel API response を domain model に変換できる。
- 欠損値や不正値を適切に拒否する。
- API error を application が扱える error に変換する。

`openapi-fetch` 自体の挙動はテストしない。テストするのは、このプロジェクトの adapter と mapper の仕様です。

### Composition

対象:

- use case factory と infrastructure implementation の組み立て
- runtime context に応じた adapter 選択

検証すること:

- 原則として、composition 自体に複雑なロジックを置かない。
- composition の単体テストは必須にしない。
- application / infrastructure の振る舞い自体は、それぞれの layer test で検証する。

ただし、以下の場合は composition test を追加する。

- feature flag により実装を切り替える。
- static export / Node.js server で実装を切り替える。
- mock / real adapter の選択条件がある。
- env により repository 実装が変わる。

### Presentation

対象:

- presenter hook
- ViewModel mapper
- form draft から command への変換
- loading / error / success state

検証すること:

- Entity / Value Object を ViewModel に変換できる。
- ViewModel が View に必要な scalar / simple structure になっている。
- application error を表示用 message に変換できる。
- UI event が正しい command/query に変換される。

### View

対象:

- pure UI component

検証すること:

- props に応じて表示が変わる。
- event callback が呼ばれる。
- domain / infrastructure に依存していない。

View の依存違反は ESLint で検出する。View の unit test で architecture を検証しない。

### Custom ESLint Rules

対象:

- local ESLint plugin
- architecture custom rule

検証すること:

- 違反コードを検出する。
- 許可コードを誤検出しない。
- message が具体的で修正しやすい。

例:

```txt
ableto/no-view-import-domain
  view から domain import があると失敗する
  presentation の ViewModel type import は許可する
```

## Test Size

テストは以下の粒度で考える。

```txt
Small
  domain / mapper / pure function / custom rule

Medium
  application use case / presenter

Large
  feature story / browser flow
```

最初に厚くするのは Small と Medium。

Large は、仕様が固まり、主要導線が増えてから Playwright 等で追加する。

## Feature Test

このプロジェクトでは、1 feature 単位のテストを重視する。

例:

```txt
ユーザープロフィールを表示する

期待仕様:
  ログイン中のユーザーを取得する
  Laravel API response を User Entity に変換する
  User Entity を UserProfileViewModel に変換する
  View は displayName と statusLabel を表示する
  API error の場合は再試行できる error state を表示する
```

この場合、すべてを browser test にする必要はない。

分割例:

```txt
infrastructure mapper test
  API response -> User

application use case test
  UserRepository.findMe を呼ぶ

presentation test
  User -> UserProfileViewModel
  error -> errorMessage

view test
  ViewModel -> rendering
```

これにより、1 feature の仕様を小さいテストで固定できる。

## Gherkin

Gherkin は有用。ただし最初から自動化前提にすると重くなりやすい。

このプロジェクトでは、最初は Gherkin を「ユーザー視点の仕様メモ」として使う。

例:

```gherkin
Feature: ユーザープロフィール表示

  Scenario: ログイン中のユーザーが自分のプロフィールを確認できる
    Given ログイン中のユーザーが存在する
    And Laravel API がユーザー情報を返す
    When ユーザーがプロフィール画面を開く
    Then ユーザー名が表示される
    And アカウント状態が表示される

  Scenario: ユーザー情報の取得に失敗した場合
    Given ログイン中のユーザーが存在する
    And Laravel API がエラーを返す
    When ユーザーがプロフィール画面を開く
    Then エラーメッセージが表示される
    And 再試行できる
```

Gherkin の役割:

- feature の期待仕様を人間が読める形で固定する。
- 実装前に仕様の抜けを発見する。
- application / presentation / view test に落とし込む元ネタにする。
- 将来 E2E 化する候補を残す。

最初から Cucumber などで自動化しない。

理由:

- step definition の保守コストが高い。
- UI 変更に弱くなりやすい。
- 小さい unit / use case test より失敗原因の特定が遅い。
- 開発初期は仕様変更が多く、Gherkin automation が負債化しやすい。

Gherkin を自動化する条件:

- 主要 user journey が安定している。
- 失敗時に誰が直すか決まっている。
- Playwright 等の E2E 基盤が整っている。
- unit / use case test では守れない価値がある。

## Test File Placement

テストは対象ファイルの近くに置く。

```txt
src/domain/user/user-name.ts
src/domain/user/user-name.test.ts

src/application/user/get-current-user.ts
src/application/user/get-current-user.test.ts

src/infrastructure/laravel/mappers/user-mapper.ts
src/infrastructure/laravel/mappers/user-mapper.test.ts

src/presentation/user/user-profile-presenter.ts
src/presentation/user/user-profile-presenter.test.ts

src/view/user/user-profile-view.tsx
src/view/user/user-profile-view.test.tsx
```

Gherkin は feature 単位で置く。

```txt
docs/plan/testing/features/user-profile.feature
```

または実装に近づける場合:

```txt
src/features/user-profile/user-profile.feature
```

最初は docs 配下に置き、E2E 自動化する段階で実装配下への移動を検討する。

## Review Policy

レビューでは、人間が見るものと機械が見るものを分ける。

機械で見る:

- layer import 違反
- `fetch` 直呼び
- `openapi-fetch` の利用場所
- generated API type の利用場所
- `process.env` 直読み
- `any`
- custom rule 違反
- unit test failure

人間が見る:

- 仕様が十分にテストされているか
- ViewModel が UI 都合を適切に表現しているか
- domain rule が presentation に漏れていないか
- use case の責務が自然か
- Gherkin とテストが矛盾していないか

## Practical Rule

新しい feature を作るときは、先に次を書く。

1. Gherkin 風の期待仕様メモ
2. application / domain / presentation の仕様テスト
3. 実装
4. 必要なら view test
5. 必要なら Gherkin を docs に残す

必須なのは 2 と 3。  
Gherkin は、仕様の会話が必要な feature で使う。
