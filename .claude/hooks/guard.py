#!/usr/bin/env python3
"""Freno PreToolUse para Claude Code, configurado por `.claude/hooks/policy.json`.

Lee el evento del hook por stdin y devuelve `deny`, `ask` o nada (sigue el flujo normal
de permisos). Solo usa la biblioteca estándar. No envía datos a ningún servicio.

Tipos de regla en policy.json (lista `rules`, se evalúan en orden; gana la decisión más
estricta: deny > ask > nada):

- `pattern`: `tool` (regex sobre tool_name) y opcionalmente `input` (regex, sin distinguir
  mayúsculas, sobre el campo `field` de tool_input o sobre todo tool_input en JSON).
- `path`: `tool` y `globs` (rutas relativas a la raíz del repo); `only_existing: true`
  aplica solo si el archivo ya existe (protege entregas publicadas sin impedir crear nuevas).
- `recipients`: `tool` y `allow` (lista de correos). Deniega si algún destinatario está
  fuera de la lista; `forbid_cc` deniega cualquier CC/CCO; `ask_if_unknown` pregunta cuando
  la herramienta no expone destinatarios (por ejemplo, responder un hilo).
- `before_git`: `git` (`commit` o `push`) y `run` (comando). Si el comando falla, deniega y
  devuelve la salida. `staged_regex` limita la ejecución a commits con archivos que coincidan.
  `{dir}` en `run` se sustituye por cada grupo 1 de `staged_regex` encontrado. `requires`
  (comando opcional) comprueba dependencias: si falla, pregunta en vez de bloquear.
- `secrets`: `git` (`commit`/`push`); revisa el diff pendiente con patrones de secretos y, si
  `pii: true`, CURP y tarjetas válidas por Luhn. Deniega mostrando solo archivo y línea.

Ante un error interno no bloquea, salvo en herramientas de envío, donde pregunta.
"""
from __future__ import annotations

import fnmatch
import json
import os
import re
import subprocess
import sys
from pathlib import Path

RANK = {None: 0, "ask": 1, "deny": 2}
SEND_TOOL = re.compile(r"(send|reply|forward|draft|publish|post)", re.I)
RECIPIENT_KEYS = {"to", "cc", "bcc", "recipient", "recipients", "torecipients",
                  "ccrecipients", "bccrecipients", "forward_to", "forwardto", "addresses"}
CC_KEYS = {"cc", "bcc", "ccrecipients", "bccrecipients"}
EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
SECRET_PATTERNS = [
    ("clave privada", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("token de Meta", re.compile(r"\bEAA[A-Za-z0-9]{40,}")),
    ("clave OpenAI/Anthropic", re.compile(r"\bsk-(?:ant-)?[A-Za-z0-9_\-]{24,}")),
    ("token de GitHub", re.compile(r"\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}")),
    ("clave de Google", re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b")),
    ("clave AWS", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("token de Slack", re.compile(r"\bxox[abprs]-[A-Za-z0-9\-]{10,}")),
    ("asignación de secreto", re.compile(
        r"(?i)\b(?:api[_-]?key|secret|token|password|contraseña)\b\s*[:=]\s*['\"][^'\"\s]{12,}['\"]")),
]
CURP = re.compile(r"\b[A-Z][AEIOUX][A-Z]{2}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d\b")
CARD = re.compile(r"\b(?:\d[ -]?){13,19}\b")


def luhn(digits: str) -> bool:
    nums = [int(c) for c in digits][::-1]
    total = sum(n if i % 2 == 0 else (n * 2 - 9 if n * 2 > 9 else n * 2) for i, n in enumerate(nums))
    return total % 10 == 0


def root_dir(event: dict) -> Path:
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2]


def load_policy(root: Path) -> dict:
    path = root / ".claude" / "hooks" / "policy.json"
    return json.loads(path.read_text(encoding="utf-8"))


def collect_recipients(value, key=None, out=None, cc=None):
    out = [] if out is None else out
    cc = [] if cc is None else cc
    if isinstance(value, dict):
        for k, v in value.items():
            collect_recipients(v, k, out, cc)
    elif isinstance(value, list):
        for item in value:
            collect_recipients(item, key, out, cc)
    elif isinstance(value, str) and key is not None:
        k = key.lower()
        if k in RECIPIENT_KEYS or "recipient" in k:
            found = EMAIL.findall(value)
            out.extend(found)
            if k in CC_KEYS or k.startswith(("cc", "bcc")):
                cc.extend(found)
    return out, cc


def git_subcommand(command: str, name: str) -> bool:
    for part in re.split(r"&&|\|\||;|\n|\|", command):
        tokens = part.strip().split()
        while tokens and ("=" in tokens[0] and not tokens[0].startswith("-")):
            tokens.pop(0)
        if len(tokens) >= 2 and tokens[0] == "git":
            rest = tokens[1:]
            while rest and rest[0].startswith("-"):
                rest = rest[2:] if rest[0] in ("-C", "-c") else rest[1:]
            if rest and rest[0] == name:
                return True
    return False


def run(cmd: str, root: Path, timeout: int = 900) -> tuple[int, str]:
    try:
        proc = subprocess.run(cmd, shell=True, cwd=root, capture_output=True, text=True, timeout=timeout)
        return proc.returncode, (proc.stdout + proc.stderr)[-3000:]
    except subprocess.TimeoutExpired:
        return 1, f"Tiempo agotado ({timeout} s) al ejecutar: {cmd}"


def commit_all(command: str) -> bool:
    return bool(re.search(r"(?:^|\s)-[a-zA-Z]*a[a-zA-Z]*(?:\s|$)", command)) or "--all" in command


def staged_files(root: Path, git: str, command: str = "") -> list[str]:
    if git == "push":
        code, out = run("git diff --name-only @{upstream}...HEAD 2>/dev/null || git diff --name-only HEAD~1", root, 60)
    elif commit_all(command):
        code, out = run("git diff HEAD --name-only", root, 60)
    else:
        code, out = run("git diff --cached --name-only", root, 60)
    return [line.strip() for line in out.splitlines() if line.strip()]


def pending_diff(root: Path, git: str, command: str) -> str:
    if git == "push":
        cmd = "git diff @{upstream}...HEAD 2>/dev/null || git diff HEAD~1"
    elif commit_all(command):
        cmd = "git diff HEAD"
    else:
        cmd = "git diff --cached"
    return subprocess.run(cmd, shell=True, cwd=root, capture_output=True, text=True, timeout=120).stdout


def scan_secrets(diff: str, pii: bool) -> list[str]:
    hits, current, line_no = [], "?", 0
    for line in diff.splitlines():
        if line.startswith("+++ "):
            current = line[6:] if line.startswith("+++ b/") else line[4:]
            continue
        m = re.match(r"@@ -\d+(?:,\d+)? \+(\d+)", line)
        if m:
            line_no = int(m.group(1)) - 1
            continue
        if line.startswith("+") and not line.startswith("+++"):
            line_no += 1
            text = line[1:]
            for label, pat in SECRET_PATTERNS:
                if pat.search(text):
                    hits.append(f"{current}:{line_no} ({label})")
            if pii:
                if CURP.search(text):
                    hits.append(f"{current}:{line_no} (posible CURP)")
                for cand in CARD.findall(text):
                    digits = re.sub(r"\D", "", cand)
                    if 13 <= len(digits) <= 19 and luhn(digits) and len(set(digits)) > 2:
                        hits.append(f"{current}:{line_no} (posible número de tarjeta)")
        elif not line.startswith("-"):
            line_no += 1
    return hits


def evaluate(event: dict, policy: dict, root: Path) -> tuple[str | None, str]:
    tool = event.get("tool_name", "")
    tinput = event.get("tool_input") or {}
    command = tinput.get("command", "") if isinstance(tinput, dict) else ""
    decision, reasons = None, []

    def hit(dec: str, reason: str):
        nonlocal decision
        if RANK[dec] > RANK[decision]:
            decision = dec
        reasons.append(reason)

    for rule in policy.get("rules", []):
        kind = rule.get("type", "pattern")
        tool_re = rule.get("tool", ".*")
        if kind in ("before_git", "secrets"):
            if tool != "Bash" or not git_subcommand(command, rule.get("git", "commit")):
                continue
        elif not re.fullmatch(tool_re, tool):
            continue

        if kind == "pattern":
            field = rule.get("field")
            target = tinput.get(field, "") if field and isinstance(tinput, dict) else json.dumps(tinput, ensure_ascii=False)
            if not isinstance(target, str):
                target = json.dumps(target, ensure_ascii=False)
            pat = rule.get("input")
            if pat is None or re.search(pat, target, re.I | re.S):
                hit(rule["decision"], rule["reason"])
        elif kind == "path":
            raw = (tinput.get("file_path") or tinput.get("notebook_path") or tinput.get("path") or "") if isinstance(tinput, dict) else ""
            if not raw:
                continue
            p = Path(raw)
            p = p if p.is_absolute() else root / p
            try:
                rel = p.resolve().relative_to(root.resolve()).as_posix()
            except ValueError:
                continue
            if any(fnmatch.fnmatch(rel, g) for g in rule["globs"]):
                if rule.get("only_existing") and not p.exists():
                    continue
                hit(rule["decision"], f"{rule['reason']} ({rel})")
        elif kind == "recipients":
            found, cc = collect_recipients(tinput)
            allow = {a.lower() for a in rule.get("allow", [])}
            outside = sorted({f for f in found if f.lower() not in allow})
            if outside:
                hit("deny", f"{rule['reason']} Destinatarios no permitidos: {', '.join(outside)}.")
            elif rule.get("forbid_cc") and cc:
                hit("deny", f"{rule['reason']} No se permiten CC/CCO.")
            elif not found and rule.get("ask_if_unknown", True):
                hit("ask", f"{rule['reason']} No se pudieron identificar destinatarios; confirma antes de continuar.")
        elif kind == "before_git":
            git = rule.get("git", "commit")
            files = staged_files(root, git, command) if rule.get("staged_regex") else []
            if rule.get("staged_regex"):
                rx = re.compile(rule["staged_regex"])
                matches = [m for m in (rx.search(f) for f in files) if m]
                if not matches:
                    continue
                dirs = sorted({m.group(1) for m in matches if m.groups()}) or [""]
            else:
                dirs = [""]
            if rule.get("requires"):
                code, _ = run(rule["requires"], root, 60)
                if code != 0:
                    hit("ask", f"{rule['reason']} No se pudo ejecutar el control porque faltan dependencias "
                               f"(`{rule['requires']}`). Instálalas o confirma que aceptas continuar sin él.")
                    continue
            for d in dirs:
                cmd = rule["run"].replace("{dir}", d)
                code, out = run(cmd, root, rule.get("timeout", 900))
                if code != 0:
                    hit("deny", f"{rule['reason']} Falló `{cmd}` (código {code}). Corrige antes de `git {git}`.\n{out}")
                    break
        elif kind == "secrets":
            git = rule.get("git", "commit")
            hits_ = scan_secrets(pending_diff(root, git, command), rule.get("pii", False))
            if hits_:
                shown = "; ".join(hits_[:15]) + ("…" if len(hits_) > 15 else "")
                hit("deny", f"{rule['reason']} Revisar: {shown}. Si es un falso positivo, explícalo a Emi y que haga el commit él.")
    return decision, "\n".join(reasons)


def main() -> int:
    raw = sys.stdin.read()
    try:
        event = json.loads(raw or "{}")
    except json.JSONDecodeError:
        return 0
    root = root_dir(event)
    try:
        decision, reason = evaluate(event, load_policy(root), root)
    except Exception as exc:  # no bloquear todo por un error del freno
        if SEND_TOOL.search(event.get("tool_name", "")) and event.get("tool_name", "").startswith("mcp__"):
            decision, reason = "ask", f"El freno falló ({exc}); confirma este envío manualmente."
        else:
            print(f"guard.py: error interno ignorado: {exc}", file=sys.stderr)
            return 0
    if decision:
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": decision,
            "permissionDecisionReason": reason,
        }}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
