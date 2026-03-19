import Link from 'next/link';

export default function MarketingFooter() {
  return (
    <footer className="border-t border-white/5 bg-[#03040A] pt-16 pb-8 relative z-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1 md:border-r border-white/5 md:pr-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-500 text-white font-bold text-xs">D</div>
              <span className="text-lg font-bold text-white tracking-tight">DigiOne</span>
            </div>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              The platform serious Indian creators use to build their business. Built for India, ready for the world.
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-3">
              <li><Link href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</Link></li>
              <li><Link href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="#creators" className="text-sm text-slate-400 hover:text-white transition-colors">Showcase</Link></li>
              <li><Link href="/integrations" className="text-sm text-slate-400 hover:text-white transition-colors">Integrations</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-3">
              <li><Link href="/blog" className="text-sm text-slate-400 hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/help" className="text-sm text-slate-400 hover:text-white transition-colors">Help Center</Link></li>
              <li><Link href="/guides" className="text-sm text-slate-400 hover:text-white transition-colors">Creator Guides</Link></li>
              <li><Link href="/community" className="text-sm text-slate-400 hover:text-white transition-colors">Community</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><Link href="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-sm text-slate-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/refunds" className="text-sm text-slate-400 hover:text-white transition-colors">Refund Policy</Link></li>
              <li><Link href="/contact" className="text-sm text-slate-400 hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} DigiOne Technologies. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Twitter</a>
            <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Instagram</a>
            <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">YouTube</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
