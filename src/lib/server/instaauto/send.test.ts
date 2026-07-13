import { describe, it, expect } from 'vitest';
import { checkSendWindow, isSimulatedSend } from './send';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

describe('checkSendWindow', () => {
  it('allows a DM within 24h of the last user message', () => {
    expect(checkSendWindow('dm', { last_user_message_at: hoursAgo(1) }).ok).toBe(true);
  });
  it('blocks a DM past the 24h window', () => {
    const r = checkSendWindow('dm', { last_user_message_at: hoursAgo(30) });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('window_closed');
  });
  it('always allows a private_reply (governed by the 7-day comment window, checked upstream)', () => {
    expect(checkSendWindow('private_reply', { last_user_message_at: null }).ok).toBe(true);
  });
});

describe('isSimulatedSend', () => {
  it('is true for a simulated account', () => {
    expect(isSimulatedSend({ is_simulated: true })).toBe(true);
    expect(isSimulatedSend({ is_simulated: false })).toBe(false);
  });
});
