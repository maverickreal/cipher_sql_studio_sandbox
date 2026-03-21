import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config', () => ({
  envVars: { PG_USER: 'test' },
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { UserSqlCodeExecutor } from '../index';
import DbPoolClient from '../../db';
import { PoolClient } from 'pg';

vi.mock('../../db', () => ({
  default: {
    get: vi.fn().mockReturnValue({
      connect: vi.fn(),
    }),
  },
}));

describe('UserSqlCodeExecutor', () => {
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

  describe('executeReadOnlyMode', () => {
    it('should execute SQL in read-only mode and return results', async () => {
      const userSql = 'SELECT * FROM test';
      (mockClient.query as any).mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1,
          fields: [{ name: 'id' }],
        });

      const result = await UserSqlCodeExecutor.executeReadOnlyMode(
        mockClient as PoolClient,
        'schema_1',
        { userSql, assignmentId: "1", mode: "read" as any }
      );

      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('BEGIN READ ONLY'));
      expect(mockClient.query).toHaveBeenCalledWith(userSql);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(result.success).toBe(true);
      expect(result.rows).toEqual([{ id: 1 }]);
    });

    it('should handle errors and rollback with sanitized messages', async () => {
      (mockClient.query as any).mockRejectedValueOnce(new Error('canceling statement due to statement timeout'));

      const result = await UserSqlCodeExecutor.executeReadOnlyMode(
        mockClient as PoolClient,
        'schema_1',
        { userSql: 'SELECT * FROM error', assignmentId: "1", mode: "read" as any }
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Time Limit Exceeded!');
    });

    it('should return passed=true when solutionSql matches user result', async () => {
      const rows = [{ id: 1 }];
      (mockClient.query as any)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows,
          rowCount: 1,
          fields: [{ name: 'id' }],
        })
        .mockResolvedValueOnce({
          rows,
          rowCount: 1,
          fields: [{ name: 'id' }],
        });

      const result = await UserSqlCodeExecutor.executeReadOnlyMode(
        mockClient as PoolClient,
        'schema_1',
        { userSql: 'SELECT id FROM t', assignmentId: '1', mode: 'read' as any, solutionSql: 'SELECT id FROM t' },
      );

      expect(result.success).toBe(true);
      expect(result.passed).toBe(true);
    });

    it('should return passed=false when solutionSql does not match', async () => {
      (mockClient.query as any)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1,
          fields: [{ name: 'id' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 2 }],
          rowCount: 1,
          fields: [{ name: 'id' }],
        });

      const result = await UserSqlCodeExecutor.executeReadOnlyMode(
        mockClient as PoolClient,
        'schema_1',
        { userSql: 'SELECT 1', assignmentId: '1', mode: 'read' as any, solutionSql: 'SELECT 2' },
      );

      expect(result.success).toBe(true);
      expect(result.passed).toBe(false);
    });

    it('should truncate rows exceeding MAX_RESULT_ROWS', async () => {
      const bigRows = Array.from({ length: 150 }, (_, i) => ({ id: i }));
      (mockClient.query as any)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: bigRows,
          rowCount: 150,
          fields: [{ name: 'id' }],
        });

      const result = await UserSqlCodeExecutor.executeReadOnlyMode(
        mockClient as PoolClient,
        'schema_1',
        { userSql: 'SELECT * FROM big', assignmentId: '1', mode: 'read' as any },
      );

      expect(result.success).toBe(true);
      expect(result.rows!.length).toBe(100);
      expect(result.truncated).toBe(true);
      expect(result.rowCount).toBe(150);
    });

    it('should return column names in result', async () => {
      (mockClient.query as any)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [{ name: 'a', age: 1 }],
          rowCount: 1,
          fields: [{ name: 'name' }, { name: 'age' }],
        });

      const result = await UserSqlCodeExecutor.executeReadOnlyMode(
        mockClient as PoolClient,
        'schema_1',
        { userSql: 'SELECT name, age FROM t', assignmentId: '1', mode: 'read' as any },
      );

      expect(result.columns).toEqual(['name', 'age']);
    });

    it('should handle error when BEGIN transaction fails', async () => {
      (mockClient.query as any).mockRejectedValueOnce(new Error('transaction start failed'));

      const result = await UserSqlCodeExecutor.executeReadOnlyMode(
        mockClient as PoolClient,
        'schema_1',
        { userSql: 'SELECT * FROM t', assignmentId: '1', mode: 'read' as any },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('transaction start failed');
    });

    it('should handle error when search_path setting fails', async () => {
      (mockClient.query as any)
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('invalid schema name'));

      const result = await UserSqlCodeExecutor.executeReadOnlyMode(
        mockClient as PoolClient,
        'invalid_schema',
        { userSql: 'SELECT * FROM t', assignmentId: '1', mode: 'read' as any },
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid schema name');
    });

    it('should handle error when statement_timeout setting fails', async () => {
      (mockClient.query as any)
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('invalid timeout value'));

      const result = await UserSqlCodeExecutor.executeReadOnlyMode(
        mockClient as PoolClient,
        'schema_1',
        { userSql: 'SELECT * FROM t', assignmentId: '1', mode: 'read' as any },
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid timeout value');
    });

    it('should handle error when user SQL query fails', async () => {
      (mockClient.query as any)
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('relation "test" does not exist'));

      const result = await UserSqlCodeExecutor.executeReadOnlyMode(
        mockClient as PoolClient,
        'schema_1',
        { userSql: 'SELECT * FROM test', assignmentId: '1', mode: 'read' as any },
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(result.success).toBe(false);
    });

    it('should handle error when solution validation query fails', async () => {
      (mockClient.query as any)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1,
          fields: [{ name: 'id' }],
        })
        .mockRejectedValueOnce(new Error('solution query error'));

      const result = await UserSqlCodeExecutor.executeReadOnlyMode(
        mockClient as PoolClient,
        'schema_1',
        { userSql: 'SELECT 1', assignmentId: '1', mode: 'read' as any, solutionSql: 'SELECT 2' },
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(result.success).toBe(false);
      expect(result.error).toBe('solution query error');
    });
  });

  describe('executeReadWriteMode', () => {
    it('should set up temporary tables and execute SQL', async () => {
      const userSql = 'UPDATE test SET x=1';
      (mockClient.query as any)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [{ table_name: 'test' }],
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          fields: [],
        });

      const result = await UserSqlCodeExecutor.executeReadWriteMode(
        mockClient as PoolClient,
        'schema_1',
        { userSql, assignmentId: "1", mode: "write" as any }
      );

      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TEMPORARY TABLE "test"'));
      expect(mockClient.query).toHaveBeenCalledWith(userSql);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(result.success).toBe(true);
    });

    it('should handle error when BEGIN transaction fails', async () => {
      (mockClient.query as any).mockRejectedValueOnce(new Error('transaction init failed'));

      const result = await UserSqlCodeExecutor.executeReadWriteMode(
        mockClient as PoolClient,
        'schema_1',
        { userSql: 'UPDATE t SET x=1', assignmentId: '1', mode: 'write' as any },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('transaction init failed');
    });

    it('should handle error when getting tables fails', async () => {
      (mockClient.query as any)
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('permission denied for schema schema_1'));

      const result = await UserSqlCodeExecutor.executeReadWriteMode(
        mockClient as PoolClient,
        'schema_1',
        { userSql: 'UPDATE t SET x=1', assignmentId: '1', mode: 'write' as any },
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Operation not allowed!');
    });

    it('should handle error when copying data to temp tables fails', async () => {
      (mockClient.query as any)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [{ table_name: 'test' }],
        })
        .mockRejectedValueOnce(new Error('duplicate column name'));

      const result = await UserSqlCodeExecutor.executeReadWriteMode(
        mockClient as PoolClient,
        'schema_1',
        { userSql: 'UPDATE test SET x=1', assignmentId: '1', mode: 'write' as any },
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(result.success).toBe(false);
      expect(result.error).toBe('duplicate column name');
    });
  });

  describe('process', () => {
    it('should route to readOnlyMode correctly', async () => {
      const mockJob: any = {
        data: {
          assignmentId: '1',
          mode: 'read',
          userSql: 'SELECT 1',
        },
      };

      const connectMock = vi.fn().mockResolvedValue(mockClient);
      (DbPoolClient.get as any).mockReturnValue({ connect: connectMock });

      const executeReadOnlySpy = vi.spyOn(UserSqlCodeExecutor, 'executeReadOnlyMode').mockResolvedValue({ success: true } as any);

      await UserSqlCodeExecutor.process(mockJob);

      expect(executeReadOnlySpy).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
