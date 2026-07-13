// Instagram Auto DM — shared server types.
export type InboundEventType = 'comment' | 'dm' | 'story_reply' | 'story_mention' | 'postback';

export interface InboundEvent {
  eventType: InboundEventType;
  igUserId: string;            // sender IGSID
  igUsername?: string;
  text: string;                // comment text / message text (empty for postback)
  commentId?: string;          // for comment events (private-reply target)
  mediaId?: string;            // media the comment is on (media-scope match)
  payloadRef?: string;         // postback payload string
  commentCreatedAt?: string;   // ISO — for the 7-day comment-age guard
  raw: unknown;                // original envelope slice (stored in events.payload)
}

export interface ResolvedPayload {
  messageText: string;         // {name}-substituted
  link?: string;
  buttons?: Array<{ title: string; payload: string }>;
  notFollowerMessage?: string;
  commentReply?: string;
}

export interface SendResult { igMessageId: string | null; }

export class SendError extends Error {
  httpStatus: number;
  code: string;
  retryable: boolean;
  isOAuthInvalid: boolean;
  constructor(o: { message: string; httpStatus: number; code: string; retryable: boolean; isOAuthInvalid?: boolean }) {
    super(o.message);
    this.httpStatus = o.httpStatus; this.code = o.code;
    this.retryable = o.retryable; this.isOAuthInvalid = o.isOAuthInvalid ?? false;
  }
}
