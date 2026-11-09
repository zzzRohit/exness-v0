import { Router, type Router as ExpressRouter } from "express";
import {
  loginController,
  signupController,
} from "../controllers/auth.controller.js";
import { validateBody } from "../middlewares/validate-body.middleware.js";
import {
  loginSchema,
  signupSchema,
} from "../validators/auth.validator.js";

export const authRouter: ExpressRouter = Router();

authRouter.post(
  "/signup",
  validateBody(signupSchema),
  signupController,
);
authRouter.post(
  "/login",
  validateBody(loginSchema),
  loginController,
);
