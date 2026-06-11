'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MessageCircle, Lightbulb, Heart,
  ArrowRight, Star, Globe, Megaphone, BookOpen, Award,
  ChevronRight, Sparkles, Rocket,
} from 'lucide-react';
import { Rails, Cross, Kicker } from '@/src/components/marketing/Ledger';
import CtaBanner from '@/src/components/marketing/sections/CtaBanner';

const COMMUNITY_STATS = [
  { label: 'creators', value: '2,500+' },
  { label: 'products sold', value: '15K+' },
  { label: 'revenue generated', value: '₹2Cr+' },
  { label: 'community posts', value: '8K+' },
];

const FEATURED_DISCUSSIONS = [
  {
    id: 1,
    title: 'How I made ₹50K in my first month selling Notion templates',
    author: 'Priya Sharma',
    category: 'Success Story',
    replies: 42,
    likes: 156,
    time: '2 hours ago',
  },
  {
    id: 2,
    title: 'Best practices for pricing your digital course in 2026',
    author: 'Rahul Verma',
    category: 'Discussion',
    replies: 28,
    likes: 89,
    time: '5 hours ago',
  },
  {
    id: 3,
    title: 'Free vs paid: when should you gate your content?',
    author: 'Ananya Reddy',
    category: 'Tips',
    replies: 63,
    likes: 201,
    time: '1 day ago',
  },
  {
    id: 4,
    title: 'Launching my photography preset pack - feedback welcome!',
    author: 'Karthik Nair',
    category: 'Launch',
    replies: 19,
    likes: 67,
    time: '1 day ago',
  },
  {
    id: 5,
    title: 'Tax and GST guide for digital product sellers in India',
    author: 'Vikram Singh',
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
  },
  {
    name: 'Product Launches',
    description: 'Share your latest launches and get early feedback',
    icon: Rocket,
    members: 1800,
  },
  {
    name: 'Marketing Tips',
    description: 'Growth strategies, SEO, social media and more',
    icon: Megaphone,
    members: 2100,
  },
  {
    name: 'Course Creators',
    description: 'Dedicated space for online educators',
    icon: BookOpen,
    members: 950,
  },
  {
    name: 'Design & Templates',
    description: 'UI/UX, Notion, Figma, Canva — all design talk',
    icon: Sparkles,
    members: 1200,
  },
  {
    name: 'Success Stories',
    description: 'Celebrate wins and share your journey',
    icon: Award,
    members: 1600,
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

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'discussions' | 'channels' | 'events'>('discussions');

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative bg-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(22,19,15,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(22,19,15,0.035) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
          }}
        />
        <Rails className="pt-28 sm:pt-36">
          <div className="px-5 sm:px-10 lg:px-14">
            <Kicker index="00" route="/community" />
            <h1 className="mt-7 sm:mt-9 text-[36px] sm:text-[52px] lg:text-[60px] font-bold tracking-[-0.04em] leading-[1.05] text-[#16130F] max-w-2xl">
              Join 2,500+
              <br />
              <span className="text-[#E83A2E]">Indian creators.</span>
            </h1>
            <p className="mt-6 text-[15px] sm:text-[17px] font-medium text-black/50 max-w-xl leading-relaxed">
              Share wins, get feedback, and grow alongside creators who get it.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:items-center gap-3 pb-12">
              <Link
                href="/signup"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] transition-colors duration-200"
              >
                Join the Community
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border border-black/[0.12] hover:border-black/[0.25] text-[#16130F] font-semibold text-[14px] transition-colors duration-200"
              >
                I already have an account
              </Link>
            </div>
          </div>

          {/* Metrics ledger strip */}
          <div className="border-t border-black/[0.08] grid grid-cols-2 lg:grid-cols-4">
            {COMMUNITY_STATS.map((m, i) => (
              <div
                key={m.label}
                className={`px-5 sm:px-10 lg:px-14 py-6 sm:py-8 ${i > 0 ? 'border-l border-black/[0.08]' : ''} ${
                  i >= 2 ? 'border-t lg:border-t-0 border-black/[0.08]' : ''
                } ${i === 2 ? 'border-l-0 lg:border-l' : ''}`}
              >
                <p className="font-ledger text-[22px] sm:text-[28px] font-semibold tracking-tight text-[#16130F] leading-none">
                  {m.value}
                </p>
                <p className="mt-2 text-[12px] sm:text-[13px] font-medium text-black/40">{m.label}</p>
              </div>
            ))}
          </div>
        </Rails>
      </section>

      {/* Content Tabs */}
      <section className="relative bg-white">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <Rails>
          <Cross className="-bottom-[5px] -left-[5px]" />
          <Cross className="-bottom-[5px] -right-[5px]" />
          <div className="px-5 sm:px-10 lg:px-14 py-10 sm:py-14">

            {/* Tab Switcher */}
            <div className="flex items-center gap-1 p-1 bg-[#FAF8F6] border border-black/[0.08] rounded-lg w-fit mb-10">
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
                    onClick={() => setActiveTab(tab.key as 'discussions' | 'channels' | 'events')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-[13px] font-semibold transition-colors duration-200 ${
                      active
                        ? 'bg-[#16130F] text-white'
                        : 'text-black/55 hover:text-[#16130F]'
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
              <div className="max-w-4xl space-y-2.5">
                <div className="flex items-center gap-4 font-ledger text-[11px] mb-6">
                  <span className="text-[#E83A2E] font-semibold">{'>>'}</span>
                  <span className="text-black/35 uppercase tracking-[0.18em]">Trending discussions</span>
                  <span aria-hidden="true" className="h-px flex-1 bg-black/[0.07]" />
                  <Link href="/signup" className="font-sans text-[12px] text-black/45 hover:text-[#16130F] font-semibold flex items-center gap-1 transition-colors">
                    Start a discussion <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                {FEATURED_DISCUSSIONS.map((post) => (
                  <div
                    key={post.id}
                    className="group p-5 bg-white border border-black/[0.07] rounded-xl hover:bg-[#FAF8F6] hover:border-black/[0.15] transition-colors duration-200 cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-md bg-[#16130F] flex items-center justify-center shrink-0">
                        <span className="font-ledger text-white text-[12px] font-medium">{post.author.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="font-ledger text-[9px] font-medium uppercase tracking-[0.14em] text-[#E83A2E]">
                            {post.category}
                          </span>
                          <span className="font-ledger text-[10px] text-black/30">{post.time}</span>
                        </div>
                        <h3 className="text-[14.5px] font-bold text-[#16130F] group-hover:text-[#E83A2E] transition-colors duration-200 mb-1">
                          {post.title}
                        </h3>
                        <p className="text-[12px] font-medium text-black/45">by {post.author}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 mt-1">
                        <div className="flex items-center gap-1 font-ledger text-[11px] text-black/35">
                          <Heart className="w-3.5 h-3.5" />
                          {post.likes}
                        </div>
                        <div className="flex items-center gap-1 font-ledger text-[11px] text-black/35">
                          <MessageCircle className="w-3.5 h-3.5" />
                          {post.replies}
                        </div>
                        <ChevronRight className="w-4 h-4 text-black/25 group-hover:text-[#16130F] transition-colors" />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-center pt-6">
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-black/[0.12] hover:border-black/[0.25] text-[#16130F] rounded-lg text-[13px] font-semibold transition-colors duration-200"
                  >
                    Join to see all discussions
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* Channels Tab */}
            {activeTab === 'channels' && (
              <div className="max-w-4xl">
                <div className="flex items-center gap-4 font-ledger text-[11px] mb-6">
                  <span className="text-[#E83A2E] font-semibold">{'>>'}</span>
                  <span className="text-black/35 uppercase tracking-[0.18em]">Community channels</span>
                  <span aria-hidden="true" className="h-px flex-1 bg-black/[0.07]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {COMMUNITY_CHANNELS.map((channel) => {
                    const Icon = channel.icon;
                    return (
                      <div
                        key={channel.name}
                        className="group p-5 bg-white border border-black/[0.07] rounded-xl hover:bg-[#FAF8F6] hover:border-black/[0.15] transition-colors duration-200 cursor-pointer"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#16130F] flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-white" strokeWidth={1.8} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <h3 className="text-[14.5px] font-bold text-[#16130F] group-hover:text-[#E83A2E] transition-colors duration-200">
                                # {channel.name}
                              </h3>
                              <span className="font-ledger text-[10px] font-semibold text-[#E83A2E]">
                                {'>>'}
                              </span>
                            </div>
                            <p className="text-[12px] font-medium text-black/45 mb-2">{channel.description}</p>
                            <span className="font-ledger text-[10px] text-black/30">
                              {channel.members.toLocaleString()} members
                            </span>
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
              <div className="max-w-4xl">
                <div className="flex items-center gap-4 font-ledger text-[11px] mb-6">
                  <span className="text-[#E83A2E] font-semibold">{'>>'}</span>
                  <span className="text-black/35 uppercase tracking-[0.18em]">Upcoming events</span>
                  <span aria-hidden="true" className="h-px flex-1 bg-black/[0.07]" />
                </div>
                <div className="space-y-3">
                  {UPCOMING_EVENTS.map((event, i) => (
                    <div
                      key={i}
                      className="group flex items-center gap-5 p-5 bg-white border border-black/[0.07] rounded-xl hover:bg-[#FAF8F6] hover:border-black/[0.15] transition-colors duration-200"
                    >
                      {/* Date block */}
                      <div className="w-14 h-14 rounded-lg bg-[#FAF8F6] border border-black/[0.07] flex flex-col items-center justify-center shrink-0">
                        <span className="font-ledger text-[9px] font-medium text-black/40 uppercase tracking-[0.1em]">
                          {event.date.split(' ')[0]}
                        </span>
                        <span className="font-ledger text-[18px] font-semibold text-[#16130F] leading-none">
                          {event.date.split(' ')[1]?.replace(',', '')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[14.5px] font-bold text-[#16130F] group-hover:text-[#E83A2E] transition-colors duration-200 mb-1">
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-3">
                          <span className={`font-ledger text-[9px] font-medium uppercase tracking-[0.14em] ${
                            event.type === 'Online' ? 'text-emerald-700' : 'text-amber-600'
                          }`}>
                            {event.type}
                          </span>
                          <span className="font-ledger text-[10px] text-black/30">{event.spots} spots</span>
                        </div>
                      </div>
                      <Link
                        href="/signup"
                        className="px-4 py-2 border border-black/[0.12] hover:bg-[#16130F] hover:border-[#16130F] hover:text-white text-[#16130F] rounded-lg text-[12px] font-semibold transition-colors duration-200 shrink-0"
                      >
                        RSVP
                      </Link>
                    </div>
                  ))}
                </div>

                <div className="mt-10 p-8 bg-[#FAF8F6] border border-black/[0.07] rounded-xl text-center">
                  <Lightbulb className="w-7 h-7 text-[#E83A2E] mx-auto mb-3" strokeWidth={1.8} />
                  <h3 className="text-[17px] font-bold text-[#16130F] mb-2">Want to host an event?</h3>
                  <p className="text-[13.5px] font-medium text-black/50 mb-5 max-w-md mx-auto leading-relaxed">
                    Community members can organize meetups, webinars, and workshops. Share your expertise with fellow creators.
                  </p>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#16130F] hover:bg-black text-white rounded-lg text-[13px] font-semibold transition-colors duration-200"
                  >
                    Apply to host
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </Rails>
      </section>

      <CtaBanner />
    </div>
  );
}
