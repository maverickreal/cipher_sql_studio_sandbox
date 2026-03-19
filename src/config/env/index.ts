import { z } from "zod/v4";
import { UNWANTED_SERVICE_TERMINATION_CODE } from "../../utils";
import logger from "../log";

const envVarsSchema = z.object({
  REDIS_URL: z.url().nonempty().nonoptional(),
  PG_HOST: z.string().nonempty().nonoptional(),
  PG_PORT: z.coerce.number().int().nonoptional(),
  PG_DATABASE: z.string().nonempty().nonoptional(),
  PG_USER: z.string().nonempty().nonoptional(),
  PG_PASSWORD: z.string().nonempty().nonoptional(),
  ADMIN_PG_USER: z.string().nonempty().nonoptional(),
  ADMIN_PG_PASSWORD: z.string().nonempty().nonoptional(),
  BULLMQ_SQL_QUEUE_NAME: z.string().nonempty().nonoptional(),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .nonoptional(),
  ENV_MODE: z.enum(["dev", "staging", "prod"]).nonoptional(),
  LOG_DIR: z.string().nonempty().nonoptional(),
});

const parsedEnvVarsBody = envVarsSchema.safeParse(process.env);

if (!parsedEnvVarsBody.success) {
  logger.error(
    { trace: z.prettifyError(parsedEnvVarsBody.error) },
    "Invalid environment variables:",
  );
  process.exit(UNWANTED_SERVICE_TERMINATION_CODE);
}

export default parsedEnvVarsBody.data;
