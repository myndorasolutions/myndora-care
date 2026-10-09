// Shared shell for public (pre-login) pages — same design system as the portal.
// Header carries the full public navigation; mobile uses a working hamburger menu.
import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { HeartPulse, Menu, X } from 'lucide-react';
import { useEffect } from 'react';

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'Services', to: '/services' },
  { label: 'Packages', to: '/packages' },
  { label: 'Partners', to: '/partners' },
  { label: 'Safety and Privacy', to: '/safety-and-privacy' },
  { label: 'Contact', to: '/contact' },
];

const FOOTER_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'Services', to: '/services' },
  { label: 'Packages', to: '/packages' },
  { label: 'Partners', to: '/partners' },
  { label: 'Privacy', to: '/safety-and-privacy' },
  { label: 'Terms', to: '/terms' },
  { label: 'Contact', to: '/contact' },
  { label: 'Sign In', to: '/login' },
  { label: 'Create Account', to: '/register' },
  { label: 'Staff Sign In', to: '/staff-login' },
];

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the mobile menu whenever navigation happens.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <div data-theme="sponsor" className="mc-app min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 h-16 max-w-[1200px] mx-auto w-full">
          <Link to="/" className="flex items-center gap-2.5 font-extrabold text-lg text-slate-900 shrink-0">
            <span className="w-9 h-9 rounded-xl grid place-items-center text-white" style={{ background: 'linear-gradient(135deg,#1687ff,#19c6b2)' }}>
              <HeartPulse size={20} />
            </span>
            <span>Myndora Care</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-4 text-sm font-semibold text-slate-600" aria-label="Public">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `hover:text-slate-900 ${isActive ? 'text-slate-900 underline underline-offset-4 decoration-2' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <Link to="/login" className="mc-btn mc-btn-secondary mc-btn-sm">Sign in</Link>
              <Link to="/register" className="mc-btn mc-btn-primary mc-btn-sm">Create account</Link>
            </div>
            <button
              type="button"
              className="lg:hidden mc-btn mc-btn-secondary mc-btn-sm !px-2.5"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1" aria-label="Public mobile">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {item.label}
              </NavLink>
            ))}
            <div className="flex gap-2 pt-2 sm:hidden">
              <Link to="/login" className="mc-btn mc-btn-secondary mc-btn-sm flex-1">Sign in</Link>
              <Link to="/register" className="mc-btn mc-btn-primary mc-btn-sm flex-1">Create account</Link>
            </div>
          </nav>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 text-xs text-slate-500 space-y-3">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {FOOTER_LINKS.map((l) => (
              <Link key={l.to + l.label} to={l.to} className="underline hover:text-slate-700">{l.label}</Link>
            ))}
          </div>
          <p>Myndora Care — UAT prototype with fictional data only.</p>
        </div>
      </footer>
    </div>
  );
}
