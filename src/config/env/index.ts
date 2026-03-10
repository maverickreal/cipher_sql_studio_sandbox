import z from "zod";
import { UNWANTED_SERVICE_TERMINATION_CODE } from "../../utils/constants";
import dotenv from "dotenv";


dotenv.config();

const envVarsSchema = z.object({
  REDIS_URL: z.url().nonempty().nonoptional(),
  PG_HOST: z.string().nonempty().nonoptional(),
  PG_PORT: z.coerce.number().int().nonoptional(),
  PG_DATABASE: z.string().nonempty().nonoptional(),
  PG_USER: z.string().nonempty().nonoptional(),
  PG_PASSWORD: z.string().nonempty().nonoptional(),
});

const parsedEnvVarsBody = envVarsSchema.safeParse(process.env);

if (!parsedEnvVarsBody.success) {
  console.error(
    "Invalid environment variables:",
    z.prettifyError(parsedEnvVarsBody.error),
  );
  process.exit(UNWANTED_SERVICE_TERMINATION_CODE);
}

export default parsedEnvVarsBody.data;
