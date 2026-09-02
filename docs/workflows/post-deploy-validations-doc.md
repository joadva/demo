# Documentación: Workflow Post-deploy Validations

## ¿Qué es este archivo?
Este archivo es un workflow de GitHub Actions llamado **Post-deploy Validations**. Su función es ejecutar pruebas automáticas sobre la API recién desplegada, validando su funcionamiento y seguridad.

---

## ¿Cuándo se ejecuta?
Se activa cuando otro workflow lo llama (`workflow_call`), normalmente después de un despliegue.

---

## ¿Qué permisos usa?
Solicita permisos mínimos para escribir tokens de identidad y leer el contenido del repositorio.

---

## Variables de entrada
- `ENVIRONMENT`: Entorno donde se desplegó la API.
- `BASE_URL`: URL base de la API desplegada.
- `TOKEN_URL`: URL para obtener el token JWT de autenticación.

---

## ¿Qué trabajos (jobs) realiza?

### 1. portman
- **Propósito:** Ejecuta pruebas automáticas sobre la API usando Portman.
- **¿Cómo lo hace?**
  1. Instala dependencias y configura el entorno.
  2. Obtiene un token de acceso usando la URL de token y credenciales de prueba.
  3. Ejecuta pruebas sobre la API usando Portman y la URL base.
  4. Sube los resultados como artefacto.

---

## ¿Por qué es útil?
- Valida automáticamente el funcionamiento de la API tras el despliegue.
- Permite detectar errores o problemas de integración de forma temprana.

---

## ¿Cómo se usa?
No necesitas hacer nada especial. El workflow se ejecuta automáticamente tras el despliegue.

---

## Resumen visual del flujo
1. Recibe las URLs y entorno
2. Obtiene el token de acceso
3. Ejecuta pruebas sobre la API
4. Sube los resultados

---

Si tienes dudas, revisa el archivo `.github/workflows/post-deploy-validations.yaml` o contacta al responsable del repositorio.
