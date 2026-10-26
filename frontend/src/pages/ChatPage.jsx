import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Send, UsersRound } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import api from '../services/api';
import { asList } from '../utils/apiData';

const POLL_MS = 3000;

const initialsOf = (name = '') => name.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();

export default function ChatPage() {
  const me = useSelector((s) => s.auth.user);
  const myId = me?.id || me?._id;
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const lastStampRef = useRef(null);

  const merge = useCallback((incoming) => {
    if (!incoming.length) return;
    setMessages((current) => {
      const seen = new Set(current.map((m) => m._id));
      const fresh = incoming.filter((m) => !seen.has(m._id));
      return fresh.length ? [...current, ...fresh] : current;
    });
    lastStampRef.current = incoming[incoming.length - 1].createdAt;
  }, []);

  const poll = useCallback(async () => {
    try {
      const params = lastStampRef.current ? { after: lastStampRef.current } : {};
      const { data } = await api.get('/chat/messages', { params });
      merge(asList(data.data));
      setError('');
    } catch {
      setError('Reconnecting to chat…');
    }
  }, [merge]);

  useEffect(() => {
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => clearInterval(timer);
  }, [poll]);

  useEffect(() => {
    api.get('/chat/members').then(({ data }) => setMembers(asList(data.data))).catch(() => {});
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const send = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { data } = await api.post('/chat/messages', { body });
      merge([data.data]);
      setText('');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Message could not be sent');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Neighbourhood conversations" title="Community chat" description="Chat with everyone in the community — newly approved members join automatically." />
      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <section className="card flex h-[70vh] flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {!messages.length && <div className="grid h-full place-items-center text-sm text-slate-400">No messages yet — say hello! 👋</div>}
            {messages.map((m) => {
              const mine = (m.sender?._id || m.sender) === myId;
              return (
                <div key={m._id} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{initialsOf(m.sender?.name)}</div>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${mine ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm bg-slate-100 dark:bg-earth-800'}`}>
                    {!mine && <div className="text-xs font-bold text-brand-600">{m.sender?.name || 'Member'} <span className="font-normal text-slate-400">· {m.sender?.role}</span></div>}
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                    <div className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-slate-400'}`}>{new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          {error && <div className="border-t border-amber-200 bg-amber-50 px-5 py-2 text-xs font-bold text-amber-700">{error}</div>}
          <form onSubmit={send} className="flex gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
            <input className="field" maxLength={1000} placeholder="Type a message" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn-primary !px-5" disabled={sending || !text.trim()} aria-label="Send message"><Send size={18} /></button>
          </form>
        </section>

        <aside className="card hidden h-fit max-h-[70vh] overflow-y-auto p-5 lg:block">
          <div className="mb-3 flex items-center gap-2 font-bold"><UsersRound size={17} className="text-brand-600" /> Members ({members.length})</div>
          <ul className="space-y-2 text-sm">
            {members.map((member) => (
              <li key={member._id} className="flex items-center justify-between gap-2">
                <span className="truncate">{member.name}{(member._id === myId) && ' (you)'}</span>
                <span className="shrink-0 text-xs text-slate-400">{member.role}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
