import "dotenv/config";
import { LibSQLStore } from "@mastra/libsql";
import path from "node:path";

export const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "local.db");

export const storage = new LibSQLStore({
  id: "libsql-store",
  url: `file:${DB_PATH}`,
});
