# Trabajo en Claude Code

Complemento operativo para Claude Code. No cambia el método de la skill: si algo aquí parece contradecir [SKILL.md](../SKILL.md) o sus referencias, prevalecen ellos.

## Frenos activos (hooks)

El repositorio configura estos frenos:

1. Preguntar antes de desplegar o publicar (`wrangler deploy`, `vercel`, `netlify`, `firebase`, `npm publish`, `gh-pages`) y antes de enviar o publicar por conectores.
2. Antes de cada commit, buscar secretos y datos personales (CURP, tarjetas) en el diff.
3. Preguntar antes de `git push`; `push --force` queda bloqueado.
4. Si cambia SKILL.md, comprobar que siga siendo compatible con claude.ai.

Solo actúan en Claude Code dentro de este repositorio, no en claude.ai ni en otras IA. No sustituyen las reglas de la skill: la autorización concreta, el estado terminal y la privacidad de datos siguen valiendo donde no hay hook.

Las mismas reglas valen fuera de Claude Code: están en `ia/REGLAS.md` (generadas de `ia/politica.json`). Con terminal, `sh ia/instalar.sh` las activa como hooks de git para cualquier IA o persona, y GitHub revisa cada push con `registro-ia.yml`. En chat sin frenos (claude.ai, ChatGPT, Gemini), la IA las cumple por sí misma y entrega el registro pendiente. Además, todo commit sin entrada de registro con `Agente:` queda bloqueado.

## Plan y entrevista

Usar modo plan (Shift+Tab) para un evento nuevo, un paquete integral o un cambio del sitio: investiga y propone sin tocar archivos.

La entrevista es obligatoria al arrancar un evento nuevo o un paquete integral. Prompt listo para copiar:

> Antes de armar el plan, entrevístame. Hazme una pregunta a la vez sobre el propósito, la audiencia, la fecha y la sede, qué no puede fallar y qué está confirmado o solo propuesto, hasta que no te quede ninguna duda. Después muéstrame el plan, empezando por el núcleo que desbloquea lo demás.

## Reparto en paralelo

Para el paquete integral, partir de la ficha maestra de [eventos-documentos.md](eventos-documentos.md). Es la única fuente de datos y solo quien consolida la edita. Un subagente por pieza:

- formato del evento: APJ-F01, plan maestro y programa;
- flyer y variantes para redes;
- presentación y guion del presentador;
- landing o módulo del sitio, con las pruebas del repositorio.

Cada subagente lee la ficha, no la modifica y devuelve como `POR CONFIRMAR` lo que le falte. Quien consolida revisa que todas las piezas usen los mismos datos y versión; si cambia fecha, sede, nombre o aforo, actualiza la ficha y las piezas afectadas. Ningún subagente envía, publica, despliega ni declara el paquete terminado: eso lo hace quien consolida, con la autorización correspondiente.

## /goal

> /goal Terminar el cambio del sitio: `npm run typecheck`, `npm run lint` y `npm test` pasan, y la nota de control separa código guardado, versión creada, despliegue y funcionamiento observado. No despliegues sin mi autorización.

> /goal Paquete de [evento]: todas las piezas usan la misma versión de la ficha, cada una pasó sus comprobaciones mínimas y la nota de control lista lo pendiente. No envíes ni publiques nada.

## /loop

Para vigilar algo ya autorizado y en curso, no para repetir la acción:

> /loop 5m Consulta el despliegue de [versión] hasta su estado terminal. Al terminar, abre la URL pública y las rutas críticas y dime el resultado. No vuelvas a desplegar.

> /loop 10m Comprueba que el formulario [URL] abre en móvil y escritorio y muestra el aviso de privacidad. No envíes respuestas de prueba sin autorización. Detente al confirmarlo o al encontrar un fallo.

Usar intervalos de 5 a 10 minutos. `/loop` dura mientras la sesión esté abierta (hasta 7 días).

## Navegador

- Playwright abre un navegador aparte: sirve para revisar el sitio publicado y sus formularios en móvil y escritorio, y para ver flyers o variantes renderizados. No es dependencia del repositorio; no añadirlo a `package.json` sin una función concreta.
- Claude in Chrome usa tu Chrome con tus sesiones: sirve para paneles con login (alojamiento o Cloudflare, Google Forms y Drive, redes). Lee estados; no publica, envía ni cambia ajustes sin autorización expresa.
- Nunca usar ninguno para eludir accesos.

## En la sesión

- `/context`: ver cuánto espacio ocupan skill, referencias y conectores.
- `/compact conserva la ficha maestra, los estados y lo pendiente`: liberar espacio sin perder datos del evento.
- `/clear`: entre encargos distintos, para no mezclar esta organización con otros proyectos.
- `/rewind` (o Esc Esc): volver a un punto anterior si una pieza tomó mal camino.
- `/btw`: preguntar algo mientras corre una revisión sin mezclarlo en la conversación.
- `!npm run typecheck`: correr una comprobación directo en la terminal.
- `/remote-control`: seguir desde el teléfono una sesión que vigila un despliegue.

## Mejora continua

En Claude Code local, `/insights` ayuda a detectar patrones de uso. Sus sugerencias son candidatas: siguen la «Actualización de la memoria operativa» de [estado-fuentes.md](estado-fuentes.md), nunca se vuelven reglas automáticas.
