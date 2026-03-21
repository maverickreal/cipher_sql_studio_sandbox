import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../config", () => ({
  envVars: { PG_USER: "test" },
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { UserSqlCodeExecutor } from "../index";
import DbPoolClient from "../../db";
import { PoolClient } from "pg";

vi.mock("../../db", () => ({
  default: {
    get: vi.fn().mockReturnValue({
      connect: vi.fn(),
    }),
  },
}));

describe("UserSqlCodeExecutor - extended", () => {
  let mockClient: Partial<PoolClient>;

  beforeEach(() => {
    mockClient = {
      query: vi.fn().mockResolvedValue({
        rows: [],
        rowCount: 0,
        fields: [],
      }),
      escapeIdentifier: vi.fn((id) => `"${id}"`),
      release: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe("executeReadWriteMode", () => {
    it("should handle schema with no tables", async () => {
      (mockClient.query as any)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [{ x: 1 }],
          rowCount: 1,
          fields: [{ name: "x" }],
        });

      const result = await UserSqlCodeExecutor.executeReadWriteMode(
        mockClient as PoolClient,
        "schema_1",
        { userSql: "SELECT 1 as x", assignmentId: "1", mode: "write" as any },
      );

      expect(result.success).toBe(true);
      expect(result.rows).toEqual([{ x: 1 }]);
    });

    it("should create temp tables for multiple tables", async () => {
      (mockClient.query as any)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [
            { table_name: "users" },
            { table_name: "orders" },
            { table_name: "products" },
          ],
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          fields: [],
        });

      const result = await UserSqlCodeExecutor.executeReadWriteMode(
        mockClient as PoolClient,
        "schema_1",
        { userSql: "UPDATE users SET name='test'", assignmentId: "1", mode: "write" as any },
      );

      expect(result.success).toBe(true);
      const calls = (mockClient.query as any).mock.calls.map(
        (c: any[]) => c[0],
      );
      const tempTableQuery = calls.find(
        (q: string) =>
          typeof q === "string" && q.includes("CREATE TEMPORARY TABLE"),
      );
      expect(tempTableQuery).toContain('"users"');
      expect(tempTableQuery).toContain('"orders"');
      expect(tempTableQuery).toContain('"products"');
    });

    it("should rollback on error during write mode", async () => {
      (mockClient.query as any)
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error("table query failed"));

      const result = await UserSqlCodeExecutor.executeReadWriteMode(
        mockClient as PoolClient,
        "schema_1",
        { userSql: "UPDATE x SET y=1", assignmentId: "1", mode: "write" as any },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("table query failed");
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
    });

    it("should compare validation results when validationSql and solutionSql are provided", async () => {
      const validationRows = [{ count: 1 }];
      (mockClient.query as any)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ table_name: "t" }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [], rowCount: 0, fields: [] })
        .mockResolvedValueOnce({ rows: validationRows, rowCount: 1, fields: [{ name: "count" }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: validationRows, rowCount: 1, fields: [{ name: "count" }] });

      const result = await UserSqlCodeExecutor.executeReadWriteMode(
        mockClient as PoolClient,
        "schema_1",
        {
          userSql: "UPDATE t SET x=1",
          assignmentId: "1",
          mode: "write" as any,
          validationSql: "SELECT count(*) FROM t",
          solutionSql: "UPDATE t SET x=1",
          orderMatters: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.passed).toBe(true);
    });
  });

  describe("process", () => {
    it("should route to executeReadWriteMode for write mode", async () => {
      const mockJob: any = {
        data: {
          assignmentId: "1",
          mode: "write",
          userSql: "UPDATE test SET x=1",
        },
      };

      const connectMock = vi.fn().mockResolvedValue(mockClient);
      (DbPoolClient.get as any).mockReturnValue({ connect: connectMock });

      const writeModeSpy = vi
        .spyOn(UserSqlCodeExecutor, "executeReadWriteMode")
        .mockResolvedValue({ success: true });

      await UserSqlCodeExecutor.process(mockJob);

      expect(writeModeSpy).toHaveBeenCalledWith(
        mockClient,
        "assignment_schema_1",
        {
          assignmentId: "1",
          mode: "write",
          userSql: "UPDATE test SET x=1",
        }
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should release client even when executor throws", async () => {
      const mockJob: any = {
        data: {
          assignmentId: "1",
          mode: "read",
          userSql: "SELECT 1",
        },
      };

      const connectMock = vi.fn().mockResolvedValue(mockClient);
      (DbPoolClient.get as any).mockReturnValue({ connect: connectMock });

      vi.spyOn(UserSqlCodeExecutor, "executeReadOnlyMode").mockRejectedValue(
        new Error("unexpected"),
      );

      await expect(UserSqlCodeExecutor.process(mockJob)).rejects.toThrow(
        "unexpected",
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
