import { config } from "dotenv";
import { resolve } from "node:path";

// apps/web/.env.local then apps/web/.env
config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") });
