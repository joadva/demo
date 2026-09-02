# Documentación: Workflow Pre-deploy Validations

## ¿Qué es este archivo?
Este archivo es un workflow de GitHub Actions llamado **Pre-deploy Validations**. Su función es ejecutar validaciones automáticas antes de desplegar la API, asegurando la calidad y el correcto funcionamiento del código.

---

## ¿Cuándo se ejecuta?
Se activa cuando otro workflow lo llama (`workflow_call`), normalmente antes de un despliegue.

---

## ¿Qué permisos usa?
Solicita permisos mínimos para leer el contenido del repositorio.

---

## Variables de salida
- `BRANCH_NAME`: Nombre de la rama que será desplegada.

---

## ¿Qué trabajos (jobs) realiza?

### 1. pre-deploy-validations
- **Propósito:** Ejecuta validaciones automáticas sobre el código fuente.
- **¿Cómo lo hace?**
  1. Clona el repositorio.
  2. Ejecuta linters para JS y OpenAPI (si está habilitado).
  3. Ejecuta pruebas unitarias y genera reporte de cobertura.
  4. Expone el nombre de la rama como variable de salida.

---

## ¿Por qué es útil?
- Garantiza que el código cumple con los estándares de calidad antes de desplegar.
- Detecta errores y problemas antes de que lleguen a producción.

---

## ¿Cómo se usa?
No necesitas hacer nada especial. El workflow se ejecuta automáticamente antes del despliegue.

---

## Resumen visual del flujo
1. Clona el repositorio
2. Ejecuta linters
3. Ejecuta pruebas unitarias
4. Expone el nombre de la rama

---

Si tienes dudas, revisa el archivo `.github/workflows/pre-deploy-validations.yaml` o contacta al responsable del repositorio.
