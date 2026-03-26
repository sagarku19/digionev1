import Link from 'next/link';
import Image from 'next/image';

export default function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)] pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1 md:border-r border-[var(--border)] md:pr-4">
            <div className="flex items-center gap-2 mb-4">
              <Image src="/logo.webp" alt="DigiOne" width={24} height={24} className="rounded" />
              <span className="text-base font-bold text-[var(--text-primary)] tracking-tight">DigiOne<sup className="text-[10px] text-[var(--text-secondary)] font-medium ml-0.5 -top-2 relative">.ai</sup></span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
              The platform serious Indian creators use to build their business. Built for India, ready for the world.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Product</h3>
            <ul className="space-y-3">
              <li><Link href="#features" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Features</Link></li>
              <li><Link href="#pricing" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Pricing</Link></li>
              <li><Link href="#creators" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Showcase</Link></li>
              <li><Link href="/integrations" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Integrations</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Resources</h3>
            <ul className="space-y-3">
              <li><Link href="/blog" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Blog</Link></li>
              <li><Link href="/help" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Help Center</Link></li>
              <li><Link href="/guides" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Creator Guides</Link></li>
              <li><Link href="/community" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Community</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><Link href="/terms" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/refunds" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Refund Policy</Link></li>
              <li><Link href="/contact" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[var(--border)] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--text-secondary)]">
            &copy; {new Date().getFullYear()} DigiOne Technologies. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors">Twitter</a>
            <a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors">Instagram</a>
            <a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors">YouTube</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
