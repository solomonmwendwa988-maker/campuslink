import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Plus, Search, Send, MessageCircle, X } from 'lucide-react';
import { Avatar } from '../shared/Avatar';
import { ApiConversation, ApiMessage, listConversations, getConversationMessages, sendConversationMessage, markConversationRead, startConversation } from '../../services/api';


function personName(person?: ApiConversation['participants'][number]) {
  return person?.profile?.fullName?.trim() || person?.username || 'Student';
}
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || 'S';
}
function timeLabel(date?: string) {
  if (!date) return '';
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  const now = new Date();
  if (value.toDateString() === now.toDateString()) return value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (value.getFullYear() === now.getFullYear()) return value.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return value.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function MessagesPage({ initialUsername, onInitialHandled }: { initialUsername?: string; onInitialHandled?: () => void }) {
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const openedInitialUsername = useRef<string>('');
  const selected = conversations.find(item => item.id === selectedId) ?? null;
  const contact = selected?.participants?.[0];
  const filtered = useMemo(() => conversations.filter(item => {
    const target = item.participants[0];
    const last = item.lastMessage?.content ?? '';
    return `${personName(target)} ${target?.username ?? ''} ${last}`.toLowerCase().includes(search.trim().toLowerCase());
  }), [conversations, search]);

  const refreshConversations = useCallback(async (quiet = false) => {
    if (!quiet) setLoadingList(true);
    try {
      const result = await listConversations();
      setConversations(result.data);
      setSelectedId(current => current && result.data.some(item => item.id === current) ? current : result.data[0]?.id ?? null);
      setError('');
    } catch (err) {
      if (!quiet) setError(err instanceof Error ? err.message : 'Could not load conversations.');
    } finally { if (!quiet) setLoadingList(false); }
  }, []);

  const refreshMessages = useCallback(async (conversationId: string, quiet = false) => {
    if (!quiet) setLoadingMessages(true);
    try {
      const result = await getConversationMessages(conversationId);
      setMessages(result.data);
      // Active conversation is continuously acknowledged, including background refreshes.
      await markConversationRead(conversationId).catch(() => undefined);
      await refreshConversations(true);
    } catch (err) {
      if (!quiet) setError(err instanceof Error ? err.message : 'Could not load messages.');
    } finally { if (!quiet) setLoadingMessages(false); }
  }, [refreshConversations]);

  useEffect(() => { void refreshConversations(); }, [refreshConversations]);
  useEffect(() => {
    const username = (initialUsername ?? '').trim().replace(/^@/, '');
    if (!username || openedInitialUsername.current.toLowerCase() === username.toLowerCase()) return;
    openedInitialUsername.current = username;
    let cancelled = false;
    setError('');
    void startConversation(username)
      .then(async result => {
        if (cancelled) return;
        setSelectedId(result.conversation.id);
        setMobileChatOpen(true);
        await refreshConversations(true);
        if (!cancelled) {
          setSelectedId(result.conversation.id);
          onInitialHandled?.();
        }
      })
      .catch(error => {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : 'Could not open this student conversation.');
          onInitialHandled?.();
        }
      });
    return () => { cancelled = true; };
  }, [initialUsername, refreshConversations, onInitialHandled]);
  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    void refreshMessages(selectedId);
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void refreshMessages(selectedId, true);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [selectedId, refreshMessages, refreshConversations]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages.length, selectedId]);

  const openConversation = (id: string) => {
    setSelectedId(id); setMobileChatOpen(true); setError('');
    if (window.matchMedia('(max-width: 720px)').matches) window.history.pushState({ campuslinkConversation: id }, '', `${window.location.pathname}#conversation`);
  };
  const back = () => { if (window.location.hash === '#conversation') window.history.back(); else setMobileChatOpen(false); };
  useEffect(() => { const onPop = () => setMobileChatOpen(false); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, []);

  const submitMessage = async (event: FormEvent) => {
    event.preventDefault(); const content = draft.trim(); if (!content || !selectedId || sending) return;
    setSending(true); setError(''); const clientMessageId = crypto.randomUUID();
    try {
      const result = await sendConversationMessage(selectedId, content, clientMessageId);
      setMessages(current => current.some(message => message.id === result.message.id) ? current : [...current, result.message]);
      setDraft(''); void refreshConversations(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Message failed to send. Please retry.'); }
    finally { setSending(false); }
  };
  const createChat = async (event: FormEvent) => {
    event.preventDefault(); const username = newUsername.trim().replace(/^@/, ''); if (!username) return;
    setError('');
    try { const result = await startConversation(username); await refreshConversations(true); setSelectedId(result.conversation.id); setMobileChatOpen(true); setNewChatOpen(false); setNewUsername(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not start conversation.'); }
  };

  return <div className={`messages-page card instagram-messages${mobileChatOpen ? ' mobile-chat-open' : ''}`}>
    <aside className="conversation-list" aria-label="Messages inbox">
      <header className="conversation-list-header"><div><h1>Messages</h1><span className="inbox-subtitle">Your campus conversations</span></div><button className="new-message-btn" onClick={() => setNewChatOpen(open => !open)} title="New message" aria-label="New message"><Plus size={19}/></button></header>
      <label className="message-search"><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations"/><button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X size={15}/></button></label>
      {newChatOpen && <form className="new-chat-form" onSubmit={createChat}><input value={newUsername} onChange={event => setNewUsername(event.target.value)} placeholder="Student username" autoFocus/><button type="submit" disabled={!newUsername.trim()}>Start</button></form>}
      {error && <div className="messages-error" role="alert">{error}</div>}
      <div className="conversation-items">
        {loadingList && conversations.length === 0 && <div className="messages-loading">Loading your inbox…</div>}
        {!loadingList && conversations.length === 0 && <div className="inbox-empty"><MessageCircle size={25}/><strong>Your messages are waiting</strong><span>Start a conversation with a student from Explore.</span><button onClick={() => setNewChatOpen(true)}>New message</button></div>}
        {filtered.map(item => { const student = item.participants[0]; const title = personName(student); const last = item.lastMessage; const isMine = Boolean(last && item.participants.every(p => p.id !== last.senderId)); return <button className={`conversation ig-conversation${selectedId === item.id ? ' selected' : ''}`} key={item.id} onClick={() => openConversation(item.id)}>
          <Avatar initials={initials(title)} image={student?.profile?.photoUrl ?? undefined}/><span className="conversation-details"><strong>{title}</strong><small>{last ? `${isMine ? 'You: ' : ''}${last.content}` : 'Start a conversation'}</small></span><span className="conversation-meta"><small>{timeLabel(last?.createdAt ?? item.updatedAt)}</small>{item.unreadCount > 0 && <b>{item.unreadCount}</b>}</span>
        </button>})}
        {!loadingList && filtered.length === 0 && conversations.length > 0 && <div className="conversation-empty">No conversations found.</div>}
      </div>
    </aside>
    <section className="chat-active" aria-label={contact ? `Conversation with ${personName(contact)}` : 'Conversation'}>
      {!selected ? <div className="instagram-chat-welcome"><div className="welcome-icon"><Send size={28}/></div><h2>Your messages</h2><p>Connect with classmates and keep conversations going.</p><button onClick={() => setNewChatOpen(true)}>Send a message</button></div> : <>
        <header className="chat-head ig-chat-head"><button className="chat-back" onClick={back} aria-label="Back to inbox"><ChevronRight size={19}/></button><Avatar initials={initials(personName(contact))} image={contact?.profile?.photoUrl ?? undefined}/><div className="chat-contact"><strong>{personName(contact)}</strong><small>@{contact?.username}</small></div></header>
        <div className="chat-scroll ig-chat-scroll" ref={scrollRef} aria-live="polite">
          <div className="chat-profile-intro"><Avatar initials={initials(personName(contact))} image={contact?.profile?.photoUrl ?? undefined}/><strong>{personName(contact)}</strong><span>@{contact?.username}</span><p>CampusLink · University community</p></div>
          {loadingMessages && messages.length === 0 && <div className="messages-loading">Loading messages…</div>}
          {messages.map(message => { const mine = selected.participants.length > 0 && !selected.participants.some(p => p.id === message.senderId); return <div className={`ig-message-row${mine ? ' mine' : ''}`} key={message.id}><div className="chat-bubble ig-bubble">{message.content}<span className="chat-time">{timeLabel(message.createdAt)}</span>{mine && <span className={`message-receipt${message.readAt ? ' seen' : message.deliveredAt ? ' delivered' : ''}`}>{message.readAt ? 'Seen' : message.deliveredAt ? 'Delivered' : 'Sent'}</span>}</div></div>; })}
          {!loadingMessages && messages.length === 0 && <div className="chat-empty-state"><b>Say hello to {personName(contact)}</b><span>You're connected. Start your conversation.</span></div>}
        </div>
        <form className="chat-send ig-chat-send" onSubmit={submitMessage}><input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Message…" aria-label="Write a message" autoComplete="off"/><button type="submit" aria-label="Send message" disabled={!draft.trim() || sending}>{sending ? "Sending…" : <Send size={17}/>}</button></form>
      </>}
    </section>
  </div>;
}
