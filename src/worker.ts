import DbPoolClient from "./db";
import UserSqlCodeExecutor from "./executor";
import { UserSqlExecJobData, UserSqlExecJobResult } from "./types";
import { Job, Worker } from "bullmq";
import {
  KILL_SIGNALS_TO_INTERCEPT,
  UNWANTED_SERVICE_TERMINATION_CODE,
  CONCURRENT_WORKERS_COUNT,
} from "./utils/constants";
import { envVars } from "./config";
import { logger } from "./config";

DbPoolClient.connect();

const workerOpts = {
  connection: {
    url: envVars.REDIS_URL,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  },
  concurrency: CONCURRENT_WORKERS_COUNT,
};

const userSqlExecWorker = new Worker<UserSqlExecJobData, UserSqlExecJobResult>(
  envVars.BULLMQ_SQL_QUEUE_NAME!,
  UserSqlCodeExecutor.process,
  workerOpts,
);

userSqlExecWorker.on("completed", (job: Job) => {
  logger.info({ jobId: job.id }, "Successfully finished job");
});

userSqlExecWorker.on("failed", (job: Job | undefined, err: Error) => {
  logger.error({ jobId: job?.id, err }, "Unsuccessfully finished job");
});

userSqlExecWorker.on("error", (err: Error) => {
  logger.error({ err }, "Exception in worker!");
});

userSqlExecWorker.on("ready", () => {
  logger.info(
    { queue: envVars.BULLMQ_SQL_QUEUE_NAME },
    "User SQL execution job worker ready",
  );
});

for (const event of KILL_SIGNALS_TO_INTERCEPT) {
  process.on(event, async () => {
    logger.info({ queue: envVars.BULLMQ_SQL_QUEUE_NAME }, "Worker terminated");

    await userSqlExecWorker.close();
    await DbPoolClient.disconnect();

    process.exit(UNWANTED_SERVICE_TERMINATION_CODE);
  });
}
