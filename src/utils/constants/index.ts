// These are the events which I know of / understood;
// there are potentially more that need be handled in a similar fashion.
export const KILL_SIGNALS_TO_INTERCEPT = [
  "SIGTERM",
  "SIGINT",
  "UNHANDLED_REJECTION",
  "UNCAUGHT_EXCEPTION",
];

export const enum ENV_MODE {
  DEV,
  STAGING,
  PROD,
}

export const UNWANTED_SERVICE_TERMINATION_CODE = 1;
export const PG_POOL_MAX = 5;
export const USER_SQL_EXEC_MAX_TIME = 5000;
export const USER_SQL_EXEC_MAX_MEM = 16;
export const CONCURRENT_WORKERS_COUNT = 3;
export const MAX_RESULT_ROWS = 100;
export const ADMIN_ASSIGNMENT_SEED_JOB_NAME =
  "client_sql_studio_admin_assignment_seed";
