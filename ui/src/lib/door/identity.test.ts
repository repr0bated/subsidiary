import { describe, expect, it } from 'vitest';
import { containerIdentity, injectedSealedId, SID1_HEADER } from './identity';

const sid = 'U0lEMQAAAAEAAAAA';

describe('container identity (injected SID1)', () => {
  it('sends the injected SID1 unchanged as the one identity header', async () => {
    const source = containerIdentity({ identity: { kind: 'sid1', sealedId: sid } });
    expect(await source?.metadata()).toEqual({ [SID1_HEADER]: sid });
  });

  it('has no identity when the page carries none', () => {
    expect(containerIdentity(undefined)).toBeUndefined();
    expect(containerIdentity({})).toBeUndefined();
  });

  it('accepts only SID1, never OIA1 or other kinds', () => {
    expect(injectedSealedId({ identity: { kind: 'oia1', sealedId: sid } })).toBeUndefined();
    expect(injectedSealedId({ identity: { kind: 'human', sealedId: sid } })).toBeUndefined();
  });

  it('rejects values that are not standard base64', () => {
    for (const bad of ['', '   ', 'abc', 'ab$d', 'U0lE-QAA', 42]) {
      expect(injectedSealedId({ identity: { kind: 'sid1', sealedId: bad } })).toBeUndefined();
    }
  });

  it('returns a fresh object each call, so a caller cannot alter the identity', async () => {
    const source = containerIdentity({ identity: { kind: 'sid1', sealedId: sid } })!;
    const first = await source.metadata();
    first[SID1_HEADER] = 'changed';
    expect((await source.metadata())[SID1_HEADER]).toBe(sid);
  });
});
