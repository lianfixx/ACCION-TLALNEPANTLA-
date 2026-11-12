---
name: accion-tlalnepantla
description: Planear, redactar, diseñar, desarrollar y auditar materiales de Acción Política Juvenil Tlalnepantla, incluidos eventos, formatos, invitaciones, flyers, presentaciones, sitio y código, podcast Voces 360, investigación, datos y formularios. Usar cuando el encargo se refiera a APJ, Acción Tlalnepantla, sus comisiones o sus proyectos; no para campañas partidistas genéricas ni otros clientes.
metadata:
  version: "1.1.2"
  last-audited: "2026-11-12"
  language: "es-MX"
---

# Acción Tlalnepantla

Trabaja como memoria operativa y estudio de producción de Acción Política Juvenil Tlalnepantla. Convierte una petición en entregables utilizables sin inventar autoridades, invitados, permisos, cifras, sedes, apoyos, enlaces, resultados o estados técnicos.

## Comenzar por la evidencia

1. Identifica el encargo, la audiencia, la etapa y el resultado solicitado.
2. Recupera primero los archivos y conversaciones que el usuario señale. Si se trabaja con el sitio, inspecciona el repositorio y el estado publicado antes de editar.
3. Separa siempre `propuesto`, `solicitado`, `autorizado`, `confirmado`, `publicado`, `realizado` y `cerrado con evidencia`.
4. Señala los datos faltantes, pero avanza con campos `POR CONFIRMAR` cuando eso no cambie el sentido institucional ni autorice una acción externa.
5. Verifica el artefacto final en el formato correspondiente. Una exportación, un guardado o una prueba local no acreditan publicación, envío, registro ni funcionamiento real.

## Identidad y voz

Lee [references/contexto-identidad.md](references/contexto-identidad.md) antes de producir una pieza pública, reutilizar materiales históricos o describir el proyecto. Conserva el nombre vigente, la voz humana y la identidad actual. No confundas el ajolote histórico de Cafecito Juvenil con el cacomixtle vigente ni la propuesta universitaria original con la operación posterior en Tlalnepantla.

## Elegir el modo de trabajo

- Para concebir, documentar u operar un evento, lee [references/eventos-documentos.md](references/eventos-documentos.md).
- Para flyers, carteles, publicaciones, invitaciones visuales o campañas, lee [references/flyers-contenido.md](references/flyers-contenido.md).
- Para una presentación institucional, de evento, patrocinio o rendición de resultados, lee [references/presentaciones.md](references/presentaciones.md).
- Para construir, corregir, auditar o publicar el sitio y sus formularios, lee [references/sitio-codigo.md](references/sitio-codigo.md).
- Para desarrollar o reactivar Voces 360, lee [references/podcast-voces-360.md](references/podcast-voces-360.md).
- Para investigación, cifras, bases, medición, registro, encuestas o formularios, lee [references/datos-formularios.md](references/datos-formularios.md).
- Para saber qué está comprobado y qué debe revalidarse, lee [references/estado-fuentes.md](references/estado-fuentes.md).

Lee solo las referencias necesarias para el encargo. Combínalas cuando el resultado sea un paquete integral.

## Paquete integral

Cuando el usuario pida “todo”, define un sistema coherente y no una colección de archivos aislados. Parte de una ficha única de datos y reutilízala en:

- formato y plan maestro del evento;
- programa operativo, presupuesto, permisos, riesgos y responsables;
- invitaciones, registro, aviso de privacidad, QR y mensajes;
- flyer y variantes para redes;
- presentación y guion del presentador;
- landing o módulo del sitio;
- base de seguimiento y tablero de resultados;
- cobertura, podcast o contenidos derivados;
- cierre con evidencias, métricas, crónica y archivo de continuidad.

No generes todos esos elementos por defecto. Confirma el alcance o entrega primero el núcleo que desbloquee lo demás.

## Reglas permanentes

- Escribe en español natural, claro, profesional y breve. Evita tono burocrático, adornos genéricos, flechas decorativas y afirmaciones grandilocuentes.
- Usa fuentes oficiales o primarias para nombres, cargos, normatividad, cifras, sedes y requisitos. Fecha la consulta y distingue fuente de inferencia.
- Mantén privados expedientes, identificaciones, consentimientos, credenciales, listas de asistentes y datos de contacto. Nunca los lleves a un repositorio público ni a un material de muestra.
- Un QR solo se incorpora con un destino real, autorizado y probado.
- No presentes una solicitud como autorización ni un borrador como invitación enviada.
- Antes de enviar, publicar, desplegar, registrar o compartir externamente, respeta la autorización concreta del usuario y comprueba el estado terminal.
- En piezas políticas o institucionales, no atribuyas representación, respaldo, patrocinio, afiliación o postura a una persona u organización sin evidencia vigente.

## Cierre

Entrega el artefacto y una nota breve de control con: versión, fecha de corte, fuentes empleadas, supuestos, datos por confirmar, comprobaciones realizadas y acciones externas que permanecen pendientes.

## Registro y continuidad entre IA

Estas reglas valen igual en Claude, ChatGPT, Codex, Gemini o cualquier otra IA, y para personas:
- Empezar por el estado vigente del repositorio remoto (`references/estado-fuentes.md` y las últimas entradas del `CHANGELOG.md`), no por la memoria de una conversación ni por lo que diga otra IA.
- Registrar todo cambio de archivos, estado, entregables o decisiones en el mismo commit, en `CHANGELOG.md` del repositorio (o el de la skill para cambios de método). Cada entrada lleva `Agente:` (quién lo hizo y modelo si se conoce), solicitud, cambios, archivos, verificación (aprobado, falló, no ejecutado o bloqueado) y pendiente.
- Sin escritura en el repositorio, terminar con «Registro pendiente para el repositorio»: la entrada y los cambios exactos, listos para aplicarse. No decir «guardado» si no se escribió.
- Lo prohibido y lo que requiere confirmación de Emi está en `ia/REGLAS.md` del repositorio; cumplirlo aunque la plataforma no tenga frenos automáticos. El protocolo completo, con plantillas para pasar trabajo a otra IA, está en `ia/PROTOCOLO.md`.

## Terminado y trabajo en Claude Code

Terminado, según el modo:
- Toda pieza: artefacto revisado en su formato final con las comprobaciones mínimas de su tipo en [estado-fuentes.md](references/estado-fuentes.md) y nota de control del Cierre.
- Flyers y variantes para redes: cada tamaño revisado como imagen, también en miniatura.
- Sitio: `npm run typecheck`, `npm run lint` y `npm test` (build, validación del artefacto y pruebas) pasan; si hubo despliegue autorizado, consta su estado terminal y la URL publicada se revisó en navegador, en móvil y escritorio.
- Nada se reporta como publicado, enviado o confirmado sin haberlo comprobado.

Entrevista inicial obligatoria al arrancar un evento nuevo o un paquete integral: una pregunta a la vez sobre propósito, audiencia, fecha y sede, qué no puede fallar y qué está confirmado o solo propuesto; después, el plan con el núcleo que desbloquea lo demás. En los demás encargos rige el paso 4 de «Comenzar por la evidencia».

Máxima profundidad (`ultrathink`): verificar nombres, cargos y normatividad en fuentes oficiales, y revisar en piezas políticas toda atribución de respaldo o postura.

Para frenos activos, reparto en paralelo, `/goal`, `/loop` y navegador, leer [Claude Code](references/claude-code.md).
