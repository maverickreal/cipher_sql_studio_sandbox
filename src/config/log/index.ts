import pino from "pino";
import { envVars } from "..";

const logger = pino({
  level: envVars.LOG_LEVEL,
});

export default logger;
