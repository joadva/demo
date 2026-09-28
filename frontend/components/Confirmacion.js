'use client';

import { useEffect, useRef } from 'react';

/**
 * Dialogo de confirmacion. Usa el <dialog> nativo, que ya trae el fondo
 * oscurecido, la trampa de foco y el cierre con Escape; no hace falta
 * replicar nada de eso a mano.
 */
export default function Confirmacion({
  abierto,
  titulo,
  mensaje,
  etiquetaConfirmar = 'Confirmar',
  peligro = false,
  onConfirmar,
  onCancelar
}) {
  const dialogo = useRef(null);

  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;

    // showModal() sobre un dialogo ya abierto lanza; de ahi las guardas.
    if (abierto && !el.open) el.showModal();
    if (!abierto && el.open) el.close();
  }, [abierto]);

  return (
    <dialog ref={dialogo} className="dialogo" onCancel={onCancelar} onClose={onCancelar}>
      <h3>{titulo}</h3>
      <p>{mensaje}</p>
      <div className="acciones">
        <button type="button" className="secundario" onClick={onCancelar}>Cancelar</button>
        <button type="button" className={peligro ? 'peligro-solido' : ''} onClick={onConfirmar} autoFocus>
          {etiquetaConfirmar}
        </button>
      </div>
    </dialog>
  );
}
