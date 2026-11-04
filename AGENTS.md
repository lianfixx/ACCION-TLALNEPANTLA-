# Preferencias de trabajo de este proyecto

Instrucciones expresas de Emi para Acción Política Juvenil Tlalnepantla, registradas el 11 de septiembre de 2026.

- Contrastar cada petición con su implementación y verificar el resultado antes de entregar. No afirmar que todo está terminado cuando existan requisitos pendientes.
- Respetar el alcance y las decisiones aprobadas. No agregar funciones ni datos por suposición. Preguntar primero cuando falte una decisión que cambie el funcionamiento o el significado jurídico del sistema.
- Distinguir implementación, activación y prueba real. No sustituir una función pedida por un enlace o una explicación y presentarla como terminada.
- No inventar personas responsables, domicilios, contactos, autorizaciones, integraciones, registros, fuentes ni resultados de auditoría.
- Escribir en español natural, profesional, claro y breve. Conservar la identidad y reducir elementos genéricos, numeraciones decorativas y texto innecesario.
- Registrar qué se pudo leer de X, Reddit y foros; no llamar exhaustiva a una búsqueda limitada ni instalar dependencias sin una función concreta.
- Mantener separados los requisitos de esta organización y los de Vicente Diablo u otros proyectos.

Estas preferencias quedan conservadas con el código del proyecto. No son una afirmación de que se haya modificado la memoria global de ChatGPT.

## Trabajo entre IA (obligatorio para cualquier IA o persona)

Este repositorio sigue el protocolo común de `ia/PROTOCOLO.md`; las reglas concretas están en `ia/REGLAS.md`.
- Al empezar, ejecuta `python3 ia/verificar.py inicio`: resume rama, último commit y su IA, reglas y registro, y activa los hooks de git si faltan (en Claude Code corre solo).
- Fuente de verdad: el repositorio remoto y su estado vigente (`.agents/skills/accion-tlalnepantla/references/estado-fuentes.md` y `CHANGELOG.md`), no la memoria de una conversación.
- Todo cambio se registra en el mismo commit, con la línea `Agente:` (protocolo, sección 3). Sin escritura, entrega un «Registro pendiente para el repositorio».
- Lo prohibido y lo que requiere confirmación de Emi vale en Claude, ChatGPT, Codex, Gemini y cualquier otra IA. Con terminal, ejecuta `sh ia/instalar.sh` una vez por copia. GitHub revisa cada push con `registro-ia.yml`.
- Para pasar trabajo a otra IA: `ia/plantillas/PETICION.md` y `ia/plantillas/ENTREGA.md`.
