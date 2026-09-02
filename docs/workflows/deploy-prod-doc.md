# Documentación: Workflow Deploy Prod

## ¿Qué es este archivo?
Este archivo es un workflow de GitHub Actions llamado **Deploy Prod**. Su función es desplegar automáticamente la aplicación `demo-api-appCliente` en el entorno de producción (prod) cada vez que se realiza un push a la rama `master`.

---

## ¿Cuándo se ejecuta?
Se activa en estos casos:
- Cuando se realiza un push a la rama `master` (`push`)

---

## ¿Qué permisos usa?
Solicita permisos mínimos para escribir tokens de identidad y leer el contenido del repositorio.

---

## Variables de entorno
- `ENVIRONMENT`: Define el entorno de despliegue, aquí es `prod`.
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
  - Usa el workflow compartido (`shared-deploy-api.yaml`) y los valores calculados en los pasos anteriores para desplegar la aplicación en el entorno prod.

---

## ¿Por qué es útil?
- Automatiza el despliegue en el entorno de producción, asegurando que los cambios lleguen rápidamente y de forma controlada.
- Permite la integración continua y la gestión automática de dependencias.

---

## ¿Cómo se usa?
No necesitas hacer nada especial. Si haces push a la rama `master`, el despliegue se realiza automáticamente.

---

## Resumen visual del flujo
1. Detecta el evento (push a master)
2. Ejecuta validaciones previas
3. Despliega la API

---

Si tienes dudas, revisa el archivo `.github/workflows/deploy-prod.yaml` o contacta al responsable del repositorio.
