import {
  UserSqlExecJobData,
  UserSqlExecJobResult,
  UserSqlExecMode,
} from "../types";
import DbPoolClient from "../db";
import { Job } from "bullmq";
import { PoolClient } from "pg";
import {
  USER_SQL_EXEC_MAX_MEM,
  USER_SQL_EXEC_MAX_TIME,
} from "../utils/constants";
import { sanitizePgError } from "../utils";

class UserSqlCodeExecutor {
  static async executeReadOnlyMode(
    client: PoolClient,
    assignmentSchemaId: string,
    userSqlCode: string,
  ): Promise<UserSqlExecJobResult> {
    try {
      const escapedSchemaName = client.escapeIdentifier(assignmentSchemaId);

      await client.query(
        `BEGIN READ ONLY;
        SET LOCAL statement_timeout = '${USER_SQL_EXEC_MAX_TIME}';
        SET LOCAL work_mem = '${USER_SQL_EXEC_MAX_MEM}MB';
        SET LOCAL search_path TO ${escapedSchemaName}`,
      );
      const start = performance.now();

      const result = await client.query(userSqlCode);

      const executionTimeMs = Math.round(performance.now() - start);

      return {
        executionTimeMs,
        rowCount: result.rowCount ?? 0,
        columns: result.fields.map((field) => field.name),
        rows: result.rows,
        success: true,
      };
    } catch (err) {
      return {
        success: false,
        error: sanitizePgError(err instanceof Error ? err.message : `${err}`),
      };
    } finally {
      await client.query("ROLLBACK");
    }
  }

  static async executeReadWriteMode(
    client: PoolClient,
    assignmentSchemaId: string,
    userSqlCode: string,
  ): Promise<UserSqlExecJobResult> {
    try {
      await client.query(
        `BEGIN;
        SET LOCAL statement_timeout = '${USER_SQL_EXEC_MAX_TIME}';
        SET LOCAL work_mem = '${USER_SQL_EXEC_MAX_MEM}MB'`,
      );

      const escapedSchemaName = client.escapeIdentifier(assignmentSchemaId);

      const tableRows = await client.query(
        `SELECT table_name FROM information_schema.tables
        WHERE table_schema = $1 AND table_type = 'BASE TABLE'`,
        [assignmentSchemaId],
      );

      const tableNames: Array<string> = tableRows.rows.map(
        (row) => row.table_name,
      );

      const mergedTempTableQueries = tableNames
        .map((tableName) => {
          tableName = client.escapeIdentifier(tableName);

          return `CREATE TEMPORARY TABLE ${tableName}
            (LIKE ${escapedSchemaName}.${tableName} INCLUDING ALL)
            ON COMMIT DROP;

            INSERT INTO ${tableName}
            SELECT * FROM ${escapedSchemaName}.${tableName}`;
        })
        .join(";\n");

      if (mergedTempTableQueries.length > 0) {
        await client.query(mergedTempTableQueries);
      }
      await client.query(
        `SET LOCAL search_path TO pg_temp, ${escapedSchemaName}`,
      );
      const start = performance.now();

      const result = await client.query(userSqlCode);

      const executionTimeMs = Math.round(performance.now() - start);

      return {
        success: true,
        rows: result.rows,
        columns: result.fields.map((col) => col.name),
        rowCount: result.rowCount ?? 0,
        executionTimeMs,
      };
    } catch (err) {
      return {
        success: false,
        error: sanitizePgError(err instanceof Error ? err.message : `${err}`),
      };
    } finally {
      await client.query("ROLLBACK");
    }
  }

  static async process(
    job: Job<UserSqlExecJobData, UserSqlExecJobResult>,
  ): Promise<UserSqlExecJobResult> {
    const dbPoolClientInst = await DbPoolClient.get().connect();

    try {
      const { assignmentId, mode, userSql } = job.data;
      const assignmentSchema = `assignment_schema_${assignmentId}`;

      const readOrWriteOp =
        this[
          mode === UserSqlExecMode.READ
            ? "executeReadOnlyMode"
            : "executeReadWriteMode"
        ];

      return await readOrWriteOp(dbPoolClientInst, assignmentSchema, userSql);
    } finally {
      dbPoolClientInst.release();
    }
  }
}

export default UserSqlCodeExecutor;
