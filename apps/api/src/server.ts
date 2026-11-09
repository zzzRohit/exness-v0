import { app } from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.apiPort, () => {
  console.log(`Exness V0 API listening on http://localhost:${env.apiPort}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down API...`);

  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
