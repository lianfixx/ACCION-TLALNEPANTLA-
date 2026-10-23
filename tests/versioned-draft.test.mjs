import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';

const source = await readFile(new URL('../lib/versioned-draft.ts', import.meta.url), 'utf8');
const { reconcileDraft } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);

test('an external refresh cannot give an unsaved draft a newer concurrency token', () => {
  const original = { updatedAt: 10, title: 'Original' };
  const external = { updatedAt: 20, title: 'Changed elsewhere' };
  const editing = { record: original, dirty: true };
  assert.equal(reconcileDraft(editing, external), editing);
  assert.equal(reconcileDraft(editing, external).record.updatedAt, 10);
  const clean = reconcileDraft({ ...editing, dirty: false }, external);
  assert.equal(clean.record, external);
  const saved = { updatedAt: 30, title: 'Saved in this session' };
  assert.equal(reconcileDraft(clean, saved).record, saved);
  assert.equal(reconcileDraft(editing, original), editing);
  const pair={updatedAt:'[5,7]',role:'editor'};
  const changedPair={updatedAt:'[6,7]',role:'admin'};
  const pairDraft={record:pair,dirty:true};
  assert.equal(reconcileDraft(pairDraft,changedPair),pairDraft);
  assert.equal(reconcileDraft({record:pair,dirty:false},changedPair).record,changedPair);
});
