// Shared types + DB↔UI adapters for the Instagram Auto DM dashboard.
import React from 'react';
import {
  MessageSquare, AtSign, MessageCircle, Heart, Radio, Image as ImageIcon, BarChart3,
} from 'lucide-react';
import type { Database } from '@/types/database.types';

export type View =
  | 'overview'
  | 'automations'
  | 'leads'
  | 'inbox'
  | 'analytics'
  | 'settings'
  | 'templates'
  | 'guide';

export type SimulateEventType = 'comment' | 'dm' | 'story_reply';

export type TriggerType =
  | 'comment' | 'story_mention' | 'dm_keyword' | 'post_like'
  | 'live_comment' | 'story_reply' | 'story_reaction' | 'story_poll';
export type ListenerType = 'MESSAGE' | 'SMARTAI';
export type MatchMode = 'exact' | 'fuzzy' | 'ai_intent' | 'sentiment';
export type TemplateType = 'comment_dm' | 'dm_keyword' | 'story_reply' | 'live_comment' | 'custom';

export interface Keyword { id: string; word: string }
export interface Trigger { id: string; type: TriggerType }

export interface Automation {
  id: string;
  name: string;
  active: boolean;
  keywords: Keyword[];
  triggers: Trigger[];
  listener: ListenerType;
  prompt: string;
  commentReply: string;
  dmCount: number;
  commentCount: number;
  createdAt: string;
  matchMode: MatchMode;
  negativeKeywords: Keyword[];
  multilingual: boolean;
  templateType: TemplateType;
  requireFollow: boolean;
  notFollowerMessage: string;
  // DB round-trip fields
  version?: number;
  mediaScope?: string;
  accountId?: string;
}

// ─── DM payload shape (narrows the Json column — no bare `any` on the row) ───

export interface DmPayload {
  message?: string;
  link?: string;
  not_follower_message?: string;
  comment_reply?: string;
}

// ─── DB row + keyword nested shape ───────────────────────────────────────────

export type DbAutomation = Database['public']['Tables']['instaauto_automations']['Row'] & {
  instaauto_keywords: { id: string; word: string; is_negative: boolean }[];
  instaauto_media_targets: { id: string; ig_media_id: string; thumbnail_url: string | null }[];
};

export function dbToUiAutomation(row: DbAutomation): Automation {
  const payload = (row.dm_payload ?? {}) as DmPayload;
  const positives = row.instaauto_keywords.filter(k => !k.is_negative);
  const negatives = row.instaauto_keywords.filter(k => k.is_negative);
  return {
    id: row.id,
    name: row.name,
    active: row.status === 'active',
    keywords: positives.map(k => ({ id: k.id, word: k.word })),
    negativeKeywords: negatives.map(k => ({ id: k.id, word: k.word })),
    triggers: row.trigger_types.map(t => ({ id: t, type: t as TriggerType })),
    listener: row.response_type === 'smart_ai' ? 'SMARTAI' : 'MESSAGE',
    prompt: payload.message ?? '',
    commentReply: row.comment_reply ?? '',
    dmCount: row.dm_count,
    commentCount: row.comment_count,
    createdAt: row.created_at.slice(0, 10),
    matchMode: (row.match_mode as MatchMode) ?? 'exact',
    multilingual: row.multilingual,
    templateType: 'custom',
    requireFollow: row.require_follow,
    notFollowerMessage: payload.not_follower_message ?? '',
    version: row.version,
    mediaScope: row.media_scope,
    accountId: row.account_id,
  };
}

type DbInsertKeyword = { word: string; is_negative: boolean };
export interface DbUpsertPayload {
  name: string;
  status: string;
  trigger_types: string[];
  match_mode: string;
  response_type: string;
  require_follow: boolean;
  media_scope: string;
  comment_reply: string | null;
  dm_payload: DmPayload;
  multilingual: boolean;
  keywords: DbInsertKeyword[];
}

export function uiToDbPayload(ui: Automation): DbUpsertPayload {
  return {
    name: ui.name,
    status: ui.active ? 'active' : 'draft',
    trigger_types: ui.triggers.map(t => t.type),
    match_mode: ui.matchMode,
    response_type: ui.listener === 'SMARTAI' ? 'smart_ai' : 'message',
    require_follow: ui.requireFollow,
    media_scope: ui.mediaScope ?? 'all',
    comment_reply: ui.commentReply || null,
    dm_payload: {
      message: ui.prompt || undefined,
      comment_reply: ui.commentReply || undefined,
      not_follower_message: ui.requireFollow ? (ui.notFollowerMessage || undefined) : undefined,
    },
    multilingual: ui.multilingual,
    keywords: [
      ...ui.keywords.map(k => ({ word: k.word, is_negative: false })),
      ...ui.negativeKeywords.map(k => ({ word: k.word, is_negative: true })),
    ],
  };
}

// ─── DB row types for leads + messages ───────────────────────────────────────

export type DbLead = Database['public']['Tables']['instaauto_leads']['Row'];
export type DbMessage = Database['public']['Tables']['instaauto_messages']['Row'] & {
  instaauto_automations: { name: string } | null;
};

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  comment: 'Post Comment',
  story_mention: 'Story Mention',
  dm_keyword: 'DM Keyword',
  post_like: 'Post Like',
  live_comment: 'Live Stream Comment',
  story_reply: 'Story Reply / Reaction',
  story_reaction: 'Story Reaction',
  story_poll: 'Story Poll Response',
};

export const TRIGGER_ICONS: Record<TriggerType, React.ElementType> = {
  comment: MessageSquare,
  story_mention: AtSign,
  dm_keyword: MessageCircle,
  post_like: Heart,
  live_comment: Radio,
  story_reply: ImageIcon,
  story_reaction: Heart,
  story_poll: BarChart3,
};

export const TRIGGER_DESCS: Record<TriggerType, string> = {
  comment: 'Fires when someone comments on your post',
  story_mention: 'Fires when you are tagged in a story',
  dm_keyword: 'Fires when DM contains keyword',
  post_like: 'Fires when someone likes your post',
  live_comment: 'Fires when someone comments a keyword during your live',
  story_reply: 'Fires when someone replies or reacts to your story',
  story_reaction: 'Fires on emoji reactions to your story',
  story_poll: 'Fires when someone votes on your story poll',
};

export const MATCH_MODE_LABELS: Record<MatchMode, string> = {
  exact: 'Exact Match',
  fuzzy: 'Fuzzy Match',
  ai_intent: 'AI Intent',
  sentiment: 'Sentiment',
};

// Phase 2 trigger types / match modes — render disabled, not hidden.
export const PHASE2_TRIGGERS: TriggerType[] = ['post_like', 'live_comment', 'story_poll'];
export const PHASE1_MATCH_MODES: MatchMode[] = ['exact', 'fuzzy'];

export interface TemplateCard {
  type: Exclude<TemplateType, 'custom'>;
  title: string;
  desc: string;
  icon: React.ElementType;
  features: string[];
  defaultKeywords: string[];
  defaultPrompt: string;
  defaultTriggers: TriggerType[];
}

export const TEMPLATE_CARDS: TemplateCard[] = [
  {
    type: 'comment_dm',
    title: 'Comment to DM',
    desc: 'Auto-DM anyone who comments your trigger word on a post.',
    icon: MessageSquare,
    features: ['Post comment trigger', 'Instant DM delivery', 'Public comment reply'],
    defaultKeywords: ['PRICE', 'LINK', 'PDF', 'COURSE'],
    defaultPrompt: 'Hi {name}! Thanks for your comment. Here is the link you requested: 👇',
    defaultTriggers: ['comment'],
  },
  {
    type: 'dm_keyword',
    title: 'DM Keyword Reply',
    desc: 'Auto-respond when someone DMs you a specific keyword.',
    icon: MessageCircle,
    features: ['DM keyword trigger', 'Smart AI option', 'Conversation starter'],
    defaultKeywords: ['pricing', 'catalog', 'faq'],
    defaultPrompt: 'Hey {name}! Great question. Here is everything you need to know: 📋',
    defaultTriggers: ['dm_keyword'],
  },
  {
    type: 'story_reply',
    title: 'Story Reply Flow',
    desc: 'Engage with everyone who replies or reacts to your stories.',
    icon: ImageIcon,
    features: ['Story reply trigger', 'Story reaction trigger', 'Warm lead follow-up'],
    defaultKeywords: ['yes', 'interested', 'more'],
    defaultPrompt: 'Hey {name}! Glad you liked the story! Here is what I wanted to share with you: 🎁',
    defaultTriggers: ['story_reply', 'story_reaction'],
  },
  {
    type: 'live_comment',
    title: 'Live Stream DM',
    desc: 'Capture leads in real time while you go live on Instagram.',
    icon: Radio,
    features: ['Live comment trigger', 'Real-time delivery', 'High-intent audience'],
    defaultKeywords: ['link', 'send', 'want', 'yes'],
    defaultPrompt: 'Hi {name}! You asked during the live — here is the resource I mentioned: 🔗',
    defaultTriggers: ['live_comment'],
  },
];

export function emptyAutomation(accountId?: string): Automation {
  return {
    id: `new-${Date.now()}`,
    name: 'New Automation',
    active: false,
    keywords: [],
    triggers: [],
    listener: 'MESSAGE',
    prompt: '',
    commentReply: '',
    dmCount: 0,
    commentCount: 0,
    createdAt: new Date().toISOString().slice(0, 10),
    matchMode: 'exact',
    negativeKeywords: [],
    multilingual: false,
    templateType: 'custom',
    requireFollow: false,
    notFollowerMessage: '',
    version: 0,
    mediaScope: 'all',
    accountId,
  };
}

export function automationFromTemplate(card: TemplateCard, accountId?: string): Automation {
  return {
    ...emptyAutomation(accountId),
    name: card.title,
    keywords: card.defaultKeywords.map((w, i) => ({ id: `tmp-${i}`, word: w.toLowerCase() })),
    triggers: card.defaultTriggers.map((t, i) => ({ id: `tmp-t${i}`, type: t })),
    prompt: card.defaultPrompt,
    commentReply: 'Check your DMs! 📩',
    templateType: card.type,
  };
}
