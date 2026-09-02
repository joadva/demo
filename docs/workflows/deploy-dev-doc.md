# Documentación: Workflow Deploy Dev

## ¿Qué es este archivo?
Este archivo es un workflow de GitHub Actions llamado **Deploy Dev**. Su función es desplegar automáticamente la aplicación `demo-api-appCliente` en el entorno de desarrollo (dev) cada vez que se abre un Pull Request hacia la rama `master` o se ejecuta manualmente.

---

## ¿Cuándo se ejecuta?
Se activa en estos casos:
- Cuando se ejecuta manualmente desde GitHub (`workflow_dispatch`)
- Cuando se abre un Pull Request hacia la rama `master` (`pull_request`)

---

## ¿Qué permisos usa?
Solicita permisos mínimos para leer Pull Requests, escribir tokens de identidad y leer el contenido del repositorio. En el job de auto-merge para dependabot, también solicita permisos de escritura para PRs y contenido.

---

## Variables de entorno
- `ENVIRONMENT`: Define el entorno de despliegue, aquí es `dev`.
- `BRANCH_NAME`: Detecta el nombre de la rama o PR que disparó el workflow.
- `APP_NAME`: Nombre base de la aplicación, aquí es `demo-api-appCliente`.

---

## ¿Qué trabajos (jobs) realiza?

### 1. get-stack-name
- **Propósito:** Calcula el nombre del stack de AWS que se debe desplegar.
- **¿Cómo lo hace?**
  - Si la rama es de dependabot, el stack se llama `demo-api-appCliente-dependabot`.
  - Si no, toma el nombre de la rama, lo convierte a minúsculas, reemplaza caracteres especiales y lo recorta a 9 caracteres, para formar el nombre del stack.
  - Guarda ese nombre como variable de salida (`STACK_NAME`).

### 2. pre-deploy-validations
- **Propósito:** Ejecuta validaciones previas al despliegue.
- **¿Cómo lo hace?**
  - Llama a un workflow compartido (`pre-deploy-validations.yaml`) para verificar que todo esté listo antes de desplegar.

### 3. deploy-api
- **Propósito:** Despliega la API en AWS.
- **¿Cómo lo hace?**
  - Usa el workflow compartido (`shared-deploy-api.yaml`) y los valores calculados en los pasos anteriores para desplegar la aplicación en el entorno dev.

### 4. post-deploy-validations
- **Propósito:** Ejecuta validaciones posteriores al despliegue.
- **¿Cómo lo hace?**
  - Llama al workflow compartido (`post-deploy-validations.yaml`) para verificar que el despliegue fue exitoso y la API está disponible.

### 5. auto-merge-dependabot-update
- **Propósito:** Aprueba y fusiona automáticamente actualizaciones de dependabot.
- **¿Cómo lo hace?**
  - Si el actor es dependabot y el evento es un PR, aprueba y fusiona el PR automáticamente si cumple ciertos criterios.

### 6. cleanup-stack
- **Propósito:** Limpia los recursos de AWS asociados al stack cuando ya no se necesitan.
- **¿Cómo lo hace?**
  - Llama al workflow `cleanup-dev.yaml` para eliminar el stack correspondiente, heredando los secretos y permisos necesarios.

---

## ¿Por qué es útil?
- Automatiza el despliegue en el entorno de desarrollo, facilitando pruebas y validaciones continuas.
- Mantiene el entorno limpio eliminando stacks innecesarios.
- Permite la integración continua y la gestión automática de dependencias.

---

## ¿Cómo se usa?
No necesitas hacer nada especial. Si abres un PR hacia `master` o ejecutas el workflow manualmente, el despliegue se realiza automáticamente. La limpieza de recursos también se ejecuta automáticamente al cerrar el PR o cuando dependabot fusiona actualizaciones.

---

## Resumen visual del flujo
1. Detecta el evento (PR, ejecución manual)
2. Calcula el nombre del stack a desplegar
3. Ejecuta validaciones previas
4. Despliega la API
5. Ejecuta validaciones posteriores
6. Aprueba y fusiona PRs de dependabot (si aplica)
7. Elimina el stack cuando ya no se necesita

---

Si tienes dudas, revisa el archivo `.github/workflows/deploy-dev.yaml` o contacta al responsable del repositorio.
