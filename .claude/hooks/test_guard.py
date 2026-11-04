#!/usr/bin/env python3
"""Pruebas del freno con la política real del repositorio y casos sintéticos.

Uso: python3 .claude/hooks/test_guard.py
Cada caso de `policy.json` → `tests` declara un evento y la decisión esperada
(`deny`, `ask` o `none`). Además se prueban reglas genéricas en un repo temporal.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
GUARD = HERE / "guard.py"
ROOT = HERE.parents[1]


def call(event: dict, root: Path) -> str:
    env = dict(os.environ, CLAUDE_PROJECT_DIR=str(root))
    out = subprocess.run([sys.executable, str(GUARD)], input=json.dumps(event), text=True,
                         capture_output=True, env=env, timeout=900).stdout.strip()
    if not out:
        return "none"
    return json.loads(out)["hookSpecificOutput"]["permissionDecision"]


class PolicyCases(unittest.TestCase):
    def test_declared_cases(self):
        policy = json.loads((HERE / "policy.json").read_text(encoding="utf-8"))
        cases = policy.get("tests", [])
        self.assertTrue(cases, "policy.json debe declarar casos en `tests`")
        for case in cases:
            with self.subTest(case=case["name"]):
                event = {"hook_event_name": "PreToolUse", "tool_name": case["tool"], "tool_input": case["input"]}
                self.assertEqual(call(event, ROOT), case["expect"])


class GenericRules(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / ".claude" / "hooks").mkdir(parents=True)
        subprocess.run("git init -q && git config user.email t@t && git config user.name t", shell=True, cwd=self.root)

    def tearDown(self):
        self.tmp.cleanup()

    def policy(self, rules):
        (self.root / ".claude" / "hooks" / "policy.json").write_text(json.dumps({"rules": rules}), encoding="utf-8")

    def bash(self, command):
        return call({"tool_name": "Bash", "tool_input": {"command": command}}, self.root)

    def test_secret_scan_blocks_commit(self):
        self.policy([{"type": "secrets", "git": "commit", "pii": True, "reason": "Secreto."}])
        (self.root / "a.txt").write_text("token = 'EAA" + "B" * 50 + "'\n", encoding="utf-8")
        subprocess.run("git add a.txt", shell=True, cwd=self.root)
        self.assertEqual(self.bash("git commit -m x"), "deny")
        self.assertEqual(self.bash("git status"), "none")

    def test_secret_scan_allows_clean_commit(self):
        self.policy([{"type": "secrets", "git": "commit", "pii": True, "reason": "Secreto."}])
        (self.root / "a.txt").write_text("hola\n", encoding="utf-8")
        subprocess.run("git add a.txt", shell=True, cwd=self.root)
        self.assertEqual(self.bash("git -C . commit -m x"), "none")

    def test_curp_and_card(self):
        self.policy([{"type": "secrets", "git": "commit", "pii": True, "reason": "PII."}])
        curp, card = "GAMY900101" + "HDFRLH09", " ".join(["4111"] * 4)  # armados en ejecución: el repo no guarda datos con forma real
        (self.root / "b.txt").write_text(f"{curp}\n{card}\n", encoding="utf-8")
        subprocess.run("git add b.txt", shell=True, cwd=self.root)
        self.assertEqual(self.bash("git commit -m x"), "deny")

    def test_before_git_runs_check(self):
        self.policy([{"type": "before_git", "git": "commit", "run": "exit 3", "reason": "Pruebas."}])
        self.assertEqual(self.bash("cd x && git commit -m y"), "deny")
        self.policy([{"type": "before_git", "git": "commit", "run": "true", "reason": "Pruebas."}])
        self.assertEqual(self.bash("git commit -m y"), "none")

    def test_missing_dependency_asks(self):
        self.policy([{"type": "before_git", "git": "commit", "requires": "exit 1", "run": "exit 3", "reason": "Pruebas."}])
        self.assertEqual(self.bash("git commit -m y"), "ask")

    def test_staged_regex_dir_substitution(self):
        self.policy([{"type": "before_git", "git": "commit", "staged_regex": "^temas/([^/]+)/",
                      "run": "test {dir} = uno", "reason": "Validador."}])
        (self.root / "temas" / "uno").mkdir(parents=True)
        (self.root / "temas" / "uno" / "x.md").write_text("x", encoding="utf-8")
        subprocess.run("git add .", shell=True, cwd=self.root)
        self.assertEqual(self.bash("git commit -m y"), "none")
        (self.root / "temas" / "dos").mkdir(parents=True)
        (self.root / "temas" / "dos" / "x.md").write_text("x", encoding="utf-8")
        subprocess.run("git add .", shell=True, cwd=self.root)
        self.assertEqual(self.bash("git commit -m y"), "deny")

    def test_path_only_existing(self):
        self.policy([{"type": "path", "tool": "Edit|Write", "globs": ["versiones/*/*"], "only_existing": True,
                      "decision": "deny", "reason": "Inmutable."}])
        (self.root / "versiones" / "1").mkdir(parents=True)
        (self.root / "versiones" / "1" / "a.json").write_text("{}", encoding="utf-8")
        ev = lambda p: call({"tool_name": "Write", "tool_input": {"file_path": str(self.root / p)}}, self.root)
        self.assertEqual(ev("versiones/1/a.json"), "deny")
        self.assertEqual(ev("versiones/2/a.json"), "none")

    def test_recipients(self):
        self.policy([{"type": "recipients", "tool": "mcp__.*Gmail.*__send_message", "allow": ["yo@x.mx"],
                      "forbid_cc": True, "reason": "Solo a mí."}])
        send = lambda i: call({"tool_name": "mcp__Gmail__send_message", "tool_input": i}, self.root)
        self.assertEqual(send({"to": ["yo@x.mx"], "body": "copia a otro@x.mx"}), "none")
        self.assertEqual(send({"to": "Otro <otro@x.mx>"}), "deny")
        self.assertEqual(send({"to": ["yo@x.mx"], "cc": ["yo@x.mx"]}), "deny")
        self.assertEqual(send({"threadId": "abc"}), "ask")

    def test_strictest_wins(self):
        self.policy([
            {"type": "pattern", "tool": "Bash", "field": "command", "input": r"git\s+push", "decision": "ask", "reason": "a"},
            {"type": "pattern", "tool": "Bash", "field": "command", "input": r"--force", "decision": "deny", "reason": "b"},
        ])
        self.assertEqual(self.bash("git push origin main"), "ask")
        self.assertEqual(self.bash("git push --force origin main"), "deny")

    def test_broken_policy_does_not_block(self):
        (self.root / ".claude" / "hooks" / "policy.json").write_text("{", encoding="utf-8")
        self.assertEqual(self.bash("ls"), "none")
        self.assertEqual(call({"tool_name": "mcp__Gmail__send_message", "tool_input": {}}, self.root), "ask")


if __name__ == "__main__":
    unittest.main(verbosity=1)
