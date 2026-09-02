# Estructura de archivos en `portman/`

Este directorio contiene archivos y configuraciones relacionadas con pruebas y automatización de APIs utilizando Portman.

## Archivos principales

- **portman-cli.json**: Configuración principal para la ejecución de Portman CLI.
- **portman-config.json**: Configuración personalizada para Portman, como variables, entornos y opciones de prueba.
- **portman-filter.json**: Filtros para seleccionar endpoints o colecciones específicas durante las pruebas.

## Subcarpetas

- **get-token/**
  - Scripts o utilidades para obtener tokens de autenticación.
  - Ejemplo: `index.js` para automatizar la obtención de tokens JWT o similares.

## Ejemplo de estructura

```
portman/
├── portman-cli.json        # Configuración principal de Portman CLI
├── portman-config.json     # Configuración personalizada de Portman
├── portman-filter.json     # Filtros para endpoints/colecciones
└── get-token/
    └── index.js            # Script para obtener tokens de autenticación
```

## Notas
- Los archivos `.json` definen cómo se ejecutan y configuran las pruebas de Portman.
- Los scripts en `get-token/` pueden ser usados para pruebas automatizadas que requieren autenticación.

Para más detalles sobre la configuración y uso de Portman, revisar la documentación oficial.
