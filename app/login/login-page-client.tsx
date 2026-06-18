"use client";

import { useLoginPresenter } from "@/src/presentation/login/login-presenter";
import { LoginView } from "@/src/view/login/login-view";

export function LoginPageClient() {
  const loginViewProps = useLoginPresenter();

  return <LoginView {...loginViewProps} />;
}
