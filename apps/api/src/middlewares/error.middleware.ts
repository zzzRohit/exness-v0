import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import {
  AuthenticationError,
  EmailAlreadyRegisteredError,
} from "../services/auth.service.js";

export const errorMiddleware: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      message: "Invalid request.",
      errors: error.issues.map(({ path, message }) => ({
        path: path.join("."),
        message,
      })),
    });
    return;
  }

  if (error instanceof EmailAlreadyRegisteredError) {
    response.status(409).json({ message: error.message });
    return;
  }

  if (error instanceof AuthenticationError) {
    response.status(401).json({ message: "Invalid email or password." });
    return;
  }

  console.error("Unhandled API request error.", {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  response.status(500).json({
    message: "Internal server error.",
    ...(env.isProduction ? {} : { error: "Request could not be completed." }),
  });
};
