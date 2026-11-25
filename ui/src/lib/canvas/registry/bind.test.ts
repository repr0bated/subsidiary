import { describe, expect, it } from 'vitest';
import { isFeedPath } from './feed-path';

describe('inputs never write into feed data', () => {
  it('treats /plugins and anything under it as read-only', () => {
    expect(isFeedPath('/plugins')).toBe(true);
    expect(isFeedPath('/plugins/chat_router/x')).toBe(true);
    expect(isFeedPath('/form/name')).toBe(false);
    expect(isFeedPath('/pluginsx')).toBe(false);
    expect(isFeedPath(undefined)).toBe(false);
  });
});
