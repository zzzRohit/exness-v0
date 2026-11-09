import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { authRouter } from "./routes/auth.routes.js";

export const app: Express = express();

app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "10kb" }));

app.get("/health", (_request, response) => {
  response.json({ service: "api", status: "ok" });
});

app.use("/api/v1/auth", authRouter);
app.use(errorMiddleware);
