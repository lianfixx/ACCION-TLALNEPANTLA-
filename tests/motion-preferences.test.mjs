import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

const source = await readFile(new URL("../lib/motion-preferences.ts", import.meta.url), "utf8");
const { observeMotionPreferences } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`);

test("motion follows live device preferences and disposes each subscription once", () => {
  const queries = new Map();
  const matchMedia = query => {
    const listeners = new Set();
    const media = {
      matches: false,
      addEventListener: (_, listener) => listeners.add(listener),
      removeEventListener: (_, listener) => listeners.delete(listener),
      change(value) { this.matches = value; [...listeners].forEach(listener => listener()); },
      listenerCount: () => listeners.size,
    };
    queries.set(query, media);
    return media;
  };
  let active = 0;
  let setupCount = 0;
  let cleanupCount = 0;
  let latest;
  const stop = observeMotionPreferences(preferences => {
    assert.equal(active, 0, "Previous animation group must be disposed before a replacement starts");
    active++;
    setupCount++;
    latest = preferences;
    return () => { active--; cleanupCount++; };
  }, matchMedia);
  const reduced = queries.get("(prefers-reduced-motion: reduce)");
  const compact = queries.get("(max-width: 1024px)");
  const pointer = queries.get("(hover: hover) and (pointer: fine)");

  for (let cycle = 0; cycle < 5; cycle++) {
    compact.change(true);
    assert.equal(latest.compact, true);
    reduced.change(true);
    assert.equal(latest.reduced, true);
    pointer.change(true);
    assert.equal(latest.pointer, true);
    compact.change(false);
    reduced.change(false);
    pointer.change(false);
    assert.deepEqual(latest, { reduced: false, compact: false, pointer: false });
    assert.equal(active, 1);
    for (const query of queries.values()) assert.equal(query.listenerCount(), 1);
  }
  stop();
  stop();
  reduced.change(true);
  assert.equal(active, 0);
  assert.equal(cleanupCount, setupCount);
  for (const query of queries.values()) assert.equal(query.listenerCount(), 0);
});
