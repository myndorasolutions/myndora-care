import { useEffect, useId, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { authApi, authUserToProfile } from '@/lib/authApi';
import { useAuthStore } from '@/stores/authStore';
import { FeedbackWidget } from './FeedbackWidget';
import { LogoFooter } from './LogoFooter';
import { Sidebar } from './Sidebar';

export function Layout() {
  const [navOpen, setNavOpen] = useState(false);
  const navId = useId();
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    authApi
      .me()
      .then((me) => {
        if (cancelled) return;
        setAuth(token, authUserToProfile(me));
      })
      .catch(() => {
        /* keep persisted session if /auth/me fails (e.g. mock pilot token) */
      });
    return () => {
      cancelled = true;
    };
  }, [token, setAuth]);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navOpen]);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (mq.matches) setNavOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex min-h-0 flex-1">
        {navOpen ? (
          <button
            type="button"
            aria-label="Close navigation menu"
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setNavOpen(false)}
          />
        ) : null}

        <Sidebar id={navId} open={navOpen} onClose={() => setNavOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              aria-expanded={navOpen}
              aria-controls={navId}
              aria-label={navOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setNavOpen((v) => !v)}
            >
              <span className="sr-only">{navOpen ? 'Close menu' : 'Open menu'}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                {navOpen ? (
                  <>
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </>
                ) : (
                  <>
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                  </>
                )}
              </svg>
            </button>
            <img
              src="/assets/myndora_care_logo5.jpeg"
              alt=""
              className="h-8 w-auto object-contain"
            />
            <p className="text-sm font-bold text-slate-900">Myndora Care</p>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
          <LogoFooter className="border-t border-slate-200 py-4" />
        </div>
      </div>
      <FeedbackWidget />
    </div>
  );
}
