# Cómo explicar este proyecto a alguien que nunca ha hecho Lambdas

Guion para una sesión de 60 a 90 minutos con una persona que sabe programar
(JavaScript, HTTP, SQL básico) pero no ha tocado AWS ni SAM. Es el complemento
de `docs/manual.md`: el manual es la referencia; esto es el orden y las
palabras para contarlo.

La idea que guía todo: **no explicar las herramientas primero. Explicar el
viaje de una petición, y presentar cada herramienta en el momento en que la
petición la necesita.**

---

## Antes de la sesión

- Tener abierto: el repo en el editor, la página de Swagger en GitHub Pages,
  la pestaña Actions del repo, y la consola de AWS en CloudFormation.
- Tener corriendo `docker compose up -d` por si se llega al CRUD.
- Verificar que `npm test` pasa y que `secrets-dev` está desplegado.
- Tener una rama nueva creada (`git checkout -b sesion-<nombre>`) para el
  ejercicio en vivo.

---

## 1. Empezar por la demo, no por la teoría (5 min)

Abre el Swagger publicado. Haz `GET /ping` con *Try it out*. Muestra el 200.

> "Esto es todo lo que vamos a entender hoy: cómo esa petición llegó a
> ejecutar código nuestro en AWS, sin que tengamos ningún servidor
> encendido, y cómo ese código llegó ahí solo a partir de un push."

Luego `POST /echo` con `{ "mensaje": 12345 }`. Muestra el 400.

> "Y esto también: fíjate que nos rechazó sin que nuestro código corriera.
> Al final de la sesión vas a saber por qué."

Dejar esas dos cosas como preguntas abiertas mantiene la atención.

## 2. La analogía del restaurante (5 min)

Sirve para toda la sesión; vuelve a ella cada vez que aparezca una pieza nueva.

| En el restaurante | En el proyecto |
|---|---|
| El mesero: recibe el pedido, revisa que esté completo, lo lleva a la cocina y trae el plato | **API Gateway** |
| La carta: qué platos existen y qué lleva cada uno | **`openapi.yaml`** |
| Un cocinero que sólo aparece cuando hay un pedido y se va cuando termina | **Lambda** |
| La receta que el cocinero sigue | **`index.mjs`** |
| La despensa | **MySQL** y sus **stored procedures** |
| El plano del restaurante: cuántos cocineros, qué puede usar cada uno | **`template.yaml`** |
| El constructor que lee el plano y levanta el restaurante | **CloudFormation** (y **SAM** es el plano en versión corta) |
| El inspector que prueba cada plato de la carta después de cada remodelación | **Portman** |

El punto clave de la analogía: **el mesero revisa el pedido contra la carta
antes de entrar a la cocina.** Eso explica el 400 del inicio.

## 3. Seguir la petición por el código (20 min)

Con `/ping` abierto, en este orden y sin saltar:

**a) `openapi.yaml`, ruta `/ping`.** "Aquí el mesero sabe que existe
`GET /ping` y qué forma tiene la respuesta." Señala
`x-amazon-apigateway-integration` → `${PingFunction.Arn}`: "y aquí dice a qué
cocinero se lo lleva".

**b) `template.yaml`, `PingFunction`.** "Este es el cocinero en el plano:
qué carpeta de código tiene, qué archivo y función se invoca (`index.handler`),
qué permisos tiene, y que atiende `GET /ping`." Muestra `Globals`: "todo lo
que no está aquí lo heredan de aquí: Node 24, 128 MB, 10 segundos".

**c) `src/functions/ping/index.mjs`.** Tres cosas y nada más:

1. `handler` es lo que AWS llama. Recibe un **evento** (objeto), no una
   petición HTTP. Devuelve un **objeto** con `statusCode` y `body`, no una
   respuesta HTTP. El mesero traduce en ambos sentidos.
2. La lógica está en `buildPong()`, aparte y exportada, "para poder probarla
   en nuestra máquina sin AWS". Abre el test y córrelo: `npm test`.
3. `initializePowertools` y el `try/catch`: "esto es para que los errores
   salgan como 500 con JSON y para tener logs decentes; no lo toques, cópialo".

**d) Vuelve al 400 del inicio.** Abre el schema de `/echo`:
`mensaje: { type: string, maxLength: 500 }`. "Mandamos un número. El mesero
lo comparó con la carta y lo devolvió. La cocina nunca se enteró. Eso es el
*request validator*." Muestra `BAD_REQUEST_BODY` en el mismo archivo: "y este
es el texto con el que lo devuelve".

Pregunta de control antes de seguir: *"Si quiero que `/ping` devuelva también
la versión, ¿qué archivos toco?"* Respuesta esperada: `index.mjs` y el schema
en `openapi.yaml`. Si contesta bien, entendió la correspondencia.

## 4. Cómo llega el código a AWS (15 min)

Abre la pestaña Actions y el último run de *Deploy Dev*. Recorre los jobs de
arriba abajo, sin entrar al YAML todavía:

- **Pre-Deployment**: "lo mismo que corres en tu máquina: lint y pruebas. Si
  falla, nada se despliega."
- **Deploy API**: "aquí SAM empaqueta cada carpeta de `src/functions` y le
  entrega el plano a CloudFormation." Cambia a la consola de CloudFormation,
  muestra el stack `secrets-dev` y su pestaña *Resources*: "cada cosa del
  `template.yaml` es una fila aquí". Luego *Outputs*: "y aquí está la URL del
  API, que es de donde sale la del Swagger".
- **Post-Deployment**: "el inspector. Portman toma `openapi.yaml`, arma una
  petición por cada ruta, las lanza contra el API que se acaba de desplegar y
  compara las respuestas con los schemas."
- **Publish API Docs**: "y publica la carta actualizada."

Una sola frase sobre permisos, sin entrar en detalle:

> "No hay contraseñas de AWS guardadas en GitHub. GitHub le dice a AWS 'soy
> el repo tal', y AWS tiene un rol que confía en esa identidad. Se llama OIDC
> y se configuró una vez con `pipeline-bootstrap.yaml`."

Si preguntan más, apunta a la sección 9 y 11 del manual y sigue.

## 5. El ejercicio en vivo (25 min)

Es la parte que más enseña. Que la otra persona teclee.

**Meta:** agregar `GET /hora` que devuelva `{ "hora": "<ISO>" }`.

1. Crear `src/functions/hora/index.mjs` copiando `ping`. Renombrar
   `buildPong` → `buildHora`.
2. Crear el test. Correr `npm test`.
3. Agregar la ruta en `openapi.yaml`. Correr `npm run lint-api` — casi seguro
   falla la primera vez (falta `description`, o `maxLength`). Es a propósito:
   que vea que el contrato tiene reglas y que el linter las dice.
4. Agregar `HoraFunction` en `template.yaml`.
5. Agregar `GET::/hora` en `orderOfOperations` de `portman-config.json`.
6. Commit, push, abrir PR hacia `dev`.

Mientras corre el pipeline (4-6 minutos), explicar lo que está pasando:

> "Fíjate en el nombre del stack: `demo-secrets-sesion-xx`. No es `secrets-dev`.
> Tu PR tiene su propio restaurante completo, aparte, para que el inspector
> lo pruebe sin molestar a nadie. Cuando cierres el PR, se demuele solo."

Cuando termine: abrir el resumen de *Deploy API* con la URL del stack efímero,
pegarle a `/hora` con curl o el navegador, ver el run de Portman en verde.
Luego cerrar el PR sin mergear y mostrar que *Cleanup Dev* se dispara y el
stack desaparece de CloudFormation.

Si el pipeline falla, **no lo arregles tú**: lee el log junto con la persona.
Los errores de esta etapa (un `operationId` mal, un `Path` que no coincide)
son la mejor lección de la sesión.

## 6. Si hay tiempo: la base de datos (10 min)

Sólo si el CRUD ya está desplegado o hay Docker a la mano.

`npm run demo` con el MySQL local. Recorre la salida: 201, 409, 400, 404.
Abre `src/functions/clientes/create/index.mjs` y muestra las tres funciones:
`normalizarCliente`, `validarCliente`, `crearCliente`. La pregunta que
conecta con el inicio:

> "¿Por qué `validarCliente` no revisa que `nombre` venga? Porque eso ya lo
> revisó el mesero contra la carta. Aquí sólo van las reglas que la carta no
> puede expresar: que el correo tenga formato, que el nombre no sean puros
> espacios."

Y `callProcedure`: "la Lambda no escribe SQL; le pide a la despensa un
procedimiento por nombre".

## 7. Cerrar (5 min)

Vuelve a las dos preguntas del inicio y deja que la persona las responda:

1. ¿Cómo llegó `GET /ping` a ejecutar nuestro código sin servidor?
2. ¿Por qué `POST /echo` con un número se rechazó sin que corriera nuestro código?

Y deja tres tareas para hacer solo, en orden de dificultad:

- Hacer que `/hora` acepte `?zona=America/Mexico_City` y la use. (Toca schema
  de parámetros y validación en la Lambda.)
- Agregar un `POST /notas` que guarde en memoria y devuelva 201. (Toca
  `requestBody`, `BAD_REQUEST_BODY` y las dos formas de 400.)
- Levantar el CRUD de clientes siguiendo `docs/clientes-example.md`. (Toca
  todo: SQL, template, contrato, Portman.)

---

## Preguntas que van a hacer, y cómo responderlas corto

**"¿Dónde está el servidor?"** — No hay. AWS levanta un contenedor con tu
código cuando llega la petición y lo apaga después. Por eso cobra por
milisegundo de ejecución y no por hora encendido.

**"¿Y si llegan mil peticiones a la vez?"** — AWS levanta mil copias. Es la
parte buena. La parte a cuidar es que cada copia abre su conexión a MySQL;
por eso las Lambdas cierran la conexión al terminar.

**"¿Por qué `httpMethod: POST` en la integración si la ruta es GET?"** —
Ese es el método con el que API Gateway invoca a Lambda por dentro. Siempre
es POST. El método público está arriba, en `get:`.

**"¿Puedo probar en mi máquina sin subir?"** — La lógica sí (`npm test`,
`npm run demo`). El API Gateway completo no, y a propósito: el ambiente de
prueba real es el stack de tu PR, que es idéntico a producción.

**"¿Cuánto cuesta esto?"** — En dev, prácticamente nada: Lambda y API
Gateway tienen capa gratuita generosa, y los stacks efímeros se borran solos.
Lo que sí cuesta es lo que está encendido siempre: una base de datos RDS, o
un secreto en Secrets Manager (por eso está comentado).

**"¿Por qué stored procedures y no SQL en el código?"** — Convención del
equipo: la lógica de datos vive en la base y la Lambda sólo la invoca. Se
puede cambiar el SQL sin redesplegar Lambdas, y se prueba la Lambda simulando
`callProcedure`.

**"¿Qué pasa si rompo `dev`?"** — Nada grave: `dev` se redespliega en el
siguiente push, y `test` y `prod` sólo se despliegan a mano. Y si trabajas
por PR, ni siquiera tocas `dev` hasta mergear.

---

## Errores comunes al explicarlo

- **Empezar por CloudFormation o por IAM.** Es lo más abstracto y lo que
  menos van a tocar. Va al final o no va.
- **Abrir los workflows de GitHub Actions línea por línea.** Mostrar el run
  (jobs y resultados) enseña más que el YAML. El YAML se lee cuando algo falla.
- **Explicar Powertools, middy y esbuild.** Son plomería. "Cópialo de `ping`
  y no lo toques" es la instrucción correcta para la primera semana.
- **Saltarse el ejercicio en vivo por falta de tiempo.** Si hay que cortar
  algo, corta la sección 6 (base de datos), nunca la 5.
- **Corregir tú los errores del pipeline.** El log es la lección.
