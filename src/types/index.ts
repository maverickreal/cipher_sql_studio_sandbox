enum UserSqlExecMode {
  READ = "read",
  WRITE = "write",
}

interface UserSqlExecJobData {
  assignmentId: string;
  userSql: string;
  mode: UserSqlExecMode;
  solutionSql?: string;
  validationSql?: string;
}

interface UserSqlExecJobResult {
  success: boolean;
  passed?: boolean;
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
