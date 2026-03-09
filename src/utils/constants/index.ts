// These are the events which I know of / understood;
// there are potentially more that need be handled in a similar fashion.
export const KILL_SIGNALS_TO_INTERCEPT_IN_JOB_QUEUE = [
  "SIGTERM",
  "SIGINT",
  "UNHANDLED_REJECTION",
  "UNCAUGHT_EXCEPTION",
];

export const UNWANTED_SERVICE_TERMINATION_CODE = 1;
export const PG_POOL_MAX = 5;
export const USER_SQL_EXEC_MAX_TIME = 5000; // MS
export const USER_SQL_EXEC_MAX_MEM = 16; // MB
export const CONCURRENT_WORKERS_COUNT = 3;
export const BULL_QUEUE_NAME = "cipher_sql_studio_queue";
