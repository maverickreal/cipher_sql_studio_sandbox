import {
  AdminAssignmentSeedJobData,
  AdminAssignmentSeedJobResult,
} from "../../types";
import DbPoolClient from "../../db";
import { Job } from "bullmq";
import { SQLSanitiser } from "../../utils";

class AdminSqlCodeExecutor {
  static async process(
    job: Job<AdminAssignmentSeedJobData, AdminAssignmentSeedJobResult>,
  ) {
    const dbPoolClientInst = await DbPoolClient.getAdmin().connect();

    try {
      const { assignmentId, initSql } = job.data;
      const escapedSchemaName = dbPoolClientInst.escapeIdentifier(
        `assignment_schema_${assignmentId}`,
      );

      await dbPoolClientInst.query(
        `BEGIN;
        CREATE SCHEMA IF NOT EXISTS ${escapedSchemaName};
        SET LOCAL search_path TO ${escapedSchemaName};
        ${initSql.trim() ? initSql : ""}
        GRANT USAGE ON SCHEMA ${escapedSchemaName} TO sandbox_student;
        GRANT SELECT ON ALL TABLES IN SCHEMA ${escapedSchemaName} TO sandbox_student;
        ALTER DEFAULT PRIVILEGES IN SCHEMA ${escapedSchemaName} GRANT SELECT ON TABLES TO sandbox_student;
        REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA ${escapedSchemaName} FROM sandbox_student;
        REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ${escapedSchemaName} FROM sandbox_student;
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
