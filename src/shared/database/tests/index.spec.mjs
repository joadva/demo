import { describe, expect, it, vi } from 'vitest';
import * as db from '../index.mjs';

describe('Database functions', () => {
  describe('ExecuteQuery Functions', () => {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const params = [1];

    it('should execute query successfully', async () => {
      // mysql2/promise resuelve [filas, campos]; no acepta callback.
      const connectionMock = {
        query: vi.fn().mockResolvedValue([
          [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }],
          []
        ]),
        end: vi.fn().mockResolvedValue(undefined)
      };

      const results = await db.executeQuery(connectionMock, sql, params);

      expect(results).toEqual({ id: 1, name: 'John' });
      expect(connectionMock.query).toHaveBeenCalledWith(sql, params);
      expect(connectionMock.end).toHaveBeenCalled();
    });

    it('Should error when executing query', async () => {
      const connectionMock = {
        query: vi.fn().mockRejectedValue(new Error('Error in SQL query')),
        end: vi.fn().mockResolvedValue(undefined)
      };

      await expect(db.executeQuery(connectionMock, sql, params))
          .rejects.toThrow('Error in SQL query');

      // La conexion se cierra aunque la consulta falle
      expect(connectionMock.end).toHaveBeenCalled();
    });
  });
});
