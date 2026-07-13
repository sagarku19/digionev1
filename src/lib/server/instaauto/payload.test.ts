import { describe, it, expect } from 'vitest';
import { resolvePayload } from './payload';

describe('resolvePayload', () => {
  it('substitutes {name} and carries link + not-follower message', () => {
    const r = resolvePayload(
      { message: 'Hi {name}! Here: {link}', link: 'https://x.io', not_follower_message: 'Follow first {name}' },
      { name: 'Sam' },
    );
    expect(r.messageText).toBe('Hi Sam! Here: https://x.io');
    expect(r.link).toBe('https://x.io');
    expect(r.notFollowerMessage).toBe('Follow first Sam');
  });
  it('falls back to "there" when name is missing', () => {
    const r = resolvePayload({ message: 'Hi {name}!' }, {});
    expect(r.messageText).toBe('Hi there!');
  });
  it('tolerates an empty payload', () => {
    expect(resolvePayload({}, { name: 'Sam' }).messageText).toBe('');
  });
});
