import type { AuthenticatedUser } from "../services/api/auth.service";
import type { Navigate } from "../routes/navigation";
import { AuthForm } from "../components/auth/AuthForm";

interface SigninPageProps {
  navigate: Navigate;
  onAuthenticated: (user: AuthenticatedUser) => void;
}

export function SigninPage(props: SigninPageProps) {
  return <AuthForm {...props} mode="signin" />;
}
