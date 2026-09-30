// Convierte el aws-exports.json que genera el pipeline (artefacto
// aws-exports-<stack>) en el .env.local que Next necesita.
//
//   npm run env:aws                    # busca ../aws-exports.json
//   npm run env:aws -- ruta/al.json    # o el archivo que le pases
import fs from 'node:fs';

const origen = process.argv[2] ?? '../aws-exports.json';

if (!fs.existsSync(origen)) {
  console.error(`No existe ${origen}. Descarga el artefacto aws-exports-<stack> del run de Deploy Dev.`);
  process.exit(1);
}

const { ApiURL, Region, StackName } = JSON.parse(fs.readFileSync(origen, 'utf8'));

if (!ApiURL) {
  console.error(`${origen} no trae ApiURL.`);
  process.exit(1);
}

fs.writeFileSync('.env.local', [
  `# Generado por scripts/aws-exports-to-env.mjs desde ${origen}`,
  `NEXT_PUBLIC_API_URL=${ApiURL.replace(/\/$/, '')}`,
  `NEXT_PUBLIC_AWS_REGION=${Region ?? ''}`,
  `NEXT_PUBLIC_STACK_NAME=${StackName ?? ''}`,
  ''
].join('\n'));

console.log(`.env.local escrito: ${ApiURL} (${StackName ?? 'stack desconocido'})`);
