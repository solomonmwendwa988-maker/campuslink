import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Send, ChevronRight } from 'lucide-react';
import { Avatar } from '../shared/Avatar';
import { useLocalState } from '../../hooks/useLocalState';
import { conversationMeta, conversationSeed } from '../../data/messages';
import { LocalConversations } from '../../types/messages';

const conversationNames = conversationMeta.map(person => person.name);

export function MessagesPage() {
  const [chats, setChats] = useLocalState<LocalConversations>('messages', conversationSeed);
  const [unread, setUnread] = useLocalState<Record<string, number>>('message-unread', Object.fromEntries(conversationMeta.map(item => [item.name, item.unread])));
  const [selected, setSelected] = useState(conversationNames[0]);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedPerson = conversationMeta.find(person => person.name === selected) ?? conversationMeta[0];
  const visibleNames = useMemo(() => conversationNames.filter(name => {
    const items = chats[name] ?? [];
    const last = items[items.length - 1];
    return `${name} ${last?.text ?? ''}`.toLowerCase().includes(query.toLowerCase());
  }), [chats, query]);
  const messages = chats[selected] ?? [];

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [selected, messages.length]);
  useEffect(() => {
    const onPopState = () => setMobileChatOpen(false);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const openConversation = (name: string) => {
    setSelected(name);
    setUnread(current => ({ ...current, [name]: 0 }));
    setMobileChatOpen(true);
    if (window.matchMedia('(max-width: 720px)').matches) window.history.pushState({ campuslinkConversation: name }, '', `${window.location.pathname}#conversation`);
  };
  const backToList = () => {
    if (window.location.hash === '#conversation') window.history.back();
    else setMobileChatOpen(false);
  };
  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setChats(current => ({ ...current, [selected]: [...(current[selected] ?? []), { id: Date.now(), text, mine: true, time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }] }));
    setDraft('');
  };

  return <div className={`messages-page card${mobileChatOpen ? ' mobile-chat-open' : ''}`}>
    <aside className="conversation-list" aria-label="Conversations">
      <header className="conversation-list-header"><h1>Messages</h1><span>Local preview</span></header>
      <label className="message-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search conversations" aria-label="Search conversations"/></label>
      <div className="conversation-items">{visibleNames.map(name => {
        const person = conversationMeta.find(item => item.name === name)!;
        const last = chats[name]?.[chats[name].length - 1];
        return <button className={`conversation ${selected === name ? 'selected' : ''}`} key={name} onClick={() => openConversation(name)} aria-current={selected === name ? 'true' : undefined}>
          <span className="conversation-avatar"><Avatar initials={person.initials}/>{person.online && <i aria-label="Online"/>}</span>
          <span className="conversation-details"><strong>{name}</strong><small>{last?.text ?? 'Start a conversation'}</small></span>
          <span className="conversation-meta"><small>{person.time}</small>{(unread[name] ?? 0) > 0 && <b>{unread[name]}</b>}</span>
        </button>;
      })}{visibleNames.length === 0 && <div className="conversation-empty">No conversations match “{query}”.</div>}</div>
    </aside>
    <section className="chat-active" aria-label={`Conversation with ${selected}`}>
      <header className="chat-head"><button className="chat-back" onClick={backToList} aria-label="Back to conversations"><ChevronRight size={19}/></button><Avatar initials={selectedPerson.initials}/><div className="chat-contact"><strong>{selected}</strong><small><i className={selectedPerson.online ? 'online' : ''}/>{selectedPerson.online ? 'Online' : 'Offline'} · local preview</small></div></header>
      <div className="chat-scroll" ref={scrollRef} aria-live="polite">{messages.length === 0 ? <div className="chat-empty-state"><Avatar initials={selectedPerson.initials}/><b>Start a conversation with {selected}</b><span>Messages stay in this browser preview.</span></div> : <AnimatePresence initial={false}>{messages.map(message => <motion.div className={`chat-bubble ${message.mine ? 'mine' : ''}`} key={message.id} initial={{ opacity: 0, y: 8, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .16 }}>{message.text}<span className="chat-time">{message.time} · stored locally</span></motion.div>)}</AnimatePresence>}</div>
      <form className="chat-send" onSubmit={send}><input value={draft} onChange={event => setDraft(event.target.value)} placeholder={`Message ${selected}…`} aria-label={`Message ${selected}`} autoComplete="off"/><button type="submit" aria-label="Send message" disabled={!draft.trim()}><Send size={17}/></button></form>
    </section>
  </div>;
}
