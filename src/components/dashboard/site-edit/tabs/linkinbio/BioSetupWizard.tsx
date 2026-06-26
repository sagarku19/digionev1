'use client';
// BioSetupWizard — first-run onboarding for a freshly created Link-in-Bio site.
// Steps: Profile → Picture → Social links → Template. Skip dismisses; Next advances.
import { useState, type ElementType } from 'react';
import {
  User, ImagePlus, Check, ArrowLeft, LayoutTemplate,
  Instagram, Twitter, Youtube, Linkedin, Github, Music, Globe, Trash2,
} from 'lucide-react';
import ImagePickerModal from '@/components/dashboard/ImagePickerModal';
import type { BioProfileData } from './BioProfileEditor';
import BioTemplates, { type TemplateCard } from './BioTemplates';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/you' },
  { id: 'twitter', label: 'Twitter/X', icon: Twitter, placeholder: 'https://x.com/you' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@you' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/you' },
  { id: 'github', label: 'GitHub', icon: Github, placeholder: 'https://github.com/you' },
  { id: 'tiktok', label: 'TikTok', icon: Music, placeholder: 'https://tiktok.com/@you' },
  { id: 'website', label: 'Website', icon: Globe, placeholder: 'https://your-site.com' },
];

const INPUT =
  'w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-shadow focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] focus:outline-none';

type Props = {
  profile: BioProfileData;
  onChangeProfile: (p: BioProfileData) => void;
  designTemplates: TemplateCard[];
  contentTemplates: TemplateCard[];
  onApplyDesign: (index: number) => void;
  onApplyContent: (index: number) => void;
  onClose: () => void;   // dismiss the wizard (Skip all)
  onSave: () => void;    // persist current state (Save & next)
  onFinish: () => void;  // save everything + close
};

const STEPS = ['Profile', 'Picture', 'Social', 'Template'] as const;
const STEP_ICONS: ElementType[] = [User, ImagePlus, Globe, LayoutTemplate];

export default function BioSetupWizard({
  profile, onChangeProfile, designTemplates, contentTemplates, onApplyDesign, onApplyContent, onClose, onSave, onFinish,
}: Props) {
  const [step, setStep] = useState(0);
  const [avatarPicker, setAvatarPicker] = useState(false);
  const isLast = step === STEPS.length - 1;
  const StepIcon = STEP_ICONS[step];

  const next = () => {
    if (isLast) { onFinish(); return; }
    onSave();
    setStep((s) => s + 1);
  };
  const skipStep = () => (isLast ? onClose() : setStep((s) => s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const usedPlatforms = new Set(profile.socialLinks.map((s) => s.platform));
  const available = PLATFORMS.filter((p) => !usedPlatforms.has(p.id));
  const addSocial = (id: string) =>
    onChangeProfile({ ...profile, socialLinks: [...profile.socialLinks, { platform: id, url: '', is_visible: true }] });
  const updateSocial = (i: number, url: string) => {
    const next = [...profile.socialLinks];
    next[i] = { ...next[i], url };
    onChangeProfile({ ...profile, socialLinks: next });
  };
  const removeSocial = (i: number) =>
    onChangeProfile({ ...profile, socialLinks: profile.socialLinks.filter((_, idx) => idx !== i) });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div aria-hidden className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Set up your page"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card-lg)] sm:max-w-2xl"
      >
        {/* header */}
        <div className="shrink-0 border-b border-[var(--border)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand)] text-[var(--text-on-brand)]">
                <StepIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--brand)]">Step {step + 1} of {STEPS.length}</p>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{STEP_TITLES[step]}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-tertiary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              Skip all
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">{STEP_SUBTITLES[step]}</p>
          <div className="mt-3 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-[var(--brand)]' : 'bg-[var(--surface-muted)]'}`}
              />
            ))}
          </div>
        </div>

        {/* body */}
        <div className="min-h-[300px] overflow-y-auto p-5">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Display name</label>
                <input
                  className={INPUT}
                  value={profile.displayName}
                  onChange={(e) => onChangeProfile({ ...profile, displayName: e.target.value })}
                  placeholder="Your name or brand"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Bio</label>
                <textarea
                  className={`${INPUT} resize-none`}
                  rows={3}
                  value={profile.bioText}
                  onChange={(e) => onChangeProfile({ ...profile, bioText: e.target.value })}
                  placeholder="A short, catchy bio…"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col items-center gap-4 py-2">
              <button
                onClick={() => setAvatarPicker(true)}
                className="group relative h-28 w-28 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[var(--text-tertiary)]">
                    <User className="h-10 w-10" />
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <ImagePlus className="h-6 w-6 text-white" />
                </span>
              </button>
              <button
                onClick={() => setAvatarPicker(true)}
                className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                {profile.avatarUrl ? 'Change picture' : 'Upload picture'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {profile.socialLinks.map((s, i) => {
                const def = PLATFORMS.find((p) => p.id === s.platform);
                const Icon = def?.icon ?? Globe;
                return (
                  <div key={i} className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface)] text-[var(--text-secondary)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <input
                      className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                      value={s.url}
                      onChange={(e) => updateSocial(i, e.target.value)}
                      placeholder={def?.placeholder ?? 'https://…'}
                    />
                    <button
                      onClick={() => removeSocial(i)}
                      aria-label="Remove"
                      className="shrink-0 rounded-[var(--radius-sm)] p-1.5 text-[var(--text-tertiary)] transition hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
              {available.length > 0 && (
                <div>
                  <p className="mb-2 mt-1 text-xs font-medium text-[var(--text-secondary)]">Add a platform</p>
                  <div className="flex flex-wrap gap-2">
                    {available.map((p) => (
                      <SocialChip key={p.id} icon={p.icon} label={p.label} onClick={() => addSocial(p.id)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <BioTemplates
              designTemplates={designTemplates}
              contentTemplates={contentTemplates}
              onApplyDesign={onApplyDesign}
              onApplyContent={onApplyContent}
            />
          )}
        </div>

        {/* footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border)] p-4">
          <button
            onClick={skipStep}
            className="rounded-[var(--radius-sm)] px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={back}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            <button
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--text-on-brand)] transition hover:bg-[var(--brand-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              {isLast ? <><Check className="h-4 w-4" /> Finish</> : 'Save & next'}
            </button>
          </div>
        </div>
      </div>

      <ImagePickerModal
        open={avatarPicker}
        bucket="creator-public"
        kind="avatar"
        onClose={() => setAvatarPicker(false)}
        onSelect={(url) => onChangeProfile({ ...profile, avatarUrl: url })}
        title="Select Profile Avatar"
      />
    </div>
  );
}

const STEP_TITLES = ['Complete your profile', 'Add your profile picture', 'Add social links', 'Choose a template'];
const STEP_SUBTITLES = [
  'Tell visitors who you are.',
  'A photo makes your page feel personal.',
  'Link the places people can find you.',
  'Pick a starting design or layout — you can change it anytime.',
];

function SocialChip({ icon: Icon, label, onClick }: { icon: ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
