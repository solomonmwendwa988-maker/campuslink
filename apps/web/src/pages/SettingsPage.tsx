import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bell, Camera, Check, ChevronRight, CircleHelp, LockKeyhole, Moon, Shield, Sun, Trash2, Upload, UserRound, Search, VolumeX, RefreshCw, X } from 'lucide-react';
import { StudentProfile } from './CorePages';
import { launchUniversity } from '../data/universities';
import { useTheme } from '../app/providers/ThemeProvider';
import { optimizeImage } from '../services/imageProcessing';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { getBlockedUsers, getMutedUsers, unblockUser, unmuteAccount, getSessions, revokeSession, changePassword, type SafetyAccount } from '../services/api';

type ThemeMode = 'light' | 'dark' | 'system';
type SettingsProps = {
  profile: StudentProfile;
  onSaveProfile: (profile: StudentProfile) => void | Promise<void>;
  dark?: boolean;
  setDark?: (value: boolean) => void;
  preferences: Record<string, boolean>;
  setPreferences: (value: Record<string, boolean>) => void;
  onLogout: () => void;
  onReset: () => void;
};

const preferencesList = [
  ['showUniversity', 'University', 'Show your university on your public profile'],
  ['showCourse', 'Course or program', 'Show your course on your public profile'],
  ['showYear', 'Year of study', 'Show your year on your public profile'],
  ['showInterests', 'Interests and skills', 'Show your interests and skills publicly'],
  ['messages', 'Messages', 'Allow other students to start a conversation'],
  ['Likes', 'Likes', 'Get notified when students like your posts'],
  ['Comments', 'Comments', 'Get notified about comments on your posts'],
  ['Follows', 'Follows', 'Get notified when students follow you'],
  ['Events', 'Events', 'Get notified about campus events'],
];

function AccountSafetyPanel() {
  const [tab, setTab] = useState<'blocked' | 'muted'>('blocked');
  const [blocked, setBlocked] = useState<SafetyAccount[]>([]);
  const [muted, setMuted] = useState<SafetyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [confirm, setConfirm] = useState<{ type: 'unblock' | 'unmute'; account: SafetyAccount } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const load = async () => {
    setLoading(true); setError('');
    try { const [blockedResult, mutedResult] = await Promise.all([getBlockedUsers(), getMutedUsers()]); setBlocked(blockedResult.data ?? []); setMuted(mutedResult.data ?? []); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load account controls.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const list = tab === 'blocked' ? blocked : muted;
  const filtered = list.filter(account => { const q = query.trim().toLowerCase(); return !q || account.username.toLowerCase().includes(q) || (account.profile?.fullName ?? '').toLowerCase().includes(q); });
  const confirmAction = async () => { if (!confirm) return; setActionBusy(true); setBusyId(confirm.account.id); try { if (confirm.type === 'unblock') await unblockUser(confirm.account.id); else await unmuteAccount(confirm.account.id); setConfirm(null); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'The action could not be completed.'); } finally { setActionBusy(false); setBusyId(null); } };
  return <section className="settings-safety-panel" aria-label="Blocked and muted account management">
    <div className="settings-safety-head"><div className="settings-safety-icon"><Shield size={21}/></div><div><h3>Account boundaries</h3><p>Control whose content and interactions you want to see on CampusLink.</p></div></div>
    <div className="settings-safety-tabs" role="tablist" aria-label="Account controls"><button type="button" role="tab" aria-selected={tab==='blocked'} className={tab==='blocked'?'active':''} onClick={()=>{setTab('blocked');setQuery('')}}><Shield size={16}/> Blocked <span>{blocked.length}</span></button><button type="button" role="tab" aria-selected={tab==='muted'} className={tab==='muted'?'active':''} onClick={()=>{setTab('muted');setQuery('')}}><VolumeX size={16}/> Muted <span>{muted.length}</span></button></div>
    <label className="settings-safety-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search ${tab} accounts`} aria-label={`Search ${tab} accounts`}/>{query&&<button type="button" aria-label="Clear search" onClick={()=>setQuery('')}><X size={15}/></button>}</label>
    {error&&<div className="settings-safety-error" role="alert"><span>{error}</span><button type="button" onClick={()=>void load()}><RefreshCw size={14}/>Retry</button></div>}
    {loading?<div className="settings-safety-loading"><span className="settings-safety-spinner"/>Loading account controls…</div>:filtered.length===0?<div className="settings-safety-empty"><div className="settings-safety-empty-icon">{tab==='blocked'?<Shield size={22}/>:<VolumeX size={22}/>}</div><strong>{query?`No ${tab} accounts match your search`:`No ${tab} accounts`}</strong><p>{query?'Try a different name or username.':tab==='blocked'?'Accounts you block will appear here. Blocking prevents interaction and removes follow connections.':'Accounts you mute will appear here. Muting helps curate your feed without blocking someone.'}</p>{query&&<button type="button" className="settings-safety-clear" onClick={()=>setQuery('')}>Clear search</button>}</div>:<div className="settings-safety-list">{filtered.map(account=><article className="settings-safety-user" key={account.id}><div className="settings-safety-avatar">{account.profile?.photoUrl?<img src={account.profile.photoUrl} alt=""/>:<UserRound size={19}/>}</div><div className="settings-safety-user-copy"><strong>{account.profile?.fullName || account.username}</strong><span>@{account.username}</span><small>{tab==='blocked'?'Blocked account':'Muted account'}</small></div><button className={tab==='blocked'?'settings-safety-action unblock':'settings-safety-action unmute'} type="button" disabled={busyId===account.id} onClick={()=>setConfirm({type:tab==='blocked'?'unblock':'unmute',account})}>{tab==='blocked'?<UserRound size={15}/>:<VolumeX size={15}/>}<span>{busyId===account.id?'Working…':tab==='blocked'?'Unblock':'Unmute'}</span></button></article>)}</div>}
    <div className="settings-safety-foot"><span>Changes are saved to your account.</span><button type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/>Refresh</button></div>
    <ConfirmDialog open={Boolean(confirm)} title={confirm?.type==='unblock'?'Unblock this account?':'Unmute this account?'} description={confirm?.type==='unblock'?`@${confirm?.account.username} can interact with you again, subject to your privacy settings.`:`@${confirm?.account.username}'s content and activity can appear again.`} confirmLabel={confirm?.type==='unblock'?'Unblock account':'Unmute account'} tone="primary" busy={actionBusy} onCancel={()=>setConfirm(null)} onConfirm={confirmAction}/>
  </section>;
}

type SecuritySession = { id: string; createdAt: string; expiresAt: string; userAgent?: string | null };
function AccountSecurityPanel() {
  const [sessions, setSessions] = useState<SecuritySession[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [revokeTarget, setRevokeTarget] = useState<SecuritySession|null>(null); const [revokeBusy, setRevokeBusy] = useState(false); const [pw, setPw] = useState({ current: '', next: '', confirm: '' }); const [pwBusy, setPwBusy] = useState(false); const [pwMessage, setPwMessage] = useState('');
  const load = async () => { setLoading(true); setError(''); try { const result = await getSessions() as { data: SecuritySession[] }; setSessions(result.data ?? []); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load sessions.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const submitPassword = async (event: FormEvent) => { event.preventDefault(); setPwMessage(''); if (pw.next.length < 8) { setPwMessage('New password must be at least 8 characters.'); return; } if (pw.next !== pw.confirm) { setPwMessage('New passwords do not match.'); return; } setPwBusy(true); try { await changePassword({ currentPassword: pw.current, newPassword: pw.next }); setPw({ current: '', next: '', confirm: '' }); setPwMessage('Password changed. All active sessions were revoked—please sign in again.'); } catch (e) { setPwMessage(e instanceof Error ? e.message : 'Password change failed.'); } finally { setPwBusy(false); } };
  const revoke = async () => { if (!revokeTarget) return; setRevokeBusy(true); try { await revokeSession(revokeTarget.id); setRevokeTarget(null); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not revoke session.'); } finally { setRevokeBusy(false); } };
  const deviceLabel = (agent?: string|null) => { if (!agent) return 'Unknown device'; if (/android/i.test(agent)) return 'Android device'; if (/iphone|ipad/i.test(agent)) return 'Apple mobile device'; if (/windows/i.test(agent)) return 'Windows device'; if (/mac/i.test(agent)) return 'Mac device'; if (/linux/i.test(agent)) return 'Linux device'; return agent.slice(0,110); };
  return <div className="settings-security-upgrade"><form className="settings-password-form" onSubmit={submitPassword}><h3>Change password</h3><p>Use a unique password that you do not reuse on other sites.</p><label>Current password<input type="password" autoComplete="current-password" value={pw.current} onChange={e=>setPw({...pw,current:e.target.value})} required/></label><label>New password<input type="password" autoComplete="new-password" value={pw.next} onChange={e=>setPw({...pw,next:e.target.value})} minLength={8} required/></label><label>Confirm new password<input type="password" autoComplete="new-password" value={pw.confirm} onChange={e=>setPw({...pw,confirm:e.target.value})} minLength={8} required/></label><button className="primary-btn small" type="submit" disabled={pwBusy}>{pwBusy?'Updating…':'Update password'}</button>{pwMessage&&<p className="settings-security-feedback" role="status">{pwMessage}</p>}</form><div className="settings-session-panel"><div className="settings-session-head"><div><h3>Active sessions</h3><p>Revoke access from devices you no longer use.</p></div><button type="button" onClick={()=>void load()} disabled={loading} aria-label="Refresh sessions"><RefreshCw size={15}/></button></div>{error&&<p className="settings-safety-error-text">{error}</p>}{loading?<div className="settings-safety-loading"><span className="settings-safety-spinner"/>Loading sessions…</div>:sessions.length===0?<div className="settings-safety-empty"><strong>No active sessions found</strong><p>Sign-in sessions will appear here when available.</p></div>:<div className="settings-session-list">{sessions.map(session=><article className="settings-session-item" key={session.id}><div className="settings-session-device"><LockKeyhole size={17}/></div><div className="settings-session-copy"><strong>{deviceLabel(session.userAgent)}</strong><small>Started {new Date(session.createdAt).toLocaleString()}</small><small>Expires {new Date(session.expiresAt).toLocaleDateString()}</small></div><button type="button" onClick={()=>setRevokeTarget(session)} className="settings-session-revoke">Revoke</button></article>)}</div>}</div><ConfirmDialog open={Boolean(revokeTarget)} title="Revoke this session?" description="This device will need to sign in again before it can access your CampusLink account." confirmLabel="Revoke session" tone="danger" busy={revokeBusy} onCancel={()=>setRevokeTarget(null)} onConfirm={revoke}/></div>;
}

export function SettingsPage({ profile, onSaveProfile, preferences, setPreferences, onLogout, onReset }: SettingsProps) {
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const photoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const cameraPhotoInput = useRef<HTMLInputElement>(null);
  const cameraCoverInput = useRef<HTMLInputElement>(null);

  const updatePhoto = (kind: 'avatarImage' | 'coverImage', file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 4_000_000) {
      setFeedback('Choose an image file smaller than 4 MB.');
      return;
    }
    setFeedback('Preparing your image…');
    void optimizeImage(file).then(dataUrl => {
      setDraft(current => ({ ...current, [kind]: dataUrl, ...(kind === 'avatarImage' ? { avatarCrop: 50 } : {}) }));
      setFeedback('Image ready to preview. Save profile to apply it.');
    }).catch(error => setFeedback(error instanceof Error ? error.message : 'Could not prepare that image.'));
  };
  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !/^@?[a-zA-Z0-9._]{3,20}$/.test(draft.username)) {
      setFeedback('Enter your name and a valid 3–20 character username.');
      return;
    }
    try {
      await onSaveProfile({ ...draft, university: launchUniversity.name });
      setSaved(true);
      setFeedback('Profile changes saved to your account.');
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      setSaved(false);
      setFeedback(error instanceof Error ? error.message : 'Could not save your profile.');
    }
  };
  const isPreferenceEnabled = (key: string) => preferences[key] ?? !key.startsWith('show');
  const toggle = (key: string) => setPreferences({ ...preferences, [key]: !isPreferenceEnabled(key) });
  const previewNotificationSound = () => {
    try {
      const AudioContextCtor = window.AudioContext;
      const context = new AudioContextCtor();
      const oscillator = context.createOscillator(); const gain = context.createGain();
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(880, context.currentTime); oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.12);
      gain.gain.setValueAtTime(0.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.19); oscillator.onended = () => void context.close();
    } catch { /* Sound preview may be unavailable on this browser/device. */ }
  };
  const requestDesktopNotificationPermission = async () => {
    if (!('Notification' in window)) { setFeedback('This browser does not support desktop notifications.'); return false; }
    const permission = await Notification.requestPermission(); setNotificationPermission(permission);
    if (permission === 'granted') { setPreferences({ ...preferences, desktopNotifications: true }); setFeedback('Desktop notifications enabled. They appear while CampusLink is open.'); return true; }
    setPreferences({ ...preferences, desktopNotifications: false }); setFeedback('Notification permission was not granted.'); return false;
  };
  const toggleDesktopNotifications = async () => {
    if (preferences.desktopNotifications) { setPreferences({ ...preferences, desktopNotifications: false }); setFeedback('Desktop notifications turned off.'); return; }
    if (notificationPermission === 'granted') { setPreferences({ ...preferences, desktopNotifications: true }); setFeedback('Desktop notifications enabled.'); return; }
    await requestDesktopNotificationPermission();
  };
  const addPhotoButtons = (kind: 'avatarImage' | 'coverImage') => {
    const input = kind === 'avatarImage' ? photoInput : coverInput;
    const cameraInput = kind === 'avatarImage' ? cameraPhotoInput : cameraCoverInput;
    const image = kind === 'avatarImage' ? draft.avatarImage : draft.coverImage;
    return <div className={`settings-photo-tools ${kind === 'coverImage' ? 'cover-tools' : ''}`}>
      {image ? <img className={kind === 'avatarImage' ? 'settings-avatar-preview' : 'settings-cover-preview'} src={image} alt={kind === 'avatarImage' ? 'Profile photo preview' : 'Cover photo preview'} style={kind === 'avatarImage' ? { objectPosition: `${draft.avatarCrop ?? 50}% center` } : undefined}/> : <span className={kind === 'avatarImage' ? 'settings-avatar-placeholder' : 'settings-cover-placeholder'}>{kind === 'avatarImage' ? <UserRound size={22}/> : 'No cover photo selected'}</span>}
      <div><b>{kind === 'avatarImage' ? 'Profile photo' : 'Cover image'}</b><small>Optional · saved to your CampusLink profile</small><div className="settings-photo-actions"><button type="button" onClick={() => input.current?.click()}><Upload size={14}/>{image ? 'Replace' : 'Choose image'}</button><button type="button" onClick={() => cameraInput.current?.click()}><Camera size={14}/>Camera</button>{image && <button type="button" onClick={() => setDraft(current => ({ ...current, [kind]: undefined }))}>Remove</button>}</div></div>
      <input ref={input} className="visually-hidden-input" type="file" accept="image/*" onChange={event => updatePhoto(kind, event.target.files?.[0])}/>
      <input ref={cameraInput} className="visually-hidden-input" type="file" accept="image/*" capture="user" onChange={event => updatePhoto(kind, event.target.files?.[0])}/>
      {kind === 'avatarImage' && image && <label className="crop-control">Reposition <input aria-label="Reposition profile image" type="range" min="0" max="100" value={draft.avatarCrop ?? 50} onChange={event => setDraft(current => ({ ...current, avatarCrop: Number(event.target.value) }))}/></label>}
    </div>;
  };

  return <>
    <div className="page-heading"><div><p className="eyebrow">YOUR CAMPUSLINK ACCOUNT</p><h1>Settings</h1><p className="muted">Manage your profile, privacy and preferences.</p></div></div>
    {feedback && <p className="settings-feedback" role="status">{feedback}</p>}
    <div className="settings-layout settings-layout-v2">
      <nav className="settings-nav" aria-label="Settings sections"><a href="#settings-profile">Profile</a><a href="#settings-privacy">Privacy</a><a href="#settings-notifications">Notifications</a><a href="#settings-appearance">Appearance</a><a href="#settings-security">Security</a><a href="#settings-help">Help &amp; legal</a><a href="#settings-account">Account</a></nav>
      <div className="settings-sections">
        <form className="card settings-card" id="settings-profile" onSubmit={saveProfile}>
          <h2><UserRound size={18}/> Profile</h2><p>Only details you choose to show are visible on your public profile.</p>
          {addPhotoButtons('avatarImage')}{addPhotoButtons('coverImage')}
          <div className="settings-form-grid">
            <label className="settings-field">Full name<input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} required maxLength={70}/></label>
            <label className="settings-field">Username<input value={draft.username} onChange={event => setDraft({ ...draft, username: event.target.value })} required maxLength={20}/></label>
            <label className="settings-field">Email<input type="email" value={draft.email ?? ''} onChange={event => setDraft({ ...draft, email: event.target.value })} placeholder="Add an email address"/></label>
            <label className="settings-field">University<input value={launchUniversity.name} readOnly/></label>
            <label className="settings-field">Campus<input value={draft.campus} onChange={event => setDraft({ ...draft, campus: event.target.value })} required/></label>
            <label className="settings-field">Course or program<input value={draft.course} onChange={event => setDraft({ ...draft, course: event.target.value })} required/></label>
            <label className="settings-field">Year of study<select value={draft.year} onChange={event => setDraft({ ...draft, year: event.target.value })}><option value="">Select year</option>{['1','2','3','4','5','6'].map(year => <option key={year} value={year}>Year {year}</option>)}</select></label>
            <label className="settings-field">Bio<textarea rows={3} maxLength={180} value={draft.bio} onChange={event => setDraft({ ...draft, bio: event.target.value })}/></label>
            <label className="settings-field">Interests<input value={draft.interests.join(', ')} onChange={event => setDraft({ ...draft, interests: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} placeholder="Comma separated"/></label>
            <label className="settings-field">Skills<input value={(draft.skills ?? []).join(', ')} onChange={event => setDraft({ ...draft, skills: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} placeholder="Comma separated"/></label>
          </div>
          <button className="primary-btn" type="submit">{saved ? <><Check size={15}/> Saved</> : 'Save profile'}</button>
        </form>

        <section className="card settings-card" id="settings-privacy"><h2><Shield size={18}/> Privacy &amp; messages</h2><p>Choose what appears publicly and who can contact you.</p>
          <label className="settings-toggle"><span><b>Profile visibility</b><small>Make your profile visible to campus students</small></span><select value={draft.visibility} onChange={event => { const next = { ...draft, visibility: event.target.value as StudentProfile['visibility'] }; setDraft(next); void Promise.resolve(onSaveProfile(next)).then(() => setFeedback('Privacy setting saved.')).catch(error => setFeedback(error instanceof Error ? error.message : 'Could not save privacy setting.')); }}><option>Public</option><option>Private</option></select></label>
          {preferencesList.slice(0, 5).map(([key, title, detail]) => <label className="settings-toggle" key={key}><span><b>{title}</b><small>{detail}</small></span><input type="checkbox" checked={isPreferenceEnabled(key)} onChange={() => toggle(key)}/></label>)}
          <AccountSafetyPanel/>
        </section>

        <section className="card settings-card" id="settings-notifications"><h2><Bell size={18}/> Notifications</h2><p>Choose which activity appears in your notifications. Preferences save automatically on this device.</p>{preferencesList.slice(5).map(([key, title, detail]) => <label className="settings-toggle" key={key}><span><b>{title}</b><small>{detail}</small></span><input type="checkbox" checked={isPreferenceEnabled(key)} onChange={() => toggle(key)}/></label>)}<label className="settings-toggle"><span><b>Message alerts</b><small>Show notifications for new direct messages</small></span><input type="checkbox" checked={preferences.messageNotifications !== false} onChange={() => toggle('messageNotifications')}/></label><label className="settings-toggle"><span><b>Notification sound</b><small>Play a soft sound when new activity arrives in CampusLink</small></span><input type="checkbox" checked={preferences.notificationSound !== false} onChange={() => { const enabled = preferences.notificationSound === false; toggle('notificationSound'); if (enabled) previewNotificationSound(); }}/></label><label className="settings-toggle"><span><b>Desktop notifications</b><small>Browser alerts for new activity while CampusLink is open · Permission: {notificationPermission}</small></span><input type="checkbox" checked={Boolean(preferences.desktopNotifications)} onChange={() => void toggleDesktopNotifications()} disabled={notificationPermission === 'denied' || notificationPermission === 'unsupported'}/></label><p className="settings-notice">Desktop notifications are not background push notifications. Browser push requires additional server configuration.</p></section>

        <section className="card settings-card" id="settings-appearance"><h2><Sun size={18}/> Appearance</h2><p>Choose a theme. System follows your device preference.</p><div className="theme-choice-row">{(['light','dark','system'] as ThemeMode[]).map(mode => <button type="button" key={mode} className={themeMode === mode ? 'selected' : ''} onClick={() => setThemeMode(mode)}>{mode === 'dark' ? <Moon size={17}/> : mode === 'light' ? <Sun size={17}/> : <span className="system-theme-icon">◐</span>}{mode === 'system' ? 'System' : mode[0].toUpperCase() + mode.slice(1)}</button>)}</div></section>

        <section className="card settings-card" id="settings-security"><h2><LockKeyhole size={18}/> Security &amp; sessions</h2><p>Protect your account, update your password, and review signed-in devices.</p><AccountSecurityPanel/></section>

        <section className="card settings-card" id="settings-help"><h2><CircleHelp size={18}/> Help &amp; legal</h2><a className="settings-link-row" href="mailto:support@campuslink.ke?subject=CampusLink%20support">Help center &amp; support <ChevronRight size={16}/></a><a className="settings-link-row" href="mailto:feedback@campuslink.ke?subject=CampusLink%20feedback">Send feedback <ChevronRight size={16}/></a><details className="settings-legal"><summary>Privacy policy &amp; terms <ChevronRight size={16}/></summary><p>CampusLink is currently a frontend preview for University of Kabianga. Profile, post and preference data may be saved in this browser. Do not enter sensitive information. Authentication, account deletion, email, notifications and messaging are not connected to a production service. These preview notes are not a substitute for published legal terms.</p></details><div className="settings-app-info">CampusLink · Connect. Discover. Trade. Grow. <small>University of Kabianga preview · 0.1.0</small></div></section>

        <section className="card settings-card settings-account-card" id="settings-account"><h2>Account</h2><p>These actions only affect this local preview.</p><button className="outline-btn" type="button" onClick={onLogout}>Log out</button><button className="danger-button" type="button" onClick={() => setResetDialogOpen(true)}><Trash2 size={14}/> Delete preview data</button></section>
      </div>
    </div>
    <ConfirmDialog open={resetDialogOpen} title="Delete local preview data?" description="This removes CampusLink preview data saved in this browser. This action cannot be undone." confirmLabel="Delete data" tone="danger" onCancel={() => setResetDialogOpen(false)} onConfirm={() => { setResetDialogOpen(false); onReset(); }}/>
  </>;
}


