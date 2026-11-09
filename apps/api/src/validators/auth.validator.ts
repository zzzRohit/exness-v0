import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .refine(
    (password) => new TextEncoder().encode(password).byteLength <= 72,
    "Password must not exceed 72 UTF-8 bytes.",
  );

const emailSchema = z
  .string()
  .trim()
  .email("A valid email address is required.")
  .transform((email) => email.toLowerCase());

export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters long.")
      .max(50, "Name must not exceed 50 characters."),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export type SignupRequest = z.infer<typeof signupSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
