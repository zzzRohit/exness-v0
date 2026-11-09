import { SignJWT } from "jose";
import { env } from "../config/env.js";

const signingKey = new TextEncoder().encode(env.jwtSecret);

export function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(signingKey);
}
