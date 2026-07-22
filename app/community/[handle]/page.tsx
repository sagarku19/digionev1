'use client';
// Public per-creator community profile — viewable by ANYONE (anon or logged-in).
// Route: /community/[handle]  (handle = community username OR a creator profile id)
// Aesthetic: warm editorial ledger — paper + grain, vermilion glow, Bricolage
// display name, Plex Mono `>>` labels, vertical rails framing the column, and a
// sticky-footer layout so the DigiOne credit stays pinned to the bottom.
// Lives outside the (marketing) group on purpose — no nav.

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Instagram, Youtube, Twitter, Facebook, Linkedin, Github, Globe, Link2,
  UserRound, Loader2, Heart, Pin, MessageCircle, ArrowLeft, Users,
  type LucideIcon,
} from 'lucide-react';
import { usePublicCommunity, useLikeCommunityPost, type CommunityPost, type Social } from '@/hooks/marketing/useCommunity';

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  instagram: Instagram,
  youtube: Youtube,
  twitter: Twitter,
  x: Twitter,
  facebook: Facebook,
  linkedin: Linkedin,
  github: Github,
  website: Globe,
};
const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'Instagram', youtube: 'YouTube', twitter: 'Twitter', x: 'X',
  facebook: 'Facebook', linkedin: 'LinkedIn', github: 'GitHub', website: 'Website',
};

const CATEGORY_TINT: Record<string, string> = {
  Milestone: 'text-emerald-700 bg-emerald-600/[0.08]',
  Tip:       'text-amber-700 bg-amber-500/[0.10]',
  Feedback:  'text-sky-700 bg-sky-600/[0.08]',
  Event:     'text-[#E83A2E] bg-[#E83A2E]/[0.08]',
  General:   'text-black/55 bg-black/[0.05]',
};

const NOISE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

const RAIL = 'border-black/[0.08]';
const URL_RE = /(https?:\/\/[^\s]+)/g;
const IS_URL = /^https?:\/\//i;

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function normalizeUrl(url: string) {
  return IS_URL.test(url) ? url : `https://${url}`;
}

// Turn pasted URLs inside post text into clickable links.
function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) =>
        IS_URL.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-words font-medium text-[#E83A2E] underline decoration-[#E83A2E]/30 underline-offset-2 transition-colors hover:decoration-[#E83A2E]"
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

// Full-height, rail-framed shell. TopBar + Footer sit INSIDE the rails so their
// hairlines terminate at the rails instead of crossing past them. `flex-1` main
// keeps the footer pinned to the bottom when there's little/no content.
function Frame({ handle, children }: { handle?: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#F7F5F2] text-[#1A1712]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.045] mix-blend-multiply"
        style={{ backgroundImage: `url("${NOISE}")` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[420px]"
        style={{ background: 'radial-gradient(58% 100% at 50% 0%, rgba(232,58,46,0.11), transparent 72%)' }}
      />
      <div className={`relative z-10 mx-auto flex min-h-screen w-full max-w-[640px] flex-col border-x ${RAIL}`}>
        <header className={`sticky top-0 z-20 border-b ${RAIL} bg-[#F7F5F2]/80 backdrop-blur-xl`}>
          <div className="flex h-14 items-center justify-between px-5">
            <span className="inline-flex items-center gap-2 font-ledger text-[11px] font-semibold uppercase tracking-[0.2em] text-black/60">
              <span className="text-[#E83A2E]">{'>>'}</span>
              <Users className="h-3.5 w-3.5" strokeWidth={2.2} />
              Community
            </span>
            {handle && <span className="font-ledger text-[12px] text-black/35">@{handle}</span>}
          </div>
        </header>

        <main className="flex-1 px-5 pt-10 pb-14 sm:pt-14">{children}</main>

        <footer className={`border-t ${RAIL}`}>
          <div className="flex h-16 items-center justify-center px-5">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 font-ledger text-[11px] uppercase tracking-[0.18em] text-black/40 transition hover:text-black/70"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#E83A2E] transition group-hover:scale-125" />
              Powered by DigiOne
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Interactive like — anon-safe. Dedupe per browser via localStorage; optimistic
// count with rollback on failure.
function LikeButton({ postId, initial }: { postId: string; initial: number }) {
  const like = useLikeCommunityPost();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initial);

  useEffect(() => {
    try {
      setLiked(localStorage.getItem(`dg_comm_like_${postId}`) === '1');
    } catch {
      /* localStorage unavailable — treat as not liked */
    }
  }, [postId]);

  const toggle = async () => {
    if (like.isPending) return;
    const wasLiked = liked;
    const delta: 1 | -1 = wasLiked ? -1 : 1;
    setLiked(!wasLiked);
    setCount((c) => Math.max(0, c + delta));
    try { localStorage.setItem(`dg_comm_like_${postId}`, wasLiked ? '0' : '1'); } catch {}
    try {
      const server = await like.mutateAsync({ postId, delta });
      setCount(server);
    } catch {
      setLiked(wasLiked);
      setCount((c) => Math.max(0, c - delta));
      try { localStorage.setItem(`dg_comm_like_${postId}`, wasLiked ? '1' : '0'); } catch {}
    }
  };

  return (
    <button
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
      className={`mt-3.5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-ledger text-[11px] font-medium transition ${
        liked
          ? 'border-[#E83A2E]/25 bg-[#E83A2E]/[0.07] text-[#E83A2E]'
          : 'border-black/[0.10] bg-white/70 text-black/45 hover:-translate-y-0.5 hover:border-black/20 hover:text-black/70'
      }`}
    >
      <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} strokeWidth={1.9} />
      {count > 0 ? count : 'Like'}
    </button>
  );
}

export default function CommunityProfilePage() {
  const params = useParams<{ handle: string }>();
  const handle = params?.handle;
  const { data, isLoading } = usePublicCommunity(handle);

  if (isLoading) {
    return (
      <Frame>
        <div className="flex items-center justify-center py-40">
          <Loader2 className="h-7 w-7 animate-spin text-[#E83A2E]" />
        </div>
      </Frame>
    );
  }

  if (!data) {
    return (
      <Frame>
        <div className="pt-20 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/[0.06]">
            <MessageCircle className="h-7 w-7 text-black/25" strokeWidth={1.8} />
          </div>
          <h1 className="font-display text-[26px] font-bold tracking-tight">Community not found</h1>
          <p className="mt-2 text-[14px] text-black/45">
            This community doesn&apos;t exist or its link has changed.
          </p>
          <Link
            href="/community"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1A1712] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-black"
          >
            <ArrowLeft className="h-4 w-4" /> Explore the community
          </Link>
        </div>
      </Frame>
    );
  }

  const { community, profile, posts } = data;
  const name = community?.name || profile.full_name || 'Creator';
  const username = community?.username;
  const bio = community?.bio;
  const showAvatar = community?.show_avatar ?? true;
  const socials: Social[] = community?.socials ?? [];
  const useImage = showAvatar && !!profile.avatar_url;

  return (
    <Frame handle={username}>
      {/* Identity — avatar left, name + bio right */}
      <section className="cm-rise">
        <div className="flex items-start gap-5 sm:gap-6">
          <div className="shrink-0 rounded-full bg-white p-[4px] shadow-[0_14px_40px_-16px_rgba(26,23,18,0.45)] ring-1 ring-[#E83A2E]/15">
            <div className="h-[88px] w-[88px] overflow-hidden rounded-full sm:h-[104px] sm:w-[104px]">
              {useImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url as string} alt={name} className="h-full w-full object-cover" />
              ) : showAvatar ? (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E83A2E] to-[#ff9566] font-display text-[34px] font-bold text-white sm:text-[40px]">
                  {name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#1A1712]">
                  <UserRound className="h-10 w-10 text-white sm:h-12 sm:w-12" strokeWidth={1.5} />
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <h1 className="font-display text-[29px] font-bold leading-[1.03] tracking-[-0.035em] sm:text-[37px]">
              {name}
            </h1>
            {username && <p className="mt-1.5 font-ledger text-[13px] text-[#E83A2E]">@{username}</p>}
            {bio && (
              <p className="mt-3.5 whitespace-pre-line text-[14.5px] leading-relaxed text-black/55 sm:text-[15px]">
                {bio}
              </p>
            )}
          </div>
        </div>

        {/* Socials — labeled pills */}
        {socials.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {socials.map((s, i) => {
              const key = s.platform.toLowerCase();
              const Icon = SOCIAL_ICONS[key] ?? Link2;
              const label = SOCIAL_LABELS[key] ?? s.platform;
              return (
                <a
                  key={`${s.platform}-${i}`}
                  href={normalizeUrl(s.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 rounded-full border border-black/[0.10] bg-white/70 px-3.5 py-2 text-[13px] font-medium text-black/70 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-[#1A1712] hover:bg-[#1A1712] hover:text-white"
                >
                  <Icon className="h-4 w-4" strokeWidth={1.9} />
                  <span>{label}</span>
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* Posts header — `>>` + rule + Posts label (no numbering) */}
      <div className="mt-9 flex items-center gap-4 cm-rise" style={{ animationDelay: '70ms' }}>
        <span className="font-ledger text-[11px] font-semibold text-[#E83A2E]">{'>>'}</span>
        <span aria-hidden="true" className="h-px flex-1 bg-black/[0.08]" />
        <span className="font-ledger text-[11px] uppercase tracking-[0.2em] text-black/40">Posts</span>
      </div>

      {posts.length === 0 ? (
        <div className="mt-5 rounded-[20px] border border-dashed border-black/[0.14] bg-white/50 px-6 py-16 text-center cm-rise" style={{ animationDelay: '110ms' }}>
          <MessageCircle className="mx-auto mb-3 h-9 w-9 text-black/20" strokeWidth={1.7} />
          <p className="text-[14px] font-semibold text-black/70">No posts yet</p>
          <p className="mt-1 text-[13px] text-black/40">{name} hasn&apos;t shared anything yet.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {posts.map((post: CommunityPost, i) => (
            <article
              key={post.id}
              className="group relative overflow-hidden rounded-[18px] border border-black/[0.06] bg-white/90 p-5 shadow-[0_1px_0_rgba(0,0,0,0.02),0_14px_36px_-24px_rgba(26,23,18,0.30)] backdrop-blur-sm transition hover:border-black/[0.12] cm-rise"
              style={{ animationDelay: `${110 + Math.min(i, 6) * 45}ms` }}
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-5 h-7 w-[3px] rounded-r-full bg-[#E83A2E] opacity-0 transition-opacity group-hover:opacity-100"
              />
              {post.is_pinned && (
                <div className="mb-2.5 inline-flex items-center gap-1.5 font-ledger text-[10px] font-bold uppercase tracking-[0.14em] text-[#E83A2E]">
                  <Pin className="h-3 w-3" /> Pinned
                </div>
              )}
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className={`rounded-full px-2.5 py-1 font-ledger text-[10px] font-semibold uppercase tracking-wider ${CATEGORY_TINT[post.category] ?? CATEGORY_TINT.General}`}>
                  {post.category}
                </span>
                <span className="font-ledger text-[11px] text-black/35">{timeAgo(post.created_at)}</span>
              </div>
              <p className="whitespace-pre-line break-words text-[14.5px] leading-relaxed text-black/80">
                <Linkified text={post.content} />
              </p>
              <LikeButton postId={post.id} initial={post.like_count} />
            </article>
          ))}
        </div>
      )}
    </Frame>
  );
}
