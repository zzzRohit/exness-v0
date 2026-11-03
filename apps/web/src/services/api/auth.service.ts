export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  balance: string;
}

export interface AuthResponse {
  message: string;
  user: AuthenticatedUser;
}

interface ApiErrorResponse {
  message?: string;
  errors?: Array<{ path: string; message: string }>;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ?? "";

async function postAuth<TInput>(
  path: string,
  input: TInput,
): Promise<AuthResponse> {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as
    | AuthResponse
    | ApiErrorResponse
    | null;

  if (!response.ok) {
    const fieldErrors = payload && "errors" in payload ? payload.errors : undefined;
    const detail = fieldErrors?.map((error) => error.message).join(" ");
    const apiMessage =
      payload && "message" in payload ? payload.message : undefined;
    const message =
      detail ||
      apiMessage ||
      `Authentication failed with status ${response.status}.`;
    throw new Error(message);
  }

  if (!payload || !("user" in payload) || !payload.user?.id) {
    throw new Error("The authentication server returned an unexpected response.");
  }

  return payload;
}

export function signup(input: SignupInput): Promise<AuthResponse> {
  return postAuth("signup", input);
}

export function login(input: LoginInput): Promise<AuthResponse> {
  return postAuth("login", input);
}
