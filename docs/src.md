# Estructura de archivos en `src/`

Este directorio contiene el código fuente principal de la aplicación. A continuación se describe la estructura y propósito de cada carpeta y archivo:

## Carpetas principales

- **functions/**
  - Contiene las funciones Lambda individuales.
  - Ejemplo: `echo/` incluye la función de eco (`index.mjs`) y sus pruebas (`tests/`).

- **shared/**
  - Código reutilizable entre funciones Lambda.
  - Subcarpetas:
    - **apigateway/**: Utilidades para respuestas API Gateway (`index.mjs`, `tests/`).
    - **database/**: Funciones relacionadas con la base de datos (`index.mjs`, `tests/`).
    - **lambda-powertools/**: Inicialización y utilidades para Lambda Powertools (`index.mjs`).

## Ejemplo de estructura

```
src/
├── functions/
│   └── echo/
│       ├── index.mjs         # Handler principal de la función Lambda echo
│       └── tests/
│           └── index.test.mjs # Pruebas unitarias para echo
├── shared/
│   ├── apigateway/
│   │   ├── index.mjs         # Utilidades para API Gateway
│   │   └── tests/
│   │       └── index.spec.mjs # Pruebas para apigateway
│   ├── database/
│   │   ├── index.mjs         # Funciones de base de datos
│   │   └── tests/
│   │       └── index.spec.mjs # Pruebas para database
│   └── lambda-powertools/
│       └── index.mjs         # Inicialización y utilidades Powertools
```

## Notas
- Cada función Lambda tiene su propio directorio bajo `functions/`.
- El código compartido se organiza en subcarpetas bajo `shared/`.
- Las pruebas unitarias se ubican en subcarpetas `tests/` junto al código que prueban.

Para más detalles sobre cada módulo, revisar los archivos `index.mjs` y sus pruebas correspondientes.
