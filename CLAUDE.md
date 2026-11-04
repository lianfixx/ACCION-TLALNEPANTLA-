@AGENTS.md

# Claude Code en este repositorio

- La skill `accion-tlalnepantla` está en `.agents/skills/accion-tlalnepantla/` y se carga desde `.claude/skills/accion-tlalnepantla` (invocable como `/accion-tlalnepantla`).
- Frenos activos en `.claude/settings.json` (política en `.claude/hooks/policy.json`, pruebas en `.claude/hooks/test_guard.py`). Si un freno bloquea algo legítimo, explícaselo a Emi; no lo desactives ni lo rodees.
- Reglas por tipo de archivo en `.claude/rules/` (se cargan solas al tocar esos archivos).
- Plan y entrevista, subagentes, `/goal` y demás trabajo en Claude Code: `.agents/skills/accion-tlalnepantla/references/claude-code.md`.
