export type LoginViewModel = {
  email: string;
  password: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  canSubmit: boolean;
};
