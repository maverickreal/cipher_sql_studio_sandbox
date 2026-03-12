const SQLSanitiser = (msg: string): string => {
  if (msg?.length < 1) {
    return "An unknown error occurred during SQL execution.";
  }

  const cleaned = msg.replace(/assignment_schema_[a-f0-9]+/g, "assignment");

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

export default SQLSanitiser;
