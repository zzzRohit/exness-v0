import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { login, signup } from "../services/auth.service.js";
import { signAccessToken } from "../utils/token.js";
import type {
  LoginRequest,
  SignupRequest,
} from "../validators/auth.validator.js";

function setAccessTokenCookie(
  response: Parameters<RequestHandler>[1],
  token: string,
): void {
  response.cookie("access_token", token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  });
}

export const signupController: RequestHandler<
  object,
  unknown,
  SignupRequest
> = async (request, response, next) => {
  try {
    const user = await signup(request.body);
    const token = await signAccessToken(user.id);
    setAccessTokenCookie(response, token);
    response.status(201).json({
      message: "Account created successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const loginController: RequestHandler<
  object,
  unknown,
  LoginRequest
> = async (request, response, next) => {
  try {
    const user = await login(request.body);
    const token = await signAccessToken(user.id);
    setAccessTokenCookie(response, token);
    response.status(200).json({
      message: "Login successful",
      user,
    });
  } catch (error) {
    next(error);
  }
};
