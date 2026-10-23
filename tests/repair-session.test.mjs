import test from 'node:test';
import assert from 'node:assert/strict';
import { RepairSession } from '../Assets/Scripts/RepairSession.ts';

const origin = (x = 0) => ({position: {x, y: 75, z: -90}, rotation: {x: 0, y: 0, z: 0, w: 1}});
const recorded = (order = ['cover', 'ring', 'gear']) => {
  const session = new RepairSession();
  order.forEach((id, i) => session.record(id, id, origin(i * 4)));
  return session;
};

test('records observations and replays exactly the reverse of arbitrary user order', () => {
  for (const ids of [['cover', 'ring', 'gear'], ['gear', 'cover'], ['ring']]) {
    const session = recorded(ids);
    assert.deepEqual(session.view().steps.map(s => s.sequence), ids.map((_,i) => i + 1));
    session.beginReassembly();
    const seen = [];
    for (const id of [...ids].reverse()) {
      seen.push(session.view().current.partId);
      session.confirmReturn(id);
    }
    assert.deepEqual(seen, [...ids].reverse());
    assert.equal(session.view().mode, 'complete');
    assert.equal(session.view().returnedCount, ids.length);
    assert.equal(session.view().current, null);
  }
});

test('snapshots and returned records cannot mutate original positions or history', () => {
  const session = new RepairSession();
  const pose = origin(12);
  const record = session.record('cover', 'Cover', pose);
  pose.position.x = 900;
  pose.rotation.w = 0;
  record.origin.position.x = -200;
  const view = session.view();
  view.steps[0].origin.position.x = 500;
  view.steps[0].partId = 'tampered';
  session.beginReassembly();
  const current = session.view().current;
  current.origin.position.x = 111;
  assert.equal(session.view().current.origin.position.x, 12);
  assert.equal(session.view().current.origin.rotation.w, 1);
  assert.equal(session.view().current.partId, 'cover');
});

test('wrong, duplicate, and out-of-mode actions do not advance the task', () => {
  const session = recorded();
  assert.throws(() => session.record('cover', 'Cover again', origin()), /already/);
  session.beginReassembly();
  const before = session.view();
  assert.throws(() => session.confirmReturn('cover'), /current/);
  assert.throws(() => session.record('other', 'Other', origin()), /recording/);
  assert.throws(() => session.beginReassembly(), /recording/);
  assert.throws(() => session.undoReturn(), /No return/);
  assert.deepEqual(session.view(), before);
  session.confirmReturn('gear');
  assert.throws(() => session.confirmReturn('gear'), /current/);
  assert.equal(session.view().current.partId, 'ring');
});

test('captures numeric pose values from native-style non-enumerable accessors', () => {
  const values = {x: 12, y: 75, z: -90, w: 1};
  const nativePoint = {};
  const nativeRotation = {};
  for (const key of ['x', 'y', 'z']) {
    Object.defineProperty(nativePoint, key, {get: () => values[key]});
    Object.defineProperty(nativeRotation, key, {get: () => 0});
  }
  Object.defineProperty(nativeRotation, 'w', {get: () => values.w});
  const session = new RepairSession();
  session.record('cover', 'Cover', {position: nativePoint, rotation: nativeRotation});
  values.x = 999;
  values.w = 0;
  session.beginReassembly();
  assert.deepEqual(session.view().current.origin, origin(12));
});

test('pause hides the current guide, blocks actions and resumes the exact same step', () => {
  const session = recorded();
  session.beginReassembly();
  session.confirmReturn('gear');
  session.pause();
  assert.equal(session.view().current, null);
  assert.equal(session.view().returnedCount, 1);
  assert.throws(() => session.confirmReturn('ring'), /rewinding/);
  assert.throws(() => session.undoReturn(), /reassembly/);
  assert.throws(() => session.record('extra', 'Extra', origin()), /recording/);
  session.resume();
  assert.equal(session.view().current.partId, 'ring');
  assert.equal(session.view().returnedCount, 1);
});

test('pause during recording resumes recording without inventing returns', () => {
  const session = recorded(['cover']);
  session.pause();
  assert.equal(session.view().returnedCount, 0);
  session.resume();
  session.record('ring', 'Ring', origin());
  assert.equal(session.view().recordedCount, 2);
});

test('undo restores each confirmation including after completion', () => {
  const session = recorded();
  session.beginReassembly();
  for (const id of ['gear', 'ring', 'cover']) session.confirmReturn(id);
  for (const id of ['cover', 'ring', 'gear']) {
    session.undoReturn();
    assert.equal(session.view().current.partId, id);
  }
  assert.throws(() => session.undoReturn(), /No return/);
  assert.equal(session.view().returnedCount, 0);
});

test('undo capture and recapture keeps contiguous sequence and stable identity', () => {
  const session = recorded();
  assert.equal(session.undoLastRecord().partId, 'gear');
  const recaptured = session.record('gear', 'Gear corrected', origin(8));
  assert.equal(recaptured.sequence, 3);
  assert.equal(session.view().recordedCount, 3);
});

test('empty sessions and invalid observations fail without changing state', () => {
  const session = new RepairSession(1);
  assert.throws(() => session.beginReassembly(), /Record/);
  assert.throws(() => session.undoLastRecord(), /No observation/);
  assert.throws(() => session.resume(), /paused/);
  assert.throws(() => session.record('', 'Cover', origin()), /Part ID/);
  assert.throws(() => session.record('cover', ' ', origin()), /Label/);
  for (const invalid of [NaN, Infinity, '0', null]) {
    assert.throws(() => session.record('cover', 'Cover', origin(invalid)), /finite/);
  }
  const bad = origin(); bad.rotation.w = 0;
  assert.throws(() => session.record('cover', 'Cover', bad), /quaternion/);
  assert.throws(() => session.record('cover', 'Cover', null), /Missing/);
  assert.equal(session.view().recordedCount, 0);
  session.record('cover', 'Cover', origin());
  assert.throws(() => session.record('ring', 'Ring', origin()), /limit/);
  assert.equal(session.view().recordedCount, 1);
  for (const max of [0, 101, 1.2, NaN]) assert.throws(() => new RepairSession(max), /limit/);
});

test('reset from every lifecycle mode removes history and starts clean', () => {
  for (const mode of ['recording', 'rewinding', 'paused', 'complete']) {
    const session = recorded(['cover']);
    if (mode !== 'recording') session.beginReassembly();
    if (mode === 'paused') session.pause();
    if (mode === 'complete') session.confirmReturn('cover');
    session.reset();
    assert.deepEqual(session.view(), {mode:'recording', recordedCount:0, returnedCount:0, current:null, steps:[]});
    assert.equal(session.record('cover', 'Cover again', origin()).sequence, 1);
  }
});
