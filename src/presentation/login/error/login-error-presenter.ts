import { AuthenticationFailedError } from "@/src/application/auth/error/auth-errors";

export function presentLoginError(error: unknown): string {
  if (error instanceof AuthenticationFailedError) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "ログインできませんでした。時間をおいて再度お試しください。";
}
