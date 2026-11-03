import { useState, type FormEvent } from "react";
import { login, signup } from "../../services/api/auth.service";
import type { AuthenticatedUser } from "../../services/api/auth.service";
import type { Navigate } from "../../routes/navigation";
import { FigmaIcon } from "../ui/FigmaIcon";
import { AuthPageShell } from "../layout/AuthPageShell";

interface AuthFormProps {
  mode: "signup" | "signin";
  navigate: Navigate;
  onAuthenticated: (user: AuthenticatedUser) => void;
}

const countryOptions = [
  "United States",
  "United Kingdom",
  "India",
  "Australia",
  "Canada",
  "Singapore",
];

export function AuthForm({
  mode,
  navigate,
  onAuthenticated,
}: AuthFormProps) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [remember, setRemember] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isSignup = mode === "signup";

  function validate(): string | null {
    if (isSignup && name.trim().length < 2) {
      return "Enter your name using at least 2 characters.";
    }
    if (isSignup && name.trim().length > 50) {
      return "Name must not exceed 50 characters.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "Enter a valid email address.";
    }
    if (new TextEncoder().encode(password).byteLength < 8) {
      return "Password must be at least 8 characters long.";
    }
    if (new TextEncoder().encode(password).byteLength > 72) {
      return "Password must not exceed 72 UTF-8 bytes.";
    }
    if (isSignup && confirmation !== password) {
      return "Your passwords do not match.";
    }
    if (isSignup && !termsAccepted) {
      return "Confirm that you meet the age requirement and accept the terms.";
    }
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const response = isSignup
        ? await signup({ name: name.trim(), email: email.trim(), password })
        : await login({ email: email.trim(), password });
      setSuccess(response.message);
      onAuthenticated(response.user);
      window.setTimeout(() => navigate("/"), 450);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Authentication could not be completed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function showRecoveryMessage() {
    setError("Password recovery is not available in this API yet.");
  }

  return (
    <AuthPageShell mode={mode} navigate={navigate}>
      <div className="auth-form-content">
        <div className="auth-heading">
          <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>
          <p>
            {isSignup
              ? "Get started with your Exness V0 trading workspace."
              : "Sign in to your Exness V0 account."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {isSignup && (
            <label className="form-field">
              <span>Country / region of residence</span>
              <span className="select-wrap">
                <select
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                >
                  <option value="">Select your country / region</option>
                  {countryOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <FigmaIcon name="ChevronDown1" screen="signup" />
              </span>
              <small className="field-note">
                Country is for display only and is not sent to the API.
              </small>
            </label>
          )}

          {isSignup && (
            <label className="form-field">
              <span>Full name</span>
              <input
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                required
              />
            </label>
          )}

          <label className="form-field">
            <span>Email address</span>
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="form-field">
            <span>Password</span>
            <span className="password-wrap">
              <input
                aria-label="Password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isSignup ? "Create a password" : "Enter your password"}
                required
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((current) => !current)}
              >
                <FigmaIcon name="Eye" screen={mode} />
              </button>
            </span>
            {isSignup && (
              <small className="field-note">
                Use at least 8 characters. Passwords are sent only to the API and never stored in browser storage.
              </small>
            )}
          </label>

          {isSignup ? (
            <>
              <label className="form-field">
                <span>Confirm password</span>
                <input
                  aria-label="Confirm password"
                  autoComplete="new-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="Re-enter your password"
                  required
                />
              </label>
              <label className="terms-check">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                />
                <span>
                  I am at least 18 years old and agree to the{" "}
                  <a href="#terms" onClick={(event) => event.preventDefault()}>Terms of service</a>{" "}
                  and <a href="#privacy" onClick={(event) => event.preventDefault()}>Privacy policy</a>.
                </span>
              </label>
            </>
          ) : (
            <div className="signin-options">
              <label className="remember-check">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                Remember me
              </label>
              <button type="button" className="text-button" onClick={showRecoveryMessage}>
                Forgot password?
              </button>
            </div>
          )}

          {error && <div className="form-message form-error" role="alert">{error}</div>}
          {success && <div className="form-message form-success" role="status">{success}</div>}

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
            {!submitting && <FigmaIcon name="ArrowRight" screen={mode} />}
          </button>
        </form>

        <p className="auth-cross-link">
          {isSignup ? "Already have an account?" : "New to Exness V0?"}{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => navigate(isSignup ? "/signin" : "/signup")}
          >
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </p>

        {!isSignup && (
          <>
            <div className="form-divider"><span>or explore first</span></div>
            <button type="button" className="explore-demo" onClick={() => navigate("/")}>
              <FigmaIcon name="ChartCandlestick1" screen="signin" />
              Explore demo terminal
            </button>
            <p className="demo-caption">Virtual funds only. No account required.</p>
          </>
        )}

        <div className="secure-caption">
          <FigmaIcon name="LockKeyhole" screen={mode} />
          Your connection is secure and encrypted
        </div>
      </div>
    </AuthPageShell>
  );
}
