import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Bookmark, CalendarDays, ChevronRight, Compass, Heart, Home, ImagePlus, Menu, MessageCircle, Moon, MoreHorizontal, Plus, Search, Send, Settings, ShoppingBag, Sparkles, Sun, Users, X } from 'lucide-react';
import { useLocalState } from '../hooks/useLocalState';
import { AppNotification, NotificationsPage, SavedPage, StudentProfile } from '../pages/CorePages';
import { SettingsPage } from '../pages/SettingsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { LandingPage } from '../pages/LandingPage';
import { ExplorePage } from '../pages/ExplorePage';
import { AuthMode, AuthPage } from '../pages/auth/AuthPage';
import '../styles/base.css';
import '../styles/landing.css';
import '../styles/social.css';
import '../styles/core.css';
import '../styles/post-menu.css';
import '../styles/pwa.css';
import '../styles/landing-v2.css';
import '../styles/messaging.css';
import '../styles/auth.css';
import '../styles/responsive.css';
import '../styles/mobile-fixes.css';
import '../styles/reference-ui.css';
import '../styles/campuslink-system.css';
import { pageFromPath, pathForPage, pathForProfile, usernameFromPath } from './router/routes';
import { useTheme } from './providers/ThemeProvider';
import { Avatar } from '../components/shared/Avatar';
import { Post } from '../types/post';
import { MessagesPage } from '../components/messaging/MessagesPage';
import { launchUniversity } from '../data/universities';
import { clearCampusLinkData } from '../services/localStore';
import { publishProfileUpdate, subscribeProfileUpdates } from '../services/profileEvents';
import type { ApiUser } from '../services/api';
import { clearAccessToken, getMe, logout as apiLogout, refreshAccessToken, listNotifications, markNotificationRead, markAllNotificationsRead, updateOwnProfile, heartbeatPresence, ApiNotification } from '../services/api';

type Listing = { id: number; title: string; price: string; campus: string; category: string; image: string; seller: string; description?: string };
type Profile = StudentProfile;

// CampusLink starts with real content only. Demo posts, marketplace listings,
// fake notifications and seeded profiles have been removed.
const campusPostsSeed: Post[] = [];
const campusListingsSeed: Listing[] = [];
const nav = [{ label: 'Home', icon: Home }, { label: 'Explore', icon: Compass }, { label: 'Marketplace', icon: ShoppingBag }, { label: 'Messages', icon: MessageCircle }, { label: 'Events', icon: CalendarDays }, { label: 'Notifications', icon: Bell }];
const profileSeed: Profile = {
  name: '', username: '', bio: '', university: launchUniversity.name,
  campus: launchUniversity.campuses[0], course: '', year: '', interests: [],
  avatar: 'CL', visibility: 'Public',
};
const notificationSeed: AppNotification[] = [];
function notificationView(item: ApiNotification): AppNotification {
  const actor = item.actor;
  const name = actor?.profile?.fullName?.trim() || actor?.username || 'CampusLink';
  const typeMap: Record<ApiNotification['type'], string> = { LIKE: 'Likes', COMMENT: 'Comments', REPLY: 'Comments', REPOST: 'Likes', FOLLOW: 'Follows', MESSAGE: 'Messages', EVENT: 'Events' };
  const textMap: Record<ApiNotification['type'], string> = { LIKE: 'liked your post.', COMMENT: 'commented on your post.', REPLY: 'replied to your comment.', REPOST: 'shared your post.', FOLLOW: 'started following you.', MESSAGE: 'sent you a message.', EVENT: 'shared a campus event.' };
  return { id: item.id, name, initials: name.split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || 'CL', avatarImage: actor?.profile?.photoUrl ?? undefined, actorUsername: actor?.username, text: textMap[item.type], time: new Date(item.createdAt).toLocaleString(), unread: !item.readAt, type: typeMap[item.type] };
}

let notificationAudioContext: AudioContext | null = null;
function playNotificationSound() {
  try {
    const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    notificationAudioContext ??= new AudioContextCtor();
    if (notificationAudioContext.state === 'suspended') void notificationAudioContext.resume();
    const ctx = notificationAudioContext;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(880, ctx.currentTime); oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + 0.19);
  } catch { /* Sound is an enhancement; never interrupt app behavior. */ }
}


function LandingLegacy({ enter, open, dark, toggleTheme }: { enter: () => void; open: (page: string) => void; dark: boolean; toggleTheme: () => void }) {
  return <div className="landing-page">
    <header className="landing-nav"><div className="brand" onClick={enter}><div className="brand-mark"><Sparkles size={17}/></div><span>Campus<span>Link</span></span></div><nav><button onClick={enter}>Explore</button><button onClick={() => open('Marketplace')}>Marketplace</button><button onClick={() => open('Events')}>Events</button><a href="#about">About</a></nav><div className="landing-nav-actions"><button className="icon-btn" aria-label="Toggle theme" onClick={toggleTheme}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="text-btn" onClick={() => open('Login')}>Log in</button><button className="primary-btn" onClick={() => open('Register')}>Get started <ChevronRight size={15}/></button></div></header>
    <main>
      <section className="landing-hero"><div className="hero-copy"><span className="hero-kicker"><span/> MADE FOR CAMPUS LIFE IN KENYA</span><h1>Your campus.<br/><em>Your people.</em><br/>Your opportunities.</h1><p>Meet students, find your communities, discover what’s happening and make campus life feel a little more connected.</p><div className="hero-cta"><button className="primary-btn" onClick={() => open('Register')}>Join CampusLink <ChevronRight size={16}/></button><button className="secondary-btn" onClick={enter}><Compass size={16}/> Explore campus</button></div><div className="hero-proof"><div className="proof-avatars"><Avatar initials="AW"/><Avatar initials="KO"/><Avatar initials="NK"/></div><span><strong>Made for students,</strong> built around your campus.</span></div></div>
        <div className="hero-collage"><div className="collage-glow"/><div className="mock-window"><div className="mock-top"><div className="mock-brand"><div className="brand-mark"><Sparkles size={12}/></div>CampusLink <span>UoN · Main Campus</span></div><div className="mock-dots"><i/><i/><i/></div></div><div className="mock-layout"><div className="mock-rail"><b className="mock-active"><Home size={13}/></b><b><Compass size={13}/></b><b><ShoppingBag size={13}/></b><b><CalendarDays size={13}/></b></div><div className="mock-feed"><div className="mock-welcome"><span>YOUR CAMPUS, CONNECTED</span><strong>Good morning, Wanjiku</strong><small>Here’s what’s happening today.</small></div><div className="mock-post"><div className="mock-person"><Avatar initials="AW"/><span><b>Amani Wanjiku</b><small>Chiromo campus · 18 min</small></span></div><p>Who’s heading to the student commons this afternoon? ☀️</p><div className="mock-photo"/><div className="mock-stats"><span><Heart size={12}/> 84</span><span><MessageCircle size={12}/> 12 replies</span></div></div></div></div></div><div className="float-event"><div className="date-tile"><b>28</b><span>NOV</span></div><div><small>UPCOMING ON CAMPUS</small><strong>Designing your future</strong><span>Taifa Hall · 4:00 PM</span></div></div><div className="float-market"><div className="marketplace-visual"><ShoppingBag size={26}/></div><div><small>STUDENT MARKETPLACE</small><strong>Buy &amp; sell on campus</strong><span>Discover student listings</span></div></div><div className="float-community"><div className="community-symbol"><Users size={17}/></div><div><b>Campus Creatives</b><span>842 students inside</span></div><span className="online-dot"/></div></div>
      </section>
      <section className="landing-strip"><span>ONE PLACE FOR</span><b><Users size={15}/> People</b><i/><b><MessageCircle size={15}/> Conversations</b><i/><b><ShoppingBag size={15}/> Student finds</b><i/><b><CalendarDays size={15}/> Campus moments</b></section>
      <section className="landing-features" id="about"><div className="section-intro"><span className="hero-kicker"><span/> BUILT AROUND YOUR EVERYDAY</span><h2>Campus life is better<br/>when we’re <em>connected.</em></h2><p>The conversations, opportunities and little moments that make campus yours — all in one place.</p></div><div className="feature-grid"><button className="feature-card feature-connect" onClick={enter}><div className="feature-icon"><Users size={19}/></div><span className="feature-number">01 / CONNECT</span><h3>Find your people</h3><p>Meet students across your campus and find the communities that feel like you.</p><span className="feature-link">Meet your community <ChevronRight size={14}/></span><div className="feature-people"><Avatar initials="JM"/><Avatar initials="DO"/><Avatar initials="SA"/><span>+ students nearby</span></div></button><button className="feature-card feature-discover" onClick={() => open('Explore')}><div className="feature-icon"><Compass size={19}/></div><span className="feature-number">02 / DISCOVER</span><h3>Know what’s happening</h3><p>Find campus events, conversations and useful opportunities while they’re still fresh.</p><span className="feature-link">Explore what’s on <ChevronRight size={14}/></span><div className="mini-event-card"><span className="mini-event-date">28<br/><small>NOV</small></span><span><b>Designing your future</b><small>Taifa Hall · Friday</small></span><CalendarDays size={17}/></div></button><button className="feature-card feature-market" onClick={() => open('Marketplace')}><div className="feature-icon"><ShoppingBag size={19}/></div><span className="feature-number">03 / TRADE</span><h3>Buy and sell nearby</h3><p>Give student essentials a second life and find your next good deal close to class.</p><span className="feature-link">Browse the marketplace <ChevronRight size={14}/></span><div className="mini-product"><span className="mini-product-visual"><ShoppingBag size={18}/></span><span><b>Student marketplace</b><small>Browse real listings</small></span><Heart size={15}/></div></button></div></section>
      <section className="landing-bottom"><div><span className="hero-kicker"><span/> YOUR CAMPUS, YOUR COMMUNITY</span><h2>Everything happening on campus, <em>connected.</em></h2><p>Join the conversations, discover your next opportunity, and make more of every campus day.</p></div><button className="primary-btn" onClick={enter}>Step into CampusLink <ChevronRight size={16}/></button></section>
    </main><footer className="landing-footer"><div className="brand"><div className="brand-mark"><Sparkles size={15}/></div><span>Campus<span>Link</span></span></div><span>Connect. Discover. Trade. Grow.</span><div><a href="#about">About</a><a href="mailto:hello@campuslink.ke">Contact</a><a href="#about">Community guidelines</a><span>© 2026 CampusLink</span></div></footer>
  </div>;
}

function Landing({ enter, open, dark, toggleTheme }: { enter: () => void; open: (page: string) => void; dark: boolean; toggleTheme: () => void }) {
  return <div className="landing-page landing-v2">
    <header className="landing-nav">
      <button className="brand" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}><span className="brand-mark"><Sparkles size={17}/></span><span>Campus<span>Link</span></span></button>
      <nav aria-label="Main navigation"><button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>Home</button><button onClick={enter}>Explore</button><button onClick={()=>open('Marketplace')}>Marketplace</button><button onClick={()=>open('Events')}>Events</button><a href="#about">About</a></nav>
      <div className="landing-nav-actions"><button className="icon-btn" aria-label="Toggle theme" onClick={toggleTheme}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button><button className="text-btn" onClick={()=>open('Login')}>Sign in</button><button className="primary-btn" onClick={()=>open('Register')}>Get started <ChevronRight size={15}/></button></div>
      <details className="landing-mobile-menu"><summary aria-label="Open site navigation"><Menu size={21}/></summary><div><button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>Home</button><button onClick={enter}>Explore</button><button onClick={()=>open('Marketplace')}>Marketplace</button><button onClick={()=>open('Events')}>Events</button><a href="#about">About</a><button onClick={()=>open('Login')}>Sign in</button></div></details>
    </header>
    <main>
      <section className="landing-hero landing-hero-v2"><div className="hero-copy"><span className="hero-kicker"><span/> MADE FOR CAMPUS LIFE</span><h1>Your campus.<br/><em>Your people.</em><br/>Your opportunities.</h1><p>Discover the people, conversations, events and opportunities that make campus life worth experiencing.</p><div className="hero-cta"><button className="primary-btn" onClick={()=>open('Register')}>Join CampusLink <ChevronRight size={16}/></button><button className="secondary-btn" onClick={enter}><Compass size={16}/> Explore CampusLink</button></div><div className="hero-proof"><span className="hero-proof-dot"/><span><strong>A campus social network</strong> to connect, discover, share and trade.</span></div></div>
        <div className="campus-illustration" aria-label="Illustration of students meeting on a university campus" role="img"><div className="illustration-sun"/><div className="illustration-cloud cloud-one"/><div className="illustration-cloud cloud-two"/><div className="campus-building"><div className="building-roof"/><div className="building-face"><div className="building-sign">CAMPUS COMMONS</div><div className="building-windows"><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="building-door"/></div></div><div className="campus-tree tree-left"><i/><b/></div><div className="campus-tree tree-right"><i/><b/></div><div className="campus-ground"/><div className="campus-walkway"/><div className="student-figure figure-one"><i/><b/><span/></div><div className="student-figure figure-two"><i/><b/><span/></div><div className="illustration-label label-events"><CalendarDays size={15}/><span><b>Events nearby</b><small>Find your next campus moment</small></span></div><div className="illustration-label label-connect"><Users size={15}/><span><b>People to meet</b><small>Your campus, connected</small></span></div></div>
      </section>
      <section className="landing-strip landing-strip-v2"><span>ONE PLACE FOR</span><b><Users size={15}/> People</b><i/><b><MessageCircle size={15}/> Conversations</b><i/><b><CalendarDays size={15}/> Campus events</b><i/><b><ShoppingBag size={15}/> Student finds</b></section>
      <section className="landing-explainer" id="about"><div className="section-intro"><span className="hero-kicker"><span/> WHAT IS CAMPUSLINK?</span><h2>Campus life is better<br/>when we’re <em>connected.</em></h2><p>CampusLink is a social network for students to connect, share experiences, discover events and trade student essentials—all in one place.</p></div><div className="landing-feature-grid"><article className="landing-feature"><div className="feature-icon"><MessageCircle size={19}/></div><span className="feature-number">01 / CONNECT</span><h3>Share and take part</h3><p>Post campus moments, join conversations, follow students and interact through comments and reactions.</p><button className="feature-link" onClick={enter}>Explore the feed <ChevronRight size={14}/></button></article><article className="landing-feature"><div className="feature-icon"><Compass size={19}/></div><span className="feature-number">02 / DISCOVER</span><h3>Find what’s happening</h3><p>Explore people, popular campus conversations and events worth making time for.</p><button className="feature-link" onClick={enter}>Discover CampusLink <ChevronRight size={14}/></button></article><article className="landing-feature"><div className="feature-icon"><ShoppingBag size={19}/></div><span className="feature-number">03 / MARKETPLACE</span><h3>Trade student essentials</h3><p>Find books, electronics, fashion, furniture and other finds, then connect with sellers directly.</p><button className="feature-link" onClick={()=>open('Marketplace')}>Browse listings <ChevronRight size={14}/></button></article><article className="landing-feature"><div className="feature-icon"><CalendarDays size={19}/></div><span className="feature-number">04 / EVENTS</span><h3>Show up on campus</h3><p>Discover student workshops, sports, social activities and academic events near you.</p><button className="feature-link" onClick={()=>open('Events')}>Explore events <ChevronRight size={14}/></button></article></div></section>
      <section className="how-it-works"><div className="section-intro"><span className="hero-kicker"><span/> HOW IT WORKS</span><h2>Make campus feel<br/><em>closer.</em></h2></div><ol><li><span>01</span><div><b>Join your campus</b><small>Start with a simple CampusLink account.</small></div></li><li><span>02</span><div><b>Create your profile</b><small>Share what you study and what interests you.</small></div></li><li><span>03</span><div><b>Connect with students</b><small>Follow people and join the conversations.</small></div></li><li><span>04</span><div><b>Discover and participate</b><small>Find events, share moments and trade essentials.</small></div></li></ol></section>
      <section className="landing-bottom landing-bottom-v2"><div><span className="hero-kicker"><span/> YOUR CAMPUS, CONNECTED</span><h2>Everything happening on campus, <em>connected.</em></h2><p>Find your people and make more of every campus day.</p></div><button className="primary-btn" onClick={()=>open('Register')}>Join CampusLink <ChevronRight size={16}/></button></section>
    </main>
    <footer className="landing-footer landing-footer-v2"><div className="brand"><span className="brand-mark"><Sparkles size={15}/></span><span>Campus<span>Link</span></span></div><span>Connect. Discover. Trade. Grow.</span><nav><a href="#about">About</a><a href="mailto:support@campuslink.ke">Contact &amp; support</a><a href="#privacy" onClick={e=>{e.preventDefault();open('Settings')}}>Privacy</a><a href="#terms" onClick={e=>{e.preventDefault();open('Settings')}}>Terms</a><a href="#guidelines">Community guidelines</a></nav><small>© 2026 CampusLink</small></footer>
  </div>;
}

export function App() {
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const isAuthenticated = Boolean(currentUser);
  const { dark, mode: themeMode, setMode: setThemeMode, setDark } = useTheme();
  const location = useLocation(); const navigate = useNavigate(); const profileRouteUsername = usernameFromPath(location.pathname); const routedPage = pageFromPath(location.pathname); const page = location.pathname === '/' && isAuthenticated ? 'Home' : routedPage; const setPage = (nextPage: string) => navigate(pathForPage(nextPage)); const [menu, setMenu] = useState(false); const [posts, setPosts] = useLocalState<Post[]>('posts', campusPostsSeed); const [marketItems, setMarketItems] = useLocalState<Listing[]>('listings', campusListingsSeed); const [favorites, setFavorites] = useLocalState<number[]>('favorites', []); const [followed, setFollowed] = useLocalState<string[]>('following', []); const [interestedEvents, setInterestedEvents] = useLocalState<string[]>('events', []); const [savedEvents, setSavedEvents] = useLocalState<string[]>('saved-events', []); const [notifications, setNotifications] = useLocalState<AppNotification[]>('notifications', notificationSeed); const [notificationsLoading, setNotificationsLoading] = useState(false); const [profile, setProfile] = useLocalState<Profile>('profile', profileSeed); const [preferences, setPreferences] = useLocalState<Record<string, boolean>>('preferences', {});
  const [composer, setComposer] = useState(''); const [postImage, setPostImage] = useState<string | undefined>(); const [search, setSearch] = useState(''); const [category, setCategory] = useState('All items'); const [feedTab, setFeedTab] = useState('For You');  const [messageTargetUsername, setMessageTargetUsername] = useState<string | null>(null); const [toast, setToast] = useState(''); const [hiddenPosts,setHiddenPosts]=useLocalState<number[]>('hidden-posts',[]); const notificationSeenRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!isAuthenticated) return;
    const beat = () => { if (document.visibilityState === 'visible') void heartbeatPresence().catch(() => undefined); };
    beat(); const timer = window.setInterval(beat, 25000);
    const onVisibility = () => { if (document.visibilityState === 'visible') beat(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [isAuthenticated]);
  useEffect(() => {
    // This app's previous feed/listing/notification/chat data was local demo data.
    // Clear it so it cannot masquerade as live server content.
    for (const key of ['posts', 'listings', 'notifications', 'messages']) {
      try { window.localStorage.removeItem(key); } catch { /* storage may be unavailable */ }
    }
    setPosts([]);
    setMarketItems([]);
    setNotifications([]);
  }, []);
  useEffect(() => publishProfileUpdate(profile), [profile]);
  useEffect(() => { setMenu(false); }, [location.pathname]);
  useEffect(() => {
    if (!menu) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown); };
  }, [menu]);
  useEffect(() => {
    if (!isAuthenticated) { setNotifications([]); setNotificationsLoading(false); notificationSeenRef.current = null; return; }
    let cancelled = false; setNotificationsLoading(true);
    const loadNotifications = async () => {
      try {
        const result = await listNotifications();
        if (cancelled) return;
        const next = result.data.map(notificationView).filter(item => { const key = item.type === 'Likes' ? 'Likes' : item.type === 'Comments' ? 'Comments' : item.type === 'Follows' ? 'Follows' : item.type === 'Messages' ? 'messageNotifications' : 'Events'; return preferences[key] !== false; });
        const unread = next.filter(item => item.unread);
        const ids = new Set(unread.map(item => String(item.id)));
        const previous = notificationSeenRef.current;
        const newlyReceived = previous ? unread.filter(item => !previous.has(String(item.id))) : [];
        notificationSeenRef.current = ids;
        setNotifications(next);
        if (newlyReceived.length && preferences.notificationSound !== false) playNotificationSound();
        if (newlyReceived.length && preferences.desktopNotifications && 'Notification' in window && Notification.permission === 'granted') {
          const item = newlyReceived[0];
          try { new Notification('CampusLink', { body: `${item.name} ${item.text}`, tag: `campuslink-${item.id}`, icon: '/favicon.ico' }); } catch { /* Browser notification APIs may be blocked. */ }
        }
      } catch { /* Notification polling is intentionally non-blocking. */ } finally { if (!cancelled) setNotificationsLoading(false); }
    };
    void loadNotifications();
    const interval = window.setInterval(loadNotifications, 15000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [isAuthenticated, preferences.notificationSound, preferences.desktopNotifications]);
  const markOneNotificationRead = (id: string | number) => {
    setNotifications(current => current.map(item => item.id === id ? { ...item, unread: false } : item));
    void markNotificationRead(String(id)).catch(() => undefined);
  };
  const markEveryNotificationRead = () => {
    setNotifications(current => current.map(item => ({ ...item, unread: false })));
    void markAllNotificationsRead().catch(() => undefined);
  };
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  const profileFromUser = (user: ApiUser, registration?: {
    name?: string;
    username?: string;
    bio?: string;
    interests?: string;
    skills?: string;
    picture?: string;
    photoCrop?: string;
    campus?: string;
    course?: string;
    year?: string;
  }): Profile => {
    // The API currently returns user fields inside `profile` (fullName,
    // campus.name, university.name, yearOfStudy), while some older responses
    // used flat fields. Normalize both shapes before mapping to the UI.
    const raw = user as unknown as {
      name?: string; username?: string; email?: string; campus?: string;
      course?: string; year?: string | number; bio?: string;
      interests?: string[]; skills?: string[];
      profile?: {
        fullName?: string; bio?: string; course?: string;
        yearOfStudy?: string | number; interests?: string[]; skills?: string[];
        campus?: { name?: string } | string;
        university?: { name?: string } | string;
        photoUrl?: string | null;
        coverUrl?: string | null;
        isPrivate?: boolean;
      };
    };
    const apiProfile = raw.profile;
    const username = raw.username || registration?.username || '';
    const name = raw.name || apiProfile?.fullName?.trim() || registration?.name || username || 'Your profile';
    const campusValue = raw.campus || apiProfile?.campus;
    const campusName = typeof campusValue === 'string' ? campusValue : campusValue?.name;
    const course = raw.course || apiProfile?.course || registration?.course || '';
    const year = raw.year ?? apiProfile?.yearOfStudy ?? registration?.year ?? '';
    const interests = raw.interests ?? apiProfile?.interests ?? (registration?.interests ? registration.interests.split(',').map(value => value.trim()).filter(Boolean) : []);
    const skills = raw.skills ?? apiProfile?.skills ?? (registration?.skills ? registration.skills.split(',').map(value => value.trim()).filter(Boolean) : []);
    return {
      ...profileSeed,
      name,
      username: `@${username.replace(/^@/, '')}`,
      email: '',
      university: launchUniversity.name,
      campus: campusName || registration?.campus || launchUniversity.campuses[0],
      course,
      year: String(year),
      bio: raw.bio ?? apiProfile?.bio ?? registration?.bio ?? '',
      interests,
      skills,
      avatar: name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase(),
      avatarImage: registration?.picture || apiProfile?.photoUrl || (profile.username.toLowerCase() === `@${username.toLowerCase()}` ? profile.avatarImage : undefined),
      coverImage: apiProfile?.coverUrl || (profile.username.toLowerCase() === `@${username.toLowerCase()}` ? profile.coverImage : undefined),
      avatarCrop: Number(registration?.photoCrop ?? 50),
      visibility: apiProfile?.isPrivate ? 'Private' : 'Public',
    };
  };

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const token = await refreshAccessToken();
        if (!token || cancelled) return;

        const user = await getMe();
        if (cancelled) return;

        setCurrentUser(user);
        const restoredProfile = profileFromUser(user);
        setProfile(restoredProfile);
        publishProfileUpdate(restoredProfile);
      } catch {
        clearAccessToken();
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    };

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);
  const filteredListings = useMemo(() => marketItems.filter(l => `${l.title} ${l.category} ${l.campus}`.toLowerCase().includes(search.toLowerCase()) && (category === 'All items' || l.category === category)), [marketItems, search, category]);
  const visiblePosts = useMemo(() => posts.filter(p => !hiddenPosts.includes(p.id)).filter(p => `${p.name} ${p.handle} ${p.content} ${p.school}`.toLowerCase().includes(search.toLowerCase())).filter(p => feedTab !== 'Following' || followed.includes(p.handle)).filter(p => (feedTab !== 'Saved' && page !== 'Saved') || p.bookmarked), [posts, search, feedTab, followed, page, hiddenPosts]);
  const toggleLike = (id: number) => setPosts(current => current.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p));
  const toggleBookmark = (id: number) => setPosts(current => current.map(p => p.id === id ? { ...p, bookmarked: !p.bookmarked } : p));
  const addReply = (id: number, reply: string) => setPosts(current => current.map(p => p.id === id ? { ...p, comments: p.comments + 1, replies: [...(p.replies ?? []), reply] } : p));
  const publish = () => { if (!composer.trim() && !postImage) return; setPosts(current => [{ id: Date.now(), name: profile.name, handle: profile.username, school: `${profile.university} · ${profile.campus}`, avatar: profile.avatar, time: 'now', content: composer, image: postImage, likes: 0, comments: 0, replies: [] }, ...current]); setComposer(''); setPostImage(undefined); notify('Your post is now on the feed'); };
  const updatePostImage = (file?: File) => { if (!file) return; if (!file.type.startsWith('image/') || file.size > 1_500_000) { notify('Choose an image smaller than 1.5 MB for local preview storage.'); return; } const reader = new FileReader(); reader.onload = () => setPostImage(String(reader.result)); reader.readAsDataURL(file); };
  const activeProfile = profile;
  const handleAuthSuccess = (user: ApiUser, registration?: {
    name: string;
    username: string;
    email: string;
    university: string;
    campus: string;
    course: string;
    year: string;
    bio: string;
    interests: string;
    skills: string;
    picture?: string;
    photoCrop?: string;
  }) => {
    const nextProfile = profileFromUser(user, registration);
    setProfile(nextProfile);
    publishProfileUpdate(nextProfile);
    setCurrentUser(user);
    setPage('Home');
    notify(`Welcome to CampusLink, ${nextProfile.name.split(' ')[0]}`);
  };
  const resetPreview = () => { clearCampusLinkData(); window.history.replaceState(null, '', '/'); window.location.reload(); };
  const authPages = ['Login', 'Register', 'Forgot password', 'Reset password', 'Verify email'];
  if (authChecking && page !== 'Landing' && !authPages.includes(page)) {
    return <div className="app-shell app-shell-loading" role="status" aria-label="Loading CampusLink"><header className="topbar loading-topbar"><span className="skeleton skeleton-brand"/><span className="skeleton skeleton-search"/></header><div className="layout loading-layout"><aside className="sidebar loading-sidebar"><span className="skeleton skeleton-campus"/>{Array.from({length:7},(_,i)=><span className="skeleton skeleton-nav" key={i}/> )}</aside><main className="content loading-content"><span className="skeleton skeleton-heading"/><span className="skeleton skeleton-subheading"/>{Array.from({length:4},(_,i)=><span className="skeleton skeleton-card" key={i}/> )}</main></div></div>;
  }
  if (!authChecking && !isAuthenticated && page !== 'Landing' && !authPages.includes(page)) {
    return <><LandingPage open={setPage} dark={dark} toggleTheme={() => setDark(!dark)} /><Toast message={toast} /></>;
  }
  if (page === 'Landing') return <><LandingPage open={setPage} dark={dark} toggleTheme={() => setDark(!dark)} /><Toast message={toast} /></>;
  if (page === 'Login' || page === 'Register' || page === 'Forgot password' || page === 'Reset password' || page === 'Verify email') return <><AuthPage mode={page as AuthMode} onMode={setPage} onSuccess={handleAuthSuccess}/><Toast message={toast}/></>;
  return <div className={`app-shell${page === 'Messages' ? ' messaging-route' : ''}`}>
      <header className="topbar"><button className="brand" onClick={() => setPage('Home')}><span className="brand-mark"><Sparkles size={17}/></span><span>Campus<span>Link</span></span></button><label className="top-search"><Search size={17}/><input placeholder="Search CampusLink" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')setPage('Explore')}}/><button onClick={()=>{setPage('Explore');setSearch(search)}} aria-label="Open search"><ChevronRight size={15}/></button></label><div className="top-actions"><button className="icon-btn notification-shortcut" aria-label="Notifications" onClick={()=>setPage('Notifications')}><Bell size={19}/>{notifications.some(item=>item.unread)&&<i/>}</button><button className="icon-btn" aria-label="Toggle theme" onClick={()=>setDark(!dark)}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button><button className="profile-mini" onClick={()=>{navigate('/profile')}}><Avatar initials={profile.avatar} image={profile.avatarImage} imagePosition={profile.avatarCrop}/><span className="hide-mobile">{profile.name}</span><ChevronRight size={15}/></button><button className="header-logout" aria-label="Log out" title="Log out" onClick={()=>{if(window.confirm('Log out of CampusLink?')){void apiLogout();setCurrentUser(null);setPage('Landing')}}}><X size={17}/></button><button className="icon-btn mobile-menu" onClick={()=>setMenu(!menu)} aria-label={menu?'Close navigation':'Open navigation'} aria-expanded={menu} aria-controls="campuslink-mobile-drawer">{menu?<X/>:<Menu/>}</button></div></header>
    <div className="layout">{menu && <button className="mobile-drawer-backdrop" aria-label="Close navigation menu" onClick={()=>setMenu(false)}/>}<aside id="campuslink-mobile-drawer" className={`sidebar ${menu?'open':''}`}><div className="campus-card"><div className="campus-dot"/><div><strong>{profile.university}</strong><small>{profile.campus}</small></div></div><p className="eyebrow">CAMPUSLINK</p><nav>{nav.map(({label,icon:Icon})=><button key={label} className={page===label?'active':''} onClick={()=>{setPage(label);setMenu(false)}}><Icon size={19}/>{label}{label==='Notifications'&&notifications.some(item=>item.unread)&&<b>{notifications.filter(item=>item.unread).length}</b>}</button>)}</nav><button className="primary-btn create-post-nav" onClick={()=>{setMenu(false);setPage('Home');window.setTimeout(()=>document.querySelector<HTMLTextAreaElement>('.composer textarea')?.focus(),60)}}><Plus size={17}/> Create post</button><p className="eyebrow">YOUR SPACE</p><nav><button onClick={()=>{setPage('Saved');setMenu(false)}} className={page==='Saved'?'active':''}><Bookmark size={19}/>Saved</button><button onClick={()=>{navigate('/profile');setMenu(false)}} className={page==='Profile'?'active':''}><Users size={19}/>Profile</button><button onClick={()=>{setPage('Settings');setMenu(false)}} className={page==='Settings'?'active':''}><Settings size={19}/>Settings</button></nav><button className="sidebar-profile" onClick={()=>{navigate('/profile');setMenu(false)}}><Avatar initials={profile.avatar} image={profile.avatarImage} imagePosition={profile.avatarCrop}/><span><b>{profile.name}</b><small>{profile.username}</small></span><MoreHorizontal size={17}/></button></aside>
      <main className="content"><AnimatePresence mode="wait"><motion.div key={page} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.2}}>{page==='Marketplace'?<Marketplace listings={filteredListings} search={search} setSearch={setSearch} category={category} setCategory={setCategory} favorites={favorites} toggleFavorite={id=>setFavorites(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id])} createListing={listing=>setMarketItems(current=>[{...listing,id:Date.now()},...current])} openMessages={()=>setPage('Messages')}/>:page==='Events'?<Events interested={interestedEvents} toggle={name=>setInterestedEvents(current=>current.includes(name)?current.filter(x=>x!==name):[...current,name])} saved={savedEvents} toggleSaved={id=>setSavedEvents(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id])}/>:page==='Messages'?<MessagesPage initialUsername={messageTargetUsername ?? undefined} onInitialHandled={()=>setMessageTargetUsername(null)}/>:page==='Explore'?<ExplorePage posts={posts} listings={marketItems} search={search} setSearch={setSearch} onProfile={username=>navigate(pathForProfile(username))} onMarketplace={()=>setPage('Marketplace')} onEvents={()=>setPage('Events')}/>:page==='Profile'?<ProfilePage profile={activeProfile} posts={posts.filter(post=>post.handle===(profileRouteUsername ? `@${profileRouteUsername.replace(/^@/, '')}` : activeProfile.username))} isOwn={!profileRouteUsername} username={profileRouteUsername} viewerUsername={currentUser?.username} onEdit={()=>setPage('Settings')} onMessage={()=>{setMessageTargetUsername(profileRouteUsername);setPage('Messages')}} onFollow={()=>undefined} following={followed.includes(activeProfile.username)} listings={marketItems} onToast={notify}/>:page==='Notifications'?<NotificationsPage items={notifications} loading={notificationsLoading} onRead={markOneNotificationRead} onReadAll={markEveryNotificationRead} openMessages={username=>{if(username)setMessageTargetUsername(username);setPage('Messages')}} openEvents={()=>setPage('Events')} onProfile={username=>navigate(pathForProfile(username))}/>:page==='Settings'?<SettingsPage profile={profile} onSaveProfile={value=>{const payload={username:value.username.replace(/^@/, '').toLowerCase(),fullName:value.name,bio:value.bio,course:value.course,campus:value.campus,yearOfStudy:value.year ? Number(value.year) : undefined,interests:value.interests,skills:value.skills ?? [],isPrivate:value.visibility==='Private',photoUrl:value.avatarImage ?? null,coverUrl:value.coverImage ?? null};return updateOwnProfile(payload).then(()=>{setProfile(value);notify('Profile saved to your account')}).catch(error=>{notify(error instanceof Error?error.message:'Could not save profile.');throw error;});}} dark={dark} setDark={setDark} preferences={preferences} setPreferences={setPreferences} onLogout={()=>{void apiLogout();setCurrentUser(null);setPage('Landing')}} onReset={resetPreview}/>:page==='Saved'?<SavedPage posts={posts} listings={marketItems} favoriteIds={favorites} savedEventIds={savedEvents} onUnsavePost={toggleBookmark} onUnsaveListing={id=>setFavorites(current=>current.filter(x=>x!==id))} onUnsaveEvent={id=>setSavedEvents(current=>current.filter(x=>x!==id))} openMarketplace={()=>setPage('Marketplace')} openEvents={()=>setPage('Events')}/>:<><HomeHeader page={page} onCreate={()=>document.querySelector<HTMLTextAreaElement>('.composer textarea')?.focus()}/><div className="feed-grid"><section><div className="feed-tabs">{['For You','Following'].map(tab=><button key={tab} className={feedTab===tab?'selected':''} onClick={()=>setFeedTab(tab)}>{tab}</button>)}</div><Composer value={composer} setValue={setComposer} image={postImage} setImage={updatePostImage} publish={publish}/>{visiblePosts.filter(post=>feedTab!=='Following'||post.handle===profile.username||followed.includes(post.handle)).map(post=><PostCard key={post.id} post={post} own={post.handle===profile.username} onLike={()=>toggleLike(post.id)} onBookmark={()=>toggleBookmark(post.id)} onComment={reply=>addReply(post.id,reply)} onRepost={()=>{setPosts(current=>current.map(p=>p.id===post.id?{...p,reposts:(p.reposts??0)+1}:p));notify('Post reposted')}} onHide={()=>{setHiddenPosts(current=>current.includes(post.id)?current:[...current,post.id]);notify('Post hidden from feed')}} onReport={()=>notify('Report saved in this local preview')} onDelete={()=>{if(window.confirm('Delete this post?')){setPosts(current=>current.filter(p=>p.id!==post.id));notify('Post deleted')}}} onEdit={()=>{const content=window.prompt('Edit your post',post.content);if(content!==null){setPosts(current=>current.map(p=>p.id===post.id?{...p,content}:p));notify('Post updated')}}}/>)}{visiblePosts.length===0&&<div className="card empty-state"><Users size={24}/><h3>{feedTab==='Following'?'Your feed is ready to grow':'No matching posts'}</h3><p>Follow students or share a campus moment to get started.</p></div>}</section><RightRail followed={followed} toggleFollow={handle=>setFollowed(current=>current.includes(handle)?current.filter(x=>x!==handle):[...current,handle])} onExplore={()=>setPage('Explore')} onEvents={()=>setPage('Events')}/></div></>}</motion.div></AnimatePresence></main>
    </div><nav className="mobile-bottom-nav">{[{label:'Home',icon:Home},{label:'Explore',icon:Compass},{label:'Marketplace',icon:ShoppingBag},{label:'Messages',icon:MessageCircle},{label:'Profile',icon:Users}].map(({label,icon:Icon})=><button key={label} className={page===label?'active':''} onClick={()=>{if(label==='Profile')navigate('/profile');else setPage(label)}}><Icon size={19}/><small>{label}</small></button>)}</nav><Toast message={toast}/>
  </div>;
}

function HomeHeader({ page, onCreate }: { page: string; onCreate?: () => void }) { const [profile, setProfile] = useLocalState<Profile>('profile', profileSeed); useEffect(() => subscribeProfileUpdates(setProfile), []); return <div className="page-heading"><div><p className="eyebrow">{profile.university.toUpperCase()} · {profile.campus.toUpperCase()}</p><h1>{page === 'Home' ? `Good to see you, ${profile.name.split(' ')[0]}` : page}</h1><p className="muted">Here’s what’s happening around your campus.</p></div>{onCreate && <button className="primary-btn" onClick={onCreate}><Plus size={16}/> Create</button>}</div>; }
function Composer({ value, setValue, image, setImage, publish }: { value: string; setValue: (v: string) => void; image?: string; setImage: (file?: File) => void; publish: () => void }) { const [profile, setProfile] = useLocalState<Profile>('profile', profileSeed); useEffect(() => subscribeProfileUpdates(setProfile), []); return <div className="card composer"><div className="composer-row"><Avatar initials={profile.avatar} image={profile.avatarImage} imagePosition={profile.avatarCrop}/><textarea value={value} onChange={e => setValue(e.target.value)} placeholder="Share a campus moment, idea or question..." rows={2} /></div>{image && <div className="composer-image-preview"><img src={image} alt="Post preview"/><button aria-label="Remove selected image" onClick={() => setImage(undefined)}><X size={15}/></button></div>}<div className="composer-footer"><div className="composer-tools"><label className="composer-upload"><ImagePlus size={16}/><span>Photo</span><input type="file" accept="image/*" onChange={e => setImage(e.target.files?.[0])}/></label><button type="button" onClick={() => setValue(value ? `${value}\n#CampusQuestion` : '#CampusQuestion ')}># <span>Topic</span></button><button type="button" onClick={() => setValue(value ? `${value}\nPoll: ` : 'Poll: ')}>◉ <span>Poll</span></button></div><button className="primary-btn small" onClick={publish} disabled={!value.trim() && !image}>Share post</button></div></div>; }
function PostCard({ post, own, onLike, onBookmark, onComment, onRepost, onHide, onReport, onDelete, onEdit }: { post: Post; own:boolean; onLike: () => void; onBookmark: () => void; onComment: (reply: string) => void; onRepost:()=>void; onHide:()=>void; onReport:()=>void; onDelete:()=>void; onEdit:()=>void }) { const [commentOpen,setCommentOpen]=useState(false); const [reply,setReply]=useState(''); const [moreOpen,setMoreOpen]=useState(false); const submitReply=()=>{if(!reply.trim())return;onComment(reply.trim());setReply('');}; const share=()=>{void navigator.clipboard?.writeText(post.content).then(()=>window.alert('Post copied to clipboard.')).catch(()=>window.alert('Copy this post: '+post.content));}; return <article className="card post-card"><div className="post-head"><Avatar initials={post.avatar}/><div className="post-author"><strong>{post.name}</strong><span>{post.handle} · {post.time}</span></div><div className="post-more-wrap"><button className="more" aria-label="More post options" aria-expanded={moreOpen} onClick={()=>setMoreOpen(!moreOpen)}><MoreHorizontal size={19}/></button>{moreOpen&&<div className="post-more-menu">{own&&<><button onClick={()=>{setMoreOpen(false);onEdit()}}>Edit post</button><button onClick={()=>{setMoreOpen(false);onDelete()}}>Delete post</button></>}<button onClick={()=>{setMoreOpen(false);onHide()}}>Hide post</button>{!own&&<button onClick={()=>{setMoreOpen(false);onReport()}}>Report post</button>}</div>}</div></div><p className="post-school">{post.school}</p>{post.content&&<p className="post-content">{post.content}</p>}{post.image&&<img className="post-media" src={post.image} alt="Shared campus moment" onDoubleClick={onLike}/ >}{post.tag&&<span className="tag">#{post.tag}</span>}<div className="post-actions"><button onClick={onLike} className={post.liked?'liked':''} aria-label="Like post"><Heart size={19} fill={post.liked?'currentColor':'none'}/>{post.likes}</button><button onClick={()=>setCommentOpen(!commentOpen)} aria-expanded={commentOpen}><MessageCircle size={19}/>{post.comments}</button><button onClick={onRepost} aria-label="Repost"><Users size={18}/>{post.reposts??0}</button><button onClick={share} aria-label="Copy post link">↗</button><button onClick={onBookmark} className={post.bookmarked?'saved':''} aria-label={post.bookmarked?'Remove bookmark':'Bookmark post'}><Bookmark size={18} fill={post.bookmarked?'currentColor':'none'}/></button></div>{commentOpen&&<div className="comment-thread">{(post.replies??[]).map((text,i)=><p key={`${post.id}-${i}`}><b>You</b> {text}</p>)}<div className="comment-compose"><input value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submitReply()}} placeholder="Add a thoughtful comment..."/><button onClick={submitReply} disabled={!reply.trim()} aria-label="Send comment"><Send size={16}/></button></div></div>}</article>; }
function RightRail({ followed, toggleFollow, onExplore, onEvents }: { followed: string[]; toggleFollow: (handle: string) => void; onExplore:()=>void; onEvents:()=>void }) {
  return <aside className="right-rail">
    <section><div className="rail-heading"><h3>Trending on campus</h3><button onClick={onExplore}>Explore</button></div><div className="card empty-state"><p>No campus trends yet. They will appear as students start sharing.</p></div></section>
    <section><div className="rail-heading"><h3>Upcoming events</h3><button onClick={onEvents}>See all</button></div><div className="card empty-state"><p>No events have been published yet.</p></div></section>
    <section className="suggestions"><div className="rail-heading"><h3>People to connect</h3><button onClick={onExplore}>See all</button></div><div className="card empty-state"><p>Student suggestions will appear when real profiles are available.</p></div></section>
  </aside>;
}

const eventSeed: {id:string;title:string;category:string;day:string;month:string;time:string;venue:string;campus:string;description:string}[] = [];

function Marketplace({ listings, search, setSearch, category, setCategory, favorites, toggleFavorite, createListing, openMessages }: { listings: Listing[]; search: string; setSearch: (value: string) => void; category: string; setCategory: (value: string) => void; favorites: number[]; toggleFavorite: (id: number) => void; createListing: (listing: Omit<Listing, 'id'>) => void; openMessages: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [campus, setCampus] = useState(launchUniversity.campuses[0] || 'Main Campus');
  const [kind, setKind] = useState('Books');
  const [description, setDescription] = useState('');
  const categories = ['All items', ...new Set(listings.map((item) => item.category))];
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !/^\d+(\.\d{1,2})?$/.test(price)) return;
    createListing({ title: title.trim(), price: `KES ${Number(price).toLocaleString('en-KE')}`, campus, category: kind, image: '', seller: 'You', description: description.trim() });
    setTitle(''); setPrice(''); setDescription(''); setShowForm(false);
  };
  const filtered = listings.filter((item) => (category === 'All items' || item.category === category) && `${item.title} ${item.category} ${item.campus}`.toLowerCase().includes(search.toLowerCase()));
  return <><div className="page-heading"><div><p className="eyebrow">CAMPUS MARKETPLACE</p><h1>Find your next essential</h1><p className="muted">Buy and sell with students on your campus.</p></div><button className="primary-btn" onClick={() => setShowForm(true)}><Plus size={16}/> Sell an item</button></div><div className="market-tools"><div className="input-box"><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search listings..."/></div>{categories.map((item) => <button className={item === category ? 'filter active' : 'filter'} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div>{filtered.length ? <div className="listing-grid">{filtered.map((item) => <article className="listing card" key={item.id}><div className="listing-image"><div className="empty-state"><ShoppingBag size={28}/></div><button className={favorites.includes(item.id) ? 'liked' : ''} onClick={() => toggleFavorite(item.id)} aria-label="Toggle favorite"><Heart size={17}/></button></div><div className="listing-body"><span className="tag">{item.category}</span><h3>{item.title}</h3><strong className="price">{item.price}</strong><div className="listing-meta"><span>{item.campus}</span><span>{item.seller}</span></div><button className="listing-message" onClick={openMessages}><MessageCircle size={14}/> Message seller</button></div></article>)}</div> : <div className="card empty-state"><ShoppingBag size={25}/><h3>No listings yet</h3><p>Real student listings will appear here when available. Start by adding a listing.</p></div>}{showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><form className="app-modal" onSubmit={submit} onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setShowForm(false)}><X size={18}/></button><h2>List an item</h2><label>Item name<input required value={title} onChange={(event) => setTitle(event.target.value)}/></label><div className="form-row"><label>Price (KES)<input required inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)}/></label><label>Category<select value={kind} onChange={(event) => setKind(event.target.value)}>{['Books','Electronics','Furniture','Clothing','Services','Other'].map((item) => <option key={item}>{item}</option>)}</select></label></div><label>Campus<input required value={campus} onChange={(event) => setCampus(event.target.value)}/></label><label>Description<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)}/></label><button className="primary-btn modal-submit" type="submit">Publish listing</button></form></div>}</>;
}

function Events({ interested, toggle, saved, toggleSaved }: { interested: string[]; toggle: (id: string) => void; saved: string[]; toggleSaved: (id: string) => void }) { const [filter,setFilter]=useState('All events'); const [selected,setSelected]=useState<typeof eventSeed[number]|null>(null); const types=['All events',...new Set(eventSeed.map(e=>e.category))]; const events=filter==='All events'?eventSeed:eventSeed.filter(e=>e.category===filter); return <><HomeHeader page="Events"/><div className="event-filter-row">{types.map(type=><button key={type} className={filter===type?'filter active':'filter'} onClick={()=>setFilter(type)}>{type}</button>)}</div><div className="event-list">{events.length === 0 ? <div className="card empty-state"><CalendarDays size={25}/><h3>No events yet</h3><p>Campus events will show here once they are published.</p></div> : events.map((event,i)=><article className="card event-row" key={event.id}><button className={`date-tile ${i%2?'purple':''}`} onClick={()=>setSelected(event)}><b>{event.day}</b><span>{event.month}</span></button><div className="event-row-copy" onClick={()=>setSelected(event)}><span className="tag">{event.category}</span><h3>{event.title}</h3><p>{event.campus} · {event.venue} · {event.time}</p><small>{event.description}</small></div><div className="event-row-actions"><button className="icon-btn" onClick={()=>toggleSaved(event.id)} aria-label="Save event"><Bookmark size={17} fill={saved.includes(event.id)?'currentColor':'none'}/></button><button className="outline-btn" onClick={()=>toggle(event.id)}>{interested.includes(event.id)?'Interested ✓':'I’m interested'}</button><button className="text-link" onClick={()=>setSelected(event)}>Details</button></div></article>)}</div>{selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><section className="app-modal event-detail" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelected(null)} aria-label="Close"><X size={18}/></button><span className="tag">{selected.category}</span><h2>{selected.title}</h2><p>{selected.description}</p><p><b>{selected.day} {selected.month} · {selected.time}</b><br/>{selected.venue} · {selected.campus}</p><div className="event-row-actions"><button className="primary-btn" onClick={()=>toggle(selected.id)}>{interested.includes(selected.id)?'You’re interested':'I’m interested'}</button><button className="outline-btn" onClick={()=>toggleSaved(selected.id)}>{saved.includes(selected.id)?'Saved':'Save event'}</button></div></section></div>}</>; }
function MessagesLegacy() { const names=['Joy M.','Dylan O.','Campus Creatives']; const initialChats:Record<string,{text:string;mine:boolean}[]>={'Joy M.':[{text:'Hey! Are you coming to the student commons this afternoon?',mine:false},{text:'Yes, I should be there around 3. Save me a seat?',mine:true},{text:'Of course! See you there 🙂',mine:false}],'Dylan O.':[{text:'That sounds great. Let me check my schedule.',mine:false}],'Campus Creatives':[{text:'Njeri shared a photo from the meetup.',mine:false}]}; const [chats,setChats]=useLocalState<Record<string,{text:string;mine:boolean}[]>>('messages',initialChats); const [selected,setSelected]=useState(names[0]); const [query,setQuery]=useState(''); const [draft,setDraft]=useState(''); const lastMessage=(name:string)=>{const messages=chats[name]??[];return messages[messages.length-1]?.text??'Start a conversation';}; const send=(e:React.FormEvent)=>{e.preventDefault();if(!draft.trim())return;setChats(current=>({...current,[selected]:[...(current[selected]??[]),{text:draft.trim(),mine:true}]}));setDraft('');}; return <><HomeHeader page="Messages"/><div className="card messages"><div className="conversation-list"><div className="message-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search conversations"/></div>{names.filter(name=>`${name} ${lastMessage(name)}`.toLowerCase().includes(query.toLowerCase())).map((name,i)=><button className={`conversation ${selected===name?'selected':''}`} key={name} onClick={()=>setSelected(name)}><Avatar initials={name.split(' ').map(y=>y[0]).join('')}/><div><strong>{name}</strong><small>{lastMessage(name)}</small></div><span>{['2m','1h','3h'][i]}</span></button>)}</div><section className="chat-active"><header className="chat-head"><Avatar initials={selected.split(' ').map(y=>y[0]).join('')}/><div><strong>{selected}</strong><small>CampusLink member · local demo</small></div></header><div className="chat-scroll">{(chats[selected]??[]).map((message,i)=><div className={`chat-bubble ${message.mine?'mine':''}`} key={`${selected}-${i}`}>{message.text}<span className="chat-time">{message.mine?'Sent':'Today'}</span></div>)}</div><form className="chat-send" onSubmit={send}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder={`Message ${selected}…`}/><button type="submit" aria-label="Send message" disabled={!draft.trim()}><Send size={16}/></button></form></section></div></>; }

function Toast({ message }: { message: string }) { return <AnimatePresence>{message&&<motion.div className="app-toast" role="status" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}>{message}</motion.div>}</AnimatePresence>; }




