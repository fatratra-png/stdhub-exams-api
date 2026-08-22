import "dotenv/config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { pool, testConnection } from "./config/db.ts";
import { HttpError } from "./errors.ts";
import { authRouter } from "./routes/authRoutes.ts";
import { studentsRouter } from "./routes/studentsRoutes.ts";
import { coursesRouter } from "./routes/coursesRoutes.ts";
import { examsRouter } from "./routes/examsRoutes.ts";
import { questionsRouter } from "./routes/questionsRoutes.ts";
import { myRouter } from "./routes/myRoutes.ts";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("stdhub-exams-api is running");
});

app.use("/api/auth", authRouter);
app.use("/api/students", studentsRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/exams", examsRouter);
app.use("/api", questionsRouter);
app.use("/api/my", myRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Ressource introuvable" });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  const parseError = error as { type?: string; status?: number };
  if (parseError?.type === "entity.parse.failed") {
    res.status(400).json({ message: "Données invalides" });
    return;
  }
  console.error(error);
  res.status(500).json({ message: "Erreur interne du serveur" });
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
