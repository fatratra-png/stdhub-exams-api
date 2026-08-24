import express from "express";
import cors from "cors";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./errors/errors.ts";
import { authRouter } from "./routes/authRoute.ts";
import { studentsRouter } from "./routes/studentRoute.ts";
import { coursesRouter } from "./routes/courseRoute.ts";
import { examsRouter } from "./routes/examRoute.ts";
import { questionsRouter } from "./routes/questionRoute.ts";
import { myRouter } from "./routes/studentExamRoute.ts";

const app = express();

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

export default app;
