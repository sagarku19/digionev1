'use client';

import React from 'react';
import { Instagram, CheckCircle2, XCircle, RefreshCw, Bot, Crown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useInstaAccount } from '@/hooks/instaauto/useInstaAccount';
import { Badge } from './ui';

const PRO_FEATURES = ['Unlimited automations', 'Smart AI responses', 'Priority delivery', 'Advanced analytics', 'Webhook events', 'Bulk DM campaigns'];

export function SettingsView({ connectResult }: { connectResult: 'success' | 'error' | null }) {
  const { account, connectConfigured, isLoading, addDemoAccount, disconnect, isMutating } = useInstaAccount();

  const isConnected = account?.status === 'active';
  const isRevoked = account?.status === 'revoked' || account?.status === 'expired';
  const isSimulated = account?.is_simulated ?? false;
  const displayName = account?.username ?? 'instagram';

  return (
    <div className="space-y-6">
      {connectResult === 'success' && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[var(--success-bg)] border border-[var(--success)]/30 rounded-[var(--radius-md)] text-sm text-[var(--success)] font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> Instagram account connected successfully.
        </div>
      )}
      {connectResult === 'error' && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[var(--danger-bg)] border border-[var(--danger)]/30 rounded-[var(--radius-md)] text-sm text-[var(--danger)] font-semibold">
          <XCircle className="w-4 h-4 shrink-0" /> Connection failed. Please try again or add a demo account to test the feature.
        </div>
      )}
      {isRevoked && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-[var(--warning-bg)] border border-[var(--warning)]/30 rounded-[var(--radius-md)]">
          <div className="flex items-center gap-2 text-sm text-[var(--warning)] font-semibold">
            <RefreshCw className="w-4 h-4 shrink-0" /> Your Instagram connection has been {account?.status}. Please reconnect.
          </div>
          {connectConfigured && (
            <button
              onClick={() => { window.location.href = '/api/instaauto/connect'; }}
              className="shrink-0 text-xs font-semibold bg-[var(--warning)] text-white px-3 py-1.5 rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              Reconnect
            </button>
          )}
        </div>
      )}

      <Card className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--brand)]/10 flex items-center justify-center">
            <Instagram className="w-5 h-5 text-[var(--brand)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Instagram Account</h3>
            <p className="text-xs text-[var(--text-secondary)]">Connect your business or creator account</p>
          </div>
          {isConnected && <Badge color="green"><CheckCircle2 className="w-3 h-3" /> Connected</Badge>}
        </div>

        {isLoading ? (
          <Skeleton className="h-10" />
        ) : isConnected ? (
          <div className="flex items-center justify-between bg-[var(--surface-muted)] rounded-[var(--radius-md)] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--brand)] flex items-center justify-center text-[var(--text-on-brand)] text-xs font-bold">
                {displayName[0]?.toUpperCase() ?? 'I'}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">@{displayName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-[var(--text-secondary)] capitalize">{account?.status}</p>
                  {isSimulated && <Badge color="yellow">Demo</Badge>}
                </div>
              </div>
            </div>
            <button onClick={() => disconnect()} disabled={isMutating} className="text-xs text-[var(--danger)] hover:opacity-80 font-semibold focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded disabled:opacity-40">
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {connectConfigured && (
              <button
                onClick={() => { window.location.href = '/api/instaauto/connect'; }}
                className="w-full bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] font-semibold py-3 rounded-[var(--radius-md)] transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <Instagram className="w-4 h-4" /> Connect Instagram
              </button>
            )}
            <button
              onClick={() => addDemoAccount()}
              disabled={isMutating}
              className="w-full border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand)]/40 font-semibold py-2.5 rounded-[var(--radius-md)] transition-all text-sm flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-40"
            >
              <Bot className="w-4 h-4" /> Add demo account
            </button>
            {connectConfigured && (
              <p className="text-xs text-[var(--text-tertiary)] text-center">Requires an Instagram Business or Creator account linked to a Facebook Page.</p>
            )}
          </div>
        )}
      </Card>

      <Card className="!bg-[var(--brand)]/[0.04] !border-[var(--brand)]/20 space-y-4">
        <div className="flex items-center gap-3">
          <Crown className="w-5 h-5 text-[var(--warning)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Upgrade to Pro</h3>
          <Badge color="yellow">FREE</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-[var(--text-secondary)]">
          {PRO_FEATURES.map(f => (
            <div key={f} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />{f}</div>
          ))}
        </div>
        <button className="w-full bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] font-semibold py-3 rounded-[var(--radius-md)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          Upgrade to Pro — ₹999/mo
        </button>
      </Card>

      <Card className="!bg-[var(--danger-bg)] !border-[var(--danger)]/20 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--danger)]">Danger Zone</h3>
        <p className="text-xs text-[var(--text-secondary)]">These actions are irreversible. Proceed with caution.</p>
        <button className="text-sm font-semibold text-[var(--danger)] border border-[var(--danger)]/30 px-4 py-2 rounded-[var(--radius-md)] hover:bg-[var(--danger)]/10 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          Delete All Automations
        </button>
      </Card>
    </div>
  );
}
