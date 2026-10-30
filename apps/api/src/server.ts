import "dotenv/config";
import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ service: "api", status: "ok" });
});

const port = Number(process.env.API_PORT ?? 4000);
app.listen(port, () => {
  console.log(`Exness V0 API listening on http://localhost:${port}`);
});
