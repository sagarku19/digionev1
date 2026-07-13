import { describe, it, expect } from 'vitest';
import { parseWebhookEnvelope } from './event-parse';

describe('parseWebhookEnvelope', () => {
  it('parses a comment event', () => {
    const env = { object: 'instagram', entry: [{ id: 'IG_ACC', time: 1, changes: [
      { field: 'comments', value: { id: 'c1', text: 'send guide', from: { id: 'u1', username: 'sam' }, media: { id: 'm1' } } },
    ] }] };
    const [e] = parseWebhookEnvelope(env);
    expect(e.eventType).toBe('comment');
    expect(e.commentId).toBe('c1');
    expect(e.igUserId).toBe('u1');
    expect(e.text).toBe('send guide');
    expect(e.mediaId).toBe('m1');
  });
  it('parses a DM message event', () => {
    const env = { object: 'instagram', entry: [{ id: 'IG_ACC', time: 1, messaging: [
      { sender: { id: 'u1' }, recipient: { id: 'IG_ACC' }, message: { mid: 'mid1', text: 'guide please' } },
    ] }] };
    const [e] = parseWebhookEnvelope(env);
    expect(e.eventType).toBe('dm');
    expect(e.text).toBe('guide please');
    expect(e.igUserId).toBe('u1');
  });
  it('parses a postback button tap', () => {
    const env = { object: 'instagram', entry: [{ id: 'IG_ACC', time: 1, messaging: [
      { sender: { id: 'u1' }, recipient: { id: 'IG_ACC' }, postback: { mid: 'mid2', payload: 'FOLLOW_OK:auto1' } },
    ] }] };
    const [e] = parseWebhookEnvelope(env);
    expect(e.eventType).toBe('postback');
    expect(e.payloadRef).toBe('FOLLOW_OK:auto1');
  });
  it('classifies a story reply', () => {
    const env = { object: 'instagram', entry: [{ id: 'IG_ACC', time: 1, messaging: [
      { sender: { id: 'u1' }, recipient: { id: 'IG_ACC' }, message: { mid: 'm', text: 'nice', reply_to: { story: { id: 's1' } } } },
    ] }] };
    expect(parseWebhookEnvelope(env)[0].eventType).toBe('story_reply');
  });
  it('returns [] for an unknown envelope', () => {
    expect(parseWebhookEnvelope({ object: 'page', entry: [] })).toEqual([]);
    expect(parseWebhookEnvelope(null)).toEqual([]);
  });
});
