# Documentación: Workflow Cleanup Dev

## ¿Qué es este archivo?
`.github/workflows/cleanup-dev.yaml` elimina stacks de AWS efímeros: los que se crean para probar una rama y ya no se necesitan.

> **Importante:** hoy `deploy-dev.yaml` despliega siempre al stack fijo `secrets-dev`, no crea un stack por rama. Mientras eso no cambie, este workflow no encontrará nada que borrar en sus disparos automáticos (termina en verde diciendo que el stack no existía). Sigue siendo útil de forma manual, y queda listo para el día que se adopten ambientes efímeros por rama.

---

## ¿Cuándo se ejecuta?
- Al eliminar una rama (`delete`). Las etiquetas se ignoran.
- Al cerrar un Pull Request (`pull_request: closed`), sea por merge o descarte.
- Manualmente desde la pestaña Actions (`workflow_dispatch`), donde se puede escribir el nombre exacto del stack.
- Cuando otro workflow lo llama (`workflow_call`).

---

## Variables de entorno
- `APP_NAME`: prefijo de los stacks efímeros, aquí `demo-secrets`.
- `AWS_REGION`: `us-east-1`.

---

## ¿Qué trabajos (jobs) realiza?

### 1. get-stack-name
Calcula el nombre del stack a eliminar, en este orden:

1. Si se pasó `STACK_NAME` como entrada, se usa tal cual.
2. Si la rama es de dependabot (`dependabot/…`), el stack es `demo-secrets-dependabot`; todas esas ramas comparten uno solo.
3. Si no, toma el nombre de la rama, lo pasa a minúsculas, reemplaza cada carácter que no sea `a-z0-9` por un guion y lo recorta a 9 caracteres: `demo-secrets-<slug>`.

**Salvaguarda:** si el nombre resultante es `secrets-dev`, `secrets-test` o `secrets-prod`, el job falla a propósito. Son los stacks fijos de cada ambiente y no deben borrarse por accidente desde aquí.

### 2. cleanup-resources
1. Clona el repositorio.
2. Asume el rol de AWS vía OIDC usando la variable `PIPELINE_EXECUTION_ROLE` del Environment `dev`.
3. Comprueba con `describe-stacks` si el stack existe. Si no, termina bien: es lo normal en ramas que nunca desplegaron o en limpiezas repetidas.
4. Si existe, lo borra con `sam delete --no-prompts`.

---

## Permisos de AWS que necesita
El `PipelineExecutionRole` que crea `pipeline-bootstrap.yaml` incluye `cloudformation:DeleteStack` y `s3:DeleteObject` sobre el bucket de artefactos, que es lo que `sam delete` requiere además de los permisos de despliegue.

---

## ¿Cómo se usa?
De forma automática no hay que hacer nada. Para borrar un stack a mano: Actions → **Cleanup Dev** → *Run workflow* → escribir el nombre del stack en `STACK_NAME`.
