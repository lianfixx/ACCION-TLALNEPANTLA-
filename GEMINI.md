@./AGENTS.md

# Gemini en este repositorio

- Reglas comunes: `ia/REGLAS.md`; protocolo entre IA: `ia/PROTOCOLO.md`. Gemini no tiene los frenos automáticos de Claude Code: cúmplelos tú y, si tienes terminal, ejecuta una vez `sh ia/instalar.sh` para activar los hooks de git.
- Skill del proyecto: `accion-tlalnepantla` en `.agents/skills/accion-tlalnepantla`.
- Al empezar, ejecuta `python3 ia/verificar.py inicio` (estado, reglas y registro).
- Todo cambio se registra en el mismo commit con `Agente: Gemini` (protocolo, sección 3).
