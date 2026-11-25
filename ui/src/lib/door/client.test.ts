import { describe, expect, it } from 'vitest';
import { pluginObjectPath, toFrame } from './client';
import { ChangeType, StateFrameKind, type StateChange } from './gen/operation';
import { Value } from './gen/google/protobuf/struct';

const base: StateChange = {
  changeId: 'c', eventId: '0', pluginId: 'incus', objectPath: '/org/opdbus/v1/plugins/incus/x', changeType: ChangeType.UNSPECIFIED,
  memberName: '', tagsTouched: [], eventHash: '', actorId: '', frameKind: StateFrameKind.UPDATE, schemaHash: 's1', catalogHash: 'c1', stateGeneration: '7'
} as StateChange;

describe('door client mapping', () => {
  it('builds the canonical object path', () => {
    expect(pluginObjectPath('chat_router')).toBe('/org/opdbus/v1/plugins/chat_router');
    expect(pluginObjectPath('My-Plugin')).toBe('/org/opdbus/v1/plugins/my_plugin');
    expect(pluginObjectPath('3d')).toBe('/org/opdbus/v1/plugins/plugin_3d');
    expect(() => pluginObjectPath('../etc')).toThrow();
  });

  it('maps StateChange frames for the reducer', () => {
    const upd = toFrame({ ...base, newValue: Value.fromJson({ a: 1 }) });
    expect(upd).toMatchObject({ kind: 'update', tombstone: false, schema: false, state_generation: 7n, value: { a: 1 } });
    const del = toFrame({ ...base, changeType: ChangeType.OBJECT_REMOVED });
    expect(del.tombstone).toBe(true);
    const hb = toFrame({ ...base, frameKind: StateFrameKind.HEARTBEAT });
    expect(hb).toMatchObject({ kind: 'heartbeat', tombstone: false });
    const sch = toFrame({ ...base, changeType: ChangeType.SCHEMA_MIGRATION, newValue: Value.fromJson({ name: 'incus' }) });
    expect(sch).toMatchObject({ schema: true, tombstone: false });
  });
});
