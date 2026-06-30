'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Banknote, CheckCircle2, XCircle } from 'lucide-react';
import { usePayoutQueue } from '@/hooks/admin/usePayoutQueue';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Database } from '@/types/database.types';
import { formatINR } from '@/lib/format';

type PayoutRow = Database['public']['Tables']['creator_payouts']['Row'];

export default function AdminPayoutsPage() {
  const { payouts, isLoading, approve, reject, sync } = usePayoutQueue();
  const [approveId, setApproveId] = useState<string | null>(null);
  const hasSynced = useRef(false);

  // Lazy reconcile on first mount — not data fetching, just a side-effect trigger
  useEffect(() => {
    if (!hasSynced.current) {
      hasSynced.current = true;
      sync.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReject = (id: string) => {
    const reason = window.prompt('Reason for rejection (optional):');
    if (reason === null) return; // user cancelled the prompt
    reject.mutate({ id, reason: reason.trim() || undefined });
  };

  const columns: ColumnDef<PayoutRow>[] = [
    {
      header: 'Creator',
      cell: (row) => (
        <span className="font-mono text-xs text-[var(--text-secondary)]" title={row.creator_id}>
          {row.creator_id.slice(0, 8)}…
        </span>
      ),
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      sortable: true,
      cell: (row) => (
        <span className="font-semibold tabular-nums text-[var(--text-primary)]">
          {formatINR(row.amount)}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <StatusPill status={row.status} type="payout" />,
    },
    {
      header: 'Requested',
      accessorKey: 'created_at',
      sortable: true,
      cell: (row) =>
        row.created_at ? (
          <span className="text-xs text-[var(--text-secondary)]">
            {new Date(row.created_at).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        ) : (
          <span className="text-[var(--text-tertiary)]">—</span>
        ),
    },
    {
      header: 'Failure reason',
      cell: (row) =>
        row.failure_reason ? (
          <span className="text-xs text-[var(--danger)] max-w-[160px] truncate block" title={row.failure_reason}>
            {row.failure_reason}
          </span>
        ) : (
          <span className="text-[var(--text-tertiary)]">—</span>
        ),
    },
    {
      header: 'Actions',
      cell: (row) =>
        row.status === 'pending' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setApproveId(row.id)}
              disabled={approve.isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[var(--success-bg)] text-[var(--success)] hover:opacity-80 disabled:opacity-40 rounded-[var(--radius-sm)] border border-[var(--success)]/20 transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <CheckCircle2 size={12} />
              Approve
            </button>
            <button
              onClick={() => handleReject(row.id)}
              disabled={reject.isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[var(--danger-bg)] text-[var(--danger)] hover:opacity-80 disabled:opacity-40 rounded-[var(--radius-sm)] border border-[var(--danger)]/20 transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <XCircle size={12} />
              Reject
            </button>
          </div>
        ) : null,
    },
  ];

  const syncButton = (
    <button
      onClick={() => sync.mutate()}
      disabled={sync.isPending}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)] rounded-[var(--radius-sm)] disabled:opacity-50 transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <RefreshCw size={14} className={sync.isPending ? 'animate-spin' : ''} />
      {sync.isPending ? 'Syncing…' : 'Sync statuses'}
    </button>
  );

  return (
    <>
      <div className="space-y-6 pb-12">
        <PageHeader
          title="Payouts · Admin"
          description="Review, approve, and reject creator payout requests."
          action={syncButton}
        />

        {isLoading ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] overflow-hidden">
            <div className="divide-y divide-[var(--border-subtle)]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton rounded="full" className="h-5 w-16" />
                  <Skeleton className="h-4 w-28" />
                  <div className="flex gap-2 ml-auto">
                    <Skeleton className="h-6 w-16" rounded="sm" />
                    <Skeleton className="h-6 w-14" rounded="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : payouts.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="No payouts yet"
            description="Creator payout requests will appear here."
          />
        ) : (
          <DataTable<PayoutRow>
            data={payouts}
            columns={columns}
            pageSize={20}
            emptyState={
              <EmptyState
                icon={Banknote}
                title="No payouts found"
              />
            }
          />
        )}
      </div>

      {/* Approve confirmation */}
      <ConfirmDialog
        isOpen={approveId !== null}
        onClose={() => setApproveId(null)}
        onConfirm={async () => {
          if (approveId) await approve.mutateAsync(approveId);
        }}
        title="Approve payout"
        description={`Approve this payout request? This will initiate the transfer to the creator's bank account.`}
        confirmLabel="Approve"
      />
    </>
  );
}
