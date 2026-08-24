import "dotenv/config";
import { pool, testConnection } from "./config/db.ts";
import app from "./app.ts";

const PORT = Number(process.env.PORT) || 3000;

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
