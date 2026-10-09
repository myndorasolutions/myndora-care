// Modal + toast UI plumbing (not persisted).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalOptions {
  title: string;
  body: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
  /** Backdrop click only closes the modal where it is safe (no unsaved form input). */
  backdropDismiss?: boolean;
}

interface ModalContextValue {
  openModal: (opts: ModalOptions) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within UiProvider');
  return ctx;
}

interface Toast { id: number; message: string; }
interface ToastContextValue { toast: (message: string) => void; }
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within UiProvider');
  return ctx;
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalOptions | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const toastId = useRef(0);

  const closeModal = useCallback(() => setModal(null), []);
  const openModal = useCallback((opts: ModalOptions) => setModal(opts), []);

  const toast = useCallback((message: string) => {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  }, []);

  // Escape always closes the modal.
  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKey);
    // Move focus into the dialog for keyboard users
    const el = dialogRef.current;
    const focusable = el?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusable?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [modal, closeModal]);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      <ToastContext.Provider value={{ toast }}>
        {children}
        {modal && (
          <div
            className="mc-modal-backdrop"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && modal.backdropDismiss !== false) closeModal();
            }}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={modal.title}
              className={`mc-modal ${modal.size === 'lg' ? 'mc-modal-lg' : ''}`}
            >
              <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-slate-100 sticky top-0 bg-white rounded-t-[20px]">
                <h2 className="text-lg font-bold text-slate-900">{modal.title}</h2>
                <button
                  type="button"
                  aria-label="Close dialog"
                  className="mc-btn mc-btn-ghost mc-btn-sm -mr-2"
                  onClick={closeModal}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="px-6 py-4">{modal.body}</div>
              {modal.footer && <div className="px-6 pb-5 pt-1 flex flex-wrap gap-2 justify-end">{modal.footer}</div>}
            </div>
          </div>
        )}
        <div className="mc-toast-wrap" aria-live="polite">
          {toasts.map((t) => <div key={t.id} className="mc-toast">{t.message}</div>)}
        </div>
      </ToastContext.Provider>
    </ModalContext.Provider>
  );
}
