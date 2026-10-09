import { FormEvent, useState } from 'react';
import html2canvas from 'html2canvas';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const MAX_SCREENSHOT_CHARS = 400_000; // ~300KB base64 budget

type Severity = 'low' | 'medium' | 'high';

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

  async function captureScreenshot() {
    setCapturing(true);
    setMessage(null);
    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        logging: false,
        scale: Math.min(window.devicePixelRatio || 1, 1.25),
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: Math.min(document.documentElement.scrollHeight, 2400),
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
      if (dataUrl.length > MAX_SCREENSHOT_CHARS) {
        setMessage('Screenshot too large; try again after scrolling to a smaller region.');
        setScreenshotBase64(null);
      } else {
        setScreenshotBase64(dataUrl);
        setMessage('Screenshot attached.');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Screenshot failed');
      setScreenshotBase64(null);
    } finally {
      setCapturing(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await apiFetch('/feedback', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          severity,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          screenshotBase64: screenshotBase64 ?? undefined,
          role: user?.role,
        }),
      });
      setMessage('Thanks — feedback submitted.');
      setTitle('');
      setDescription('');
      setScreenshotBase64(null);
      setSeverity('medium');
      setTimeout(() => setOpen(false), 900);
    } catch (err) {
      const detail =
        err instanceof ApiError
          ? `${err.message}${err.body ? ` (${JSON.stringify(err.body)})` : ''}`
          : err instanceof Error
            ? err.message
            : 'Submit failed';
      setMessage(detail);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMessage(null);
        }}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-slate-800"
      >
        Feedback
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 p-4 sm:items-center sm:justify-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Submit feedback"
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Report a bug</h2>
                <p className="text-sm text-slate-500">
                  Submit feedback from this page. Screenshots stay on Myndora staging.
                </p>
              </div>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-800"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <form className="space-y-3" onSubmit={onSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Short summary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Steps to reproduce, expected vs actual"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as Severity)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={captureScreenshot}
                  disabled={capturing}
                  className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
                >
                  {capturing ? 'Capturing…' : screenshotBase64 ? 'Retake screenshot' : 'Attach screenshot'}
                </button>
                {screenshotBase64 ? (
                  <span className="text-xs text-emerald-700">Screenshot ready</span>
                ) : null}
              </div>
              {message ? <p className="text-sm text-slate-600">{message}</p> : null}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Submit feedback'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
