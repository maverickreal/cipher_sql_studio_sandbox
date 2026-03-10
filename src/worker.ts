import DbPoolClient from "./db";
import UserSqlCodeExecutor from "./executor";
import { UserSqlExecJobData, UserSqlExecJobResult } from "./types";
import { Job, Worker } from "bullmq";
import {
  BULL_QUEUE_NAME,
  KILL_SIGNALS_TO_INTERCEPT,
  UNWANTED_SERVICE_TERMINATION_CODE,
  CONCURRENT_WORKERS_COUNT,
} from "./utils/constants";
import envVars from "./config/env";


DbPoolClient.connect();

const workerOpts = {
  connection: { url: envVars.REDIS_URL },
  concurrency: CONCURRENT_WORKERS_COUNT,
};

const userSqlExecWorker = new Worker<UserSqlExecJobData, UserSqlExecJobResult>(
  BULL_QUEUE_NAME,
  UserSqlCodeExecutor.process,
  workerOpts,
);

userSqlExecWorker.on("completed", (job: Job) => {
  console.log(`Successfully finished job ${job.id}.`);
});

userSqlExecWorker.on("failed", (job: Job | undefined, err: Error) => {
  console.error(`Unsuccessfully finished job ${job?.id}!`, err.message);
});

userSqlExecWorker.on("error", (err: Error) => {
  console.error("Exception in worker!", err.message);
});

userSqlExecWorker.on("ready", () => {
  console.log(`User SQL execution job worker ready in queue ${BULL_QUEUE_NAME}`);
});

for (const event of KILL_SIGNALS_TO_INTERCEPT) {
  process.on(event, async () => {
    console.log(`Worker on queue ${BULL_QUEUE_NAME} terminated!`);

    await userSqlExecWorker.close();
    await DbPoolClient.disconnect();

    process.exit(UNWANTED_SERVICE_TERMINATION_CODE);
  });
}
