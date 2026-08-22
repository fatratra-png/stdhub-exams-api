import "dotenv/config";
import express from "express";
import { pool, testConnection } from "./config/db.ts";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("stdhub-exams-api is running");
});

const startServer = async (): Promise<void> => {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error);
    await pool.end().catch(() => undefined);
    process.exit(1);
  }
};

startServer();
