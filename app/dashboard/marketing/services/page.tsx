'use client';
// Services — full CRUD for creator services (1:1, retainer, audit) + booking management.
// DB: services, service_bookings (tables from migration)

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import {
  Video, Briefcase, FileSearch, Plus, X, Trash2, ToggleLeft, ToggleRight,
  AlertCircle, Loader2, Calendar, Users, IndianRupee, Clock, CheckCircle2,
  Edit2, Link as LinkIcon, Copy, Check, Lightbulb,
} from 'lucide-react';

const INPUT = 'w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none text-[var(--text-primary)] placeholder-gray-400 transition';

const SERVICE_TYPES = [
  { id: '1on1',       label: '1:1 Call',     icon: Video,       color: 'text-indigo-600 dark:text-indigo-400',  bg: 'bg-indigo-50 dark:bg-indigo-500/10',   border: 'border-indigo-100 dark:border-indigo-500/20' },
  { id: 'retainer',   label: 'Retainer',     icon: Briefcase,   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20' },
  { id: 'audit',      label: 'Audit',        icon: FileSearch,  color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-500/10',     border: 'border-amber-100 dark:border-amber-500/20' },
  { id: 'consulting', label: 'Consulting',   icon: Lightbulb,   color: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-50 dark:bg-violet-500/10',   border: 'border-violet-100 dark:border-violet-500/20' },
];

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  confirmed: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  completed: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  cancelled: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
};

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Copy booking link'}
    </button>
  );
}

type Service = { id: string; title: string; description: string | null; service_type: string; price: number; duration_minutes: number | null; is_active: boolean; metadata: any; created_at: string };
type Booking = { id: string; service_id: string; customer_name: string | null; customer_email: string | null; status: string; booked_at: string | null; amount_paid: number | null; created_at: string };

export default function ServicesPage() {
  const supabase   = createClient();
  const [profileId, setProfileId]     = useState<string | null>(null);
  const [services, setServices]       = useState<Service[]>([]);
  const [bookings, setBookings]       = useState<Booking[]>([]);
  const [loading, setLoading]         = useState(true);
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pid = await getCreatorProfileId(supabase);
      setProfileId(pid);

      const { data: svcs } = await (supabase as any).from('services').select('*')
        .eq('creator_id', pid).order('created_at', { ascending: false });
      setServices(svcs ?? []);

      if (svcs && svcs.length > 0) {
        const { data: bkgs } = await (supabase as any).from('service_bookings').select('*')
          .in('service_id', svcs.map((s: any) => s.id)).order('created_at', { ascending: false });
        setBookings(bkgs ?? []);
      }
    } catch {}
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditService(null); setForm(emptyForm); setFormError(''); setShowModal(true); };
  const openEdit   = (s: Service) => {
    setEditService(s);
    setForm({ title: s.title, description: s.description ?? '', service_type: s.service_type, price: s.price, duration_minutes: s.duration_minutes ?? 30, calendly_url: s.metadata?.calendly_url ?? '' });
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
        creator_id: profileId!,
        title: form.title.trim(),
        description: form.description.trim() || null,
        service_type: form.service_type,
        price: Number(form.price),
        duration_minutes: (form.service_type === '1on1' || form.service_type === 'consulting') ? Number(form.duration_minutes) : null,
        is_active: true,
        metadata: form.calendly_url ? { calendly_url: form.calendly_url } : null,
      };
      if (editService) {
        await (supabase as any).from('services').update(payload).eq('id', editService.id);
      } else {
        await (supabase as any).from('services').insert(payload);
      }
      setShowModal(false);
      await load();
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to save service.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (svc: Service) => {
    await (supabase as any).from('services').update({ is_active: !svc.is_active }).eq('id', svc.id);
    setServices(prev => prev.map(s => s.id === svc.id ? { ...s, is_active: !s.is_active } : s));
  };

  const deleteService = async (id: string) => {
    await (supabase as any).from('services').delete().eq('id', id);
    setServices(prev => prev.filter(s => s.id !== id));
    setDeleteConfirm(null);
  };

  const updateBookingStatus = async (id: string, status: string) => {
    await (supabase as any).from('service_bookings').update({ status }).eq('id', id);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

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
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition shrink-0">
            <Plus className="w-4 h-4" /> New Service
          </button>
        </div>

        {/* Stats */}
        {!loading && services.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Services',          value: services.length, icon: Calendar,    color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
              { label: 'Active',            value: activeServices,  icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
              { label: 'Pending Bookings',  value: pendingCount,    icon: Clock,       color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
              { label: 'Revenue Earned',    value: `₹${totalRevenue.toFixed(0)}`, icon: IndianRupee, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10' },
            ].map(s => (
              <div key={s.label} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-[var(--text-primary)] leading-none">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-[var(--bg-secondary)] rounded-xl w-fit">
          {(['services', 'bookings'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                activeTab === t ? 'bg-white dark:bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)]'
              }`}>
              {t} {t === 'bookings' && bookings.length > 0 && <span className="ml-1 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{bookings.length}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : activeTab === 'services' ? (
          /* Services grid */
          services.length === 0 ? (
            <div className="flex flex-col items-center py-24 text-center bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl">
              <div className="w-14 h-14 bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-center mb-4 border border-[var(--border)]">
                <Calendar className="w-7 h-7 text-gray-300 dark:text-gray-700" />
              </div>
              <p className="font-semibold text-gray-800 dark:text-[var(--text-primary)] mb-1">No services yet</p>
              <p className="text-sm text-gray-500 max-w-xs mb-5">Create a service to start accepting bookings and monetizing your time.</p>
              <button onClick={openCreate}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition">
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
                  <div key={svc.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700 transition group flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${typeInfo.bg} ${typeInfo.border}`}>
                        <typeInfo.icon className={`w-5 h-5 ${typeInfo.color}`} />
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(svc)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] transition opacity-0 group-hover:opacity-100">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleActive(svc)} title={svc.is_active ? 'Pause' : 'Activate'}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] transition">
                          {svc.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button onClick={() => setDeleteConfirm(svc.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100">
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
                      {svc.description && <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{svc.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-[var(--text-secondary)] mb-3">
                        <span className="font-bold text-[var(--text-primary)] text-sm">₹{svc.price}</span>
                        {svc.duration_minutes && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{svc.duration_minutes}min</span>}
                        <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{svcBookings.length} booking{svcBookings.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="border-t border-[var(--border)] pt-3 mt-auto">
                      {svc.metadata?.calendly_url ? (
                        <a href={svc.metadata.calendly_url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
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
            <div className="flex flex-col items-center py-20 text-center bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl">
              <Users className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="font-semibold text-gray-700 dark:text-[var(--text-secondary)]">No bookings yet</p>
              <p className="text-sm text-gray-500 mt-1">Share your service booking links to start receiving requests.</p>
            </div>
          ) : (
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">All Bookings</h2>
                <span className="text-xs text-gray-400">{bookings.length} total</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {bookings.map(bkg => {
                  const svcName = services.find(s => s.id === bkg.service_id)?.title ?? 'Service';
                  return (
                    <div key={bkg.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-[var(--bg-secondary)]/60 transition">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 text-white font-bold text-sm">
                        {(bkg.customer_name ?? bkg.customer_email ?? 'B')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{bkg.customer_name ?? bkg.customer_email ?? '—'}</p>
                        <p className="text-xs text-gray-500 truncate">{svcName}</p>
                      </div>
                      {bkg.amount_paid ? <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">₹{bkg.amount_paid}</span> : null}
                      <span className="text-xs text-gray-400 hidden sm:block shrink-0">
                        {new Date(bkg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                      {/* Status selector */}
                      <select value={bkg.status}
                        onChange={e => updateBookingStatus(bkg.id, e.target.value)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 outline-none cursor-pointer ${STATUS_STYLES[bkg.status] ?? STATUS_STYLES.pending}`}>
                        {['pending', 'confirmed', 'completed', 'cancelled'].map(s => (
                          <option key={s} value={s} className="bg-white dark:bg-[var(--bg-secondary)] text-[var(--text-primary)]">{s}</option>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--border)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-primary)] z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">{editService ? 'Edit Service' : 'New Service'}</h2>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/40 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              {/* Service type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[var(--text-secondary)] mb-2">Service Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {SERVICE_TYPES.map(t => (
                    <button key={t.id} type="button" onClick={() => setForm(p => ({ ...p, service_type: t.id }))}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition ${
                        form.service_type === t.id ? `border-indigo-500 ${t.bg}` : 'border-gray-200 dark:border-[var(--border)] hover:border-gray-300 dark:hover:border-gray-600'
                      }`}>
                      <t.icon className={`w-5 h-5 ${form.service_type === t.id ? t.color : 'text-gray-400'}`} />
                      <span className={`text-xs font-semibold ${form.service_type === t.id ? t.color : 'text-[var(--text-secondary)]'}`}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[var(--text-secondary)] mb-1.5">Title</label>
                <input type="text" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="30-min Strategy Call" className={INPUT} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[var(--text-secondary)] mb-1.5">Description <span className="text-gray-400 font-normal">optional</span></label>
                <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What will the client get from this session?" className={`${INPUT} resize-none`} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[var(--text-secondary)] mb-1.5">Price (₹)</label>
                  <input type="number" min={0} value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))}
                    className={INPUT} />
                </div>
                {(form.service_type === '1on1' || form.service_type === 'consulting') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-[var(--text-secondary)] mb-1.5">Duration (min)</label>
                    <input type="number" min={15} step={15} value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: Number(e.target.value) }))}
                      className={INPUT} />
                  </div>
                )}
              </div>

              {(form.service_type === '1on1' || form.service_type === 'consulting') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[var(--text-secondary)] mb-1.5">
                    Calendly URL <span className="text-gray-400 font-normal">optional</span>
                  </label>
                  <input type="url" value={form.calendly_url} onChange={e => setForm(p => ({ ...p, calendly_url: e.target.value }))}
                    placeholder="https://calendly.com/your-link" className={INPUT} />
                  <p className="text-xs text-gray-400 mt-1.5">If set, clients will be redirected to Calendly to pick a time slot.</p>
                </div>
              )}

              <button type="submit" disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition">
                {saving ? 'Saving…' : editService ? 'Save Changes →' : 'Create Service →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] mb-1">Delete service?</h3>
            <p className="text-sm text-gray-500 mb-5">This service and all its booking history will be permanently removed.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-[var(--border)] rounded-xl text-sm font-semibold text-gray-600 dark:text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-[var(--bg-secondary)] transition">Cancel</button>
              <button onClick={() => deleteService(deleteConfirm)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
