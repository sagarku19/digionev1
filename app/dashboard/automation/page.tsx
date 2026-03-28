import React from 'react';
import { Mail, Bot, Workflow, ArrowRight, Activity, Command, PhoneForwarded } from 'lucide-react';
import Link from 'next/link';

export default function AutomationHubPage() {
  const automations = [
    {
      id: 'email',
      title: 'Email Sequences',
      description: 'Send automated welcome emails, abandoned cart recovery, and newsletters to your audience.',
      icon: Mail,
      color: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-500',
      badge: 'Popular',
      status: 'Active',
      href: '/dashboard/automation/email'
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Bots',
      description: 'Engage customers instantly on WhatsApp with automated replies, order updates, and support messages.',
      icon: PhoneForwarded,
      color: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-500',
      badge: 'New',
      status: 'Connect',
      href: '/dashboard/automation/whatsapp'
    },
    {
      id: 'telegram',
      title: 'Telegram Broadcasts',
      description: 'Push updates to your Telegram channel and interact with subscribers through intelligent bots.',
      icon: Bot,
      color: 'from-sky-500/20 to-blue-500/20',
      iconColor: 'text-sky-500',
      status: 'Coming Soon',
      href: '#'
    },
    {
      id: 'webhooks',
      title: 'Webhooks & APIs',
      description: 'Connect DigiOne with Zapier, Make, and thousands of other tools using raw webhooks.',
      icon: Workflow,
      color: 'from-purple-500/20 to-fuchsia-500/20',
      iconColor: 'text-purple-500',
      status: 'Configure',
      href: '/dashboard/automation/webhooks'
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-semibold w-fit border border-[var(--accent)]/20">
            <Command className="w-3.5 h-3.5" />
            <span>Workflow Builder</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-3">
            <Activity className="w-8 h-8 text-[var(--accent)]" />
            Marketing Automations
          </h1>
          <p className="text-[var(--text-secondary)] max-w-2xl">
            Put your marketing on autopilot. Connect with your audience across channels without lifting a finger.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {automations.map((automation) => (
            <div 
              key={automation.id}
              className="group relative bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 hover:border-[var(--accent)]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--accent)]/5 overflow-hidden flex flex-col h-full"
            >
              {/* Background gradient blob */}
              <div className={`absolute -right-16 -top-16 w-32 h-32 bg-gradient-to-br ${automation.color} rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity`}></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${automation.color} ring-1 ring-white/10`}>
                  <automation.icon className={`w-6 h-6 ${automation.iconColor}`} />
                </div>
                {automation.badge && (
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                    automation.badge === 'New' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                  }`}>
                    {automation.badge}
                  </span>
                )}
              </div>
              
              <div className="flex-1 relative z-10">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{automation.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {automation.description}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[var(--border)] flex items-center justify-between relative z-10">
                <span className={`text-xs font-semibold ${
                  automation.status === 'Active' ? 'text-green-500 flex items-center gap-1.5' : 
                  automation.status === 'Coming Soon' ? 'text-[var(--text-secondary)]' :
                  'text-[var(--text-primary)]'
                }`}>
                  {automation.status === 'Active' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                  {automation.status}
                </span>

                {automation.status === 'Coming Soon' ? (
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-tertiary)] cursor-not-allowed opacity-50 text-[var(--text-primary)] transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                ) : (
                  <Link 
                    href={automation.href}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-tertiary)] group-hover:bg-[var(--accent)] group-hover:text-white text-[var(--text-primary)] transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
