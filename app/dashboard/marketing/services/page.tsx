'use client';

// Services Tool page — hub linking to specific service offerings
import React from 'react';
import Link from 'next/link';
import { Video, Briefcase, FileSearch, ArrowRight, Calendar, ChevronRight } from 'lucide-react';

const serviceTools = [
  {
    icon: Video,
    label: '1:1 Calling',
    description: 'Set up paid video consultations. Configure your calendar availability and let clients book directly.',
    href: '#', // Placeholder for future feature
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20',
  },
  {
    icon: Briefcase,
    label: 'Consulting Retainers',
    description: 'Offer monthly consulting packages. Manage recurring payments and asynchronous client communication.',
    href: '#', // Placeholder for future feature
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20',
  },
  {
    icon: FileSearch,
    label: 'Custom Audits',
    description: 'Sell asynchronous teardowns, code reviews, or business audits. Collect files directly during checkout.',
    href: '#', // Placeholder for future feature
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20',
  },
];

export default function ServicesPage() {
  return (
    <div className="pt-6 sm:pt-8 pb-16 min-h-screen max-w-[1200px] mx-auto">
      {/* Dynamic Header Box */}
      <div className="relative mb-8 sm:mb-10 overflow-hidden rounded-3xl border border-rose-200/50 dark:border-rose-900/30 bg-white dark:bg-zinc-950 p-6 sm:px-8 sm:py-10 shadow-sm transition-all text-center sm:text-left">
        <div className="absolute top-0 right-0 p-8 sm:p-12 opacity-40 pointer-events-none fade-in">
          <div className="w-64 h-64 bg-gradient-to-br from-rose-400/20 to-orange-400/20 rounded-full blur-3xl opacity-50 mix-blend-multiply dark:mix-blend-screen" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="w-full">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs font-bold text-rose-700 dark:text-rose-400 mb-4 shadow-sm backdrop-blur-md">
              <Calendar className="w-3.5 h-3.5" /> Client Services
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Service Management
            </h1>
            <p className="text-base font-medium text-gray-500 dark:text-gray-400 mt-2 max-w-lg mx-auto sm:mx-0">
              Monetize your expertise through scheduled 1:1 calls, active consulting retainers, and asynchronous audits.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        {serviceTools.map((tool) => (
          <div
            key={tool.label}
            className="group relative isolate bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl border border-gray-200/80 dark:border-zinc-800/80 rounded-[32px] p-6 sm:p-8 hover:border-rose-300/50 dark:hover:border-rose-500/30 hover:shadow-xl hover:-translate-y-1 hover:shadow-rose-500/5 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
          >
            <div className={`absolute inset-0 bg-gradient-to-br from-black/0 to-black/0 group-hover:from-${tool.color.split('-')[1]}-500/5 group-hover:to-transparent dark:group-hover:from-${tool.color.split('-')[1]}-500/10 transition-colors duration-500 -z-10`} />
            
            <div className="flex items-start justify-between mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${tool.bg}`}>
                <tool.icon className={`w-7 h-7 flex-shrink-0 ${tool.color}`} />
              </div>
              <div className="w-10 h-10 rounded-full border border-gray-200 dark:border-zinc-800 flex items-center justify-center bg-gray-50 dark:bg-zinc-900 group-hover:bg-rose-50 dark:group-hover:bg-rose-500/10 group-hover:border-rose-200 dark:group-hover:border-rose-500/30 transition-colors">
                <ChevronRight className={`w-5 h-5 text-gray-400 group-hover:text-rose-500 transition-colors translate-x-px`} />
              </div>
            </div>
            
            <div className="flex-1">
              <h2 className={`text-xl font-extrabold text-gray-900 dark:text-white mb-2 group-hover:${tool.color} transition-colors`}>{tool.label}</h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed pr-2">{tool.description}</p>
            </div>
            
            {/* Future Feature Tag indicator */}
            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400">Coming Soon</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
