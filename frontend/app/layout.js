import Link from 'next/link';

import './globals.css';

export const metadata = {
  title: 'Demo API',
  description: 'Como conectar un frontend en Next con el API desplegado con SAM'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <header>
          <nav>
            <Link href="/">Conexión</Link>
            <Link href="/clientes/">Clientes (CRUD)</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
