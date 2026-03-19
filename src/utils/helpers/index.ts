import { SANDBOX_DB_SCHEMA_PREFIX } from "../constants";

export const SQLSanitiser = (msg: string): string => {
  if (msg?.length < 1) {
    return "An unknown error occurred during SQL execution.";
  }

  const cleaned = msg.replace(
    /assignment_schema_[a-fA-F0-9]{24}/g,
    "assignment",
  );

  if (cleaned.includes("statement timeout")) {
    return "Time Limit Exceeded!";
  }

  if (cleaned.includes("work_mem")) {
    return "Memory Limit Exceeded!";
  }

  if (cleaned.includes("permission denied")) {
    return "Operation not allowed!";
  }

  return cleaned;
};

export const getSandboxDBSchemaIdForAssignment = (seed: string): string =>
  SANDBOX_DB_SCHEMA_PREFIX + seed;

export const compareQueryResults = (
  userRows: Array<Record<string, unknown>>,
  solutionRows: Array<Record<string, unknown>>,
  orderMatters: boolean,
): boolean => {
  if (userRows.length !== solutionRows.length) return false;

  const normalize = (row: Record<string, unknown>) =>
    JSON.stringify(
      Object.keys(row)
        .sort()
        .map((k) => [k, row[k]]),
    );

  const userNormalized = userRows.map(normalize);
  const solutionNormalized = solutionRows.map(normalize);

  if (!orderMatters) {
    userNormalized.sort();
    solutionNormalized.sort();
  }

  return userNormalized.every((row, i) => row === solutionNormalized[i]);
};
