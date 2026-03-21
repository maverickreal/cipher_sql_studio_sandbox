import { describe, it, expect } from "vitest";
import { SQLSanitiser, compareQueryResults } from "../index";

describe("SQLSanitiser", () => {
  it("should return a default message if error is empty", () => {
    expect(SQLSanitiser("")).toBe(
      "An unknown error occurred during SQL execution.",
    );
  });

  it("should mask internal schema names", () => {
    const error = 'relation "assignment_schema_12345678901234567890abcd.users" does not exist';
    expect(SQLSanitiser(error)).toBe(
      'relation "assignment.users" does not exist',
    );
  });

  it("should return user-friendly message for statement timeouts", () => {
    const error = "canceling statement due to statement timeout";
    expect(SQLSanitiser(error)).toBe("Time Limit Exceeded!");
  });

  it("should return user-friendly message for memory limits", () => {
    const error = "out of memory for work_mem";
    expect(SQLSanitiser(error)).toBe("Memory Limit Exceeded!");
  });

  it("should return user-friendly message for permission errors", () => {
    const error = "permission denied for table users";
    expect(SQLSanitiser(error)).toBe("Operation not allowed!");
  });

  it("should return the original message if no patterns match", () => {
    const error = 'syntax error at or near "SELECT"';
    expect(SQLSanitiser(error)).toBe(error);
  });
});

describe("compareQueryResults", () => {
  it("should return true for matching rows", () => {
    const rows = [{ id: 1, name: "a" }, { id: 2, name: "b" }];
    expect(compareQueryResults(rows, rows, true)).toBe(true);
  });

  it("should return false for different row counts", () => {
    const user = [{ id: 1 }];
    const solution = [{ id: 1 }, { id: 2 }];
    expect(compareQueryResults(user, solution, true)).toBe(false);
  });

  it("should return true for same rows in different order when orderMatters is false", () => {
    const user = [{ id: 2, name: "b" }, { id: 1, name: "a" }];
    const solution = [{ id: 1, name: "a" }, { id: 2, name: "b" }];
    expect(compareQueryResults(user, solution, false)).toBe(true);
  });

  it("should return false for same rows in different order when orderMatters is true", () => {
    const user = [{ id: 2, name: "b" }, { id: 1, name: "a" }];
    const solution = [{ id: 1, name: "a" }, { id: 2, name: "b" }];
    expect(compareQueryResults(user, solution, true)).toBe(false);
  });

  it("should return true for empty arrays", () => {
    expect(compareQueryResults([], [], true)).toBe(true);
    expect(compareQueryResults([], [], false)).toBe(true);
  });
});
