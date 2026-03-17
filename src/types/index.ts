enum UserSqlExecMode {
  READ = "read",
  WRITE = "write",
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
  truncated?: boolean;
  error?: string;
  executionTimeMs?: number;
}

interface AdminAssignmentSeedJobData {
  assignmentId: string;
  initSql: string;
}

interface AdminAssignmentSeedJobResult {
  success: boolean;
  error?: string;
}

export {
  UserSqlExecJobData,
  UserSqlExecJobResult,
  UserSqlExecMode,
  AdminAssignmentSeedJobData,
  AdminAssignmentSeedJobResult,
};
