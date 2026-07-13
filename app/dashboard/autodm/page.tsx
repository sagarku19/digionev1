'use client';

import React, { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Instagram, Activity, Zap, Users, MessageCircle, BarChart3, Settings, Sparkles, HelpCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { AutoDmProvider, useAutoDm } from '@/components/dashboard/autodm/AutoDmContext';
import { useInstaAutomations } from '@/hooks/instaauto/useInstaAutomations';
import { useInstaAnalytics } from '@/hooks/instaauto/useInstaAnalytics';
import { useInstaLeads } from '@/hooks/instaauto/useInstaLeads';
import { useInstaMessages } from '@/hooks/instaauto/useInstaMessages';
import { OverviewView } from '@/components/dashboard/autodm/OverviewView';
import { AutomationsWorkspace } from '@/components/dashboard/autodm/AutomationsWorkspace';
import { AutomationWizard } from '@/components/dashboard/autodm/AutomationWizard';
import { LeadsWorkspace } from '@/components/dashboard/autodm/LeadsWorkspace';
import { InboxWorkspace } from '@/components/dashboard/autodm/InboxWorkspace';
import { AnalyticsView } from '@/components/dashboard/autodm/AnalyticsView';
import { SettingsView } from '@/components/dashboard/autodm/SettingsView';
import { TemplatesView } from '@/components/dashboard/autodm/TemplatesView';
import { GuideView } from '@/components/dashboard/autodm/GuideView';
import {
  dbToUiAutomation, uiToDbPayload, emptyAutomation, automationFromTemplate,
} from '@/components/dashboard/autodm/types';
import type {
  View, Automation, DbAutomation, TemplateCard,
} from '@/components/dashboard/autodm/types';

const TABS: { view: View; icon: React.ElementType; label: string }[] = [
  { view: 'overview', icon: Activity, label: 'Overview' },
  { view: 'automations', icon: Zap, label: 'Automations' },
  { view: 'leads', icon: Users, label: 'Leads' },
  { view: 'inbox', icon: MessageCircle, label: 'Inbox' },
  { view: 'analytics', icon: BarChart3, label: 'Analytics' },
  { view: 'templates', icon: Sparkles, label: 'Templates' },
];

function AutoDMInner() {
  const { accountId, isSimulated, isLoading: accountLoading } = useAutoDm();
  const searchParams = useSearchParams();
  const connectResult = searchParams.get('connect') as 'success' | 'error' | null;
  const [view, setView] = useState<View>('overview');
  const [wizardTarget, setWizardTarget] = useState<Automation | null>(null);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [isSavingBuilder, setIsSavingBuilder] = useState(false);

  const { automations: dbAutomations, isLoading, createAutomation, updateAutomation, deleteAutomation, isMutating } = useInstaAutomations(accountId);
  const analyticsQuery = useInstaAnalytics(accountId);
  const analytics = analyticsQuery.data ?? { totalLeads: 0, totalSent: 0, totalFailed: 0 };
  const { leads, isLoading: leadsLoading } = useInstaLeads(accountId);
  const { messages, isLoading: messagesLoading } = useInstaMessages(accountId);

  const automations: Automation[] = (dbAutomations as DbAutomation[]).map(dbToUiAutomation);

  const closeWizard = useCallback(() => {
    setWizardTarget(null);
    setBuilderError(null);
  }, []);

  const handleEdit = useCallback((id: string) => {
    const found = automations.find(a => a.id === id);
    if (found) { setBuilderError(null); setWizardTarget(found); }
  }, [automations]);

  const handleCreateNew = useCallback(() => {
    setBuilderError(null);
    setWizardTarget(emptyAutomation(accountId));
  }, [accountId]);

  const handleCreateFromTemplate = useCallback((card: TemplateCard) => {
    setBuilderError(null);
    setWizardTarget(automationFromTemplate(card, accountId));
  }, [accountId]);

  const handleSave = useCallback(async (updated: Automation) => {
    setBuilderError(null);
    setIsSavingBuilder(true);
    try {
      const payload = uiToDbPayload(updated);
      const dbPayload = { ...payload, dm_payload: payload.dm_payload as unknown as import('@/types/database.types').Json };
      const isNew = !dbAutomations.some(r => r.id === updated.id);
      if (isNew) {
        if (!accountId) throw new Error('No connected account — cannot save.');
        await createAutomation({ ...dbPayload, account_id: accountId });
      } else {
        await updateAutomation({
          id: updated.id,
          version: updated.version ?? 0,
          patch: { ...dbPayload },
          keywords: payload.keywords,
        });
      }
      closeWizard();
    } catch (err) {
      setBuilderError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSavingBuilder(false);
    }
  }, [dbAutomations, accountId, createAutomation, updateAutomation, closeWizard]);

  const handleToggleActive = useCallback(async (a: Automation) => {
    if (a.version === undefined) return;
    try {
      await updateAutomation({ id: a.id, version: a.version, patch: { status: a.active ? 'paused' : 'active' } });
    } catch {
      // non-fatal — the query re-fetches current state
    }
  }, [updateAutomation]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteAutomation(id);
    } catch {
      // non-fatal
    }
  }, [deleteAutomation]);

  const noAccount = !accountId && !accountLoading;

  function renderTabContent() {
    switch (view) {
      case 'overview': return (
        <OverviewView automations={automations} onNavigate={setView} totalLeads={analytics.totalLeads} totalSent={analytics.totalSent} isSimulated={isSimulated} />
      );
      case 'automations': return (
        <AutomationsWorkspace automations={automations} onEdit={handleEdit} onToggleActive={handleToggleActive} onDelete={handleDelete} onCreateNew={handleCreateNew} isMutating={isMutating} />
      );
      case 'leads': return <LeadsWorkspace leads={leads} isLoading={leadsLoading} automations={automations} />;
      case 'inbox': return <InboxWorkspace messages={messages} isLoading={messagesLoading} />;
      case 'analytics': return (
        <AnalyticsView automations={automations} totalLeads={analytics.totalLeads} totalSent={analytics.totalSent} totalFailed={analytics.totalFailed} />
      );
      case 'templates': return <TemplatesView onCreateFromTemplate={handleCreateFromTemplate} />;
      case 'settings': return <SettingsView connectResult={connectResult} />;
      case 'guide': return <GuideView />;
      default: return null;
    }
  }

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Instagram Automation"
        description="Auto DM · Follow-gated delivery · Lead capture"
        action={
          <div className="flex items-center gap-2">
            {!isLoading && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--success-bg)] border border-[var(--success)]/20 text-xs font-semibold text-[var(--success)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                {automations.filter(a => a.active).length} Running
              </span>
            )}
            <button
              onClick={() => setView('guide')}
              title="Guide"
              className="p-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('settings')}
              title="Settings"
              className="p-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {wizardTarget ? (
        <AutomationWizard automation={wizardTarget} onSave={handleSave} onBack={closeWizard} saveError={builderError} isSaving={isSavingBuilder} />
      ) : view === 'settings' || view === 'guide' ? (
        <div className="max-w-2xl mx-auto space-y-4">
          <button
            onClick={() => setView('overview')}
            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded"
          >
            ← Back to workspace
          </button>
          {renderTabContent()}
        </div>
      ) : noAccount ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-4">
          <div className="w-16 h-16 rounded-[var(--radius-lg)] bg-[var(--brand)]/10 flex items-center justify-center">
            <Instagram className="w-8 h-8 text-[var(--brand)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Connect your Instagram</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xs">Go to Settings to connect a real Instagram account or add a demo account to test the feature.</p>
          </div>
          <button
            onClick={() => setView('settings')}
            className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] text-sm font-semibold px-5 py-2.5 rounded-[var(--radius-md)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <Settings className="w-4 h-4" /> Go to Settings
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-1 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] p-1 w-fit overflow-x-auto no-scrollbar max-w-full">
            {TABS.map(t => (
              <button
                key={t.view}
                onClick={() => setView(t.view)}
                className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-sm)] text-xs font-semibold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                  view === t.view ? 'bg-[var(--brand)] text-[var(--text-on-brand)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>

          {renderTabContent()}
        </>
      )}
    </div>
  );
}

export default function AutoDMPage() {
  return (
    <AutoDmProvider>
      <AutoDMInner />
    </AutoDmProvider>
  );
}
