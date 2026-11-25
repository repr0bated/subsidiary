import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { handlersFor } from './actions';

const sealed = [{ name: 'setState' }, { name: 'pushState' }, { name: 'removeState' }, { name: 'validateForm' }, { name: 'invokeAnything' }];

function run(name: string, params: Record<string, unknown>, start: Record<string, unknown> = {}) {
  let state = start;
  handlersFor(sealed)[name](params, (u) => (state = u(state)), state);
  return state;
}

describe('canvas actions', () => {
  it('registers only sealed actions it implements', () => {
    expect(Object.keys(handlersFor(sealed)).sort()).toEqual(['pushState', 'removeState', 'setState', 'validateForm']);
    expect(handlersFor([])).toEqual({});
  });

  it('never writes into /plugins', () => {
    fc.assert(fc.property(fc.string(), fc.jsonValue(), (rest, value) => {
      for (const name of ['setState', 'pushState', 'removeState']) {
        expect(() => run(name, { statePath: '/plugins/' + rest, value, index: 0 })).toThrow();
      }
    }), { numRuns: 100 });
  });

  it('sets, pushes and removes in local view state', () => {
    let s = run('setState', { statePath: '/form/name', value: 'Ada' });
    expect(s).toEqual({ form: { name: 'Ada' } });
    s = run('pushState', { statePath: '/list', value: 1 }, s);
    s = run('pushState', { statePath: '/list', value: 2 }, s);
    expect(s.list).toEqual([1, 2]);
    s = run('removeState', { statePath: '/list', index: 0 }, s);
    expect(s.list).toEqual([2]);
  });
});
