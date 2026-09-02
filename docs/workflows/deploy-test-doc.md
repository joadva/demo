# Documentación: Workflow Deploy Test

## ¿Qué es este archivo?
Este archivo es un workflow de GitHub Actions llamado **Deploy Test**. Su función es desplegar automáticamente la aplicación `demo-api-appCliente` en el entorno de pruebas (test) cada vez que se ejecuta manualmente.

---

## ¿Cuándo se ejecuta?
Se activa en estos casos:
- Cuando se ejecuta manualmente desde GitHub (`workflow_dispatch`)

---

## ¿Qué permisos usa?
Solicita permisos mínimos para escribir tokens de identidad y leer el contenido del repositorio.

---

## Variables de entorno
- `ENVIRONMENT`: Define el entorno de despliegue, aquí es `test`.
- `BRANCH_NAME`: Detecta el nombre de la rama o PR que disparó el workflow.
- `APP_NAME`: Nombre base de la aplicación, aquí es `demo-api-appCliente`.

---

## ¿Qué trabajos (jobs) realiza?

### 1. pre-deploy-validations
- **Propósito:** Ejecuta validaciones previas al despliegue.
- **¿Cómo lo hace?**
  - Llama a un workflow compartido (`pre-deploy-validations.yaml`) para verificar que todo esté listo antes de desplegar.

### 2. deploy-api
- **Propósito:** Despliega la API en AWS.
- **¿Cómo lo hace?**
  - Usa el workflow compartido (`shared-deploy-api.yaml`) y los valores calculados en los pasos anteriores para desplegar la aplicación en el entorno test.

### 3. post-deploy-validations
- **Propósito:** Ejecuta validaciones posteriores al despliegue.
- **¿Cómo lo hace?**
  - Llama al workflow compartido (`post-deploy-validations.yaml`) para verificar que el despliegue fue exitoso y la API está disponible.

---

## ¿Por qué es útil?
- Automatiza el despliegue en el entorno de pruebas, facilitando validaciones continuas.
- Permite la integración continua y la gestión automática de dependencias.

---

## ¿Cómo se usa?
No necesitas hacer nada especial. Si ejecutas el workflow manualmente, el despliegue se realiza automáticamente.

---

## Resumen visual del flujo
1. Detecta el evento (ejecución manual)
2. Ejecuta validaciones previas
3. Despliega la API
4. Ejecuta validaciones posteriores

---

Si tienes dudas, revisa el archivo `.github/workflows/deploy-test.yaml` o contacta al responsable del repositorio.
