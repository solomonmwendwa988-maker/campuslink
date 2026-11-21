import { FormEvent, InputHTMLAttributes, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Eye, EyeOff, LockKeyhole, Sparkles, UserRound } from 'lucide-react';
import { launchUniversity } from '../../data/universities';
import { optimizeImage } from '../../services/imageProcessing';
import { loadLocal } from '../../services/localStore';

export type AuthMode = 'Login' | 'Register' | 'Forgot password' | 'Reset password' | 'Verify email';
type Registration = { name: string; username: string; email: string; password: string; confirm: string; university: string; campus: string; course: string; year: string; bio: string; interests: string; skills: string; picture?: string; photoCrop?: string };
const emptyRegistration: Registration = { name: '', username: '', email: '', password: '', confirm: '', university: launchUniversity.name, campus: launchUniversity.campuses[0], course: '', year: '', bio: '', interests: '', skills: '', photoCrop: '50' };

export function AuthPage({ mode, onMode, onSuccess }: { mode: AuthMode; onMode: (mode: AuthMode) => void; onSuccess: (registration?: Omit<Registration, 'password' | 'confirm'>) => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyRegistration);
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('');
  const isRegister = mode === 'Register';
  const passwordStrength = form.password.length >= 12 ? 'Strong password' : form.password.length >= 8 ? 'Good password' : 'Use at least 8 characters';
  const change = (field: keyof Registration, value: string) => setForm(current => ({ ...current, [field]: value }));
  const usernameAvailable = (raw: string) => {
    const name = raw.toLowerCase();
    const savedProfile = loadLocal<{ username?: string } | null>('profile', null);
    const currentName = savedProfile?.username?.replace(/^@/, '').toLowerCase();
    const taken = ['wanjiku.m', 'amaniw', 'kevin.o', 'njeri.k', currentName].filter((value): value is string => Boolean(value));
    try { return !taken.includes(name) && !(JSON.parse(localStorage.getItem('campuslink-usernames') || '[]') as string[]).includes(name); }
    catch { return !taken.includes(name); }
  };

  const finishAuth = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      if (isRegister) {
        try {
          const names = JSON.parse(localStorage.getItem('campuslink-usernames') || '[]') as string[];
          localStorage.setItem('campuslink-usernames', JSON.stringify([...new Set([...names, form.username.toLowerCase()])]));
        } catch { /* Keep the local demo usable when storage is unavailable. */ }
        const { password: _password, confirm: _confirm, ...safeProfile } = form;
        onSuccess(safeProfile);
      } else onSuccess();
    }, 350);
  };
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (mode === 'Login') {
      const next: Record<string, string> = {};
      if (!identifier.trim()) next.identifier = 'Enter your email or username.';
      if (!form.password) next.password = 'Enter your password.';
      setErrors(next);
      if (!Object.keys(next).length) finishAuth();
      return;
    }
    if (mode === 'Forgot password') {
      setMessage('Password recovery is a frontend preview; no email was sent.');
      return;
    }
    if (mode === 'Reset password') {
      setMessage('Password reset is not connected to an account in this preview.');
      return;
    }
    if (mode === 'Verify email') {
      setMessage('Email verification is not connected in this frontend preview.');
      return;
    }
    if (step === 4) { finishAuth(); return; }
    const next: Record<string, string> = {};
    if (step === 1) {
      if (!form.name.trim()) next.name = 'Enter your full name.';
      if (!/^[a-zA-Z0-9._]{3,20}$/.test(form.username)) next.username = 'Use 3–20 letters, numbers, dots or underscores.';
      else if (!usernameAvailable(form.username)) next.username = 'That username is already in use in this preview.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.';
      if (form.password.length < 8) next.password = 'Use at least 8 characters.';
      if (form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    }
    if (step === 2) {
      if (!form.university.trim()) next.university = 'Enter your university or college.';
      if (!form.campus.trim()) next.campus = 'Enter your campus.';
      if (!form.course.trim()) next.course = 'Enter your course.';
      if (!form.year) next.year = 'Choose your year of study.';
    }
    setErrors(next);
    if (!Object.keys(next).length) setStep(current => Math.min(4, current + 1));
  };
  const uploadPicture = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2_000_000) { setErrors({ picture: 'Choose an image smaller than 2 MB.' }); return; }
    void optimizeImage(file, 900, 0.8).then(picture => { change('picture', picture); setErrors({}); }).catch(() => setErrors({ picture: 'Could not prepare that image. Try another file.' }));
  };
  const field = (key: keyof Registration, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => <label className="auth-field" key={key}>{label}<input {...props} value={form[key] ?? ''} onChange={event => change(key, event.target.value)} aria-invalid={Boolean(errors[key])} />{errors[key] && <small className="auth-error">{errors[key]}</small>}</label>;

  return <main className="auth-page auth-page-v2">
    <aside className="auth-art"><button className="brand auth-brand" onClick={() => onMode('Login')}><span className="brand-mark"><Sparkles size={16}/></span><span>Campus<span>Link</span></span></button><span className="hero-kicker"><span/> CONNECT. DISCOVER. TRADE. GROW.</span><h2>Make more<br/>of your <em>campus life.</em></h2><p>Find the conversations, events and people that make your campus feel like yours.</p><div className="auth-art-note"><UserRound size={18}/><span>Built around student life<br/><small>Frontend preview · no real account is created</small></span></div></aside>
    <form className="card auth-card auth-card-v2" onSubmit={handleSubmit} noValidate>
      <header className="auth-card-head"><div className="brand auth-mobile-brand"><span className="brand-mark"><Sparkles size={15}/></span><span>Campus<span>Link</span></span></div><p>{isRegister ? 'CREATE YOUR ACCOUNT' : mode === 'Login' ? 'WELCOME BACK' : 'ACCOUNT HELP'}</p><h1>{isRegister ? step === 4 ? 'Welcome to CampusLink' : 'Join your campus' : mode === 'Login' ? 'Sign in' : mode}</h1><span>{isRegister ? step === 4 ? 'Your local preview profile is ready.' : `Step ${step} of 3 · ${['','Account','Campus','Personalize'][step]}` : mode === 'Login' ? 'Sign in to continue to CampusLink.' : 'This feature is simulated in the frontend preview.'}</span></header>
      {isRegister && step < 4 && <div className="auth-stepper" aria-label={`Step ${step} of 3`}>{[1,2,3].map(item=><i key={item} className={item <= step ? 'current' : ''}/>)}</div>}
      <AnimatePresence mode="wait" initial={false}><motion.div key={`${mode}-${step}`} className="auth-fields" initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-8}} transition={{duration:.16}}>
        {mode === 'Login' && <><label className="auth-field">Email or username<input type="text" value={identifier} onChange={event=>setIdentifier(event.target.value)} autoComplete="username" placeholder="you@university.ac.ke" aria-invalid={Boolean(errors.identifier)}/>{errors.identifier&&<small className="auth-error">{errors.identifier}</small>}</label><label className="auth-field">Password<span className="password-field"><input type={visible?'text':'password'} value={form.password} onChange={event=>change('password',event.target.value)} autoComplete="current-password" aria-invalid={Boolean(errors.password)}/><button type="button" aria-label={visible?'Hide password':'Show password'} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={16}/>:<Eye size={16}/>}</button></span>{errors.password&&<small className="auth-error">{errors.password}</small>}</label><label className="remember-row"><input type="checkbox" checked={remember} onChange={event=>setRemember(event.target.checked)}/> Remember me</label><button className="auth-inline-link" type="button" onClick={()=>onMode('Forgot password')}>Forgot password?</button></>}
        {isRegister && step === 1 && <>{field('name','Full name',{autoComplete:'name',placeholder:'Your name'})}<label className="auth-field">Username<input autoComplete="username" value={form.username} onChange={event=>{const value=event.target.value;change('username',value);setUsernameStatus(/^[a-zA-Z0-9._]{3,20}$/.test(value)?usernameAvailable(value)?'Available in this preview':'Already taken':'Use 3–20 letters, numbers, dots or underscores.')}} placeholder="e.g. student.kabianga" aria-invalid={Boolean(errors.username)}/>{usernameStatus&&<small className={usernameStatus.startsWith('Available')?'password-strength valid':'auth-error'}>{usernameStatus}</small>}{errors.username&&<small className="auth-error">{errors.username}</small>}</label>{field('email','Email address',{type:'email',autoComplete:'email',placeholder:'you@university.ac.ke'})}<label className="auth-field">Password<span className="password-field"><input type={visible?'text':'password'} value={form.password} onChange={event=>change('password',event.target.value)} autoComplete="new-password"/><button type="button" aria-label={visible?'Hide password':'Show password'} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={16}/>:<Eye size={16}/>}</button></span><small className={form.password.length>=8?'password-strength valid':'password-strength'}>{passwordStrength}</small>{errors.password&&<small className="auth-error">{errors.password}</small>}</label><label className="auth-field">Confirm password<input type={visible?'text':'password'} value={form.confirm} onChange={event=>change('confirm',event.target.value)} autoComplete="new-password" aria-invalid={Boolean(errors.confirm)}/>{errors.confirm&&<small className="auth-error">{errors.confirm}</small>}</label></>}
        {isRegister && step === 2 && <><label className="auth-field">University<input value={launchUniversity.name} readOnly aria-readonly="true"/><small>CampusLink is currently for University of Kabianga students.</small></label><label className="auth-field">Campus<select value={form.campus} onChange={event=>change('campus',event.target.value)} aria-invalid={Boolean(errors.campus)}>{launchUniversity.campuses.map(campus=><option key={campus}>{campus}</option>)}</select>{errors.campus&&<small className="auth-error">{errors.campus}</small>}</label>{field('course','Course or program',{placeholder:'e.g. Computer Science'})}<label className="auth-field">Year of study<select value={form.year} onChange={event=>change('year',event.target.value)} aria-invalid={Boolean(errors.year)}><option value="">Select year</option>{['1','2','3','4','5','6'].map(year=><option key={year} value={year}>Year {year}</option>)}</select>{errors.year&&<small className="auth-error">{errors.year}</small>}</label></>}
        {isRegister && step === 3 && <><label className="auth-picture-upload"><input type="file" accept="image/*" capture="environment" onChange={event=>uploadPicture(event.target.files?.[0])}/>{form.picture?<img src={form.picture} alt="Profile preview" style={{objectPosition:`${form.photoCrop ?? 50}% center`}}/>:<span className="auth-picture-placeholder"><UserRound size={21}/></span>}<span><b>Profile photo</b><small>Optional · choose a file or use your camera · max 2 MB</small></span></label>{form.picture&&<label className="auth-field">Reposition photo<input type="range" min="0" max="100" value={form.photoCrop ?? '50'} onChange={event=>change('photoCrop',event.target.value)} aria-label="Reposition profile photo"/></label>}{errors.picture&&<small className="auth-error">{errors.picture}</small>}<label className="auth-field">Short bio <small>Optional</small><textarea value={form.bio} onChange={event=>change('bio',event.target.value)} maxLength={180} rows={3} placeholder="A little about you"/></label><label className="auth-field">Interests <small>Optional · comma separated</small><input value={form.interests} onChange={event=>change('interests',event.target.value)} placeholder="Design, football, photography"/></label><label className="auth-field">Skills <small>Optional · comma separated</small><input value={form.skills} onChange={event=>change('skills',event.target.value)} placeholder="Writing, coding, teamwork"/></label><button className="auth-skip" type="button" onClick={()=>setStep(4)}>Skip for now</button></>}
        {isRegister && step === 4 && <div className="auth-welcome"><span className="auth-welcome-mark"><Sparkles size={24}/></span><h2>You’re in, {form.name.split(' ')[0] || 'student'}.</h2><p>Your profile is ready for this local preview. You can explore the feed, discover students and update your profile in Settings.</p><div className="auth-completion"><b>Profile setup</b><span><i/></span><small>{form.bio || form.picture ? 'Personalized' : 'Basic account'} · frontend preview</small></div></div>}
        {mode === 'Forgot password' && <>{field('email','Email address',{type:'email',autoComplete:'email',placeholder:'you@university.ac.ke'})}<button className="auth-inline-link" type="button" onClick={()=>onMode('Reset password')}>Open reset password preview</button></>}
        {mode === 'Reset password' && <><label className="auth-field">New password<input type={visible?'text':'password'} value={form.password} onChange={event=>change('password',event.target.value)} minLength={8}/></label><label className="auth-field">Confirm new password<input type={visible?'text':'password'} value={form.confirm} onChange={event=>change('confirm',event.target.value)}/></label><button className="auth-inline-link" type="button" onClick={()=>setVisible(!visible)}>{visible?'Hide passwords':'Show passwords'}</button></>}
        {mode === 'Verify email' && <div className="auth-welcome"><LockKeyhole size={22}/><p>Email verification is not connected in this frontend preview. No email has been sent.</p></div>}
      </motion.div></AnimatePresence>
      {message && <p className="auth-message" role="status">{message}</p>}
      <div className="auth-submit-row">{isRegister && step > 1 && step < 4 && <button className="outline-btn" type="button" onClick={()=>setStep(current=>current-1)}><ChevronLeft size={15}/> Back</button>}<button className="primary-btn auth-submit" type="submit" disabled={loading}>{loading?'Please wait…':isRegister?step===4?'Continue to CampusLink':step===3?'Finish profile':'Continue':mode==='Login'?'Sign in':'Continue'}{!loading&&<ChevronRight size={15}/>}</button></div>
      <p className="auth-switch">{mode==='Login'?<>New to CampusLink? <button type="button" onClick={()=>{setStep(1);onMode('Register')}}>Create an account</button></>:isRegister?<>Already have an account? <button type="button" onClick={()=>onMode('Login')}>Sign in</button></>:<button type="button" onClick={()=>onMode('Login')}>Back to sign in</button>}</p>
      <small className="auth-disclaimer"><LockKeyhole size={12}/> Frontend demo only. Credentials are never stored or sent.</small>
    </form>
  </main>;
}
