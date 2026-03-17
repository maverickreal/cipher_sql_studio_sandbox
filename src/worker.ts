import DbPoolClient from "./db";
import { UserSqlCodeExecutor, AdminSqlCodeExecutor } from "./executor/";
import {
  UserSqlExecJobData,
  UserSqlExecJobResult,
  AdminAssignmentSeedJobData,
  AdminAssignmentSeedJobResult,
} from "./types";
import { Job, Worker } from "bullmq";
import {
  KILL_SIGNALS_TO_INTERCEPT,
  UNWANTED_SERVICE_TERMINATION_CODE,
  CONCURRENT_WORKERS_COUNT,
  ADMIN_ASSIGNMENT_SEED_JOB_NAME,
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

const BullMQWorker = new Worker<
  UserSqlExecJobData | AdminAssignmentSeedJobData,
  UserSqlExecJobResult | AdminAssignmentSeedJobResult
>(
  envVars.BULLMQ_SQL_QUEUE_NAME!,
  (job: Job) =>
    (job.name === ADMIN_ASSIGNMENT_SEED_JOB_NAME
      ? AdminSqlCodeExecutor
      : UserSqlCodeExecutor
    ).process(job),
  workerOpts,
);

BullMQWorker.on("completed", (job: Job) => {
  logger.info(
    { jobId: job.id, jobName: job.name },
    "Successfully finished job",
  );
});

BullMQWorker.on("failed", (job: Job | undefined, err: Error) => {
  logger.error({ jobId: job?.id, err }, "Unsuccessfully finished job");
});

BullMQWorker.on("error", (err: Error) => {
  logger.error({ err }, "Exception in worker!");
});

BullMQWorker.on("ready", () => {
  logger.info({ queue: envVars.BULLMQ_SQL_QUEUE_NAME }, "BullMQ worker ready.");
});

KILL_SIGNALS_TO_INTERCEPT.forEach((event: string) =>
  process.on(event, async () => {
    logger.info({ queue: envVars.BULLMQ_SQL_QUEUE_NAME }, "Worker terminated");

    await BullMQWorker.close();
    await DbPoolClient.disconnect();

    process.exit(UNWANTED_SERVICE_TERMINATION_CODE);
  }),
);
