'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// La portada explicativa esta oculta por ahora: vive en /conexion/ y no se
// enlaza desde el menu. La raiz manda directo al CRUD, que es lo que se
// demuestra. Para volver a mostrarla basta con devolver el enlace en
// app/layout.js; el contenido sigue intacto en app/conexion/page.js.
export default function Inicio() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/clientes/');
  }, [router]);

  return null;
}
