# Sitio, código y publicación

## Fuentes canónicas

- Sitio público: `https://acciontlalnepantla.site`
- Repositorio: `https://github.com/lianfixx/ACCION-TLALNEPANTLA-`
- Proyecto: React 19, Next/Vinext, Worker de Cloudflare, D1 y R2 a través de Sites.

Antes de cambiar algo, lee `AGENTS.md`, `README.md`, `.openai/hosting.json`, `package.json` y la documentación relacionada con el módulo. Inspecciona el estado publicado y no supongas que la rama, el repositorio y producción coinciden.

## Baseline auditado

Al 3 de noviembre de 2026, Sites mostraba la versión 45 publicada y el dominio respondía. El repositorio público contenía una importación de 283 archivos de esa versión. Esa observación es histórica: revalida versión, commit, despliegue, dominio, datos y rutas en cada encargo.

## Método de cambio

1. Define el comportamiento solicitado y su evidencia de aceptación.
2. Recorre rutas, componentes, API, esquema, migraciones, pruebas y documentación afectados.
3. Conserva decisiones vigentes y elimina contradicciones solo con evidencia.
4. Implementa el cambio más estrecho que resuelva el encargo.
5. Ejecuta instalación reproducible, typecheck, lint, build, validación del artefacto y pruebas proporcionales al riesgo.
6. Revisa la interfaz en escritorio, tableta y móvil, teclado, foco, contraste, errores, carga y movimiento reducido.
7. Para producción, verifica despliegue terminal, URL, versión, rutas críticas y flujo real autorizado. Una suite aislada no acredita cuentas, correos, R2, D1 ni formularios en producción.

## Flujos sensibles

- Registro, documentos, afiliación, solicitudes y panel requieren controles de acceso y minimización de datos.
- No copies bases, expedientes, identificaciones, credenciales, tokens, enlaces privados de activación ni datos de producción a GitHub, ejemplos, capturas o conversaciones.
- La incorporación a una comisión, la habilitación del equipo y la afiliación son estados diferentes.
- Contacto general, comentarios, registro y recuperación pueden tener activaciones distintas. Comprueba cada canal por separado.
- No prometas confirmación por correo, captcha, recuperación o integración externa por la sola existencia de un componente o una variable.

## Formularios y panel

Comprueba validación cliente y servidor, consentimiento exacto, aviso vigente, límites, antiabuso, persistencia de borrador, conflictos, accesibilidad, acuse, trazabilidad y permisos dentro de la escritura. Prueba también estados vacíos, expirados, revocados y fallos de red.

## Publicación

No modifiques el dominio, acceso, audiencia, variables, bindings o datos reales fuera del encargo. Antes de publicar, confirma que el estado fuente está respaldado y que el destino correcto fue seleccionado. Después, consulta el despliegue hasta estado terminal y comprueba el dominio personalizado. Reporta por separado código guardado, versión creada, despliegue exitoso y funcionamiento observado.
