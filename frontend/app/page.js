'use client';

import Prueba from '@/components/Prueba';
import { BASE_URL, echo, info, ping } from '@/lib/api';

export default function Inicio() {
  return (
    <>
      <h1>Cómo conectar este frontend con el API</h1>
      <p className="suave">
        Tres pasos: conseguir la URL del API, ponerla en <code>.env.local</code> y llamar
        con <code>lib/api.js</code>. Abajo cada endpoint se puede probar en vivo.
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
      <pre><code>{`cd frontend
npm run env:aws        # lee ../aws-exports.json y escribe .env.local
npm run dev            # http://localhost:3000`}</code></pre>
      <p>
        En CI es lo mismo con <code>actions/download-artifact</code> antes de{' '}
        <code>npm run build</code>; ver <code>frontend/README.md</code>.
      </p>

      <h2>3. Llamar al API</h2>
      <p>
        Todo pasa por <code>api()</code> en <code>lib/api.js</code>: arma la URL, manda JSON y
        convierte cualquier respuesta no-2xx en un <code>ApiError</code> con el{' '}
        <code>message</code>, el <code>detalle</code> del gateway o los <code>errores</code> por
        campo de la Lambda.
      </p>

      <Prueba
        titulo="GET /ping — ¿está vivo el API?"
        codigo={`import { ping } from '@/lib/api';\nconst { message, timestamp } = await ping();`}
        accion={ping}
      />

      <Prueba
        titulo="GET /info — nombre, versión y región"
        codigo={`import { info } from '@/lib/api';\nconst { service, version, region } = await info();`}
        accion={info}
      />

      <Prueba
        titulo="POST /echo — mandar un cuerpo JSON"
        codigo={`import { echo } from '@/lib/api';\nconst { receivedAt, payload } = await echo({ mensaje: 'hola' });`}
        accion={() => echo({ mensaje: 'hola', desde: 'next' })}
      />

      <Prueba
        titulo="POST /echo con cuerpo inválido — así se ve un 400 del gateway"
        codigo={`// mensaje debe ser string y de máximo 500 caracteres (openapi.yaml).\n// API Gateway lo rechaza antes de invocar la Lambda.\nawait echo({ mensaje: 12345 });`}
        accion={() => echo({ mensaje: 12345 })}
        etiqueta="Provocar 400"
      />
    </>
  );
}
