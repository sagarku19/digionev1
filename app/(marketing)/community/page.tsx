'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MessageCircle, Users, Lightbulb, TrendingUp, Heart, Zap,
  ArrowRight, Star, Globe, Megaphone, BookOpen, Award,
  ChevronRight, ExternalLink, Sparkles, Rocket,
} from 'lucide-react';

const COMMUNITY_STATS = [
  { label: 'Creators', value: '2,500+', icon: Users },
  { label: 'Products Sold', value: '15K+', icon: TrendingUp },
  { label: 'Revenue Generated', value: '₹2Cr+', icon: Zap },
  { label: 'Community Posts', value: '8K+', icon: MessageCircle },
];

const FEATURED_DISCUSSIONS = [
  {
    id: 1,
    title: 'How I made ₹50K in my first month selling Notion templates',
    author: 'Priya Sharma',
    avatar: null,
    category: 'Success Story',
    replies: 42,
    likes: 156,
    time: '2 hours ago',
  },
  {
    id: 2,
    title: 'Best practices for pricing your digital course in 2026',
    author: 'Rahul Verma',
    avatar: null,
    category: 'Discussion',
    replies: 28,
    likes: 89,
    time: '5 hours ago',
  },
  {
    id: 3,
    title: 'Free vs paid: when should you gate your content?',
    author: 'Ananya Reddy',
    avatar: null,
    category: 'Tips',
    replies: 63,
    likes: 201,
    time: '1 day ago',
  },
  {
    id: 4,
    title: 'Launching my photography preset pack - feedback welcome!',
    author: 'Karthik Nair',
    avatar: null,
    category: 'Launch',
    replies: 19,
    likes: 67,
    time: '1 day ago',
  },
  {
    id: 5,
    title: 'Tax and GST guide for digital product sellers in India',
    author: 'Vikram Singh',
    avatar: null,
    category: 'Guide',
    replies: 91,
    likes: 312,
    time: '3 days ago',
  },
];

const COMMUNITY_CHANNELS = [
  {
    name: 'General',
    description: 'Introductions, announcements and general chat',
    icon: MessageCircle,
    members: 2500,
    color: 'from-indigo-500 to-violet-500',
  },
  {
    name: 'Product Launches',
    description: 'Share your latest launches and get early feedback',
    icon: Rocket,
    members: 1800,
    color: 'from-amber-500 to-orange-500',
  },
  {
    name: 'Marketing Tips',
    description: 'Growth strategies, SEO, social media and more',
    icon: Megaphone,
    members: 2100,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    name: 'Course Creators',
    description: 'Dedicated space for online educators',
    icon: BookOpen,
    members: 950,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'Design & Templates',
    description: 'UI/UX, Notion, Figma, Canva — all design talk',
    icon: Sparkles,
    members: 1200,
    color: 'from-pink-500 to-rose-500',
  },
  {
    name: 'Success Stories',
    description: 'Celebrate wins and share your journey',
    icon: Award,
    members: 1600,
    color: 'from-yellow-500 to-amber-500',
  },
];

const UPCOMING_EVENTS = [
  {
    title: 'Creator Meetup: Delhi NCR',
    date: 'Apr 5, 2026',
    type: 'In-person',
    spots: 30,
  },
  {
    title: 'Webinar: Building a ₹1L/month digital product business',
    date: 'Apr 12, 2026',
    type: 'Online',
    spots: 200,
  },
  {
    title: 'Workshop: Mastering product photography',
    date: 'Apr 20, 2026',
    type: 'Online',
    spots: 50,
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Success Story': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Discussion': 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border)]',
  'Tips': 'bg-amber-50 text-amber-700 border-amber-200',
  'Launch': 'bg-pink-50 text-pink-700 border-pink-200',
  'Guide': 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'discussions' | 'channels' | 'events'>('discussions');

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-tertiary)] via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-full text-[var(--text-secondary)] text-xs font-medium mb-5">
              <Users className="w-3.5 h-3.5" />
              Join 2,500+ Indian creators
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] mb-4">
              Community
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
              Connect with fellow creators, share ideas, get feedback, and grow together. The most active creator community in India.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-xl text-sm font-bold transition-all shadow-sm"
              >
                Join the Community
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-xl text-sm font-medium transition-all"
              >
                I already have an account
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-14 max-w-3xl mx-auto">
            {COMMUNITY_STATS.map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl">
                  <Icon className="w-5 h-5 text-[var(--text-secondary)] mx-auto mb-2" />
                  <p className="text-2xl font-extrabold text-[var(--text-primary)]">{stat.value}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Content Tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 pt-10">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl w-fit mx-auto mb-10">
          {[
            { key: 'discussions', label: 'Discussions', icon: MessageCircle },
            { key: 'channels', label: 'Channels', icon: Globe },
            { key: 'events', label: 'Events', icon: Star },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Discussions Tab */}
        {activeTab === 'discussions' && (
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Trending Discussions</h2>
              <Link href="/signup" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium flex items-center gap-1">
                Start a discussion <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {FEATURED_DISCUSSIONS.map(post => (
              <div
                key={post.id}
                className="group p-5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl hover:bg-[var(--bg-tertiary)] hover:border-[var(--text-secondary)] transition-all cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand)] to-violet-600 flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-bold">{post.author.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border ${
                        CATEGORY_COLORS[post.category] || CATEGORY_COLORS['Discussion']
                      }`}>
                        {post.category}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">{post.time}</span>
                    </div>
                    <h3 className="text-[15px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--text-secondary)] transition-colors mb-1">
                      {post.title}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">by {post.author}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 mt-1">
                    <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                      <Heart className="w-3.5 h-3.5" />
                      {post.likes}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                      <MessageCircle className="w-3.5 h-3.5" />
                      {post.replies}
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
                  </div>
                </div>
              </div>
            ))}
            <div className="text-center pt-6">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-all"
              >
                Join to see all discussions
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Channels Tab */}
        {activeTab === 'channels' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Community Channels</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {COMMUNITY_CHANNELS.map(channel => {
                const Icon = channel.icon;
                return (
                  <div
                    key={channel.name}
                    className="group p-5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl hover:bg-[var(--bg-tertiary)] hover:border-[var(--text-secondary)] transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${channel.color} flex items-center justify-center shrink-0 shadow-sm`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--text-secondary)] transition-colors mb-0.5">
                          # {channel.name}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] mb-2">{channel.description}</p>
                        <div className="flex items-center gap-1.5">
                          <div className="flex -space-x-1.5">
                            {[0, 1, 2].map(i => (
                              <div key={i} className="w-5 h-5 rounded-full bg-[var(--bg-tertiary)] border-2 border-[var(--bg-secondary)]" />
                            ))}
                          </div>
                          <span className="text-[11px] text-[var(--text-secondary)]">{channel.members.toLocaleString()} members</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Upcoming Events</h2>
            </div>
            <div className="space-y-4">
              {UPCOMING_EVENTS.map((event, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-5 p-5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl hover:bg-[var(--bg-tertiary)] hover:border-[var(--text-secondary)] transition-all"
                >
                  {/* Date block */}
                  <div className="w-16 h-16 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                      {event.date.split(' ')[0]}
                    </span>
                    <span className="text-xl font-extrabold text-[var(--text-primary)] leading-none">
                      {event.date.split(' ')[1]?.replace(',', '')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--text-secondary)] transition-colors mb-1">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border ${
                        event.type === 'Online'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {event.type}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">{event.spots} spots</span>
                    </div>
                  </div>
                  <Link
                    href="/signup"
                    className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-[var(--accent-fg)] text-[var(--text-primary)] rounded-lg text-xs font-semibold transition-all shrink-0"
                  >
                    RSVP
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-10 p-8 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl text-center">
              <Lightbulb className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Want to host an event?</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4 max-w-md mx-auto">
                Community members can organize meetups, webinars, and workshops. Share your expertise with fellow creators.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-xl text-sm font-bold transition-all"
              >
                Apply to host
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] mb-4">
            Ready to join?
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-lg mx-auto mb-8">
            Start selling, get support, and grow alongside India&#39;s most ambitious digital creators.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-xl text-base font-bold transition-all shadow-sm"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
