'use client';

import { useState } from 'react';

import { ApiError } from '@/lib/api';

/**
 * Boton que ejecuta una llamada al API y muestra la respuesta o el error tal
 * cual llego. Sirve para ver en vivo cada endpoint desde la pagina de inicio.
 */
export default function Prueba({ titulo, codigo, accion, etiqueta = 'Probar' }) {
  const [estado, setEstado] = useState({ cargando: false });

  const ejecutar = async () => {
    setEstado({ cargando: true });
    try {
      const inicio = performance.now();
      const respuesta = await accion();
      setEstado({ respuesta, ms: Math.round(performance.now() - inicio) });
    } catch (err) {
      setEstado({
        error: err instanceof ApiError ? `${err.status} ${err.message}` : err.message,
        cuerpo: err instanceof ApiError ? { detalle: err.detalle, errores: err.errores } : null
      });
    }
  };

  return (
    <section className="tarjeta">
      <h3>{titulo}</h3>
      <pre><code>{codigo}</code></pre>
      <button onClick={ejecutar} disabled={estado.cargando}>
        {estado.cargando ? 'Llamando…' : etiqueta}
      </button>

      {estado.respuesta !== undefined && (
        <>
          <p className="estado ok">200 en {estado.ms} ms</p>
          <pre><code>{JSON.stringify(estado.respuesta, null, 2)}</code></pre>
        </>
      )}

      {estado.error && (
        <>
          <p className="estado error">{estado.error}</p>
          {estado.cuerpo && <pre><code>{JSON.stringify(estado.cuerpo, null, 2)}</code></pre>}
        </>
      )}
    </section>
  );
}
