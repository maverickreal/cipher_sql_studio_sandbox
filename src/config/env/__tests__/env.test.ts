import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod/v4";
import { ENV_MODE } from "../../../utils/constants";

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
  ENV_MODE: z.enum(ENV_MODE).nonoptional(),
  LOG_DIR: z.string().nonempty().nonoptional(),
  API_GATEWAY_URL: z.url().nonempty().nonoptional(),
  INTERNAL_API_KEY: z.string().nonempty().nonoptional(),
});

const validEnvVars = {
  REDIS_URL: "redis://localhost:6379",
  PG_HOST: "localhost",
  PG_PORT: "5432",
  PG_DATABASE: "sandbox_db",
  PG_USER: "user",
  PG_PASSWORD: "password",
  ADMIN_PG_USER: "admin",
  ADMIN_PG_PASSWORD: "admin_password",
  BULLMQ_SQL_QUEUE_NAME: "sql_exec_queue",
  LOG_LEVEL: "info",
  ENV_MODE: "DEV",
  LOG_DIR: "/var/log",
  API_GATEWAY_URL: "http://localhost:3000",
  INTERNAL_API_KEY: "test-api-key",
};

describe("envVarsSchema", () => {
  describe("valid environment variables", () => {
    it("should pass validation with valid environment variables", () => {
      const result = envVarsSchema.safeParse(validEnvVars);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.REDIS_URL).toBe("redis://localhost:6379");
        expect(result.data.PG_HOST).toBe("localhost");
        expect(result.data.PG_PORT).toBe(5432);
        expect(result.data.LOG_LEVEL).toBe("info");
        expect(result.data.ENV_MODE).toBe("DEV");
      }
    });

    it("should handle all valid LOG_LEVEL enum values", () => {
      const logLevels = ["trace", "debug", "info", "warn", "error", "fatal"];
      for (const level of logLevels) {
        const result = envVarsSchema.safeParse({ ...validEnvVars, LOG_LEVEL: level });
        expect(result.success).toBe(true);
      }
    });

    it("should handle all valid ENV_MODE enum values", () => {
      const envModes = ["DEV", "STAGING", "PROD"];
      for (const mode of envModes) {
        const result = envVarsSchema.safeParse({ ...validEnvVars, ENV_MODE: mode });
        expect(result.success).toBe(true);
      }
    });

    it("should coerce PG_PORT from string to number", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, PG_PORT: "8080" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PG_PORT).toBe(8080);
        expect(typeof result.data.PG_PORT).toBe("number");
      }
    });
  });

  describe("missing required fields", () => {
    it("should fail when REDIS_URL is missing", () => {
      const { REDIS_URL: _, ...envWithoutRedis } = validEnvVars;
      const result = envVarsSchema.safeParse(envWithoutRedis);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes("REDIS_URL"))).toBe(true);
      }
    });

    it("should fail when PG_HOST is missing", () => {
      const { PG_HOST: _, ...envWithoutPgHost } = validEnvVars;
      const result = envVarsSchema.safeParse(envWithoutPgHost);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes("PG_HOST"))).toBe(true);
      }
    });

    it("should fail when PG_PORT is missing", () => {
      const { PG_PORT: _, ...envWithoutPgPort } = validEnvVars;
      const result = envVarsSchema.safeParse(envWithoutPgPort);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes("PG_PORT"))).toBe(true);
      }
    });

    it("should fail when PG_DATABASE is missing", () => {
      const { PG_DATABASE: _, ...envWithoutPgDb } = validEnvVars;
      const result = envVarsSchema.safeParse(envWithoutPgDb);
      expect(result.success).toBe(false);
    });

    it("should fail when PG_USER is missing", () => {
      const { PG_USER: _, ...envWithoutPgUser } = validEnvVars;
      const result = envVarsSchema.safeParse(envWithoutPgUser);
      expect(result.success).toBe(false);
    });

    it("should fail when PG_PASSWORD is missing", () => {
      const { PG_PASSWORD: _, ...envWithoutPgPassword } = validEnvVars;
      const result = envVarsSchema.safeParse(envWithoutPgPassword);
      expect(result.success).toBe(false);
    });

    it("should fail when ADMIN_PG_USER is missing", () => {
      const { ADMIN_PG_USER: _, ...envWithoutAdminPgUser } = validEnvVars;
      const result = envVarsSchema.safeParse(envWithoutAdminPgUser);
      expect(result.success).toBe(false);
    });

    it("should fail when ADMIN_PG_PASSWORD is missing", () => {
      const { ADMIN_PG_PASSWORD: _, ...envWithoutAdminPgPassword } = validEnvVars;
      const result = envVarsSchema.safeParse(envWithoutAdminPgPassword);
      expect(result.success).toBe(false);
    });

    it("should fail when BULLMQ_SQL_QUEUE_NAME is missing", () => {
      const { BULLMQ_SQL_QUEUE_NAME: _, ...envWithoutQueueName } = validEnvVars;
      const result = envVarsSchema.safeParse(envWithoutQueueName);
      expect(result.success).toBe(false);
    });

    it("should fail when LOG_LEVEL is missing", () => {
      const { LOG_LEVEL: _, ...envWithoutLogLevel } = validEnvVars;
      const result = envVarsSchema.safeParse(envWithoutLogLevel);
      expect(result.success).toBe(false);
    });

    it("should fail when ENV_MODE is missing", () => {
      const { ENV_MODE: _, ...envWithoutEnvMode } = validEnvVars;
      const result = envVarsSchema.safeParse(envWithoutEnvMode);
      expect(result.success).toBe(false);
    });

    it("should fail when LOG_DIR is missing", () => {
      const { LOG_DIR: _, ...envWithoutLogDir } = validEnvVars;
      const result = envVarsSchema.safeParse(envWithoutLogDir);
      expect(result.success).toBe(false);
    });

    it("should fail when API_GATEWAY_URL is missing", () => {
      const { API_GATEWAY_URL: _, ...envWithoutApiGatewayUrl } = validEnvVars;
      const result = envVarsSchema.safeParse(envWithoutApiGatewayUrl);
      expect(result.success).toBe(false);
    });

    it("should fail when INTERNAL_API_KEY is missing", () => {
      const { INTERNAL_API_KEY: _, ...envWithoutApiKey } = validEnvVars;
      const result = envVarsSchema.safeParse(envWithoutApiKey);
      expect(result.success).toBe(false);
    });
  });

  describe("invalid URL formats", () => {
    it("should fail when REDIS_URL is not a valid URL", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, REDIS_URL: "not-a-url" });
      expect(result.success).toBe(false);
    });

    it("should fail when REDIS_URL is an empty string", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, REDIS_URL: "" });
      expect(result.success).toBe(false);
    });

    it("should fail when API_GATEWAY_URL is not a valid URL", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, API_GATEWAY_URL: "invalid-url" });
      expect(result.success).toBe(false);
    });

    it("should fail when API_GATEWAY_URL is an empty string", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, API_GATEWAY_URL: "" });
      expect(result.success).toBe(false);
    });

    it("should accept valid redis URL with password", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, REDIS_URL: "redis://:password@localhost:6379" });
      expect(result.success).toBe(true);
    });

    it("should accept valid http URL for API gateway", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, API_GATEWAY_URL: "http://127.0.0.1:8080/api" });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid enum values", () => {
    it("should fail when LOG_LEVEL is an invalid enum value", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, LOG_LEVEL: "invalid" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes("LOG_LEVEL"))).toBe(true);
      }
    });

    it("should fail when LOG_LEVEL is uppercase", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, LOG_LEVEL: "INFO" });
      expect(result.success).toBe(false);
    });

    it("should fail when ENV_MODE is an invalid enum value", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, ENV_MODE: "invalid" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes("ENV_MODE"))).toBe(true);
      }
    });

    it("should fail when ENV_MODE is lowercase", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, ENV_MODE: "dev" });
      expect(result.success).toBe(false);
    });

    it("should fail when ENV_MODE is a number", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, ENV_MODE: 123 });
      expect(result.success).toBe(false);
    });
  });

  describe("invalid types", () => {
    it("should fail when PG_PORT is not a number or numeric string", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, PG_PORT: "not-a-number" });
      expect(result.success).toBe(false);
    });

    it("should fail when PG_PORT is a decimal number", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, PG_PORT: "5432.5" });
      expect(result.success).toBe(false);
    });

    it("should fail when PG_PORT is an object", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, PG_PORT: { value: 5432 } });
      expect(result.success).toBe(false);
    });
  });

  describe("empty string validation", () => {
    it("should fail when PG_HOST is an empty string", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, PG_HOST: "" });
      expect(result.success).toBe(false);
    });

    it("should fail when PG_DATABASE is an empty string", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, PG_DATABASE: "" });
      expect(result.success).toBe(false);
    });

    it("should fail when PG_USER is an empty string", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, PG_USER: "" });
      expect(result.success).toBe(false);
    });

    it("should fail when BULLMQ_SQL_QUEUE_NAME is an empty string", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, BULLMQ_SQL_QUEUE_NAME: "" });
      expect(result.success).toBe(false);
    });

    it("should fail when LOG_DIR is an empty string", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, LOG_DIR: "" });
      expect(result.success).toBe(false);
    });

    it("should fail when INTERNAL_API_KEY is an empty string", () => {
      const result = envVarsSchema.safeParse({ ...validEnvVars, INTERNAL_API_KEY: "" });
      expect(result.success).toBe(false);
    });
  });
});
