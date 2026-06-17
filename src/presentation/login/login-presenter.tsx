"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/src/di/auth/auth-use-cases";
import { toLoginCommand } from "@/src/presentation/login/mapper/login-command-mapper";
import { presentLoginError } from "@/src/presentation/login/error/login-error-presenter";
import type { LoginViewModel } from "@/src/presentation/login/view-model/login-view-model";
import { LoginView } from "@/src/view/login/login-view";

type LoginFormState = {
  email: string;
  password: string;
  isSubmitting: boolean;
  errorMessage: string | null;
};

const initialState: LoginFormState = {
  email: "",
  password: "",
  isSubmitting: false,
  errorMessage: null,
};

export function LoginPresenter() {
  const router = useRouter();
  const [state, setState] = useState<LoginFormState>(initialState);

  const viewModel = useMemo<LoginViewModel>(
    () => ({
      ...state,
      canSubmit:
        state.email.trim().length > 0 &&
        state.password.length > 0 &&
        !state.isSubmitting,
    }),
    [state],
  );

  async function handleSubmit() {
    if (!viewModel.canSubmit) {
      return;
    }

    setState((current) => ({
      ...current,
      isSubmitting: true,
      errorMessage: null,
    }));

    try {
      await login(toLoginCommand(viewModel));
      router.push("/");
    } catch (error) {
      setState((current) => ({
        ...current,
        isSubmitting: false,
        errorMessage: presentLoginError(error),
      }));
    }
  }

  return (
    <LoginView
      viewModel={viewModel}
      onEmailChange={(email) => {
        setState((current) => ({ ...current, email, errorMessage: null }));
      }}
      onPasswordChange={(password) => {
        setState((current) => ({ ...current, password, errorMessage: null }));
      }}
      onSubmit={handleSubmit}
    />
  );
}
