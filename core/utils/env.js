// core/utils/env.js
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const env = {
  BASE_URL: (process.env.BASE_URL || "https://www.cambridgeone.org").replace(/\/$/, ""),
  LOGIN_PATH: process.env.LOGIN_PATH || "/login",
  LOGIN_URL: ((process.env.BASE_URL || "https://www.cambridgeone.org").replace(/\/$/, "") + (process.env.LOGIN_PATH || "/login")),
  HEADLESS: String(process.env.HEADLESS || "false").toLowerCase() === "true",
  DEBUG_DIR: process.env.DEBUG_DIR || "/tmp/vitest-debug",
};
