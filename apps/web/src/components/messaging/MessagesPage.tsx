import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Plus, Search, Send, MessageCircle, X, Mic, Square, MoreHorizontal, UserRound, VolumeX, ShieldBan, Flag } from 'lucide-react';
import { Avatar } from '../shared/Avatar';
import { ApiConversation, ApiMessage, listConversations, getConversationMessages, sendConversationMessage, markConversationRead, startConversation, sendVoiceMessage, blockUser, reportUser, muteConversation, unmuteConversation, getPresence, setConversationTyping, getConversationTyping } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { pathForProfile } from '../../app/router/routes';
import { ConfirmDialog, ReportDialog } from '../shared/ConfirmDialog';


function personName(person?: ApiConversation['participants'][number]) {
  return person?.profile?.fullName?.trim() || person?.username || 'Student';
}
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || 'S';
}
const INBOX_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
function inboxCacheKey(scope?: string) {
  const normalized = (scope ?? '').trim().toLowerCase();
  return normalized ? `campuslink:inbox:v2:${normalized}` : null;
}
function readInboxCache(scope?: string): ApiConversation[] {
  const key = inboxCacheKey(scope);
  if (!key || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const cache = JSON.parse(raw) as { savedAt?: number; data?: ApiConversation[] };
    if (!Array.isArray(cache.data) || !cache.savedAt || Date.now() - cache.savedAt > INBOX_CACHE_TTL) {
      window.localStorage.removeItem(key);
      return [];
    }
    return cache.data;
  } catch { return []; }
}
function writeInboxCache(scope: string | undefined, data: ApiConversation[]) {
  const key = inboxCacheKey(scope);
  if (!key || typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data })); } catch { /* Storage may be full or disabled; inbox remains usable. */ }
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

export function MessagesPage({ initialUsername, onInitialHandled, cacheScope }: { initialUsername?: string; onInitialHandled?: () => void; cacheScope?: string }) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ApiConversation[]>(() => readInboxCache(cacheScope));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [loadingList, setLoadingList] = useState(() => readInboxCache(cacheScope).length === 0);
  const inboxRequestVersion = useRef(0);
  const conversationsRef = useRef(conversations);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  const [inboxError, setInboxError] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [voiceSending, setVoiceSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  
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
    const requestVersion = ++inboxRequestVersion.current;
    const hasCachedData = conversationsRef.current.length > 0;
    if (!quiet && !hasCachedData) { setLoadingList(true); setInboxError(''); }
    let timeoutId: number | undefined;
    const controller = new AbortController();
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        controller.abort();
        reject(new Error('INBOX_REQUEST_TIMEOUT'));
      }, 9000);
    });
    try {
      // Race the fetch against a hard timeout. Abort alone is not enough on some
      // mobile browsers/proxies, which may leave a request pending indefinitely.
      const result = await Promise.race([listConversations(controller.signal), timeout]);
      if (requestVersion !== inboxRequestVersion.current) return;
      const fresh = Array.isArray(result.data) ? result.data : [];
      setConversations(fresh);
      writeInboxCache(cacheScope, fresh);
      setSelectedId(current => current && fresh.some(item => item.id === current) ? current : null);
      setError(''); setInboxError('');
    } catch (err) {
      if (requestVersion !== inboxRequestVersion.current) return;
      const message = err instanceof Error && err.message === 'INBOX_REQUEST_TIMEOUT'
        ? 'CampusLink could not reach the inbox in time. Your saved conversations are kept; retry when your connection is ready.'
        : err instanceof Error ? err.message : 'Could not refresh conversations.';
      if (!quiet || hasCachedData) { setInboxError(message); setError(''); }
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (requestVersion === inboxRequestVersion.current && !quiet) setLoadingList(false);
    }
  }, [cacheScope]);

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
  useEffect(() => {
    const ids = conversations.flatMap(item => item.participants.map(participant => participant.id));
    if (!ids.length) { setOnlineUsers(new Set()); return; }
    let cancelled = false;
    const poll = () => { if (document.visibilityState !== 'visible') return; void getPresence(ids).then(result => { if (!cancelled) setOnlineUsers(new Set(result.data.filter(status => status.online).map(status => status.userId))); }).catch(() => undefined); };
    poll(); const timer = window.setInterval(poll, 15000); return () => { cancelled = true; window.clearInterval(timer); };
  }, [conversations]);
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
  useEffect(() => {
    if (!selectedId || !contact?.id) { setTypingUsers(new Set()); return; }
    let cancelled = false;
    const poll = () => { if (document.visibilityState !== 'visible') return; void getConversationTyping(selectedId).then(result => { if (!cancelled) setTypingUsers(new Set(result.userIds)); }).catch(() => undefined); };
    poll(); const timer = window.setInterval(poll, 1500); return () => { cancelled = true; window.clearInterval(timer); setTypingUsers(new Set()); };
  }, [selectedId, contact?.id]);
  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!selectedId) return;
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    if (value.trim()) {
      void setConversationTyping(selectedId, true).catch(() => undefined);
      typingTimerRef.current = window.setTimeout(() => { void setConversationTyping(selectedId, false).catch(() => undefined); typingTimerRef.current = null; }, 4000);
    } else {
      void setConversationTyping(selectedId, false).catch(() => undefined);
      typingTimerRef.current = null;
    }
  };
  useEffect(() => () => {
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    if (selectedId) void setConversationTyping(selectedId, false).catch(() => undefined);
  }, [selectedId]);

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
      handleDraftChange(''); void refreshConversations(true);
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
  const handleBlock = () => { if (contact?.id) setBlockDialogOpen(true); };
  const confirmBlock = async () => { if (!contact?.id) return; setDialogBusy(true); try { await blockUser(contact.id); setBlockDialogOpen(false); setContactMenuOpen(false); setSelectedId(null); setMobileChatOpen(false); await refreshConversations(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not block this user.'); } finally { setDialogBusy(false); } };
  const handleReport = () => { if (contact?.id) setReportDialogOpen(true); };
  const submitReport = async (details: string) => { if (!contact?.id) return; setDialogBusy(true); try { await reportUser(contact.id, 'OTHER', details || undefined); setReportDialogOpen(false); setContactMenuOpen(false); setError('Report submitted for review.'); } catch (err) { setError(err instanceof Error ? err.message : 'Could not submit report.'); } finally { setDialogBusy(false); } };
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
      {inboxError && conversations.length > 0 && <div className="inbox-stale-notice" role="status"><span>{inboxError}</span><button type="button" onClick={() => void refreshConversations()}>Refresh</button></div>}

      <div className="conversation-items" aria-live="polite">
        {loadingList && conversations.length === 0 && <div className="inbox-loading" role="status"><span className="inbox-loading-spinner"/><strong>Loading conversations</strong><span>Connecting to your inbox…</span></div>}
        {!loadingList && inboxError && conversations.length === 0 && <div className="inbox-load-error" role="alert"><MessageCircle size={24}/><strong>Couldn't load your inbox</strong><span>{inboxError}</span><button type="button" onClick={() => void refreshConversations()}>Try again</button></div>}
        {!loadingList && !inboxError && conversations.length === 0 && <div className="inbox-empty"><MessageCircle size={25}/><strong>Your messages are waiting</strong><span>Start a conversation with a student from Explore.</span><button onClick={() => setNewChatOpen(true)}>New message</button></div>}
        {filtered.map(item => { const student = item.participants[0]; const title = personName(student); const last = item.lastMessage; const isMine = Boolean(last && item.participants.every(p => p.id !== last.senderId)); return <button className={`conversation ig-conversation${selectedId === item.id ? ' selected' : ''}`} key={item.id} onClick={() => openConversation(item.id)}>
          <span className={`conversation-avatar${student && onlineUsers.has(student.id) ? ' is-online' : ''}`}><Avatar initials={initials(title)} image={student?.profile?.photoUrl ?? undefined}/>{student && onlineUsers.has(student.id) && <i aria-label="Online" title="Online"/>}</span><span className="conversation-details"><strong>{title}</strong><small>{last ? `${isMine ? 'You: ' : ''}${last.content}` : 'Start a conversation'}</small></span><span className="conversation-meta"><small>{timeLabel(last?.createdAt ?? item.updatedAt)}</small>{item.unreadCount > 0 && <b>{item.unreadCount}</b>}</span>
        </button>})}
        {!loadingList && filtered.length === 0 && conversations.length > 0 && <div className="conversation-empty">No conversations found.</div>}
      </div>
    </aside>
    <section className="chat-active" aria-label={contact ? `Conversation with ${personName(contact)}` : 'Conversation'}>
      {!selected ? <div className="instagram-chat-welcome"><div className="welcome-icon"><Send size={28}/></div><h2>Your messages</h2><p>Connect with classmates and keep conversations going.</p><button onClick={() => setNewChatOpen(true)}>Send a message</button></div> : <>
        <header className="chat-head ig-chat-head"><button className="chat-back" onClick={back} aria-label="Back to inbox"><ChevronRight size={19}/></button><button className="chat-contact-profile" type="button" onClick={openContactProfile} title="View profile"><Avatar initials={initials(personName(contact))} image={contact?.profile?.photoUrl ?? undefined}/><div className="chat-contact"><strong>{personName(contact)}</strong><small><i className={contact && onlineUsers.has(contact.id) ? 'online' : ''}/>{contact && onlineUsers.has(contact.id) ? 'Online' : `@${contact?.username}`}</small></div></button><button className="chat-contact-menu-trigger" onClick={()=>setContactMenuOpen(open=>!open)} aria-label="Conversation options"><MoreHorizontal size={19}/></button></header>{contactMenuOpen&&<div className="conversation-contact-menu"><button onClick={openContactProfile}><UserRound size={16}/> View profile</button><button onClick={toggleMute}><VolumeX size={16}/> {muted?'Unmute conversation':'Mute conversation'}</button><button onClick={handleReport}><Flag size={16}/> Report user</button><button className="danger" onClick={handleBlock}><ShieldBan size={16}/> Block user</button></div>}
        <div className="chat-scroll ig-chat-scroll" ref={scrollRef} aria-live="polite">
          <div className="chat-profile-intro"><Avatar initials={initials(personName(contact))} image={contact?.profile?.photoUrl ?? undefined}/><strong>{personName(contact)}</strong><span>@{contact?.username}</span><p>CampusLink · University community</p></div>
          {loadingMessages && messages.length === 0 && <div className="chat-skeleton" aria-label="Loading messages">{Array.from({length:5},(_,i)=><span className={`skeleton skeleton-message ${i%2?'right':'left'}`} key={i}/> )}</div>}
          {messages.map(message => { const mine = selected.participants.length > 0 && !selected.participants.some(p => p.id === message.senderId); const audioAttachment = message.attachments?.find(attachment => attachment.mediaType.startsWith('audio/')); return <div className={`ig-message-row${mine ? ' mine' : ''}`} key={message.id}><div className="chat-bubble ig-bubble">{audioAttachment ? <div className="voice-message"><audio controls preload="metadata" src={audioAttachment.url}/><span>Voice message</span></div> : message.content}<span className="chat-time">{timeLabel(message.createdAt)}</span>{mine && <span className={`message-receipt${message.readAt ? ' seen' : message.deliveredAt ? ' delivered' : ''}`}>{message.readAt ? 'Seen' : message.deliveredAt ? 'Delivered' : 'Sent'}</span>}</div></div>; })}
          {!loadingMessages && messages.length === 0 && <div className="chat-empty-state"><b>Say hello to {personName(contact)}</b><span>You're connected. Start your conversation.</span></div>}
          {contact && typingUsers.has(contact.id) && <div className="typing-indicator"><span className="typing-dots"><i/><i/><i/></span><span>{personName(contact)} is typing</span></div>}
        </div>
        <form className="chat-send ig-chat-send" onSubmit={submitMessage}>{voiceBlob&&voicePreviewUrl?<div className="voice-preview"><audio controls src={voicePreviewUrl}/><span>{formatDuration(recordSeconds)}</span><button type="button" onClick={cancelVoiceRecording} aria-label="Discard recording"><X size={16}/></button><button type="button" onClick={sendVoice} disabled={voiceSending}>{voiceSending?'Uploading…':'Send voice'}</button></div>:recording?<div className="voice-recording-controls"><span className="recording-dot"/><b>{formatDuration(recordSeconds)}</b><span>Recording voice message</span><button type="button" onClick={cancelVoiceRecording} aria-label="Cancel recording"><X size={17}/></button><button type="button" onClick={stopVoiceRecording} aria-label="Stop recording"><Square size={16}/></button></div>:<><input value={draft} onChange={event => handleDraftChange(event.target.value)} placeholder="Message…" aria-label="Write a message" autoComplete="off"/><button type="button" className="voice-record-button" onClick={beginVoiceRecording} aria-label="Record voice message"><Mic size={17}/></button><button type="submit" aria-label="Send message" disabled={!draft.trim() || sending}>{sending ? "Sending…" : <Send size={17}/>}</button></>}</form>
      </>}
    </section>
    <ConfirmDialog open={blockDialogOpen} title={`Block @${contact?.username ?? 'user'}?`} description="They will no longer be able to message you." confirmLabel="Block user" tone="danger" busy={dialogBusy} onCancel={() => setBlockDialogOpen(false)} onConfirm={confirmBlock}/>
    <ReportDialog open={reportDialogOpen} username={contact?.username ?? 'user'} busy={dialogBusy} onCancel={() => setReportDialogOpen(false)} onSubmit={submitReport}/>
  </div>;
}
