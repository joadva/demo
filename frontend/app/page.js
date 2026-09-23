'use client';

import Prueba from '@/components/Prueba';
import { BASE_URL, createClienteSam, listClientesSam } from '@/lib/api';

export default function Inicio() {
  return (
    <>
      <h1>Cómo conectar este frontend con el API</h1>
      <p className="suave">
        Tres pasos: conseguir la URL del API, ponerla en <code>.env.local</code> y llamar
        con <code>lib/api.js</code>. Abajo se puede probar en vivo.
      </p>

      {BASE_URL ? (
        <p>API en uso: <code>{BASE_URL}</code></p>
      ) : (
        <div className="aviso">
          <strong>Falta <code>NEXT_PUBLIC_API_URL</code>.</strong> Los botones de abajo
          fallarán hasta que la configures (paso 1 y 2).
        </div>
      )}

      <h2>1. Conseguir la URL</h2>
      <p>
        Cada despliegue publica un artefacto <code>aws-exports-&lt;stack&gt;</code> con los
        outputs del stack. Descárgalo del run de <em>Deploy Dev</em> en GitHub Actions (o
        pídelo directo a AWS) y déjalo en la raíz del repo:
      </p>
      <pre><code>{`# opción A: desde el run de GitHub Actions (necesita gh CLI)
gh run download --name aws-exports-secrets-dev

# opción B: directo desde AWS
aws cloudformation describe-stacks --stack-name secrets-dev \\
  --query "Stacks[0].Outputs" --output json \\
  | jq 'map({(.OutputKey): .OutputValue}) | add' > aws-exports.json`}</code></pre>

      <h2>2. Convertirlo en variables de entorno</h2>
      <p>
        Next sólo expone al navegador las variables que empiezan con <code>NEXT_PUBLIC_</code>,
        y las incrusta al compilar. Este script escribe <code>.env.local</code>:
      </p>
      <pre><code>{`npm run env:aws        # lee ../aws-exports.json y escribe .env.local
npm run dev            # http://localhost:3000`}</code></pre>

      <h2>3. Llamar al API</h2>
      <p>
        Todo pasa por <code>api()</code> en <code>lib/api.js</code>: arma la URL, manda JSON y
        convierte cualquier respuesta no-2xx en un <code>ApiError</code> con el{' '}
        <code>message</code>, el <code>detalle</code> del gateway o los <code>errores</code> por
        campo de la Lambda.
      </p>

      <Prueba
        titulo="GET /clientes-sam — listar"
        codigo={`import { listClientesSam } from '@/lib/api';\nconst { clientes } = await listClientesSam(5, 0);`}
        accion={() => listClientesSam(5, 0)}
      />

      <Prueba
        titulo="POST /clientes-sam sin correo — así se ve un 400 del gateway"
        codigo={`// email es requerido en el schema (openapi.yaml), así que API Gateway\n// rechaza el cuerpo antes de invocar la Lambda. Responde { message, detalle }.\nawait createClienteSam({ nombre: 'Sin correo' });`}
        accion={() => createClienteSam({ nombre: 'Sin correo' })}
        etiqueta="Provocar 400 del gateway"
      />

      <Prueba
        titulo="POST /clientes-sam con correo inválido — un 400 de la Lambda"
        codigo={`// El schema deja pasar cualquier cadena de 3 caracteres o más: API Gateway\n// ignora format: email. La regla vive en la Lambda, que responde\n// { message, errores: [{ campo, mensaje }] }.\nawait createClienteSam({ nombre: 'Ana Ruiz', email: 'sin-arroba' });`}
        accion={() => createClienteSam({ nombre: 'Ana Ruiz', email: 'sin-arroba' })}
        etiqueta="Provocar 400 de la Lambda"
      />

      <p className="suave">
        Las dos pruebas de 400 funcionan aunque la base de datos no esté lista: ninguna
        llega a consultar MySQL. El listado sí la necesita.
      </p>
    </>
  );
}
