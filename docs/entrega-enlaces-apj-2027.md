# Entrega · Apartado Enlaces APJ 2027

Formato de `ia/plantillas/ENTREGA.md`. Fecha de corte: 16 de noviembre de 2026.

- **Agente:** Claude Code (sesión en la nube). **Solicitante e integrador:** Emi. **Revisor:** pendiente.
- **Repositorio:** `lianfixx/ACCION-TLALNEPANTLA-`, rama `claude/kind-davinci-64007v`. **Base:** `1707fec6f0a4a150a0670e0ab733edfec37f9dd5`. **HEAD del código:** `51cd4d94c44200ac5074fecded8e017c5eba5b3e`.
  - La petición pedía partir de `main`. `main` (`25e3156`) está 21 commits detrás de esta rama, que es la que está publicada en `acciontlalnepantla.site`. Se trabajó sobre la rama publicada.

## Encargo y alcance

Construir el apartado Enlaces APJ 2027 para que se publique solo el 23-nov-2026 a las 00:00 y cierre solo el 6-dic-2026 a las 23:59 (America/Mexico_City). Hecho: página pública por fases, postulación en `/cuenta/enlaces`, panel `/admin/enlaces`, datos, seguridad, aviso y pruebas. Detalle de funcionamiento en `docs/enlaces-apj.md`.

Cambios de plan respecto de la petición:

- **Puntaje:** una sola hoja por postulación, capturada por administración, en lugar de tres evaluadores con promedio. Decisión de Emi del 16-nov («decisión colegiada de 3 pero solo yo decido»).
- **Consentimiento al inicio:** la casilla del aviso se marca antes de empezar, no al final, para que nada se guarde ni se suba sin consentimiento. La autorización para publicar el nombre sí va al final.
- **Fechas:** fijas en el código y sobrescribibles con dos variables de servidor para ensayar. No son editables desde el panel.
- **Categorías de documentos:** se usan las existentes `motivation_letter` y `recommendation_letter`, no `carta_motivos` y `carta_recomendacion`.
- **Flujo anterior de Enlaces:** se retiró (casilla en la solicitud, ajustes de apertura manual, bloques editables de `/enlaces`, pestaña de cartas, botón de la ficha). El texto de la convocatoria ya no se edita desde el panel.
- **PDF oficial:** no se versiona, porque el repositorio es público. Se sirve solo desde el almacenamiento privado y queda oculto hasta la apertura.
- **Reglas añadidas en el servidor**, tomadas de la convocatoria: puntaje antes de seleccionar, mínimo de 60 en Comunidad, dos plazas por comisión y una por universidad o colonia; la decisión no se muestra a la persona hasta publicar resultados.
- **Entre el cierre y los resultados** la entrada sale del menú y de la portada, como dice la petición («solo mientras esté abierta o con resultados»). La página sigue visible por su dirección.

No se hizo: el `.docx` editable (no llegó y no se publica); distinguir titular y apoyo; avisos por correo de entrevista o resultado; rol de evaluador.

## Archivos

68 archivos respecto de la base: 17 nuevos y 51 modificados (`git diff --stat 1707fec 51cd4d9`).

- **Nuevos, módulo:** `drizzle/0017_enlaces_2027.sql` y su snapshot; `lib/enlaces-shared.ts`, `lib/enlaces-convocatoria.ts`, `lib/enlaces-documents.ts`, `lib/enlaces-view.ts`, `lib/enlaces-admin.ts`; `app/cuenta/enlaces/` (página y formulario); `app/api/enlaces/` (postulación y documentos); `app/admin/enlaces/` (lista, detalle, herramientas); `app/api/admin/enlaces/` (acciones y exportación).
- **Reescritos:** `lib/enlaces.ts`, `app/enlaces/page.tsx`, `tests/enlaces.test.mjs`, `docs/enlaces-apj.md`.
- **Conexión con el sitio:** `db/schema.ts`, `app/layout.tsx`, `app/SiteHeader.tsx`, `app/page.tsx`, `app/comisiones/page.tsx`, `app/sitemap.xml/route.ts`, `app/archivos/[file]/route.ts`, `lib/site-documents.ts`, `lib/account-paths.ts`, `app/crear-cuenta/`, `app/admin/ingresar/page.tsx`, `app/api/registro-cuenta/route.ts`, `app/admin/AdminHeader.tsx`, `lib/retention.ts`, `lib/people-actions.ts`, `app/globals.css`.
- **Avisos:** `lib/membership-notice.ts`, `lib/membership.ts`, `app/privacidad/page.tsx`, `app/terminos/page.tsx`.
- **Retiro del flujo anterior:** `lib/site-settings.ts`, `lib/runtime-env.ts`, `app/admin/SettingsManager.tsx`, `lib/site-content*.ts`, `app/admin/contenido/`, `app/participacion/`, `lib/membership-profile.ts`, `app/ApplicationProfileView.tsx`, `app/mi-comision/Workspace.tsx`, `lib/workspace-navigation.ts`, `app/api/espacio/`, `app/api/incorporaciones/`, `app/admin/personas/[id]/PersonRecord.tsx`.

## Verificación

Comandos ejecutados el 16-nov-2026 sobre `51cd4d9`, con salida guardada fuera del repositorio:

| Comando | Resultado |
|---|---|
| `npm run typecheck` | aprobado, 0 errores |
| `npm run lint` | aprobado, 0 errores y 0 avisos |
| `npm test` | aprobado, 222 de 222 |
| `node --test tests/enlaces.test.mjs` | aprobado, 16 de 16 (pruebas propias) |

Las 206 pruebas restantes son heredadas; tres se ajustaron por el retiro del flujo anterior y una por el borrado diario.

Las pruebas propias mueven el reloj, no la configuración, así que comprueban la ventana oficial:

1. **Fases.** 22-nov: solo título y fecha, sin bases, sin botón, sin entrada en menú, portada ni sitemap, PDF en 404; administración ve vista previa. Minuto exacto: 05:59:59Z cerrado, 06:00:00Z abierto, 07-dic 05:59:59Z abierto, 06:00:00Z cerrado. Abierta: las once bases, «Postularme», PDF, entrada en menú y portada, sitemap. Cerrada: «Postulaciones cerradas», sin entrada. Resultados: bloque con nombres autorizados y entrada de vuelta.
2. **Flujo completo.** Consentimiento con el aviso vigente, borrador parcial, envío rechazado mientras falta algo, tres documentos, envío con folio `ENL27-…`, edición después de enviar, folio visible en la cuenta, auditoría.
3. **Documentos.** Subida de los tres, reemplazo que deja un solo archivo, reutilización de la identificación ya entregada (con su conservación alineada) y descarga con sesión de administración; otra cuenta recibe 404 y sin sesión 401.
4. **Límites.** Menor de 18 y mayor de 29 al cierre (y los dos días frontera válidos), fecha imposible, segunda postulación con la misma cuenta (409), archivo de 6 MB (413), contenido que no corresponde y HTML (415), carta de motivos en imagen (415), categoría ajena (400), cuenta sin postulación (403), origen ajeno (403), envíos, cambios y archivos fuera de la ventana (409).
5. **Puntaje.** Un solo registro por postulación, límites 30, 25, 25 y 20, sin decimales, total automático. No hay promedio de tres evaluadores porque Emi lo cambió.
6. **Selección y resultados.** Sin puntaje no se selecciona; mínimo de 60 en Comunidad; tercera persona en una comisión rechazada; conservación hasta el 17-ene-2028 para seleccionadas y suplentes; publicar solo después del cierre; nombres sin autorización nunca aparecen.
7. **Sin afiliación.** Ningún archivo del módulo contiene «afilia» ni «militan», y las páginas `/enlaces`, `/cuenta/enlaces` y la respuesta de la API se comprueban en una prueba. El PDF oficial tampoco la menciona.
8. **Exportación.** CSV con BOM, fórmulas neutralizadas, sin cartas, textos, fechas de nacimiento ni archivos, y con registro.

Recorrido en celular: Chromium a 375 px contra el Worker compilado, con base en memoria, almacenamiento simulado y reloj simulado en 22-nov, 25-nov y 8-dic de 2026. Se hizo con la interfaz real: aceptar el aviso, llenar el formulario, subir tres archivos, recargar y comprobar el borrador, enviar, ver el folio; después puntaje, selección, descarga autenticada y publicación desde el panel. 26 capturas, 0 px de desborde en todas, sin errores de página ni de consola.

## Lo que no se pudo probar y por qué

- **Producción.** Nada está publicado. La migración 0017 no se ha aplicado en la base real.
- **Alta de cuenta y confirmación de correo dentro del flujo.** Las pruebas usan cuentas sembradas. El registro real depende de Turnstile y Resend, que no se ensayan en local.
- **Ingreso con contraseña en producción.** El plan gratuito de Workers cortó peticiones el 13-nov al comprobar contraseñas. Sin Workers Paid, el ingreso y el alta pueden fallar con la convocatoria abierta.
- **Almacenamiento real.** Las subidas se probaron contra un almacenamiento en memoria, no contra R2.
- **Teléfono físico.** Las capturas son de Chromium emulando 375 px, no de un iPhone o Android real.
- **PDF oficial servido.** La ruta se probó con un PDF sintético. El oficial (5 páginas, 4.2 MB, páginas como imagen) todavía no está en el almacenamiento privado.
- **Lectores de pantalla.** No se hizo una revisión con lector de pantalla.

## Riesgos y recuperación

- **El repositorio es público.** El texto de la convocatoria ya está en esta rama desde el 16-nov, una semana antes de su publicación. Decide Emi si hace privado el repositorio.
- **Plan de Workers.** Activar Workers Paid antes del 23-nov.
- **Cuenta propietaria.** Emi no ha entrado desde el restablecimiento de contraseña del 13-nov.
- **Revertir:** `git revert` de los commits `fc8ce07`, `e3931e8` y `51cd4d9`. La migración 0017 solo agrega dos tablas; no toca las existentes.

## Estado

Enviado a la rama de trabajo. Sin revisión. Sin integrar a `main`. Sin publicar. Siguiente acción: Emi autoriza publicar; después se aplica la migración, se sube el PDF oficial y se comprueba `/enlaces` en producción en estado «antes de la apertura».

## Dudas para Emi

- Lista de universidades: quedó con las siete de la convocatoria y la opción «Otra».
- Cómo se avisa a cada persona la hora de su entrevista.
- Si se distingue titular y apoyo al publicar resultados.
- La presidencia del Comité no se nombra en ningún lugar del sitio.

## Actualización del 16-nov-2026, después de la auditoría independiente

La entrega anterior describe el commit `51cd4d9`. Después se agregaron dos cambios, y esta sección manda donde contradiga lo de arriba.

- **Titular y apoyo** (`60ecb43`, migración `0018_enlaces_plaza`). Emi lo pidió el 16-nov; ya no es una duda abierta.
- **Correcciones de la auditoría** (commit siguiente, migración `0019_enlaces_plaza_unica`). Nada crítico; dos hallazgos altos y diez medios, todos corregidos:
  - El guardado automático compartía límite con enviar y retirar y podía dejar a alguien sin poder enviar. Ahora son límites separados y el guardado espera 4 segundos.
  - La fecha de conservación delataba la decisión antes de los resultados. Ahora se amplía al publicar, se deshace al retirar los resultados y no sale del servidor.
  - La evaluación (puntaje, estado, nota) solo se abre al cierre.
  - Los documentos de una postulación enviada ya no se quitan desde Mi comisión; una identificación revisada no se reemplaza; los archivos se ocultan antes de borrarse; dos cargas simultáneas ya no se borran entre sí.
  - Una plaza por universidad o colonia aunque se escriba distinto; índice único para titular y apoyo.
  - La autorización de nombre dice con qué datos se publica y se puede quitar; las cuentas suspendidas no salen en resultados.
  - El aviso menciona el puntaje, la nota de entrevista y a Resend. El enlace al PDF solo aparece si el PDF está subido. El historial se borra con la postulación.
- **Verificación sobre el árbol corregido:** typecheck y lint sin avisos; `npm test` → 223 de 223 (17 del módulo); recorrido en Chromium a 375 px con 26 capturas, 0 px de desborde y sin errores de página.
- **Sigue sin probarse:** el funcionamiento en producción y la apertura real del 23 de noviembre.
