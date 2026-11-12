# Estado verificado y fuentes

## Corte de auditoría

Actualización del **12 de noviembre de 2026** (Claude Code):

- El sitio publicado coincide con la v45 en las rutas revisadas; `/confirmar-correo` responde 404, así que la corrección de registro del 23-oct no está publicada.
- En la rama `claude/kind-davinci-64007v` se integró esa corrección y se construyó Enlaces APJ (`/enlaces`, postulación y cartas). Ver `docs/enlaces-apj.md`. Nada de esto está desplegado.
- `.openai/hosting.json` no está en el repositorio; compilar exige una copia local sin versionar.
- Decisión de Emi: migrar el alojamiento a su cuenta de Cloudflare. Plan en `docs/migracion-cloudflare.md`, sin ejecutar.
- «La ruta · Plan maestro y Formatos de Evento» (Drive, 5-nov-2026) es la ficha vigente de los eventos de diciembre a marzo; todo en estado de propuesta.

Corte anterior:

Estado observado el **3 de noviembre de 2026**:

- No existía una skill local o en el repositorio que reuniera eventos, comunicación, presentaciones, sitio, podcast, datos y formularios.
- El proyecto de ChatGPT se identificaba como **ACCIÓN NACIONAL TLALNEPANTLA**.
- El sitio **Acción Política Juvenil Tlalnepantla** estaba activo y público en Sites, versión 45.
- `https://acciontlalnepantla.site` y rutas públicas principales respondían; `/crear-cuenta` mostraba el registro disponible en esa consulta.
- El repositorio público `lianfixx/ACCION-TLALNEPANTLA-` contenía una importación de 283 archivos de la versión 45 y una sola confirmación histórica de importación. No contenía `SKILL.md`.
- El código incluía seis comisiones, agenda, publicaciones, registro, cuentas, panel, documentos, actividades, formularios, pruebas y PDFs de operación.
- La publicación de versión 45 figuraba como despliegue exitoso. Eso no acredita por sí solo cada flujo autenticado, correo, captcha, carga, respaldo o integración.

Este corte caduca. Revalida antes de afirmar que algo está “actualizado”, “funciona”, “está publicado” o “está confirmado”.

## Jerarquía de fuentes del proyecto

1. Instrucción actual del usuario y archivos aportados para el encargo.
2. Estado real del repositorio, despliegue, dominio y datos autorizados.
3. Documentación vigente dentro de `lianfixx/ACCION-TLALNEPANTLA-`, especialmente `AGENTS.md`, `README.md`, `docs/comisiones-operacion.md`, `docs/requisitos-activos.md` y documentos específicos del módulo.
4. Conversación **Recuperar código contexto reglas** del proyecto de ChatGPT.
5. Formato APJ-F01 y guías de comisión en `public/documentos`.
6. Materiales históricos de Cafecito Juvenil, Parlamento Juvenil, la presentación original y Voces 360.
7. Fuentes oficiales o académicas actuales para hechos externos.

Una fuente posterior y específica puede sustituir una anterior, pero registra la decisión y no borres el antecedente si explica un material histórico.

## Contradicciones conocidas

- La iniciativa universitaria se describió como independiente y apartidista; la identidad vigente del sitio está vinculada con Acción Nacional.
- Cafecito Juvenil usó un ajolote; la mascota vigente es un cacomixtle.
- Documentos históricos del evento contenían horarios diferentes.
- Auditorías antiguas describieron canales cerrados, acceso externo o estados previos que luego cambiaron.
- El repositorio importó el contenido de Sites, pero su commit de importación no es el mismo identificador del código fuente de Sites.

Resuelve estas contradicciones por encargo, fecha y evidencia. No elijas silenciosamente la versión que convenga al diseño.

## Comprobaciones mínimas por resultado

- **Documento**: contenido, formato, render, páginas y archivo editable.
- **Flyer**: datos, identidad, tamaños, contraste, permisos, enlace y QR.
- **Presentación**: narrativa, fuentes, notas, render de todas las diapositivas y exportación.
- **Sitio**: código, pruebas, build, despliegue terminal, URL y flujo real autorizado.
- **Podcast**: fuentes, derechos, audio, metadatos, publicación por plataforma y correcciones.
- **Datos/formularios**: aviso, validación, seguridad, acuse, almacenamiento, exportación y recepción real.
- **Evento**: autorización, confirmaciones, operación, asistencia, evidencias, resultados y pendientes.

## Actualización de la memoria operativa

Cuando el usuario cambie una regla o se confirme un hecho, actualiza la referencia específica y la fecha de corte. No conviertas una preferencia de una pieza en regla universal sin comprobar que el usuario la quiere para el sistema completo.
