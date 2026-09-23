-- Datos de ejemplo para el CRUD de /clientes-sam. Se puede ejecutar las veces que
-- haga falta: los correos ya existentes se ignoran.

INSERT IGNORE INTO clientesSam (nombre, email, telefono) VALUES
  ('Ana Ruiz',      'ana@demo.mx',    '5551234567'),
  ('Luis Herrera',  'luis@demo.mx',   NULL),
  ('Maria Torres',  'maria@demo.mx',  '5559876543');
