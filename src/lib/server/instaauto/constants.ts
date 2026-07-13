// Instagram Auto DM — tunables. Server-only.
export const MAX_ATTEMPTS = 5;
export const FAST_PATH_BATCH = 5;   // messages the after() fast-path drains inline
export const CRON_DRAIN_BATCH = 20; // messages the cron drains per account per run
export const SEND_SPACING_MS = 500; // ~2 sends/sec/account (Meta cap)
export const IG_API_VERSION = 'v21.0';
export const DM_WINDOW_HOURS = 24;
export const COMMENT_MAX_AGE_DAYS = 7;
export const PHASE1_TRIGGERS = ['comment', 'dm_keyword', 'story_reply', 'story_mention'] as const;
export const REQUIRED_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
];
