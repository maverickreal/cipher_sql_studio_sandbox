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
  orderMatters?: boolean;
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
  success: true;
}

export {
  UserSqlExecJobData,
  UserSqlExecJobResult,
  UserSqlExecMode,
  AdminAssignmentSeedJobData,
  AdminAssignmentSeedJobResult,
};
