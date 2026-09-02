# Documentación: Workflow Deploy Dev

## ¿Qué es este archivo?
`.github/workflows/deploy-dev.yaml` despliega la API en el ambiente de desarrollo. Tiene dos modos según el evento que lo dispara:

| Evento | Stack | Vida |
|---|---|---|
| Push a la rama `dev` | `secrets-dev` | Permanente, ambiente compartido |
| Pull Request abierto, actualizado o reabierto | `demo-secrets-<slug>` | Efímero, se borra al cerrar el PR |

Ambos usan el mismo Environment de GitHub (`dev`), así que comparten rol, bucket de artefactos y credenciales de base de datos.

---

## ¿Cuándo se ejecuta?
- Push a la rama `dev`.
- Pull Request con los tipos `opened`, `synchronize` y `reopened`. Cada push al PR vuelve a desplegar su stack.

La concurrencia está agrupada por rama con `cancel-in-progress`, así que si empujas dos veces seguidas al mismo PR, la ejecución anterior se cancela en vez de encimarse.

---

## ¿Qué trabajos (jobs) realiza?

### 1. pre-deploy-validations
Llama a `pre-deploy-validations.yaml`: lint del código, lint del OpenAPI si cambió, y las pruebas con cobertura.

### 2. get-stack-name
Llama a `resolve-stack-name.yaml`, que es la única fuente de verdad del nombre:

- En un **push a `dev`** se le pasa `STACK_NAME: secrets-dev` y lo devuelve tal cual.
- En un **Pull Request** se le pasa la rama y calcula: si es de dependabot, `demo-secrets-dependabot`; si no, toma el nombre de la rama en minúsculas, reemplaza lo que no sea `a-z0-9` por guiones y lo recorta a 9 caracteres → `demo-secrets-<slug>`.

`cleanup-dev.yaml` invoca ese mismo workflow para saber qué borrar. Por eso la regla vive en un solo archivo: si estuviera duplicada, cualquier ajuste dejaría stacks huérfanos que nadie elimina.

### 3. deploy-api
Usa `shared-deploy-api.yaml`: asume el rol de AWS por OIDC, sustituye los secrets en `samconfig.ci.yaml`, y corre `sam build` y `sam deploy` sobre el stack resuelto. Expone la URL del API como salida.

### 4. post-deploy-validations
Llama a `post-deploy-validations.yaml`, que corre Portman contra la URL recién desplegada. Está marcado como `continue-on-error`, así que sus fallas no tumban un despliegue que ya salió bien.

### 5. auto-merge-dependabot-update
Si el PR es de dependabot y la actualización es menor o de parche, lo aprueba y lo pone en auto-merge.

---

## La limpieza no vive aquí
El borrado de los stacks efímeros lo hace `cleanup-dev.yaml`, que se dispara solo al cerrar el PR o al borrar la rama. Ver `cleanup-dev-doc.md`.

---

## Requisitos
En el Environment `dev` de GitHub:

- **Variables:** `PIPELINE_EXECUTION_ROLE`, `CLOUDFORMATION_EXECUTION_ROLE`, `ARTIFACTS_BUCKET_NAME`
- **Secrets:** `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`, `DB_DATABASE`

Los tres valores de las variables salen de los Outputs de la pila `pipeline-bootstrap.yaml`.
