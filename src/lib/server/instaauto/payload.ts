// Resolve an automation's dm_payload jsonb into the frozen payload_snapshot stored
// on the message. Substitutes {name} (and {link}) at enqueue time so later automation
// edits never change an in-flight send.
import type { ResolvedPayload } from './types';

export interface DmPayload {
  message?: string;
  link?: string;
  not_follower_message?: string;
  comment_reply?: string;
  buttons?: Array<{ title: string; payload: string }>;
}

function subst(t: string, vars: Record<string, string>): string {
  return t
    .replace(/\{name\}/g, vars.name?.trim() || 'there')
    .replace(/\{link\}/g, vars.link ?? '');
}

export function resolvePayload(payload: DmPayload, vars: { name?: string }): ResolvedPayload {
  const v = { name: vars.name ?? '', link: payload.link ?? '' };
  return {
    messageText: payload.message ? subst(payload.message, v) : '',
    link: payload.link,
    buttons: payload.buttons,
    notFollowerMessage: payload.not_follower_message ? subst(payload.not_follower_message, v) : undefined,
    commentReply: payload.comment_reply ? subst(payload.comment_reply, v) : undefined,
  };
}
