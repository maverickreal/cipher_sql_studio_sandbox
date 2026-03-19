import {
  AdminAssignmentSeedJobData,
  AdminAssignmentSeedJobResult,
} from "../../types";
import DbPoolClient from "../../db";
import { Job } from "bullmq";
import { getSandboxDBSchemaIdForAssignment, SQLSanitiser } from "../../utils";
import { envVars } from "../../config";

class AdminSqlCodeExecutor {
  static async process(
    job: Job<AdminAssignmentSeedJobData, AdminAssignmentSeedJobResult>,
  ) {
    const dbPoolClientInst = await DbPoolClient.getAdmin().connect();

    try {
      const { assignmentId, initSql } = job.data;
      const escapedSchemaName = dbPoolClientInst.escapeIdentifier(
        getSandboxDBSchemaIdForAssignment(assignmentId),
      );

      await dbPoolClientInst.query(
        `BEGIN;
        CREATE SCHEMA IF NOT EXISTS ${escapedSchemaName};
        SET LOCAL search_path TO ${escapedSchemaName};`,
      );

      if (initSql.trim()) {
        await dbPoolClientInst.query(initSql);
      }

      await dbPoolClientInst.query(
        `GRANT USAGE ON SCHEMA ${escapedSchemaName} TO ${envVars.PG_USER};
        GRANT SELECT ON ALL TABLES IN SCHEMA ${escapedSchemaName} TO ${envVars.PG_USER};
        ALTER DEFAULT PRIVILEGES IN SCHEMA ${escapedSchemaName} GRANT SELECT ON TABLES TO ${envVars.PG_USER};
        REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA ${escapedSchemaName} FROM ${envVars.PG_USER};
        REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ${escapedSchemaName} FROM ${envVars.PG_USER};
        COMMIT;`,
      );

      return {
        success: true,
      };
    } catch (err) {
      await dbPoolClientInst.query("ROLLBACK;");

      return {
        success: false,
        error: SQLSanitiser(err instanceof Error ? err.message : `${err}`),
      };
    } finally {
      dbPoolClientInst.release();
    }
  }
}

export default AdminSqlCodeExecutor;
