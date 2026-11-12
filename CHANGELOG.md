# Registro de cambios

Lo más reciente arriba. Formato y reglas: `ia/PROTOCOLO.md`, sección 3. Cada entrada lleva la línea `Agente:`.

## 2026-11-12 · freno de secretos: menos falsos positivos

- Agente: Claude Code (sesión en la nube)
- Solicitud: Emi, 12/11/2026: autorizó ajustar el freno después de que bloqueara la integración del 23-oct con 13 falsos positivos (marca de tiempo de migración leída como tarjeta, variables `token`/`password` y valores sintéticos `example.test`).
- Cambios: la heurística «asignación de secreto» ya no cuenta como secreto un valor que es llamada a función (`token = randomSecret()`). Nueva opción `skip_heuristics` de la regla `secrets`: en `tests/`, `drizzle/meta/` y `scripts/audit-storage-local.mjs` se omiten solo la asignación genérica y la tarjeta; las claves con formato conocido y las CURP se siguen revisando en todo el repositorio.
- Archivos: `ia/guard.py`, `ia/test_guard.py`, `ia/politica.json` y este registro.
- Verificación: `python3 ia/test_guard.py` → aprobado (34 pruebas, una nueva de regresión); `python3 ia/verificar.py reglas --check` → aprobado.
- Pendiente: `ia/guard.py` debía ser idéntico en los repositorios de lianfixx; llevar el cambio a las demás copias si Emi lo pide. El workflow de GitHub evalúa con las reglas de la base, así que el primer push con esta integración puede salir en rojo una vez.

## 2026-11-12 · integración de la corrección de registro y activación (23-oct)

- Agente: Claude Code (sesión en la nube)
- Solicitud: Emi, 12/11/2026: seguir construyendo aquí la última versión de la página, sobre v45 más la corrección del 23-oct, con migración posterior a una cuenta propia de Cloudflare.
- Cambios: se fusiona `fix/account-registration-verification` (Codex/Emi, 23-oct): activación que sobrevive a la recarga, formularios sin JavaScript por POST sin exponer contraseñas, registro público con Turnstile y confirmación de correo por Resend, migración `0015_email_confirmation.sql`. Se resolvió el conflicto de README conservando la operación de comisiones y la nueva regla. Consecuencia: el registro público queda cerrado hasta configurar Resend y Turnstile en producción.
- Archivos: los 31 de la rama (ver `docs/registro-confirmacion-correo.md`), `README.md` y este registro.
- Verificación: `npm run typecheck`, `npm run lint` y `npm test` → aprobado (187 pruebas, 0 fallidas), con un `.openai/hosting.json` local que solo declara los bindings `DB` y `BUCKET` y no se versiona. Prueba de navegador `tests/browser/account-access.mjs` → no ejecutado.
- Pendiente: el `.openai/hosting.json` real no está en el repositorio; no desplegado; configurar Resend (remitente con dominio verificado) y Turnstile antes de abrir el registro.

## 2026-11-05 · La ruta: plan maestro, formatos y presentación (registro aplicado el 12-nov)

- Agente: Claude (claude.ai, Opus 5.5); registro aplicado por Claude Code el 12/11/2026 desde el documento de Drive.
- Solicitud: Emi, 5/11/2026: presentación «La ruta» con seis actividades, Enlaces APJ, sitio y Voces 360, Formatos de Evento y formulario para el show de magia.
- Cambios: plan maestro con ficha única, seis Formatos APJ-F01, bases de Enlaces APJ, oficios, registros, riesgos y fuentes (Claude Docs, copia en Drive «La ruta · Plan maestro y Formatos de Evento»); presentación de 17 diapositivas; formulario para el equipo de magos en Jotform, sin compartir.
- Archivos: ninguno en el repositorio; entregables en claude.ai, Drive y Jotform.
- Verificación: datos de la Novena Regidora y de la representación del PAN ante el INE cotejados en fuentes públicas; fechas revisadas; render de diapositivas no ejecutado.
- Pendiente: confirmaciones externas de la ficha única; aprobación del Comité de las bases de Enlaces APJ; flyers con fechas confirmadas; páginas de Luma; prueba del formulario en celular.

## 2026-11-04 · corrección: puentes de skill con YAML válido

- Agente: Claude Code (sesión en la nube)
- Solicitud: autocorrección de Claude Code al revisar la skill matriz-castorena (4/11/2026).
- Cambios: los puentes `.claude/skills/` y `.agents/skills/` copiaban la descripción sin comillas; si contenía «: » el YAML quedaba inválido (afectaba a tareas-maestria y meta-ads-client-onboarding). Ahora va entre comillas, `ia/check_skill.py` rechaza valores que rompan el YAML y el control previo al commit revisa también los puentes.
- Archivos: `ia/check_skill.py`, `ia/politica.json`, `ia/REGLAS.md`, puentes de skill (si existen) y este registro.
- Verificación: `python3 ia/test_guard.py` → aprobado; `python3 ia/verificar.py inicio` → aprobado.
- Pendiente: ninguno.

## 2026-11-04 · corrección: flag de push mal formado

- Agente: Claude Code (sesión en la nube)
- Solicitud: autocorrección de Claude Code al revisar su propio comando (4/11/2026).
- Cambios: la regla que prohíbe forzar el push no atrapaba flags cortos mal formados que contienen `f` o `d` (por ejemplo `-f-never`); el patrón ahora es `-(?!-)\S*[fd]\S*`. Se añadió el caso a las pruebas. Ese push concreto (rama de mes.) fue de avance lineal y no borró historial.
- Archivos: `ia/politica.json`, `ia/REGLAS.md`, `ia/INSTRUCCIONES_PROYECTO.md` y este registro.
- Verificación: `python3 ia/test_guard.py` → aprobado; `python3 ia/verificar.py inicio` → aprobado.
- Pendiente: ninguno.

## 2026-11-04 · frenos de git también para Codex, ChatGPT y Gemini

- Agente: Claude Code (sesión en la nube)
- Solicitud: Emi, 4/11/2026: que los frenos de git funcionen también con Codex y ChatGPT, no solo con Claude.
- Cambios: `python3 ia/verificar.py inicio`, que `AGENTS.md` pide ejecutar a cualquier IA al empezar, ahora también activa los hooks de git si faltan (antes solo lo hacía el hook de Claude Code). Así Codex, ChatGPT con terminal y Gemini CLI quedan con los mismos frenos de commit y push. `AGENTS.md` e `ia/INSTRUCCIONES_PROYECTO.md` lo indican.
- Archivos: `ia/verificar.py`, `ia/test_guard.py`, `ia/INSTRUCCIONES_PROYECTO.md`, `AGENTS.md` y este registro.
- Verificación: `python3 ia/test_guard.py` → aprobado; `python3 ia/verificar.py inicio` → aprobado.
- Pendiente: ninguno.

## 2026-11-04 · arranque común entre IA (protocolo 1.1.0)

- Agente: Claude Code (sesión en la nube)
- Solicitud: Emi, 4/11/2026: «haz lo que tengas que hacer para que entiendas» las reglas al trabajar.
- Cambios: `python3 ia/verificar.py inicio` resume al empezar rama, último commit y su IA, reglas, registro vigente y hooks de git; en Claude Code corre solo con un hook `SessionStart` y activa los hooks de git si faltan. `ia/PROTOCOLO.md` pasa a 1.1.0; `AGENTS.md`, `GEMINI.md` e `ia/INSTRUCCIONES_PROYECTO.md` indican el comando a las demás IA.
- Archivos: `.claude/settings.json`, `ia/verificar.py`, `ia/test_guard.py`, `ia/PROTOCOLO.md`, `ia/INSTRUCCIONES_PROYECTO.md`, `AGENTS.md`, `GEMINI.md` y este registro.
- Verificación: `python3 ia/test_guard.py` → aprobado; `python3 ia/verificar.py inicio` → aprobado.
- Pendiente: ninguno.

## 2026-11-04 · 1.1.1 · registro obligatorio y trabajo entre IA

- Agente: Claude Code (sesión en la nube; modelo según la sesión)
- Solicitud: Emi, 4/11/2026: auditar y documentar las mejoras, hacerlas funcionar igual con ChatGPT, Gemini u otra IA, y documentar siempre todo cambio, use la IA que use, bajo las mismas reglas.
- Cambios: capa común `ia/` (protocolo común 1.0.0 basado en el de Mes, `REGLAS.md` generadas de `politica.json`, frenos para Claude Code, hooks de git para cualquier IA, workflow `registro-ia.yml`, `INSTRUCCIONES_PROYECTO.md` para ChatGPT y Gemini, plantillas de petición y entrega); `GEMINI.md`; sección «Trabajo entre IA» en `AGENTS.md`; `.claude/settings.json` apunta a `ia/guard.py` (se retira `.claude/hooks/`); auditoría en `ia/AUDITORIA_2026-11-04.md`. Skill 1.1.1: sección «Registro y continuidad entre IA» y nota de portabilidad en `references/claude-code.md`; el método no cambia.
- Archivos: ver `ia/AUDITORIA_2026-11-04.md`, sección «Archivos cambiados».
- Verificación: `python3 ia/test_guard.py` → aprobado; `python3 ia/verificar.py reglas --check` → aprobado; `ia/check_skill.py` → aprobado.
- Revisión independiente: 17 hallazgos sobre el código común; corregidos los reproducidos, con pruebas de regresión (detalle en `ia/AUDITORIA_2026-11-04.md`).
- Pendiente: activar los hooks de git en cada copia (`sh ia/instalar.sh`); opcionalmente exigir el check `registro-ia` con protección de rama en GitHub.

