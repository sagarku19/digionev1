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
  'Success Story': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Discussion': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'Tips': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Launch': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Guide': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'discussions' | 'channels' | 'events'>('discussions');

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/8 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-[600px] h-[300px] bg-violet-500/6 rounded-full blur-[120px]" />
        <div className="absolute top-20 right-1/4 w-[400px] h-[200px] bg-indigo-500/6 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-xs font-medium mb-5">
              <Users className="w-3.5 h-3.5" />
              Join 2,500+ Indian creators
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent mb-4">
              Community
            </h1>
            <p className="text-lg text-slate-400 max-w-xl mx-auto mb-8">
              Connect with fellow creators, share ideas, get feedback, and grow together. The most active creator community in India.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/25"
              >
                Join the Community
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 border border-white/15 text-white hover:bg-white/5 rounded-xl text-sm font-medium transition-all"
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
                <div key={stat.label} className="text-center p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                  <Icon className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
                  <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Content Tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit mx-auto mb-10">
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
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
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
              <h2 className="text-xl font-bold text-white">Trending Discussions</h2>
              <Link href="/signup" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
                Start a discussion <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {FEATURED_DISCUSSIONS.map(post => (
              <div
                key={post.id}
                className="group p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-bold">{post.author.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border ${
                        CATEGORY_COLORS[post.category] || CATEGORY_COLORS['Discussion']
                      }`}>
                        {post.category}
                      </span>
                      <span className="text-xs text-slate-600">{post.time}</span>
                    </div>
                    <h3 className="text-[15px] font-semibold text-white group-hover:text-indigo-300 transition-colors mb-1">
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-500">by {post.author}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 mt-1">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Heart className="w-3.5 h-3.5" />
                      {post.likes}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MessageCircle className="w-3.5 h-3.5" />
                      {post.replies}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
            <div className="text-center pt-6">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white rounded-xl text-sm font-medium transition-all"
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
            <h2 className="text-xl font-bold text-white mb-6">Community Channels</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {COMMUNITY_CHANNELS.map(channel => {
                const Icon = channel.icon;
                return (
                  <div
                    key={channel.name}
                    className="group p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${channel.color} flex items-center justify-center shrink-0 shadow-lg`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-semibold text-white group-hover:text-indigo-300 transition-colors mb-0.5">
                          # {channel.name}
                        </h3>
                        <p className="text-xs text-slate-500 mb-2">{channel.description}</p>
                        <div className="flex items-center gap-1.5">
                          <div className="flex -space-x-1.5">
                            {[0, 1, 2].map(i => (
                              <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border-2 border-[#03040A]" />
                            ))}
                          </div>
                          <span className="text-[11px] text-slate-500">{channel.members.toLocaleString()} members</span>
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
              <h2 className="text-xl font-bold text-white">Upcoming Events</h2>
            </div>
            <div className="space-y-4">
              {UPCOMING_EVENTS.map((event, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-5 p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:bg-white/[0.04] hover:border-white/10 transition-all"
                >
                  {/* Date block */}
                  <div className="w-16 h-16 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-indigo-400 uppercase">
                      {event.date.split(' ')[0]}
                    </span>
                    <span className="text-xl font-extrabold text-white leading-none">
                      {event.date.split(' ')[1]?.replace(',', '')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-semibold text-white group-hover:text-indigo-300 transition-colors mb-1">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border ${
                        event.type === 'Online'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {event.type}
                      </span>
                      <span className="text-xs text-slate-500">{event.spots} spots</span>
                    </div>
                  </div>
                  <Link
                    href="/signup"
                    className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] hover:bg-indigo-500 hover:border-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shrink-0"
                  >
                    RSVP
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-10 p-8 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 border border-indigo-500/10 rounded-2xl text-center">
              <Lightbulb className="w-8 h-8 text-amber-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Want to host an event?</h3>
              <p className="text-sm text-slate-400 mb-4 max-w-md mx-auto">
                Community members can organize meetups, webinars, and workshops. Share your expertise with fellow creators.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all"
              >
                Apply to host
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-white/[0.06] bg-gradient-to-b from-white/[0.01] to-transparent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to join?
          </h2>
          <p className="text-lg text-slate-400 max-w-lg mx-auto mb-8">
            Start selling, get support, and grow alongside India&#39;s most ambitious digital creators.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-base font-bold transition-all shadow-lg shadow-indigo-500/25"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
