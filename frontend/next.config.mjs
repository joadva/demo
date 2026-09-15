import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sitio estatico: no hay servidor de Next, solo HTML/JS que llama al API
  // desde el navegador. Se puede publicar en S3, GitHub Pages o Amplify.
  output: 'export',
  trailingSlash: true,
  // El backend tiene su propio package-lock.json un nivel arriba; sin esto
  // Turbopack lo toma como raiz del workspace.
  turbopack: {
    root: path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
  }
};

export default nextConfig;
