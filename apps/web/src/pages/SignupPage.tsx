import type { AuthenticatedUser } from "../services/api/auth.service";
import type { Navigate } from "../routes/navigation";
import { AuthForm } from "../components/auth/AuthForm";

interface SignupPageProps {
  navigate: Navigate;
  onAuthenticated: (user: AuthenticatedUser) => void;
}

export function SignupPage(props: SignupPageProps) {
  return <AuthForm {...props} mode="signup" />;
}
