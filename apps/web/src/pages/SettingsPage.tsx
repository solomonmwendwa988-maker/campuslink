import { FormEvent, useRef, useState } from 'react';
import { Bell, Camera, Check, ChevronRight, CircleHelp, LockKeyhole, Moon, Shield, Sun, Trash2, Upload, UserRound } from 'lucide-react';
import { StudentProfile } from './CorePages';
import { useLocalState } from '../hooks/useLocalState';
import { launchUniversity } from '../data/universities';
import { useTheme } from '../app/providers/ThemeProvider';
import { optimizeImage } from '../services/imageProcessing';

type ThemeMode = 'light' | 'dark' | 'system';
type SettingsProps = {
  profile: StudentProfile;
  onSaveProfile: (profile: StudentProfile) => void;
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

export function SettingsPage({ profile, onSaveProfile, preferences, setPreferences, onLogout, onReset }: SettingsProps) {
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [blocked, setBlocked] = useLocalState<string[]>('blocked-students', []);
  const [muted, setMuted] = useLocalState<string[]>('muted-students', []);
  const [blockDraft, setBlockDraft] = useState('');
  const [muteDraft, setMuteDraft] = useState('');
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
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
  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !/^@?[a-zA-Z0-9._]{3,20}$/.test(draft.username)) {
      setFeedback('Enter your name and a valid 3–20 character username.');
      return;
    }
    onSaveProfile({ ...draft, university: launchUniversity.name });
    setSaved(true);
    setFeedback('Profile changes saved in this browser.');
    window.setTimeout(() => setSaved(false), 1800);
  };
  const isPreferenceEnabled = (key: string) => preferences[key] ?? !key.startsWith('show');
  const toggle = (key: string) => setPreferences({ ...preferences, [key]: !isPreferenceEnabled(key) });
  const addName = (kind: 'blocked' | 'muted') => {
    const value = (kind === 'blocked' ? blockDraft : muteDraft).trim().replace(/^@/, '');
    if (!value) return;
    const setter = kind === 'blocked' ? setBlocked : setMuted;
    setter(current => current.some(name => name.toLowerCase() === value.toLowerCase()) ? current : [...current, value]);
    kind === 'blocked' ? setBlockDraft('') : setMuteDraft('');
  };
  const changePassword = (event: FormEvent) => {
    event.preventDefault();
    if (!password.current || password.next.length < 8 || password.next !== password.confirm) {
      setFeedback('Enter the current password, a new password of at least 8 characters, and matching confirmation.');
      return;
    }
    setPassword({ current: '', next: '', confirm: '' });
    setFeedback('Password change is a preview only. No password was stored or changed.');
  };
  const addPhotoButtons = (kind: 'avatarImage' | 'coverImage') => {
    const input = kind === 'avatarImage' ? photoInput : coverInput;
    const cameraInput = kind === 'avatarImage' ? cameraPhotoInput : cameraCoverInput;
    const image = kind === 'avatarImage' ? draft.avatarImage : draft.coverImage;
    return <div className={`settings-photo-tools ${kind === 'coverImage' ? 'cover-tools' : ''}`}>
      {image ? <img className={kind === 'avatarImage' ? 'settings-avatar-preview' : 'settings-cover-preview'} src={image} alt={kind === 'avatarImage' ? 'Profile photo preview' : 'Cover photo preview'} style={kind === 'avatarImage' ? { objectPosition: `${draft.avatarCrop ?? 50}% center` } : undefined}/> : <span className={kind === 'avatarImage' ? 'settings-avatar-placeholder' : 'settings-cover-placeholder'}>{kind === 'avatarImage' ? <UserRound size={22}/> : 'No cover photo selected'}</span>}
      <div><b>{kind === 'avatarImage' ? 'Profile photo' : 'Cover image'}</b><small>Optional · image stays in this browser preview</small><div className="settings-photo-actions"><button type="button" onClick={() => input.current?.click()}><Upload size={14}/>{image ? 'Replace' : 'Choose image'}</button><button type="button" onClick={() => cameraInput.current?.click()}><Camera size={14}/>Camera</button>{image && <button type="button" onClick={() => setDraft(current => ({ ...current, [kind]: undefined }))}>Remove</button>}</div></div>
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
          <label className="settings-toggle"><span><b>Profile visibility</b><small>Make your profile visible to campus students</small></span><select value={draft.visibility} onChange={event => { const next = { ...draft, visibility: event.target.value as StudentProfile['visibility'] }; setDraft(next); onSaveProfile(next); }}><option>Public</option><option>Private</option></select></label>
          {preferencesList.slice(0, 5).map(([key, title, detail]) => <label className="settings-toggle" key={key}><span><b>{title}</b><small>{detail}</small></span><input type="checkbox" checked={isPreferenceEnabled(key)} onChange={() => toggle(key)}/></label>)}
          <div className="settings-list-editor"><h3>Blocked students</h3><p>Blocked names are stored locally; blocking is not enforced by a server.</p><div><input value={blockDraft} onChange={event => setBlockDraft(event.target.value)} placeholder="Username"/><button type="button" onClick={() => addName('blocked')}>Add</button></div>{blocked.map(name => <button className="settings-chip" key={name} onClick={() => setBlocked(blocked.filter(item => item !== name))}>@{name} · remove</button>)}</div>
          <div className="settings-list-editor"><h3>Muted students</h3><p>Muted names are saved in this browser preview.</p><div><input value={muteDraft} onChange={event => setMuteDraft(event.target.value)} placeholder="Username"/><button type="button" onClick={() => addName('muted')}>Add</button></div>{muted.map(name => <button className="settings-chip" key={name} onClick={() => setMuted(muted.filter(item => item !== name))}>@{name} · remove</button>)}</div>
        </section>

        <section className="card settings-card" id="settings-notifications"><h2><Bell size={18}/> Notifications</h2><p>Choose which activity appears in your notifications.</p>{preferencesList.slice(5).map(([key, title, detail]) => <label className="settings-toggle" key={key}><span><b>{title}</b><small>{detail}</small></span><input type="checkbox" checked={isPreferenceEnabled(key)} onChange={() => toggle(key)}/></label>)}</section>

        <section className="card settings-card" id="settings-appearance"><h2><Sun size={18}/> Appearance</h2><p>Choose a theme. System follows your device preference.</p><div className="theme-choice-row">{(['light','dark','system'] as ThemeMode[]).map(mode => <button type="button" key={mode} className={themeMode === mode ? 'selected' : ''} onClick={() => setThemeMode(mode)}>{mode === 'dark' ? <Moon size={17}/> : mode === 'light' ? <Sun size={17}/> : <span className="system-theme-icon">◐</span>}{mode === 'system' ? 'System' : mode[0].toUpperCase() + mode.slice(1)}</button>)}</div></section>

        <form className="card settings-card" id="settings-security" onSubmit={changePassword}><h2><LockKeyhole size={18}/> Security</h2><p>Password controls are shown for the UI preview only; there is no account server.</p><label className="settings-field">Current password<input type="password" autoComplete="current-password" value={password.current} onChange={event => setPassword({ ...password, current: event.target.value })}/></label><label className="settings-field">New password<input type="password" autoComplete="new-password" minLength={8} value={password.next} onChange={event => setPassword({ ...password, next: event.target.value })}/></label><label className="settings-field">Confirm new password<input type="password" autoComplete="new-password" value={password.confirm} onChange={event => setPassword({ ...password, confirm: event.target.value })}/></label><button type="submit" className="outline-btn">Preview password change</button><div className="settings-security-note"><Shield size={16}/> Passwords are never written to localStorage.</div></form>

        <section className="card settings-card" id="settings-help"><h2><CircleHelp size={18}/> Help &amp; legal</h2><a className="settings-link-row" href="mailto:support@campuslink.ke?subject=CampusLink%20support">Help center &amp; support <ChevronRight size={16}/></a><a className="settings-link-row" href="mailto:feedback@campuslink.ke?subject=CampusLink%20feedback">Send feedback <ChevronRight size={16}/></a><details className="settings-legal"><summary>Privacy policy &amp; terms <ChevronRight size={16}/></summary><p>CampusLink is currently a frontend preview for University of Kabianga. Profile, post and preference data may be saved in this browser. Do not enter sensitive information. Authentication, account deletion, email, notifications and messaging are not connected to a production service. These preview notes are not a substitute for published legal terms.</p></details><div className="settings-app-info">CampusLink · Connect. Discover. Trade. Grow. <small>University of Kabianga preview · 0.1.0</small></div></section>

        <section className="card settings-card settings-account-card" id="settings-account"><h2>Account</h2><p>These actions only affect this local preview.</p><button className="outline-btn" type="button" onClick={onLogout}>Log out</button><button className="danger-button" type="button" onClick={() => { if (window.confirm('Deactivate this local preview session?')) onLogout(); }}>Deactivate preview account</button><button className="danger-button" type="button" onClick={() => { if (window.confirm('Delete/reset all CampusLink preview data stored in this browser? This cannot be undone.')) onReset(); }}><Trash2 size={14}/> Delete preview data</button></section>
      </div>
    </div>
  </>;
}
