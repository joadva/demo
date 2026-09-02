# Documentación: Workflow Shared Deploy API

## ¿Qué es este archivo?
Este archivo es un workflow de GitHub Actions llamado **Shared Deploy API**. Su función es construir y desplegar automáticamente la aplicación API en AWS usando SAM, y exponer las URLs necesarias para el consumo de la API y autenticación.

---

## ¿Cuándo se ejecuta?
Se activa cuando otro workflow lo llama (`workflow_call`), normalmente como parte de un proceso de despliegue.

---

## ¿Qué permisos usa?
Solicita permisos mínimos para escribir tokens de identidad y leer el contenido del repositorio.

---

## Variables de entrada
- `ENVIRONMENT`: Entorno donde se desplegará la API.
- `AWS_REGION`: Región de AWS donde se desplegará el stack.
- `STACK_NAME`: Nombre del stack a desplegar (por defecto `demo-back`).

## Variables de salida
- `API_BASE_URL`: URL base de la API desplegada.
- `COGNITO_TOKEN_URL`: URL para obtener el token JWT de autenticación.

---

## ¿Qué trabajos (jobs) realiza?

### 1. build-and-deploy
- **Propósito:** Construye y despliega la aplicación API usando AWS SAM.
- **¿Cómo lo hace?**
  1. Clona el repositorio.
  2. Configura las credenciales de AWS usando un rol seguro.
  3. Reemplaza variables en el archivo de configuración de SAM.
  4. Instala dependencias y construye la aplicación.
  5. Despliega la aplicación en AWS usando SAM.
  6. Obtiene las URLs de la API y Cognito y las expone como variables de salida.

---

## ¿Por qué es útil?
- Automatiza el proceso de construcción y despliegue de la API.
- Expone las URLs necesarias para consumir la API y autenticarse.

---

## ¿Cómo se usa?
No necesitas hacer nada especial. El workflow se ejecuta automáticamente cuando es llamado por otro workflow.

---

## Resumen visual del flujo
1. Clona el repositorio
2. Configura AWS
3. Reemplaza variables en SAM
4. Instala dependencias y construye
5. Despliega la API
6. Expone las URLs

---

Si tienes dudas, revisa el archivo `.github/workflows/shared-deploy-api.yaml` o contacta al responsable del repositorio.
