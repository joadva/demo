import fs from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { conexionLocal, separarSentencias } from '../local-db.mjs';

describe('separarSentencias', () => {
  it('corta por ; cuando no hay DELIMITER', () => {
    expect(separarSentencias('SELECT 1;\nSELECT 2;')).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('respeta el DELIMITER para no partir un procedimiento por los ; internos', () => {
    const script = [
      'DELIMITER $$',
      'CREATE PROCEDURE p()',
      'BEGIN',
      '  SELECT 1;',
      '  SELECT 2;',
      'END$$',
      'DELIMITER ;',
      'CALL p();'
    ].join('\n');

    expect(separarSentencias(script)).toEqual([
      'CREATE PROCEDURE p()\nBEGIN\n  SELECT 1;\n  SELECT 2;\nEND',
      'CALL p()'
    ]);
  });

  it('divide sql/clientesSam.sql en la tabla, los 5 DROP y los 5 procedimientos', async () => {
    const sentencias = separarSentencias(await fs.readFile('sql/clientesSam.sql', 'utf8'));

    expect(sentencias).toHaveLength(11);
    expect(sentencias.filter((s) => s.includes('CREATE PROCEDURE'))).toHaveLength(5);
    // Los comentarios que preceden a cada sentencia viajan con ella; MySQL los ignora.
    expect(sentencias.at(-1)).toMatch(/CREATE PROCEDURE sp_clientesSam_eliminar[\s\S]*END$/);
  });
});

describe('conexionLocal', () => {
  it('usa credenciales de desarrollo local cuando no hay variables', () => {
    expect(conexionLocal()).toMatchObject({ host: '127.0.0.1', port: 3306, user: 'demo', database: 'demo' });
  });
});
