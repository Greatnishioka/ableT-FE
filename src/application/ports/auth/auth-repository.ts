export type LoginCommand = {
  email: string;
  password: string;
};

export interface AuthRepository {
  login(command: LoginCommand): Promise<void>;
}