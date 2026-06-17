import type { FormEvent } from "react";
import type { LoginViewModel } from "@/src/presentation/login/view-model/login-view-model";

type LoginViewProps = {
  viewModel: LoginViewModel;
  onEmailChange(email: string): void;
  onPasswordChange(password: string): void;
  onSubmit(): void;
};

export function LoginView({
  viewModel,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginViewProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-8">
          <p className="text-sm font-medium text-teal-700">Able-T</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            ログイン
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            登録済みのメールアドレスとパスワードでログインしてください。
          </p>
        </div>

        <form
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div className="space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                メールアドレス
              </span>
              <input
                className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                type="email"
                autoComplete="email"
                value={viewModel.email}
                onChange={(event) => onEmailChange(event.currentTarget.value)}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                パスワード
              </span>
              <input
                className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                type="password"
                autoComplete="current-password"
                value={viewModel.password}
                onChange={(event) =>
                  onPasswordChange(event.currentTarget.value)
                }
              />
            </label>
          </div>

          {viewModel.errorMessage ? (
            <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {viewModel.errorMessage}
            </p>
          ) : null}

          <button
            className="mt-6 flex h-11 w-full items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            type="submit"
            disabled={!viewModel.canSubmit}
          >
            {viewModel.isSubmitting ? "ログイン中..." : "ログイン"}
          </button>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            デモ: demo@example.com / password123
          </p>
        </form>
      </section>
    </main>
  );
}
