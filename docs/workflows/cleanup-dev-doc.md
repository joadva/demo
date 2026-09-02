# Documentación: Workflow Cleanup Dev

## ¿Qué es este archivo?
`.github/workflows/cleanup-dev.yaml` elimina los stacks efímeros que `deploy-dev.yaml` crea por cada Pull Request, cuando ese PR se cierra o su rama se borra.

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
Llama a `resolve-stack-name.yaml`, el mismo workflow que usa `deploy-dev.yaml` para nombrar el stack al crearlo. Ahí está la garantía de que se borra exactamente lo que se creó: la regla vive en un solo archivo.

El orden que aplica es: nombre explícito si se pasó `STACK_NAME` → `demo-secrets-dependabot` si la rama es de dependabot → si no, `demo-secrets-<slug>` con la rama en minúsculas, sin caracteres especiales y recortada a 9 caracteres.

### 2. cleanup-resources
1. **Protege los stacks fijos:** si el nombre resuelto es `secrets-dev`, `secrets-test` o `secrets-prod`, el job falla a propósito. Los efímeros siempre llevan el prefijo `demo-secrets-`, así que una colisión no debería darse; el freno existe porque el nombre también puede llegar escrito a mano por `workflow_dispatch`.
2. Clona el repositorio.
3. Asume el rol de AWS vía OIDC usando la variable `PIPELINE_EXECUTION_ROLE` del Environment `dev`.
4. Comprueba con `describe-stacks` si el stack existe. Si no, termina bien: es lo normal en ramas que nunca desplegaron o en limpiezas repetidas.
5. Si existe, lo borra con `sam delete --no-prompts`.

---

## Permisos de AWS que necesita
El `PipelineExecutionRole` que crea `pipeline-bootstrap.yaml` incluye `cloudformation:DeleteStack` y `s3:DeleteObject` sobre el bucket de artefactos, que es lo que `sam delete` requiere además de los permisos de despliegue.

---

## ¿Cómo se usa?
De forma automática no hay que hacer nada. Para borrar un stack a mano: Actions → **Cleanup Dev** → *Run workflow* → escribir el nombre del stack en `STACK_NAME`.
