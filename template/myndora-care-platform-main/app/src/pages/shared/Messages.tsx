// Messages: threaded coordination inbox per portal audience (sponsor / patient / chw).
import { useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useStore, type PortalMessage } from '@/store/useStore';
import { useAuth } from '@/store/auth';
import { Btn, Card, EmptyState, PageHeader } from '@/components/kit';

export default function MessagesPage({ audience }: { audience: PortalMessage['audience'] }) {
  const session = useAuth((s) => s.session);
  const myName = session?.account.name ?? 'You';
  const messages = useStore(useShallow((s) => s.messages.filter((m) => m.audience === audience)));
  const sendMessage = useStore((s) => s.sendMessage);

  const threads = useMemo(() => {
    const map = new Map<string, PortalMessage[]>();
    for (const m of messages) {
      const list = map.get(m.thread) ?? [];
      list.push(m);
      map.set(m.thread, list);
    }
    return [...map.entries()].map(([thread, list]) => ({
      thread,
      list: [...list].sort((a, b) => a.at.localeCompare(b.at)),
      last: list.reduce((a, b) => (a.at > b.at ? a : b)),
    })).sort((a, b) => b.last.at.localeCompare(a.last.at));
  }, [messages]);

  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const current = threads.find((t) => t.thread === activeThread) ?? threads[0];

  const send = () => {
    if (!draft.trim() || !current) return;
    sendMessage(audience, current.thread, myName, draft.trim());
    setDraft('');
  };

  return (
    <div>
      <PageHeader title="Messages" subtitle="Coordination messages between you, the care team and Myndora Care. Notification previews outside the app stay masked — no clinical detail is included." />
      {threads.length === 0 ? (
        <Card><EmptyState title="No messages yet" hint="When the care team or Myndora Care contacts you, the conversation appears here." /></Card>
      ) : (
        <div className="grid md:grid-cols-[260px_1fr] gap-4">
          <Card className="p-2 space-y-1">
            {threads.map((t) => (
              <button
                key={t.thread}
                type="button"
                onClick={() => setActiveThread(t.thread)}
                className={`w-full text-left rounded-xl px-3 py-2.5 ${current?.thread === t.thread ? 'bg-[var(--accent-soft)]' : 'hover:bg-slate-50'}`}
              >
                <p className="text-sm font-bold text-slate-900 truncate">{t.thread}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{t.last.from}: {t.last.text}</p>
              </button>
            ))}
          </Card>
          <Card>
            {current && (
              <>
                <p className="text-sm font-extrabold text-slate-900 mb-3">{current.thread}</p>
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {current.list.map((m) => (
                    <div key={m.id} className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.mine ? 'ml-auto text-white' : 'bg-slate-100 text-slate-800'}`} style={m.mine ? { background: 'var(--accent, var(--blue))' } : undefined}>
                      <p className={`text-[11px] font-bold mb-0.5 ${m.mine ? 'text-white/80' : 'text-slate-500'}`}>{m.from} · {new Date(m.at).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      <p>{m.text}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <input
                    className="mc-input flex-1"
                    placeholder="Write a reply…"
                    aria-label="Write a reply"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                  />
                  <Btn onClick={send} aria-label="Send message"><Send size={15} /> Send</Btn>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
