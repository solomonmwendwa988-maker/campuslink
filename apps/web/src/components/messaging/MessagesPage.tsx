import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Plus, Search, Send, MessageCircle, X, Mic, Square, MoreHorizontal, UserRound, VolumeX, ShieldBan, Flag } from 'lucide-react';
import { Avatar } from '../shared/Avatar';
import { ApiConversation, ApiMessage, listConversations, getConversationMessages, sendConversationMessage, markConversationRead, startConversation, sendVoiceMessage, blockUser, reportUser, muteConversation, unmuteConversation } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { pathForProfile } from '../../app/router/routes';


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
  const navigate = useNavigate();
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
  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [voiceSending, setVoiceSending] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const openedInitialUsername = useRef<string>('');
  const selected = conversations.find(item => item.id === selectedId) ?? null;
  const muted = Boolean(selected?.muted);
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
      setSelectedId(current => current && result.data.some(item => item.id === current) ? current : null);
      setError('');
    } catch (err) {
      if (!quiet) setError(err instanceof Error ? err.message : 'Could not load conversations.');
    } finally { if (!quiet) setLoadingList(false); }
  }, []);

  const refreshMessages = useCallback(async (conversationId: string, quiet = false, acknowledge = false) => {
    if (!quiet) setLoadingMessages(true);
    try {
      const result = await getConversationMessages(conversationId);
      setMessages(result.data);
      // Read receipts are sent only when the user explicitly opens this conversation.
      if (acknowledge) { await markConversationRead(conversationId).catch(() => undefined); await refreshConversations(true); }
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
  useEffect(() => { const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refreshConversations(true); }, 30000); return () => window.clearInterval(timer); }, [refreshConversations]);
  // Acknowledge read status only when the conversation selection changes (explicit open).
  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    void refreshMessages(selectedId, false, true);
  }, [selectedId, refreshMessages]);
  // Poll only the open chat while the tab is visible. Inbox refresh is separate and slower.
  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || (!mobileChatOpen && window.matchMedia('(max-width: 720px)').matches)) return;
      void refreshMessages(selectedId, true, false);
    }, 12000);
    return () => window.clearInterval(timer);
  }, [selectedId, refreshMessages, mobileChatOpen]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages.length, selectedId]);

  const openConversation = (id: string) => {
    setSelectedId(id); setMobileChatOpen(true); setMessages([]); setLoadingMessages(true); setContactMenuOpen(false); setVoiceBlob(null); setVoicePreviewUrl(null); setError('');
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

  const openContactProfile = () => { if (contact?.username) navigate(pathForProfile(contact.username)); };
  const toggleMute = async () => { if (!selectedId) return; try { if (muted) await unmuteConversation(selectedId); else await muteConversation(selectedId); await refreshConversations(true); setContactMenuOpen(false); } catch (err) { setError(err instanceof Error ? err.message : 'Could not update conversation mute setting.'); } };
  const handleBlock = async () => { if (!contact?.id || !window.confirm(`Block @${contact.username}? They will no longer be able to message you.`)) return; try { await blockUser(contact.id); setContactMenuOpen(false); setSelectedId(null); setMobileChatOpen(false); await refreshConversations(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not block this user.'); } };
  const handleReport = async () => { if (!contact?.id) return; const details = window.prompt('Tell us what happened (optional).'); if (details === null) return; try { await reportUser(contact.id, 'OTHER', details.trim() || undefined); setContactMenuOpen(false); setError('Report submitted for review.'); } catch (err) { setError(err instanceof Error ? err.message : 'Could not submit report.'); } };
  const beginVoiceRecording = async () => { if (recording || voiceSending) return; if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('Voice recording is not supported in this browser.'); return; } try { const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); streamRef.current = stream; voiceChunksRef.current = []; const mime = ['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(type => MediaRecorder.isTypeSupported(type)); const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); recorderRef.current = recorder; recorder.ondataavailable = event => { if (event.data.size) voiceChunksRef.current.push(event.data); }; recorder.onstop = () => { const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || 'audio/webm' }); if (blob.size) { setVoiceBlob(blob); const url = URL.createObjectURL(blob); setVoicePreviewUrl(url); } stream.getTracks().forEach(track => track.stop()); streamRef.current = null; setRecording(false); if (recordTimerRef.current) window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; }; recorder.start(500); setRecording(true); setRecordSeconds(0); recordTimerRef.current = window.setInterval(() => setRecordSeconds(seconds => { if (seconds >= 119) { recorderRef.current?.stop(); return 120; } return seconds + 1; }), 1000); } catch { setError('Microphone access was denied or unavailable. Allow microphone permission and try again.'); } };
  const stopVoiceRecording = () => { if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop(); };
  const cancelVoiceRecording = () => { if (recorderRef.current && recorderRef.current.state !== 'inactive') { recorderRef.current.ondataavailable = null; recorderRef.current.onstop = null; recorderRef.current.stop(); } streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; setRecording(false); setVoiceBlob(null); if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl); setVoicePreviewUrl(null); if (recordTimerRef.current) window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; };
  const sendVoice = async () => { if (!selectedId || !voiceBlob || voiceSending) return; setVoiceSending(true); setError(''); try { const result = await sendVoiceMessage(selectedId, voiceBlob, crypto.randomUUID()); setMessages(current => current.some(message => message.id === result.message.id) ? current : [...current, result.message]); cancelVoiceRecording(); void refreshConversations(true); } catch (err) { setError(err instanceof Error ? err.message : 'Voice message upload failed.'); } finally { setVoiceSending(false); } };
  useEffect(() => () => { streamRef.current?.getTracks().forEach(track => track.stop()); if (recordTimerRef.current) window.clearInterval(recordTimerRef.current); if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl); }, [voicePreviewUrl]);
  const formatDuration = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  return <div className={`messages-page card instagram-messages${mobileChatOpen ? ' mobile-chat-open' : ''}`}>
    <aside className="conversation-list" aria-label="Messages inbox">
      <header className="conversation-list-header"><div><h1>Messages</h1><span className="inbox-subtitle">Your campus conversations</span></div><button className="new-message-btn" onClick={() => setNewChatOpen(open => !open)} title="New message" aria-label="New message"><Plus size={19}/></button></header>
      <label className="message-search"><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations"/><button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X size={15}/></button></label>
      {newChatOpen && <form className="new-chat-form" onSubmit={createChat}><input value={newUsername} onChange={event => setNewUsername(event.target.value)} placeholder="Student username" autoFocus/><button type="submit" disabled={!newUsername.trim()}>Start</button></form>}
      {error && <div className="messages-error" role="alert">{error}</div>}
      <div className="conversation-items">
        {loadingList && conversations.length === 0 && <div className="inbox-skeleton" aria-label="Loading conversations">{Array.from({length:4},(_,i)=><div className="inbox-skeleton-row" key={i}><span className="skeleton skeleton-avatar"/><span className="skeleton skeleton-line"/><span className="skeleton skeleton-time"/></div>)}</div>}
        {!loadingList && conversations.length === 0 && <div className="inbox-empty"><MessageCircle size={25}/><strong>Your messages are waiting</strong><span>Start a conversation with a student from Explore.</span><button onClick={() => setNewChatOpen(true)}>New message</button></div>}
        {filtered.map(item => { const student = item.participants[0]; const title = personName(student); const last = item.lastMessage; const isMine = Boolean(last && item.participants.every(p => p.id !== last.senderId)); return <button className={`conversation ig-conversation${selectedId === item.id ? ' selected' : ''}`} key={item.id} onClick={() => openConversation(item.id)}>
          <Avatar initials={initials(title)} image={student?.profile?.photoUrl ?? undefined}/><span className="conversation-details"><strong>{title}</strong><small>{last ? `${isMine ? 'You: ' : ''}${last.content}` : 'Start a conversation'}</small></span><span className="conversation-meta"><small>{timeLabel(last?.createdAt ?? item.updatedAt)}</small>{item.unreadCount > 0 && <b>{item.unreadCount}</b>}</span>
        </button>})}
        {!loadingList && filtered.length === 0 && conversations.length > 0 && <div className="conversation-empty">No conversations found.</div>}
      </div>
    </aside>
    <section className="chat-active" aria-label={contact ? `Conversation with ${personName(contact)}` : 'Conversation'}>
      {!selected ? <div className="instagram-chat-welcome"><div className="welcome-icon"><Send size={28}/></div><h2>Your messages</h2><p>Connect with classmates and keep conversations going.</p><button onClick={() => setNewChatOpen(true)}>Send a message</button></div> : <>
        <header className="chat-head ig-chat-head"><button className="chat-back" onClick={back} aria-label="Back to inbox"><ChevronRight size={19}/></button><button className="chat-contact-profile" type="button" onClick={openContactProfile} title="View profile"><Avatar initials={initials(personName(contact))} image={contact?.profile?.photoUrl ?? undefined}/><div className="chat-contact"><strong>{personName(contact)}</strong><small>@{contact?.username}</small></div></button><button className="chat-contact-menu-trigger" onClick={()=>setContactMenuOpen(open=>!open)} aria-label="Conversation options"><MoreHorizontal size={19}/></button></header>{contactMenuOpen&&<div className="conversation-contact-menu"><button onClick={openContactProfile}><UserRound size={16}/> View profile</button><button onClick={toggleMute}><VolumeX size={16}/> {muted?'Unmute conversation':'Mute conversation'}</button><button onClick={handleReport}><Flag size={16}/> Report user</button><button className="danger" onClick={handleBlock}><ShieldBan size={16}/> Block user</button></div>}
        <div className="chat-scroll ig-chat-scroll" ref={scrollRef} aria-live="polite">
          <div className="chat-profile-intro"><Avatar initials={initials(personName(contact))} image={contact?.profile?.photoUrl ?? undefined}/><strong>{personName(contact)}</strong><span>@{contact?.username}</span><p>CampusLink · University community</p></div>
          {loadingMessages && messages.length === 0 && <div className="chat-skeleton" aria-label="Loading messages">{Array.from({length:5},(_,i)=><span className={`skeleton skeleton-message ${i%2?'right':'left'}`} key={i}/> )}</div>}
          {messages.map(message => { const mine = selected.participants.length > 0 && !selected.participants.some(p => p.id === message.senderId); const audioAttachment = message.attachments?.find(attachment => attachment.mediaType.startsWith('audio/')); return <div className={`ig-message-row${mine ? ' mine' : ''}`} key={message.id}><div className="chat-bubble ig-bubble">{audioAttachment ? <div className="voice-message"><audio controls preload="metadata" src={audioAttachment.url}/><span>Voice message</span></div> : message.content}<span className="chat-time">{timeLabel(message.createdAt)}</span>{mine && <span className={`message-receipt${message.readAt ? ' seen' : message.deliveredAt ? ' delivered' : ''}`}>{message.readAt ? 'Seen' : message.deliveredAt ? 'Delivered' : 'Sent'}</span>}</div></div>; })}
          {!loadingMessages && messages.length === 0 && <div className="chat-empty-state"><b>Say hello to {personName(contact)}</b><span>You're connected. Start your conversation.</span></div>}
        </div>
        <form className="chat-send ig-chat-send" onSubmit={submitMessage}>{voiceBlob&&voicePreviewUrl?<div className="voice-preview"><audio controls src={voicePreviewUrl}/><span>{formatDuration(recordSeconds)}</span><button type="button" onClick={cancelVoiceRecording} aria-label="Discard recording"><X size={16}/></button><button type="button" onClick={sendVoice} disabled={voiceSending}>{voiceSending?'Uploading…':'Send voice'}</button></div>:recording?<div className="voice-recording-controls"><span className="recording-dot"/><b>{formatDuration(recordSeconds)}</b><span>Recording voice message</span><button type="button" onClick={cancelVoiceRecording} aria-label="Cancel recording"><X size={17}/></button><button type="button" onClick={stopVoiceRecording} aria-label="Stop recording"><Square size={16}/></button></div>:<><input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Message…" aria-label="Write a message" autoComplete="off"/><button type="button" className="voice-record-button" onClick={beginVoiceRecording} aria-label="Record voice message"><Mic size={17}/></button><button type="submit" aria-label="Send message" disabled={!draft.trim() || sending}>{sending ? "Sending…" : <Send size={17}/>}</button></>}</form>
      </>}
    </section>
  </div>;
}
