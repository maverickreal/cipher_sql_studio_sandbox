import { Pool } from "pg";
import { envVars } from "../config";
import { PG_POOL_MAX } from "../utils/constants";
import { logger } from "../config";

class DbPoolClient {
  private static clientInst: Pool | null = null;

  static connect(): void {
    if (DbPoolClient.clientInst) {
      return;
    }
    DbPoolClient.clientInst = new Pool({
      max: PG_POOL_MAX,
      host: envVars.PG_HOST,
      port: envVars.PG_PORT,
      user: envVars.PG_USER,
      password: envVars.PG_PASSWORD,
      database: envVars.PG_DATABASE,
    });

    DbPoolClient.clientInst.on("error", (err: Error) => {
      logger.error({ err }, "An error occurred in PostgreSQL pool!");
    });
  }

  static get(): Pool {
    if (!DbPoolClient.clientInst) {
      throw new Error("PostreSQL client instance from null pool seeked!");
    }

    return DbPoolClient.clientInst;
  }

  static async disconnect() {
    if (DbPoolClient.clientInst) {
      await DbPoolClient.clientInst.end();
      DbPoolClient.clientInst = null;
    }
  }
}

export default DbPoolClient;
