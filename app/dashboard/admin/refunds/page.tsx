'use client';

import React, { useState } from 'react';
import { RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { useRefundRequests, type AdminRefundRequest } from '@/hooks/admin/useRefundRequests';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatINR } from '@/lib/format';
import { orderRef } from '@/lib/shared/order-ref';

export default function AdminRefundsPage() {
  const { requests, isLoading, approve, reject } = useRefundRequests();
  const [approveId, setApproveId] = useState<string | null>(null);

  const handleReject = (id: string) => {
    const reason = window.prompt('Reason for rejecting this refund (optional):');
    if (reason === null) return; // cancelled
    reject.mutate({ id, reason: reason.trim() || undefined });
  };

  const columns: ColumnDef<AdminRefundRequest>[] = [
    {
      header: 'Order',
      cell: (row) => (
        <div className="min-w-0">
          <span className="font-mono text-xs text-[var(--text-primary)] block">{orderRef(row.order_id)}</span>
          <span className="text-xs text-[var(--text-secondary)] truncate block max-w-[180px]" title={row.order?.customer_email ?? ''}>
            {row.order?.customer_email ?? '—'}
          </span>
        </div>
      ),
    },
    {
      header: 'Creator',
      cell: (row) => (
        <span className="font-mono text-xs text-[var(--text-secondary)]" title={row.creator_id}>
          {row.creator_id.slice(0, 8)}…
        </span>
      ),
    },
    {
      header: 'Refund',
      accessorKey: 'amount',
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-semibold tabular-nums text-[var(--text-primary)] block">{formatINR(row.amount)}</span>
          <span className="text-[11px] text-[var(--text-tertiary)]">clawback {formatINR(row.net_clawback)}</span>
        </div>
      ),
    },
    {
      header: 'Reason',
      cell: (row) => (
        <span className="text-xs text-[var(--text-secondary)] max-w-[220px] truncate block" title={row.reason}>
          {row.reason}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <StatusPill status={row.status} />,
    },
    {
      header: 'Requested',
      accessorKey: 'created_at',
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-[var(--text-secondary)]">
          {new Date(row.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
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
        ) : row.review_reason ? (
          <span className="text-xs text-[var(--text-tertiary)] max-w-[160px] truncate block" title={row.review_reason}>
            {row.review_reason}
          </span>
        ) : null,
    },
  ];

  return (
    <>
      <div className="space-y-6 pb-12">
        <PageHeader
          title="Refunds · Admin"
          description="Review, approve, and reject creator refund requests."
        />

        {isLoading ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] overflow-hidden">
            <div className="divide-y divide-[var(--border-subtle)]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton rounded="full" className="h-5 w-16" />
                  <div className="flex gap-2 ml-auto">
                    <Skeleton className="h-6 w-16" rounded="sm" />
                    <Skeleton className="h-6 w-14" rounded="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            title="No refund requests"
            description="Creator refund requests will appear here for review."
          />
        ) : (
          <DataTable<AdminRefundRequest>
            data={requests}
            columns={columns}
            pageSize={20}
            emptyState={<EmptyState icon={RotateCcw} title="No refund requests found" />}
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={approveId !== null}
        onClose={() => setApproveId(null)}
        onConfirm={async () => {
          if (approveId) await approve.mutateAsync(approveId);
        }}
        title="Approve refund"
        description="Approve this refund request? This immediately issues the refund to the buyer via the payment gateway and deducts the clawback from the creator's balance. This cannot be undone."
        confirmLabel="Approve refund"
      />
    </>
  );
}
