enum UserSqlExecMode {
  "read",
  "write",
}

interface UserSqlExecJobData {
  assignmentId: string;
  userSql: string;
  mode: UserSqlExecMode;
}

interface UserSqlExecJobResult {
  success: boolean;
  rows?: Array<Record<string, unknown>>;
  columns?: Array<string>;
  rowCount?: number;
  error?: string;
  executionTimeMs?: number;
}

export { UserSqlExecJobData, UserSqlExecJobResult, UserSqlExecMode };
