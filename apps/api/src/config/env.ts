import dotenv from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({
  path: resolve(fileURLToPath(new URL("../../../../.env", import.meta.url))),
});

function requiredJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET must be set.");
  }

  const secretBytes = new TextEncoder().encode(secret).byteLength;
  if (
    secretBytes < 32 ||
    new Set(secret).size < 12 ||
    /replace|change.?me|example|your.?secret|secret123/i.test(secret)
  ) {
    throw new Error(
      "JWT_SECRET must be a non-placeholder value of at least 32 bytes with sufficient character variety.",
    );
  }

  return secret;
}

function apiPort(): number {
  const value = Number(process.env.API_PORT ?? 4000);
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error("API_PORT must be an integer from 1 to 65535.");
  }
  return value;
}

function frontendOrigin(): string {
  const value = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("FRONTEND_ORIGIN must be a valid origin URL.");
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.origin !== value
  ) {
    throw new Error("FRONTEND_ORIGIN must be an HTTP(S) origin without a path.");
  }

  return url.origin;
}

export const env = {
  apiPort: apiPort(),
  frontendOrigin: frontendOrigin(),
  isProduction: process.env.NODE_ENV === "production",
  jwtSecret: requiredJwtSecret(),
};
