'use client';
// Services — full CRUD for creator services (1:1, retainer, audit) + booking management.
// DB: services, service_bookings (tables from migration)

import React, { useState, useEffect } from 'react';
import { GuideButton } from '@/components/dashboard/guides/GuideButton';
import { useServices, type Service } from '@/hooks/marketing/useServices';
import {
  Video, Briefcase, FileSearch, Plus, X, Trash2, ToggleLeft, ToggleRight,
  AlertCircle, Loader2, Calendar, Users, IndianRupee, Clock, CheckCircle2,
  Edit2, Link as LinkIcon, Copy, Check, Lightbulb,
} from 'lucide-react';

const INPUT = 'w-full px-4 py-2.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] text-sm focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition';

const SERVICE_TYPES = [
  { id: '1on1',       label: '1:1 Call',     icon: Video,       color: 'text-[var(--brand)]',   bg: 'bg-[var(--surface-muted)]',   border: 'border-[var(--border)]' },
  { id: 'retainer',   label: 'Retainer',     icon: Briefcase,   color: 'text-[var(--success)]', bg: 'bg-[var(--success-bg)]',      border: 'border-[var(--border)]' },
  { id: 'audit',      label: 'Audit',        icon: FileSearch,  color: 'text-[var(--warning)]', bg: 'bg-[var(--warning-bg)]',      border: 'border-[var(--border)]' },
  { id: 'consulting', label: 'Consulting',   icon: Lightbulb,   color: 'text-[var(--brand)]',   bg: 'bg-[var(--surface-muted)]',   border: 'border-[var(--border)]' },
];

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-[var(--warning-bg)] text-[var(--warning)]',
  confirmed: 'bg-[var(--info-bg)] text-[var(--info)]',
  completed: 'bg-[var(--success-bg)] text-[var(--success)]',
  cancelled: 'bg-[var(--danger-bg)] text-[var(--danger)]',
};

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-xs text-[var(--brand)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded">
      {copied ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Copy booking link'}
    </button>
  );
}

export default function ServicesPage() {
  const {
    services,
    bookings,
    isLoading: loading,
    createService,
    updateService,
    deleteService: deleteSvc,
    toggleActive: toggleSvcActive,
    updateBookingStatus: updateBkgStatus,
  } = useServices();
  const [showModal, setShowModal]     = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState('');
  const [activeTab, setActiveTab]     = useState<'services' | 'bookings'>('services');
  const [origin, setOrigin]           = useState('');

  // Form state
  const emptyForm = { title: '', description: '', service_type: '1on1', price: 500, duration_minutes: 30, calendly_url: '' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const openCreate = () => { setEditService(null); setForm(emptyForm); setFormError(''); setShowModal(true); };
  const openEdit   = (s: Service) => {
    setEditService(s);
    setForm({ title: s.title, description: s.description ?? '', service_type: s.service_type, price: s.price, duration_minutes: s.duration_minutes ?? 30, calendly_url: (s.metadata as { calendly_url?: string } | null)?.calendly_url ?? '' });
    setFormError(''); setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    if (form.price < 0) { setFormError('Price cannot be negative.'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        service_type: form.service_type,
        price: Number(form.price),
        duration_minutes: (form.service_type === '1on1' || form.service_type === 'consulting') ? Number(form.duration_minutes) : null,
        is_active: true,
        metadata: form.calendly_url ? { calendly_url: form.calendly_url } : null,
      };
      if (editService) await updateService({ id: editService.id, updates: payload });
      else await createService(payload as Omit<Service, 'id' | 'created_at'>);
      setShowModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save service.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = (svc: Service) => { toggleSvcActive(svc); };
  const deleteService = (id: string) => { deleteSvc(id); setDeleteConfirm(null); };
  const updateBookingStatus = (id: string, status: string) => { updateBkgStatus({ id, status }); };

  const activeServices = services.filter(s => s.is_active).length;
  const totalRevenue   = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.amount_paid ?? 0), 0);
  const pendingCount   = bookings.filter(b => b.status === 'pending').length;

  return (
    <>
      <div className="space-y-5 pt-4 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Services</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Monetize your time with 1:1 calls, retainers, and audits</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <GuideButton guideKey="services" />
            <button onClick={openCreate}
              className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-4 py-2.5 rounded-[var(--radius-md)] font-semibold text-sm shadow-[var(--shadow-xs)] transition shrink-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
              <Plus className="w-4 h-4" /> New Service
            </button>
          </div>
        </div>

        {/* Stats */}
        {!loading && services.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Services',          value: services.length, icon: Calendar,     color: 'text-[var(--brand)]',   bg: 'bg-[var(--surface-muted)]' },
              { label: 'Active',            value: activeServices,  icon: CheckCircle2, color: 'text-[var(--success)]', bg: 'bg-[var(--success-bg)]' },
              { label: 'Pending Bookings',  value: pendingCount,    icon: Clock,        color: 'text-[var(--warning)]', bg: 'bg-[var(--warning-bg)]' },
              { label: 'Revenue Earned',    value: `₹${totalRevenue.toFixed(0)}`, icon: IndianRupee, color: 'text-[var(--brand)]', bg: 'bg-[var(--surface-muted)]' },
            ].map(s => (
              <div key={s.label} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${s.bg}`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-[var(--text-primary)] leading-none">{s.value}</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-[var(--surface-muted)] rounded-[var(--radius-md)] w-fit">
          {(['services', 'bookings'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold capitalize transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                activeTab === t ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-secondary)]'
              }`}>
              {t} {t === 'bookings' && bookings.length > 0 && <span className="ml-1 bg-[var(--brand)] text-[var(--text-on-brand)] text-[10px] px-1.5 py-0.5 rounded-full">{bookings.length}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" />
          </div>
        ) : activeTab === 'services' ? (
          /* Services grid */
          services.length === 0 ? (
            <div className="flex flex-col items-center py-24 text-center bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)]">
              <div className="w-14 h-14 bg-[var(--surface-muted)] rounded-[var(--radius-lg)] flex items-center justify-center mb-4 border border-[var(--border)]">
                <Calendar className="w-7 h-7 text-[var(--text-tertiary)]" />
              </div>
              <p className="font-semibold text-[var(--text-primary)] mb-1">No services yet</p>
              <p className="text-sm text-[var(--text-secondary)] max-w-xs mb-5">Create a service to start accepting bookings and monetizing your time.</p>
              <button onClick={openCreate}
                className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold shadow-[var(--shadow-xs)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <Plus className="w-4 h-4" /> Create First Service
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map(svc => {
                const typeInfo = SERVICE_TYPES.find(t => t.id === svc.service_type) ?? SERVICE_TYPES[0];
                const bookingUrl = `${origin}/book/${svc.id}`;
                const svcBookings = bookings.filter(b => b.service_id === svc.id);
                return (
                  <div key={svc.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 hover:border-[var(--border-strong)] transition group flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center border ${typeInfo.bg} ${typeInfo.border}`}>
                        <typeInfo.icon className={`w-5 h-5 ${typeInfo.color}`} />
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(svc)}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition opacity-0 group-hover:opacity-100 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleActive(svc)} title={svc.is_active ? 'Pause' : 'Activate'}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                          {svc.is_active ? <ToggleRight className="w-5 h-5 text-[var(--success)]" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button onClick={() => setDeleteConfirm(svc.id)}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition opacity-0 group-hover:opacity-100 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">{svc.title}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${typeInfo.bg} ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </div>
                      {svc.description && <p className="text-xs text-[var(--text-tertiary)] leading-relaxed mb-3 line-clamp-2">{svc.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mb-3">
                        <span className="font-bold text-[var(--text-primary)] text-sm">₹{svc.price}</span>
                        {svc.duration_minutes && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{svc.duration_minutes}min</span>}
                        <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{svcBookings.length} booking{svcBookings.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="border-t border-[var(--border)] pt-3 mt-auto">
                      {(svc.metadata as { calendly_url?: string } | null)?.calendly_url ? (
                        <a href={(svc.metadata as { calendly_url?: string }).calendly_url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs text-[var(--brand)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded">
                          <LinkIcon className="w-3 h-3" /> Calendly linked
                        </a>
                      ) : (
                        <CopyLink url={bookingUrl} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Bookings table */
          bookings.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)]">
              <Users className="w-10 h-10 text-[var(--text-tertiary)] mb-3" />
              <p className="font-semibold text-[var(--text-secondary)]">No bookings yet</p>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">Share your service booking links to start receiving requests.</p>
            </div>
          ) : (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">All Bookings</h2>
                <span className="text-xs text-[var(--text-tertiary)]">{bookings.length} total</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {bookings.map(bkg => {
                  const svcName = services.find(s => s.id === bkg.service_id)?.title ?? 'Service';
                  return (
                    <div key={bkg.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--surface-hover)] transition">
                      <div className="w-9 h-9 rounded-full bg-[var(--brand)] flex items-center justify-center shrink-0 text-[var(--text-on-brand)] font-bold text-sm">
                        {(bkg.customer_name ?? bkg.customer_email ?? 'B')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{bkg.customer_name ?? bkg.customer_email ?? '—'}</p>
                        <p className="text-xs text-[var(--text-tertiary)] truncate">{svcName}</p>
                      </div>
                      {bkg.amount_paid ? <span className="text-sm font-bold text-[var(--success)] shrink-0">₹{bkg.amount_paid}</span> : null}
                      <span className="text-xs text-[var(--text-tertiary)] hidden sm:block shrink-0">
                        {new Date(bkg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                      {/* Status selector */}
                      <select value={bkg.status}
                        onChange={e => updateBookingStatus(bkg.id, e.target.value)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 outline-none cursor-pointer focus-visible:shadow-[var(--focus-ring)] ${STATUS_STYLES[bkg.status] ?? STATUS_STYLES.pending}`}>
                        {['pending', 'confirmed', 'completed', 'cancelled'].map(s => (
                          <option key={s} value={s} className="bg-[var(--surface)] text-[var(--text-primary)]">{s}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-lg border border-[var(--border)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--surface)] z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[var(--surface-muted)] rounded-[var(--radius-md)] flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-[var(--brand)]" />
                </div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">{editService ? 'Edit Service' : 'New Service'}</h2>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-[var(--radius-md)] text-sm text-[var(--danger)]">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              {/* Service type */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Service Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {SERVICE_TYPES.map(t => (
                    <button key={t.id} type="button" onClick={() => setForm(p => ({ ...p, service_type: t.id }))}
                      className={`flex flex-col items-center gap-2 p-3 rounded-[var(--radius-md)] border-2 transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                        form.service_type === t.id ? `border-[var(--brand)] ${t.bg}` : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                      }`}>
                      <t.icon className={`w-5 h-5 ${form.service_type === t.id ? t.color : 'text-[var(--text-tertiary)]'}`} />
                      <span className={`text-xs font-semibold ${form.service_type === t.id ? t.color : 'text-[var(--text-secondary)]'}`}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Title</label>
                <input type="text" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="30-min Strategy Call" className={INPUT} />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Description <span className="text-[var(--text-tertiary)] font-normal">optional</span></label>
                <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What will the client get from this session?" className={`${INPUT} resize-none`} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Price (₹)</label>
                  <input type="number" min={0} value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))}
                    className={INPUT} />
                </div>
                {(form.service_type === '1on1' || form.service_type === 'consulting') && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Duration (min)</label>
                    <input type="number" min={15} step={15} value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: Number(e.target.value) }))}
                      className={INPUT} />
                  </div>
                )}
              </div>

              {(form.service_type === '1on1' || form.service_type === 'consulting') && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Calendly URL <span className="text-[var(--text-tertiary)] font-normal">optional</span>
                  </label>
                  <input type="url" value={form.calendly_url} onChange={e => setForm(p => ({ ...p, calendly_url: e.target.value }))}
                    placeholder="https://calendly.com/your-link" className={INPUT} />
                  <p className="text-xs text-[var(--text-tertiary)] mt-1.5">If set, clients will be redirected to Calendly to pick a time slot.</p>
                </div>
              )}

              <button type="submit" disabled={saving}
                className="w-full bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 text-[var(--text-on-brand)] py-3 rounded-[var(--radius-md)] font-bold text-sm shadow-[var(--shadow-xs)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                {saving ? 'Saving…' : editService ? 'Save Changes →' : 'Create Service →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 max-w-sm w-full shadow-[var(--shadow-lg)]">
            <div className="w-12 h-12 rounded-full bg-[var(--danger-bg)] flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-[var(--danger)]" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] mb-1">Delete service?</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-5">This service and all its booking history will be permanently removed.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-[var(--border)] rounded-[var(--radius-md)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Cancel</button>
              <button onClick={() => deleteService(deleteConfirm)} className="flex-1 py-2.5 bg-[var(--danger)] hover:opacity-90 text-white rounded-[var(--radius-md)] text-sm font-semibold transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
