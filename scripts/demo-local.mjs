// Ejecuta el CRUD de /clientes de punta a punta invocando los handlers reales
// (con Powertools y mysql2) contra la base de datos de DB_*, sin SAM CLI ni
// API Gateway. Sirve para ver las reglas de validacion y los stored procedures
// en accion desde la terminal.
//
//   npm run demo
//
// Sin variables DB_* usa las credenciales del docker-compose.yaml.
import mysql from 'mysql2/promise';

import { conexionLocal } from './local-db.mjs';

// Fuera de Lambda no hay X-Ray ni CloudWatch; se apagan para que no ensucien
// la salida. Debe ir antes de importar los handlers.
process.env.POWERTOOLS_TRACE_ENABLED = 'false';
process.env.POWERTOOLS_METRICS_DISABLED = 'true';
process.env.POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL || 'ERROR';

// El middleware de metricas avisa en cada invocacion que no hay nada que
// publicar, aunque este desactivado. Es ruido para esta demo.
const warn = console.warn;
console.warn = (...args) => {
  if (!String(args[0]).startsWith('No application metrics to publish')) {
    warn(...args);
  }
};

const db = conexionLocal();
process.env.DB_HOST = db.host;
process.env.DB_PORT = String(db.port);
process.env.DB_USER = db.user;
process.env.DB_PASSWORD = db.password;
process.env.DB_DATABASE = db.database;

console.log(`Base de datos: ${db.host}:${db.port}/${db.database}`);

// Comprobar la conexion antes de empezar; si no, cada paso daria un 500
// identico y el problema real quedaria enterrado en los logs.
try {
  const prueba = await mysql.createConnection(db);
  await prueba.end();
} catch (err) {
  console.error(`\nNo se pudo conectar: ${err.message}`);
  console.error('Si es la base local, levantala con: docker compose up -d');
  console.error('Si es otra, pon sus credenciales en .env.local (ver .env.local.example)');
  process.exit(1);
}

const { handler: listar } = await import('../src/functions/clientes/list/index.mjs');
const { handler: obtener } = await import('../src/functions/clientes/get/index.mjs');
const { handler: crear } = await import('../src/functions/clientes/create/index.mjs');
const { handler: actualizar } = await import('../src/functions/clientes/update/index.mjs');
const { handler: eliminar } = await import('../src/functions/clientes/delete/index.mjs');

// Lo minimo que los middlewares de Powertools leen del contexto de Lambda.
const contexto = {
  functionName: 'demo-local',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'arn:aws:lambda:local:000000000000:function:demo-local',
  memoryLimitInMB: '128',
  awsRequestId: '00000000-0000-0000-0000-000000000000',
  getRemainingTimeInMillis: () => 30000
};

/**
 * Invoca un handler como lo haria API Gateway y muestra el resultado.
 * @param {string} titulo - Que se esta probando.
 * @param {Function} handler - Handler de la Lambda.
 * @param {Object} evento - Evento proxy de API Gateway (parcial).
 * @return {Promise<Object>} El cuerpo de la respuesta ya parseado.
 */
const invocar = async (titulo, handler, evento) => {
  const respuesta = await handler(evento, contexto);
  const cuerpo = respuesta.body ? JSON.parse(respuesta.body) : null;

  console.log(`\n${titulo}`);
  console.log(`  -> ${respuesta.statusCode} ${JSON.stringify(cuerpo)}`);

  return cuerpo;
};

const cuerpo = (objeto) => ({ body: JSON.stringify(objeto) });
const ruta = (clienteId) => ({ pathParameters: { clienteId: String(clienteId) } });

await invocar('GET /clientes?limite=5', listar, { queryStringParameters: { limite: '5' } });

const correo = `demo-${Date.now()}@demo.mx`;

const creado = await invocar(`POST /clientes  (${correo})`, crear,
    cuerpo({ nombre: '  Pedro Paramo ', email: correo.toUpperCase(), telefono: '5550001111' }));

await invocar('POST /clientes  (mismo correo -> 409)', crear,
    cuerpo({ nombre: 'Pedro Paramo', email: correo }));

await invocar('POST /clientes  (rompe reglas -> 400)', crear,
    cuerpo({ nombre: 'P', email: 'sin-arroba' }));

await invocar(`GET /clientes/${creado.clienteId}`, obtener, ruta(creado.clienteId));

await invocar('GET /clientes/abc  (-> 400)', obtener, ruta('abc'));

await invocar(`PUT /clientes/${creado.clienteId}`, actualizar,
    { ...ruta(creado.clienteId), ...cuerpo({ nombre: 'Pedro Paramo Preciado', email: correo, telefono: null }) });

await invocar('GET /clientes?limite=999  (-> 400)', listar, { queryStringParameters: { limite: '999' } });

await invocar(`DELETE /clientes/${creado.clienteId}`, eliminar, ruta(creado.clienteId));

await invocar(`GET /clientes/${creado.clienteId}  (ya no existe -> 404)`, obtener, ruta(creado.clienteId));

console.log('\nListo.');
