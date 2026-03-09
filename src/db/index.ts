import { Pool } from "pg";
import envVars from "../config/env";
import { PG_POOL_MAX } from "../utils/constants";

class DbPool {
  private static instance: Pool | null = null;

  private constructor() {}

  static get(): Pool {
    if (!DbPool.instance) {
      DbPool.instance = new Pool({
        max: PG_POOL_MAX,
        host: envVars.PG_HOST,
        port: envVars.PG_PORT,
        user: envVars.PG_USER,
        password: envVars.PG_PASSWORD,
        database: envVars.PG_DATABASE,
      });

      DbPool.instance.on("error", (err: Error) => {
        console.error("PostgreSQL Pool error:", err.message);
      });
    }

    return DbPool.instance;
  }

  static async close(): Promise<void> {
    if (DbPool.instance) {
      await DbPool.instance.end();
      DbPool.instance = null;
    }
  }
}

export default DbPool;
