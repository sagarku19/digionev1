'use client';
// ⚠️ PROTOTYPE — not wired to real data. This entire page renders from
// MOCK_AUTOMATIONS (no hooks, no API, no persistence) and is linked live in the
// Sidebar ("Auto DM"). Before this ships as a real feature it needs: data hooks,
// API routes, and persistence. Deferred from the dashboard production refactor by
// decision — left as-is intentionally rather than refactored. See
// docs/superpowers/specs/2026-06-14-dashboard-production-audit-design.md.

import React, { useState, useCallback } from 'react';
import {
  Instagram, Zap, MessageCircle, Users, BarChart3, Settings,
  Image, ChevronRight, Plus, Play, Pause, Trash2, Edit3,
  Hash, Bell, Send, Eye, TrendingUp, ArrowUpRight,
  CheckCircle2, XCircle, Clock, Sparkles, Bot, Target,
  Link2, FileText, Radio, Activity, Shield, Crown,
  ChevronLeft, X, Search, Filter, MoreVertical, Copy,
  ToggleLeft, ToggleRight, Flame, Heart, MessageSquare,
  AtSign, Star, RefreshCw, Download, ExternalLink,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type View =
  | 'overview'
  | 'automations'
  | 'builder'
  | 'leads'
  | 'dms'
  | 'posts'
  | 'analytics'
  | 'settings'
  | 'templates'
  | 'guide';

type TriggerType = 'comment' | 'story_mention' | 'dm_keyword' | 'post_like' | 'live_comment' | 'story_reply' | 'story_reaction' | 'story_poll';
type ListenerType = 'MESSAGE' | 'SMARTAI';
type MatchMode = 'exact' | 'fuzzy' | 'ai_intent' | 'sentiment';
type TemplateType = 'comment_dm' | 'dm_keyword' | 'story_reply' | 'live_comment' | 'custom';

interface Keyword { id: string; word: string }
interface Trigger { id: string; type: TriggerType }
interface Automation {
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
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_AUTOMATIONS: Automation[] = [
  {
    id: '1',
    name: 'Free Guide Giveaway',
    active: true,
    keywords: [{ id: 'k1', word: 'guide' }, { id: 'k2', word: 'free' }, { id: 'k3', word: 'send' }],
    triggers: [{ id: 't1', type: 'comment' }, { id: 't2', type: 'story_mention' }],
    listener: 'MESSAGE',
    prompt: 'Hi {name}! Here is your free guide: https://yourlink.com 🎉',
    commentReply: 'Check your DMs! 📩',
    dmCount: 342,
    commentCount: 128,
    createdAt: '2026-04-10',
    matchMode: 'exact',
    negativeKeywords: [],
    multilingual: false,
    templateType: 'comment_dm',
  },
  {
    id: '2',
    name: 'Course Launch DM',
    active: false,
    keywords: [{ id: 'k4', word: 'course' }, { id: 'k5', word: 'enroll' }],
    triggers: [{ id: 't3', type: 'dm_keyword' }],
    listener: 'SMARTAI',
    prompt: 'Hey {name}! Thanks for your interest in our course. Here are the details...',
    commentReply: '',
    dmCount: 89,
    commentCount: 0,
    createdAt: '2026-04-14',
    matchMode: 'fuzzy',
    negativeKeywords: [],
    multilingual: true,
    templateType: 'dm_keyword',
  },
];

const MOCK_LEADS = [
  { id: '1', username: 'john_doe', igUserId: 'ig_001', source: 'comment', createdAt: '2026-04-18T08:23:00Z' },
  { id: '2', username: 'sarah.creates', igUserId: 'ig_002', source: 'dm', createdAt: '2026-04-18T07:10:00Z' },
  { id: '3', username: 'techbro99', igUserId: 'ig_003', source: 'story_mention', createdAt: '2026-04-17T22:45:00Z' },
  { id: '4', username: 'fitness_queen', igUserId: 'ig_004', source: 'comment', createdAt: '2026-04-17T19:30:00Z' },
  { id: '5', username: 'startup.vibes', igUserId: 'ig_005', source: 'dm', createdAt: '2026-04-17T15:12:00Z' },
];

const MOCK_DMS = [
  { id: '1', receiver: '@john_doe', message: 'Hi John! Here is your free guide: https://link.com 🎉', automationName: 'Free Guide Giveaway', createdAt: '2026-04-18T08:23:00Z', status: 'delivered' },
  { id: '2', receiver: '@sarah.creates', message: 'Hey Sarah! Thanks for your interest in our course...', automationName: 'Course Launch DM', createdAt: '2026-04-18T07:10:00Z', status: 'delivered' },
  { id: '3', receiver: '@techbro99', message: 'Hi! Here is your free guide: https://link.com 🎉', automationName: 'Free Guide Giveaway', createdAt: '2026-04-17T22:45:00Z', status: 'failed' },
  { id: '4', receiver: '@fitness_queen', message: 'Hi! Here is your free guide: https://link.com 🎉', automationName: 'Free Guide Giveaway', createdAt: '2026-04-17T19:30:00Z', status: 'delivered' },
];

const TRIGGER_LABELS: Record<TriggerType, string> = {
  comment: 'Post Comment',
  story_mention: 'Story Mention',
  dm_keyword: 'DM Keyword',
  post_like: 'Post Like',
  live_comment: 'Live Stream Comment',
  story_reply: 'Story Reply / Reaction',
  story_reaction: 'Story Reaction',
  story_poll: 'Story Poll Response',
};

const TRIGGER_ICONS: Record<TriggerType, React.ElementType> = {
  comment: MessageSquare,
  story_mention: AtSign,
  dm_keyword: MessageCircle,
  post_like: Heart,
  live_comment: Radio,
  story_reply: Image,
  story_reaction: Heart,
  story_poll: BarChart3,
};

const TRIGGER_DESCS: Record<TriggerType, string> = {
  comment: 'Fires when someone comments on your post',
  story_mention: 'Fires when you are tagged in a story',
  dm_keyword: 'Fires when DM contains keyword',
  post_like: 'Fires when someone likes your post',
  live_comment: 'Fires when someone comments a keyword during your live',
  story_reply: 'Fires when someone replies or reacts to your story',
  story_reaction: 'Fires on emoji reactions to your story',
  story_poll: 'Fires when someone votes on your story poll',
};

const MATCH_MODE_LABELS: Record<MatchMode, string> = {
  exact: 'Exact Match',
  fuzzy: 'Fuzzy Match',
  ai_intent: 'AI Intent',
  sentiment: 'Sentiment',
};

// ─── Reusable UI ──────────────────────────────────────────────────────────────

function Badge({ children, color = 'default' }: { children: React.ReactNode; color?: 'green' | 'red' | 'yellow' | 'pink' | 'blue' | 'default' }) {
  const colors = {
    green:   'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20',
    red:     'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]/20',
    yellow:  'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]/20',
    pink:    'bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/20',
    blue:    'bg-[var(--info-bg)] text-[var(--info)] border-[var(--info)]/20',
    default: 'bg-[var(--surface-muted)] text-[var(--text-secondary)] border-[var(--border)]',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[color]}`}>
      {children}
    </span>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
        checked ? 'bg-[var(--brand)]' : 'bg-[var(--border)]'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = 'pink' }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    pink:    'text-[var(--brand)] bg-[var(--brand)]/10',
    violet:  'text-[var(--brand)] bg-[var(--brand)]/10',
    emerald: 'text-[var(--success)] bg-[var(--success-bg)]',
    blue:    'text-[var(--info)] bg-[var(--info-bg)]',
    amber:   'text-[var(--warning)] bg-[var(--warning-bg)]',
  };
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-all duration-300 relative overflow-hidden p-6 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center ${colorMap[color] ?? colorMap.pink}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
        {sub && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function OverviewView({ automations, onNavigate }: { automations: Automation[]; onNavigate: (v: View) => void }) {
  const totalDMs = automations.reduce((s, a) => s + a.dmCount, 0);
  const totalComments = automations.reduce((s, a) => s + a.commentCount, 0);
  const activeCount = automations.filter(a => a.active).length;

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-xs)] p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Instagram className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Instagram Automation</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">Auto DM · Smart Replies · Lead Capture</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--success-bg)] border border-[var(--success)]/20 text-xs font-bold text-[var(--success)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
              {activeCount} Running
            </span>
            <button
              onClick={() => onNavigate('automations')}
              className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white text-sm font-bold px-4 py-2 rounded-[var(--radius-md)] transition-all shadow-lg shadow-pink-500/20 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <Zap className="w-4 h-4" /> Go Live
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards — 4-col on md+, 2×2 on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Zap} label="Active Automations" value={activeCount} sub={`of ${automations.length} total`} color="pink" />
        <StatCard icon={Send} label="DMs Sent" value={totalDMs.toLocaleString()} sub="all time" color="violet" />
        <StatCard icon={Users} label="Leads Captured" value={MOCK_LEADS.length} sub="from all sources" color="emerald" />
        <StatCard icon={MessageSquare} label="Comments Replied" value={totalComments.toLocaleString()} sub="auto-replies" color="blue" />
      </div>

      {/* Quick actions — 4 cards including Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'Create Automation', desc: 'Set up keywords and triggers', icon: Plus, view: 'automations' as View, gradient: 'from-pink-500 to-violet-500' },
          { label: 'View Leads', desc: `${MOCK_LEADS.length} people captured`, icon: Users, view: 'leads' as View, gradient: 'from-[var(--success)] to-teal-500' },
          { label: 'DM Inbox', desc: `${MOCK_DMS.length} messages sent`, icon: MessageCircle, view: 'dms' as View, gradient: 'from-[var(--info)] to-indigo-500' },
          { label: 'Templates', desc: 'Start from a ready-made setup', icon: Sparkles, view: 'templates' as View, gradient: 'from-violet-500 to-pink-500' },
        ].map(q => (
          <button
            key={q.label}
            onClick={() => onNavigate(q.view)}
            className="group bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-all duration-300 relative overflow-hidden p-6 text-left flex items-center gap-4 hover:border-[var(--brand)]/40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <div className={`w-12 h-12 rounded-[var(--radius-md)] bg-gradient-to-br ${q.gradient} flex items-center justify-center shrink-0 shadow-lg`}>
              <q.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">{q.label}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{q.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      {/* Recent automations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[var(--text-primary)]">Recent Automations</h3>
          <button onClick={() => onNavigate('automations')} className="text-xs text-[var(--brand)] hover:opacity-80 font-semibold flex items-center gap-1 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-3">
          {automations.map(a => (
            <div key={a.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] px-5 hover:border-[var(--brand)]/30 hover:shadow-[var(--shadow-xs)] transition-all duration-200 py-4 flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full shrink-0 ${a.active ? 'bg-[var(--success)] shadow-[0_0_6px_var(--success)]' : 'bg-[var(--border)]'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{a.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">{a.dmCount} DMs · {a.keywords.length} keywords</p>
              </div>
              <Badge color={a.active ? 'green' : 'default'}>{a.active ? 'Active' : 'Paused'}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AutomationsView({ automations, setAutomations, onEdit }: { automations: Automation[]; setAutomations: React.Dispatch<React.SetStateAction<Automation[]>>; onEdit: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const filtered = automations.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  function toggleActive(id: string) {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  }

  function deleteAutomation(id: string) {
    setAutomations(prev => prev.filter(a => a.id !== id));
  }

  function createNew() {
    const newA: Automation = {
      id: Date.now().toString(),
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
    };
    setAutomations(prev => [newA, ...prev]);
    onEdit(newA.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between pt-1">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Automations</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{automations.length} automation{automations.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button onClick={createNew} className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] text-sm font-bold px-4 py-2.5 rounded-[var(--radius-md)] transition-colors shadow-[var(--shadow-xs)] shrink-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search automations..."
          className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-all"
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-[var(--text-secondary)]">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No automations found. Create your first one!</p>
          </div>
        )}
        {filtered.map(a => (
          <div key={a.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-all duration-300 relative overflow-hidden p-6 hover:border-[var(--brand)]/30">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${a.active ? 'bg-[var(--brand)]/10' : 'bg-[var(--surface-muted)]'}`}>
                <Zap className={`w-5 h-5 ${a.active ? 'text-[var(--brand)]' : 'text-[var(--text-tertiary)]'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{a.name}</h3>
                  <Badge color={a.active ? 'green' : 'default'}>{a.active ? 'Active' : 'Paused'}</Badge>
                  <Badge color="default">{a.listener === 'SMARTAI' ? '✦ Smart AI' : '✉ Message'}</Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1"><Send className="w-3 h-3" /> {a.dmCount} DMs</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {a.commentCount} comments</span>
                  <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {a.keywords.length} keywords</span>
                  <span className="flex items-center gap-1"><Bell className="w-3 h-3" /> {a.triggers.length} triggers</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {a.keywords.slice(0, 5).map(k => (
                    <span key={k.id} className="px-2 py-0.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-full text-xs text-[var(--text-secondary)]">#{k.word}</span>
                  ))}
                  {a.keywords.length > 5 && <span className="px-2 py-0.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-full text-xs text-[var(--text-secondary)]">+{a.keywords.length - 5}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Toggle checked={a.active} onChange={() => toggleActive(a.id)} />
                <button onClick={() => onEdit(a.id)} className="p-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteAutomation(a.id)} className="p-2 rounded-[var(--radius-sm)] hover:bg-[var(--danger-bg)] text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BuilderView({ automation, onUpdate, onBack }: { automation: Automation; onUpdate: (a: Automation) => void; onBack: () => void }) {
  const [local, setLocal] = useState<Automation>(automation);
  const [newKeyword, setNewKeyword] = useState('');
  const [newNegKeyword, setNewNegKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<'keywords' | 'triggers' | 'listener' | 'message'>('keywords');

  const save = () => { onUpdate(local); onBack(); };

  function addKeyword() {
    const word = newKeyword.trim().toLowerCase();
    if (!word || local.keywords.some(k => k.word === word)) return;
    setLocal(p => ({ ...p, keywords: [...p.keywords, { id: Date.now().toString(), word }] }));
    setNewKeyword('');
  }

  function removeKeyword(id: string) {
    setLocal(p => ({ ...p, keywords: p.keywords.filter(k => k.id !== id) }));
  }

  function addNegKeyword() {
    const word = newNegKeyword.trim().toLowerCase();
    if (!word || local.negativeKeywords.some(k => k.word === word)) return;
    setLocal(p => ({ ...p, negativeKeywords: [...p.negativeKeywords, { id: Date.now().toString(), word }] }));
    setNewNegKeyword('');
  }

  function removeNegKeyword(id: string) {
    setLocal(p => ({ ...p, negativeKeywords: p.negativeKeywords.filter(k => k.id !== id) }));
  }

  function toggleTrigger(type: TriggerType) {
    setLocal(p => ({
      ...p,
      triggers: p.triggers.some(t => t.type === type)
        ? p.triggers.filter(t => t.type !== type)
        : [...p.triggers, { id: Date.now().toString(), type }],
    }));
  }

  const tabs = [
    { id: 'keywords', label: 'Keywords', icon: Hash },
    { id: 'triggers', label: 'Triggers', icon: Bell },
    { id: 'listener', label: 'AI / Message', icon: Bot },
    { id: 'message', label: 'DM Content', icon: Send },
  ] as const;

  const matchModes: { mode: MatchMode; desc: string }[] = [
    { mode: 'exact', desc: 'Only exact word matches' },
    { mode: 'fuzzy', desc: 'Allows typos & variations' },
    { mode: 'ai_intent', desc: 'AI understands meaning' },
    { mode: 'sentiment', desc: 'Matches by emotion/tone' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <input
            value={local.name}
            onChange={e => setLocal(p => ({ ...p, name: e.target.value }))}
            className="text-xl font-bold text-[var(--text-primary)] bg-transparent border-0 outline-none w-full focus:ring-0"
            placeholder="Automation name..."
          />
          <p className="text-xs text-[var(--text-secondary)]">Configure triggers, keywords, and response</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Toggle checked={local.active} onChange={v => setLocal(p => ({ ...p, active: v }))} />
            <span className="text-[var(--text-secondary)]">{local.active ? 'Active' : 'Paused'}</span>
          </div>
          <button onClick={save} className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] text-sm font-bold px-5 py-2.5 rounded-[var(--radius-md)] transition-colors shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            Save
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-xs font-semibold transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${activeTab === t.id ? 'bg-[var(--brand)] text-[var(--text-on-brand)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Keywords tab */}
      {activeTab === 'keywords' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] p-6 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Trigger Keywords</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">When someone comments or DMs these words, the automation fires.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addKeyword()}
              placeholder="Add keyword..."
              className="flex-1 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition"
            />
            <button onClick={addKeyword} className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-4 py-2.5 rounded-[var(--radius-md)] font-bold text-sm transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {local.keywords.length === 0 && <p className="text-xs text-[var(--text-tertiary)]">No keywords yet. Add some above.</p>}
            {local.keywords.map(k => (
              <span key={k.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand)]/10 border border-[var(--brand)]/20 text-[var(--brand)] rounded-full text-sm font-semibold">
                #{k.word}
                <button onClick={() => removeKeyword(k.id)} className="hover:opacity-70 transition-opacity focus-visible:outline-none">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>

          {/* Match Mode selector */}
          <div className="border-t border-[var(--border)] pt-4 space-y-3">
            <p className="text-xs font-bold text-[var(--text-primary)]">Match Mode</p>
            <div className="flex flex-wrap gap-2">
              {matchModes.map(({ mode, desc }) => (
                <button
                  key={mode}
                  title={desc}
                  onClick={() => setLocal(p => ({ ...p, matchMode: mode }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                    local.matchMode === mode
                      ? 'bg-[var(--brand)] text-[var(--text-on-brand)] shadow-[var(--shadow-xs)]'
                      : 'bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)]/40 hover:text-[var(--brand)]'
                  }`}
                >
                  {MATCH_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              {matchModes.find(m => m.mode === local.matchMode)?.desc}
            </p>
          </div>

          {/* Negative Keywords */}
          <div className="border-t border-[var(--border)] pt-4 space-y-3">
            <div>
              <p className="text-xs font-bold text-[var(--danger)]">Negative Keywords</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">If any of these appear, the automation will NOT fire.</p>
            </div>
            <div className="flex gap-2">
              <input
                value={newNegKeyword}
                onChange={e => setNewNegKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNegKeyword()}
                placeholder="Add negative keyword..."
                className="flex-1 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition"
              />
              <button onClick={addNegKeyword} className="bg-[var(--danger)] hover:opacity-90 text-white px-4 py-2.5 rounded-[var(--radius-md)] font-bold text-sm transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {local.negativeKeywords.length === 0 && <p className="text-xs text-[var(--text-tertiary)]">No negative keywords yet.</p>}
              {local.negativeKeywords.map(k => (
                <span key={k.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--danger-bg)] border border-[var(--danger)]/20 text-[var(--danger)] rounded-full text-sm font-semibold">
                  -{k.word}
                  <button onClick={() => removeNegKeyword(k.id)} className="hover:opacity-70 transition-opacity focus-visible:outline-none">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Multilingual toggle */}
          <div className="border-t border-[var(--border)] pt-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-[var(--text-primary)]">Detect keywords in any language (AI-powered)</p>
                <Badge color="pink">PRO</Badge>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Match keywords regardless of script or language</p>
            </div>
            <Toggle checked={local.multilingual} onChange={v => setLocal(p => ({ ...p, multilingual: v }))} />
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-xs text-[var(--text-secondary)] font-semibold mb-2">Pro tip: Use broader keywords for higher reach</p>
            <div className="flex flex-wrap gap-2">
              {['free', 'info', 'link', 'guide', 'send', 'course'].map(w => (
                <button key={w} onClick={() => { setNewKeyword(w); }} className="px-2.5 py-1 bg-[var(--surface-muted)] border border-[var(--border)] rounded-full text-xs text-[var(--text-secondary)] hover:border-[var(--brand)]/40 hover:text-[var(--brand)] transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                  #{w}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Triggers tab */}
      {activeTab === 'triggers' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Trigger Events</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Choose what actions activate this automation.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(TRIGGER_LABELS) as TriggerType[]).map(type => {
              const Icon = TRIGGER_ICONS[type];
              const active = local.triggers.some(t => t.type === type);
              return (
                <button
                  key={type}
                  onClick={() => toggleTrigger(type)}
                  className={`flex items-center gap-3 p-4 rounded-[var(--radius-md)] border text-left transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${active ? 'border-[var(--brand)]/50 bg-[var(--brand)]/5' : 'border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--brand)]/30'}`}
                >
                  <div className={`w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${active ? 'bg-[var(--brand)]/15 text-[var(--brand)]' : 'bg-[var(--surface-hover)] text-[var(--text-tertiary)]'}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${active ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>{TRIGGER_LABELS[type]}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 leading-snug">{TRIGGER_DESCS[type]}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${active ? 'border-[var(--brand)] bg-[var(--brand)]' : 'border-[var(--border)]'}`}>
                    {active && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Listener tab */}
      {activeTab === 'listener' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] p-6 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Response Type</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Choose how your automation responds to triggers.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {([
              { type: 'MESSAGE', icon: Send, label: 'Static Message', desc: 'Send a fixed message every time.' },
              { type: 'SMARTAI', icon: Bot, label: 'Smart AI', desc: 'AI crafts personalized replies using your prompt.' },
            ] as const).map(opt => (
              <button
                key={opt.type}
                onClick={() => setLocal(p => ({ ...p, listener: opt.type }))}
                className={`p-5 rounded-[var(--radius-md)] border text-left transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${local.listener === opt.type ? 'border-[var(--brand)]/50 bg-[var(--brand)]/5' : 'border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--brand)]/30'}`}
              >
                <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center mb-3 ${local.listener === opt.type ? 'bg-[var(--brand)] text-[var(--text-on-brand)] shadow-[var(--shadow-sm)]' : 'bg-[var(--surface-hover)] text-[var(--text-tertiary)]'}`}>
                  <opt.icon className="w-5 h-5" />
                </div>
                <p className={`text-sm font-bold ${local.listener === opt.type ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>{opt.label}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{opt.desc}</p>
                {opt.type === 'SMARTAI' && <Badge color="pink">PRO</Badge>}
              </button>
            ))}
          </div>
          {local.listener === 'SMARTAI' && (
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">AI Prompt / Context</label>
              <textarea
                value={local.prompt}
                onChange={e => setLocal(p => ({ ...p, prompt: e.target.value }))}
                placeholder="Tell the AI about your business, offer, and what to share in the DM..."
                rows={4}
                className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] resize-none transition"
              />
            </div>
          )}
        </div>
      )}

      {/* Message tab */}
      {activeTab === 'message' && (
        <div className="space-y-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">DM Message</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">The message sent to users who trigger this automation.</p>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Message text</label>
                <span className="text-xs text-[var(--text-tertiary)]">{local.prompt.length}/1000</span>
              </div>
              <textarea
                value={local.prompt}
                onChange={e => setLocal(p => ({ ...p, prompt: e.target.value }))}
                placeholder={`Hi {name}! Thanks for reaching out. Here's your link: ...`}
                rows={5}
                className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] resize-none transition"
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-2">Use <code className="bg-[var(--surface-muted)] px-1 rounded">{'{name}'}</code> to personalise.</p>
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Comment Reply <span className="text-[var(--text-tertiary)] font-normal text-xs ml-1">optional</span></h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Public reply on the post comment before sending the DM.</p>
            </div>
            <input
              value={local.commentReply}
              onChange={e => setLocal(p => ({ ...p, commentReply: e.target.value }))}
              placeholder="Check your DMs! 📩"
              className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition"
            />
          </div>

          {/* Preview */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] p-6">
            <p className="text-xs font-semibold text-[var(--text-secondary)] mb-3">Preview</p>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 shrink-0" />
              <div className="bg-[var(--surface-muted)] rounded-[var(--radius-lg)] rounded-tl-sm px-4 py-3 max-w-xs">
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{local.prompt.replace('{name}', 'Alex') || 'Your message will appear here...'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LeadsView() {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  const filtered = MOCK_LEADS.filter(l =>
    (sourceFilter === 'all' || l.source === sourceFilter) &&
    l.username.toLowerCase().includes(search.toLowerCase())
  );

  const sourceColors: Record<string, 'pink' | 'blue' | 'yellow'> = { comment: 'pink', dm: 'blue', story_mention: 'yellow' };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between pt-1">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Leads</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{MOCK_LEADS.length} leads captured from Instagram</p>
        </div>
        <button className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] px-3 py-2 rounded-[var(--radius-md)] transition-colors hover:border-[var(--brand)]/40 shrink-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by username..."
            className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition" />
        </div>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition">
          <option value="all">All Sources</option>
          <option value="comment">Comment</option>
          <option value="dm">DM</option>
          <option value="story_mention">Story Mention</option>
        </select>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['Username', 'Source', 'Captured'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-[var(--text-secondary)] px-5 py-3.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map(l => (
              <tr key={l.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--brand)] flex items-center justify-center text-[var(--text-on-brand)] text-xs font-bold shrink-0">
                      {l.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">@{l.username}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{l.igUserId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Badge color={sourceColors[l.source] ?? 'default'}>{l.source.replace('_', ' ')}</Badge>
                </td>
                <td className="px-5 py-4 text-xs text-[var(--text-tertiary)]">
                  {new Date(l.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No leads found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DMsView() {
  return (
    <div className="space-y-6">
      <div className="pt-1">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">DM Inbox</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Log of all automated DMs sent</p>
      </div>
      <div className="space-y-3">
        {MOCK_DMS.map(dm => (
          <div key={dm.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-all duration-300 p-6 hover:border-[var(--brand)]/20">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-[var(--brand)] flex items-center justify-center text-[var(--text-on-brand)] text-xs font-bold shrink-0">
                {dm.receiver[1].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-bold text-[var(--text-primary)]">{dm.receiver}</p>
                  <div className="flex items-center gap-2">
                    <Badge color={dm.status === 'delivered' ? 'green' : 'red'}>
                      {dm.status === 'delivered' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {dm.status}
                    </Badge>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {new Date(dm.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{dm.message}</p>
                <p className="text-xs text-[var(--brand)] mt-2 flex items-center gap-1"><Zap className="w-3 h-3" />{dm.automationName}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsView({ automations }: { automations: Automation[] }) {
  const totalDMs = automations.reduce((s, a) => s + a.dmCount, 0);
  const totalComments = automations.reduce((s, a) => s + a.commentCount, 0);

  return (
    <div className="space-y-6">
      <div className="pt-1">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analytics</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Performance metrics for all your automations</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={Send} label="Total DMs Sent" value={totalDMs} color="pink" />
        <StatCard icon={MessageSquare} label="Comments Replied" value={totalComments} color="violet" />
        <StatCard icon={Users} label="Leads Captured" value={MOCK_LEADS.length} color="emerald" />
        <StatCard icon={TrendingUp} label="Conversion Rate" value="12.4%" sub="leads / DMs" color="amber" />
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] p-6">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-5">Per-Automation Performance</h3>
        <div className="space-y-4">
          {automations.map(a => {
            const dmPct = totalDMs ? Math.round((a.dmCount / totalDMs) * 100) : 0;
            return (
              <div key={a.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">{a.name}</span>
                  <span className="text-[var(--text-tertiary)]">{a.dmCount} DMs · {dmPct}%</span>
                </div>
                <div className="h-2 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full transition-all" style={{ width: `${dmPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] p-6">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Lead Sources</h3>
          {[{ label: 'Comment', count: 2, color: 'bg-[var(--brand)]' }, { label: 'DM', count: 2, color: 'bg-[var(--brand)]' }, { label: 'Story Mention', count: 1, color: 'bg-[var(--info)]' }].map(s => (
            <div key={s.label} className="flex items-center gap-3 mb-3">
              <div className={`w-3 h-3 rounded-full shrink-0 ${s.color}`} />
              <span className="text-xs text-[var(--text-secondary)] flex-1">{s.label}</span>
              <span className="text-xs font-bold text-[var(--text-primary)]">{s.count}</span>
            </div>
          ))}
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] p-6">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">DM Delivery Rate</h3>
          <div className="text-center py-4">
            <p className="text-4xl font-extrabold text-[var(--text-primary)]">92<span className="text-xl text-[var(--brand)]">%</span></p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">of DMs delivered successfully</p>
          </div>
          <div className="h-2 bg-[var(--surface-muted)] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[var(--success)] to-teal-500 rounded-full" style={{ width: '92%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsView() {
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState('');

  return (
    <div className="space-y-6">
      <div className="pt-1">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Manage your Instagram connection and account preferences</p>
      </div>

      {/* Connect Instagram */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
            <Instagram className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Instagram Account</h3>
            <p className="text-xs text-[var(--text-secondary)]">Connect your business or creator account</p>
          </div>
          {connected && <Badge color="green"><CheckCircle2 className="w-3 h-3" /> Connected</Badge>}
        </div>

        {!connected ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">Instagram Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-sm">@</span>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="your_username"
                  className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] py-2.5 pl-8 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition"
                />
              </div>
            </div>
            <button
              onClick={() => username && setConnected(true)}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-bold py-3 rounded-[var(--radius-md)] transition-all shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <Instagram className="w-4 h-4" /> Connect via Instagram OAuth
            </button>
            <p className="text-xs text-[var(--text-tertiary)] text-center">Requires an Instagram Business or Creator account linked to a Facebook Page.</p>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-[var(--surface-muted)] rounded-[var(--radius-md)] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--brand)] flex items-center justify-center text-[var(--text-on-brand)] text-xs font-bold">
                {username[0]?.toUpperCase() ?? 'I'}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">@{username}</p>
                <p className="text-xs text-[var(--text-secondary)]">Business Account</p>
              </div>
            </div>
            <button onClick={() => setConnected(false)} className="text-xs text-[var(--danger)] hover:opacity-80 font-semibold focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded">Disconnect</button>
          </div>
        )}
      </div>

      {/* Subscription — decorative gradient kept */}
      <div className="bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-[var(--brand)]/20 rounded-[var(--radius-lg)] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Crown className="w-5 h-5 text-[var(--warning)]" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Upgrade to Pro</h3>
          <Badge color="yellow">FREE</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-[var(--text-secondary)]">
          {['Unlimited automations', 'Smart AI responses', 'Priority delivery', 'Advanced analytics', 'Webhook events', 'Bulk DM campaigns'].map(f => (
            <div key={f} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />{f}</div>
          ))}
        </div>
        <button className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-bold py-3 rounded-[var(--radius-md)] transition-all shadow-lg shadow-pink-500/20 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          Upgrade to Pro — ₹999/mo
        </button>
      </div>

      {/* Danger zone */}
      <div className="bg-[var(--surface-muted)] border border-[var(--danger)]/20 rounded-[var(--radius-lg)] p-6 space-y-3">
        <h3 className="text-sm font-bold text-[var(--danger)]">Danger Zone</h3>
        <p className="text-xs text-[var(--text-secondary)]">These actions are irreversible. Proceed with caution.</p>
        <button className="text-sm font-semibold text-[var(--danger)] border border-[var(--danger)]/30 px-4 py-2 rounded-[var(--radius-md)] hover:bg-[var(--danger-bg)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          Delete All Automations
        </button>
      </div>
    </div>
  );
}

// ─── Templates View ───────────────────────────────────────────────────────────

interface TemplateCard {
  type: Exclude<TemplateType, 'custom'>;
  title: string;
  desc: string;
  gradient: string;
  icon: React.ElementType;
  features: string[];
  defaultKeywords: string[];
  defaultPrompt: string;
  defaultTriggers: TriggerType[];
}

const TEMPLATE_CARDS: TemplateCard[] = [
  {
    type: 'comment_dm',
    title: 'Comment to DM',
    desc: 'Auto-DM anyone who comments your trigger word on a post.',
    gradient: 'from-pink-500 to-violet-500',
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
    gradient: 'from-violet-500 to-blue-500',
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
    gradient: 'from-pink-500 to-rose-500',
    icon: Image,
    features: ['Story reply trigger', 'Story reaction trigger', 'Warm lead follow-up'],
    defaultKeywords: ['yes', 'interested', 'more'],
    defaultPrompt: 'Hey {name}! Glad you liked the story! Here is what I wanted to share with you: 🎁',
    defaultTriggers: ['story_reply', 'story_reaction'],
  },
  {
    type: 'live_comment',
    title: 'Live Stream DM',
    desc: 'Capture leads in real time while you go live on Instagram.',
    gradient: 'from-orange-500 to-amber-500',
    icon: Radio,
    features: ['Live comment trigger', 'Real-time delivery', 'High-intent audience'],
    defaultKeywords: ['link', 'send', 'want', 'yes'],
    defaultPrompt: 'Hi {name}! You asked during the live — here is the resource I mentioned: 🔗',
    defaultTriggers: ['live_comment'],
  },
];

function TemplatesView({ onEdit, setAutomations }: { onEdit: (id: string) => void; setAutomations: React.Dispatch<React.SetStateAction<Automation[]>> }) {
  function useTemplate(card: TemplateCard) {
    const newA: Automation = {
      id: Date.now().toString(),
      name: card.title,
      active: false,
      keywords: card.defaultKeywords.map((w, i) => ({ id: `${Date.now()}-${i}`, word: w.toLowerCase() })),
      triggers: card.defaultTriggers.map((t, i) => ({ id: `${Date.now()}-t${i}`, type: t })),
      listener: 'MESSAGE',
      prompt: card.defaultPrompt,
      commentReply: 'Check your DMs! 📩',
      dmCount: 0,
      commentCount: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      matchMode: 'exact',
      negativeKeywords: [],
      multilingual: false,
      templateType: card.type,
    };
    setAutomations(prev => [newA, ...prev]);
    onEdit(newA.id);
  }

  return (
    <div className="space-y-6">
      <div className="pt-1">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Templates</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Start with a pre-built automation and customise it to your needs.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {TEMPLATE_CARDS.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.type}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-all duration-300 overflow-hidden hover:border-[var(--brand)]/30 flex flex-col"
            >
              {/* Gradient icon area — decorative, kept as-is */}
              <div className={`h-28 bg-gradient-to-br ${card.gradient} flex items-center justify-center relative overflow-hidden`}>
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_50%,white,transparent_60%)]" />
                <div className="w-14 h-14 rounded-[var(--radius-lg)] bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <Icon className="w-7 h-7 text-white" />
                </div>
              </div>

              {/* Card body */}
              <div className="p-5 flex flex-col gap-3 flex-1">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">{card.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{card.desc}</p>
                </div>

                <ul className="space-y-1.5">
                  {card.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => useTemplate(card)}
                  className={`mt-auto w-full bg-gradient-to-r ${card.gradient} hover:opacity-90 text-white text-sm font-bold py-2.5 rounded-[var(--radius-md)] transition-all shadow-lg focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]`}
                >
                  Use Template
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GuideView() {
  const steps = [
    { num: 1, title: 'Connect Instagram', desc: 'Link your Instagram Business or Creator account via OAuth in Settings.' },
    { num: 2, title: 'Create an Automation', desc: 'Go to Automations → New Automation. Give it a name.' },
    { num: 3, title: 'Add Keywords', desc: 'Add trigger words people comment or DM (e.g. "guide", "free", "link").' },
    { num: 4, title: 'Choose Triggers', desc: 'Select what fires the automation — post comment, story mention, or DM keyword.' },
    { num: 5, title: 'Set Response Type', desc: 'Pick Static Message for a fixed reply, or Smart AI for personalised responses.' },
    { num: 6, title: 'Write your DM', desc: 'Craft your automated DM. Use {name} to personalise. Optionally add a comment reply.' },
    { num: 7, title: 'Activate', desc: 'Toggle the automation on. It will now fire automatically when conditions are met.' },
  ];

  const tips = [
    'Use broad keywords like "free", "link", "send" for maximum reach.',
    'Always set a comment reply to make the interaction feel natural.',
    'Smart AI works best when you give it detailed business context in the prompt.',
    'Monitor your DM Inbox and Leads regularly to track engagement.',
  ];

  return (
    <div className="space-y-6">
      <div className="pt-1">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Guide</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">How to set up and use Instagram Auto DM effectively.</p>
      </div>

      <div className="space-y-3">
        {steps.map(s => (
          <div key={s.num} className="flex gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] px-5 hover:border-[var(--brand)]/30 hover:shadow-[var(--shadow-xs)] transition-all duration-200 py-4">
            <div className="w-6 h-6 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {s.num}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{s.title}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Pro Tips</p>
        {tips.map((t, i) => (
          <div key={i} className="flex gap-2.5 text-xs text-[var(--text-secondary)]">
            <Sparkles className="w-3.5 h-3.5 text-[var(--brand)] shrink-0 mt-0.5" />
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS: { view: View; icon: React.ElementType; label: string; badge?: string }[] = [
  { view: 'overview', icon: Activity, label: 'Overview' },
  { view: 'automations', icon: Zap, label: 'Automations' },
  { view: 'leads', icon: Users, label: 'Leads', badge: String(MOCK_LEADS.length) },
  { view: 'dms', icon: MessageCircle, label: 'DM Inbox', badge: String(MOCK_DMS.length) },
  { view: 'analytics', icon: BarChart3, label: 'Analytics' },
  { view: 'settings', icon: Settings, label: 'Settings' },
  { view: 'templates', icon: Sparkles, label: 'Templates' },
  { view: 'guide', icon: FileText, label: 'Guide' },
];

// The main sidebar is fixed at left-0, w-[256px].
// This sub-sidebar sits fixed right beside it at left-[256px].
const SUB_SIDEBAR_W = 120; // px

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function AutoDMPage() {
  const [view, setView] = useState<View>('overview');
  const [builderAutomationId, setBuilderAutomationId] = useState<string | null>(null);
  const [automations, setAutomations] = useState<Automation[]>(MOCK_AUTOMATIONS);

  const handleEdit = useCallback((id: string) => {
    setBuilderAutomationId(id);
    setView('builder');
  }, []);

  const handleUpdate = useCallback((updated: Automation) => {
    setAutomations(prev => prev.map(a => a.id === updated.id ? updated : a));
  }, []);

  const handleBack = useCallback(() => {
    setBuilderAutomationId(null);
    setView('automations');
  }, []);

  const builderAutomation = automations.find(a => a.id === builderAutomationId);

  function navigate(v: View) {
    if (view === 'builder') handleBack();
    setView(v);
  }

  function renderView() {
    if (view === 'builder' && builderAutomation) {
      return <BuilderView automation={builderAutomation} onUpdate={handleUpdate} onBack={handleBack} />;
    }
    switch (view) {
      case 'overview': return <OverviewView automations={automations} onNavigate={setView} />;
      case 'automations': return <AutomationsView automations={automations} setAutomations={setAutomations} onEdit={handleEdit} />;
      case 'leads': return <LeadsView />;
      case 'dms': return <DMsView />;
      case 'analytics': return <AnalyticsView automations={automations} />;
      case 'settings': return <SettingsView />;
      case 'templates': return <TemplatesView onEdit={handleEdit} setAutomations={setAutomations} />;
      case 'guide': return <GuideView />;
      default: return null;
    }
  }

  return (
    <>
      {/* ── Sub-sidebar: fixed, anchored right after the main 256px sidebar ── */}
      <aside
        className="fixed top-14 bottom-0 flex-col bg-[var(--bg-primary)] border-r border-[var(--border)] hidden md:flex"
        style={{ left: 256, width: SUB_SIDEBAR_W, zIndex: 99998 }}
      >
        <nav className="pt-4 flex flex-col gap-2">
          {/* Section header */}
          <div className="px-3 pb-2 flex flex-col items-center gap-1.5">
            {/* <Instagram className="w-4 h-4 text-[var(--text-secondary)]" /> */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60 text-center leading-tight">
              Automation
            </p>
          </div>

          <div className="flex flex-col gap-0.5 px-1">
            {NAV_ITEMS.map((item) => {
              const active = view === item.view || (view === 'builder' && item.view === 'automations');
              return (
                <button
                  key={item.view}
                  onClick={() => navigate(item.view)}
                  title={item.label}
                  className={`group relative flex flex-col items-center justify-center gap-1 w-full py-3 px-1 rounded-[var(--radius-sm)] transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                    active
                      ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full bg-[var(--brand)]" />
                  )}
                  <item.icon className={`w-4 h-4 shrink-0 transition-colors ${
                    active ? 'text-[var(--brand)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                  }`} />
                  <span className="text-[10px] font-medium leading-tight text-center w-full px-1">{item.label}</span>
                  {item.badge ? (
                    <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[14px] h-3.5 px-0.5 rounded-full bg-[var(--danger)] text-[var(--text-on-brand)] text-[8px] font-bold leading-none">
                      {Number(item.badge) > 9 ? '9+' : item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* ── Main content: offset by sub-sidebar width on md+ ── */}
      <div
        className="min-h-screen hidden md:block"
        style={{ marginLeft: SUB_SIDEBAR_W }}
      >
        <div className="px-8 py-8 w-full">
          {renderView()}
        </div>
      </div>

      {/* ── Mobile fallback: no fixed sub-sidebar, just stacked ── */}
      <div className="md:hidden">
        {/* Mobile nav pills */}
        <div className="flex overflow-x-auto gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-primary)] no-scrollbar">
          {NAV_ITEMS.map(item => {
            const active = view === item.view || (view === 'builder' && item.view === 'automations');
            return (
              <button
                key={item.view}
                onClick={() => navigate(item.view)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                  active
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="px-4 py-6">
          {renderView()}
        </div>
      </div>
    </>
  );
}
