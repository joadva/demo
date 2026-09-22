// Aplica sql/clientes.sql y sql/seed.sql contra la base de datos de DB_*.
// Sirve para cualquier MySQL (local o en la nube) sin necesitar el
// cliente `mysql`, que es el unico que entiende la instruccion DELIMITER.
//
//   node --env-file-if-exists=.env.local scripts/db-init.mjs
//   node scripts/db-init.mjs sql/otro.sql      # o archivos concretos
//
// Las credenciales salen de las variables DB_*; ver docs/local-db.md.
import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';

import { conexionLocal, separarSentencias } from './local-db.mjs';

const archivos = process.argv.slice(2);
if (archivos.length === 0) {
  archivos.push('sql/clientes.sql', 'sql/seed.sql');
}

const { host, port, database } = conexionLocal();
console.log(`Conectando a ${host}:${port}/${database}`);

const conexion = await mysql.createConnection(conexionLocal());

try {
  for (const archivo of archivos) {
    const sentencias = separarSentencias(await fs.readFile(archivo, 'utf8'));
    for (const sentencia of sentencias) {
      await conexion.query(sentencia);
    }
    console.log(`${archivo}: ${sentencias.length} sentencias aplicadas`);
  }
} finally {
  await conexion.end();
}
