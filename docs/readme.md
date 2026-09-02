# Guía de flujo de desarrollo

Este repositorio sigue un flujo de trabajo basado en tickets de Jira para asegurar trazabilidad y calidad en el desarrollo.

## Flujo de desarrollo

1. **Creación de rama**
   - Se crea una nueva rama a partir de `master`.
   - El nombre de la rama debe incluir el ID del ticket de Jira (por ejemplo: `feature/JIRA-1234-nueva-funcionalidad`).

2. **Desarrollo**
   - El código fuente se encuentra en el directorio `src/`.
   - Las funciones Lambda se desarrollan en `src/functions/`.
   - El código compartido y utilidades están en `src/shared/`.
   - Las pruebas unitarias se ubican en subcarpetas `tests/` junto al código que prueban.
   - Las configuraciones y scripts para pruebas de API están en `portman/`.

3. **Pruebas**
   - Ejecuta las pruebas unitarias y de integración antes de subir cambios.
   - Utiliza los scripts y configuraciones de `portman/` para pruebas automatizadas de endpoints.

4. **Pull Request (PR)**
   - Al finalizar el desarrollo, crea un PR hacia la rama `master`.
   - El PR debe referenciar el ticket de Jira y describir los cambios realizados.
   - El flujo de CI/CD ejecuta validaciones, despliegue y pruebas automáticas.

5. **Revisión y Merge**
   - El PR es revisado por el equipo.
   - Si pasa las validaciones y revisiones, se realiza el merge a `master`.

## Estructura de carpetas principal

- `src/`: Código fuente y pruebas.
- `portman/`: Configuración y scripts para pruebas de API.
- `.github/workflows/`: Workflows de CI/CD para despliegue y validaciones.

## Recomendaciones
- Usa nombres de ramas claros y siempre incluye el ID de Jira.
- Mantén el código y las pruebas organizados según la estructura definida.
- Revisa la documentación de cada carpeta para detalles específicos.

---

Para más información sobre la estructura y configuración, revisa los archivos `src/readme.md` y `portman/readme.md`.
