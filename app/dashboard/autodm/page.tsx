'use client';
// description: Instagram Auto DM setup page

import React, { useState } from 'react';
import { Instagram, Send, Sparkles, MessageCircle, Zap, ShieldCheck } from 'lucide-react';

export default function AutoDMPage() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [replyComments, setReplyComments] = useState(true);
  const [replyMentions, setReplyMentions] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 text-pink-500 text-xs font-semibold w-fit border border-pink-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Grow Your Audience</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-3">
            <Instagram className="w-8 h-8 text-pink-500" />
            Auto DM Setup
          </h1>
          <p className="text-[var(--text-secondary)]">
            Automate your Instagram interactions and turn followers into customers instantly.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Elements */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
                Connect Account
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Instagram Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-[var(--text-secondary)]">@</span>
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="your_username"
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl py-2.5 pl-8 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[var(--accent)]" />
                Message Content
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5 flex justify-between">
                    <span>Automated Reply</span>
                    <span className="text-[var(--text-secondary)] text-xs">{message.length}/500</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Hi! Thanks for reaching out. Here is the link you requested: ..."
                    rows={5}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all resize-none"
                  />
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    Use {'{name}'} to personalize your messages.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <button className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[var(--accent)]/20">
                <Zap className="w-4 h-4" />
                Save & Activate
              </button>
              <button className="px-6 bg-[var(--bg-tertiary)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-primary)] py-3 rounded-xl font-bold transition-colors">
                Test Message
              </button>
            </div>
          </div>

          {/* Sidebar Settings */}
          <div className="space-y-6">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Triggers</h2>
              
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-[var(--text-primary)]">Story Mentions</label>
                    <p className="text-xs text-[var(--text-secondary)]">Reply when tagged in a story.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={replyMentions}
                      onChange={(e) => setReplyMentions(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                  </label>
                </div>

                <div className="w-full h-px bg-[var(--border)]"></div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-[var(--text-primary)]">Post Comments</label>
                    <p className="text-xs text-[var(--text-secondary)]">DM users who comment.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={replyComments}
                      onChange={(e) => setReplyComments(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-2xl p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto ring-4 ring-white/5 backdrop-blur-sm shadow-sm">
                <Send className="w-6 h-6 text-violet-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Need more limits?</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 mb-3">Upgrade to Pro to send unlimited automated messages.</p>
                <button className="w-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2.5 rounded-lg transition-colors shadow-lg shadow-violet-500/20">
                  Upgrade Now
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
