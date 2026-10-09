import { useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { Btn, Card, EmptyState, PageHeader } from '@/components/kit';
import { useAuthStore } from '@/stores/authStore';

interface DraftMessage {
  id: string;
  from: string;
  text: string;
  at: string;
  mine: boolean;
}

interface DraftThread {
  thread: string;
  list: DraftMessage[];
}

function newId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function MessagesPage() {
  const user = useAuthStore((s) => s.user);
  const myName = user?.full_name ?? 'You';
  const [threads, setThreads] = useState<DraftThread[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const current = useMemo(
    () => threads.find((t) => t.thread === activeThread) ?? threads[0],
    [threads, activeThread],
  );

  const startThread = () => {
    const thread = `Conversation ${threads.length + 1}`;
    setThreads((prev) => [...prev, { thread, list: [] }]);
    setActiveThread(thread);
  };

  const send = () => {
    if (!draft.trim() || !current) return;
    const message: DraftMessage = {
      id: newId(),
      from: myName,
      text: draft.trim(),
      at: new Date().toISOString(),
      mine: true,
    };
    setThreads((prev) =>
      prev.map((t) => (t.thread === current.thread ? { ...t, list: [...t.list, message] } : t)),
    );
    setDraft('');
  };

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Coordination messages between you, the care team and Myndora Care. Drafts stay on this device until messaging is connected."
        actions={
          <Btn size="sm" variant="secondary" onClick={startThread}>
            New conversation
          </Btn>
        }
      />
      {threads.length === 0 ? (
        <Card>
          <EmptyState
            title="No messages yet"
            hint="Start a draft conversation. When the care team or Myndora Care contacts you, the thread will appear here."
            action={
              <Btn size="sm" onClick={startThread}>
                Start a conversation
              </Btn>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          <Card className="space-y-1 p-2">
            {threads.map((t) => {
              const last = t.list[t.list.length - 1];
              return (
                <button
                  key={t.thread}
                  type="button"
                  onClick={() => setActiveThread(t.thread)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left ${current?.thread === t.thread ? 'bg-[var(--accent-soft)]' : 'hover:bg-slate-50'}`}
                >
                  <p className="truncate text-sm font-bold text-slate-900">{t.thread}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {last ? `${last.from}: ${last.text}` : 'No messages yet'}
                  </p>
                </button>
              );
            })}
          </Card>
          <Card>
            {current && (
              <>
                <p className="mb-3 text-sm font-extrabold text-slate-900">{current.thread}</p>
                <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
                  {current.list.length === 0 ? (
                    <p className="text-sm text-slate-500">Write the first message in this draft thread.</p>
                  ) : (
                    current.list.map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.mine ? 'ml-auto text-white' : 'bg-slate-100 text-slate-800'}`}
                        style={m.mine ? { background: 'var(--accent, var(--blue))' } : undefined}
                      >
                        <p className={`mb-0.5 text-[11px] font-bold ${m.mine ? 'text-white/80' : 'text-slate-500'}`}>
                          {m.from} ·{' '}
                          {new Date(m.at).toLocaleString('en-NG', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p>{m.text}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <input
                    className="mc-input flex-1"
                    placeholder="Write a reply…"
                    aria-label="Write a reply"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') send();
                    }}
                  />
                  <Btn onClick={send} aria-label="Send message">
                    <Send size={15} /> Send
                  </Btn>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
