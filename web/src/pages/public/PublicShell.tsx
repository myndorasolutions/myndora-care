import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'How It Works', to: '/#how-it-works' },
  { label: 'Services', to: '/#services' },
  { label: 'Packages', to: '/#packages' },
  { label: 'Safety and Privacy', to: '/#privacy' },
];

const FOOTER_LINKS = [
  { label: 'How It Works', to: '/#how-it-works' },
  { label: 'Services', to: '/#services' },
  { label: 'Packages', to: '/#packages' },
  { label: 'Privacy', to: '/#privacy' },
  { label: 'Sign In', to: '/login?role=SPONSOR' },
  { label: 'Create Account', to: '/register?role=SPONSOR' },
  { label: 'Staff Sign In', to: '/login?role=ADMIN' },
];

export function PublicShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  return (
    <div data-theme="sponsor" className="mc-app flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-3 px-4 md:px-6">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 text-lg font-extrabold text-slate-900"
          >
            <img
              src="/assets/myndora_care_logo5.jpeg"
              alt=""
              className="h-9 w-auto object-contain"
            />
            <span>Myndora Care</span>
          </Link>
          <nav
            className="hidden items-center gap-4 text-sm font-semibold text-slate-600 lg:flex"
            aria-label="Public"
          >
            {NAV.map((item) =>
              item.to === '/' ? (
                <NavLink
                  key={item.to}
                  to="/"
                  end
                  className={({ isActive }) =>
                    `hover:text-slate-900 ${isActive && !location.hash ? 'text-slate-900 underline decoration-2 underline-offset-4' : ''}`
                  }
                >
                  {item.label}
                </NavLink>
              ) : (
                <Link key={item.to} to={item.to} className="hover:text-slate-900">
                  {item.label}
                </Link>
              ),
            )}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login?role=SPONSOR" className="mc-btn mc-btn-secondary mc-btn-sm">
                Sign in
              </Link>
              <Link to="/register?role=SPONSOR" className="mc-btn mc-btn-primary mc-btn-sm">
                Create account
              </Link>
            </div>
            <button
              type="button"
              className="mc-btn mc-btn-secondary mc-btn-sm !px-2.5 lg:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav
            className="space-y-1 border-t border-slate-200 bg-white px-4 py-3 lg:hidden"
            aria-label="Public mobile"
          >
            {NAV.map((item) =>
              item.to === '/' ? (
                <NavLink
                  key={item.to}
                  to="/"
                  end
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2.5 text-sm font-semibold ${isActive && !location.hash ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`
                  }
                >
                  {item.label}
                </NavLink>
              ) : (
                <Link
                  key={item.to}
                  to={item.to}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {item.label}
                </Link>
              ),
            )}
            <div className="flex gap-2 pt-2 sm:hidden">
              <Link to="/login?role=SPONSOR" className="mc-btn mc-btn-secondary mc-btn-sm flex-1">
                Sign in
              </Link>
              <Link to="/register?role=SPONSOR" className="mc-btn mc-btn-primary mc-btn-sm flex-1">
                Create account
              </Link>
            </div>
          </nav>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-[1200px] space-y-3 px-4 py-6 text-xs text-slate-500 md:px-6">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {FOOTER_LINKS.map((l) => (
              <Link key={l.to + l.label} to={l.to} className="underline hover:text-slate-700">
                {l.label}
              </Link>
            ))}
          </div>
          <p>Myndora Care — home health monitoring with family peace of mind.</p>
        </div>
      </footer>
    </div>
  );
}
