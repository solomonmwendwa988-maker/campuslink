import { useEffect, useState, type FormEvent } from 'react';
import { Bookmark, MessageCircle, Share2, UserRound, Shield, Check, X } from 'lucide-react';
import { Avatar } from '../components/shared/Avatar';
import { useLocalState } from '../hooks/useLocalState';
import { StudentProfile } from './CorePages';
import { Post } from '../types/post';
import { ApiError, followStudent, getPublicProfile, getOwnProfile, unfollowStudent, submitVerificationRequest, getMyVerificationRequest } from '../services/api';

type Listing = { id: number; title: string; price: string; campus: string; category: string; image: string; seller: string };
type Counts = { posts?: number; follows?: number; followedBy?: number };
type ProfilePageProps = {
  profile: StudentProfile;
  posts: Post[];
  isOwn: boolean;
  username?: string | null;
  viewerUsername?: string;
  onEdit: () => void;
  onMessage: () => void;
  onFollow: () => void;
  following: boolean;
  listings: Listing[];
  onToast: (message: string) => void;
};

type PublicUser = {
  id: string;
  username: string;
  profile?: {
    fullName?: string | null;
    bio?: string | null;
    course?: string | null;
    yearOfStudy?: number | string | null;
    photoUrl?: string | null;
    coverUrl?: string | null;
    verifiedAt?: string | null;
    interests?: string[];
    skills?: string[];
    campus?: { name?: string | null } | string | null;
    university?: { name?: string | null } | string | null;
  } | null;
  counts?: Counts;
};

function textValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}
function placeName(value: { name?: string | null } | string | null | undefined): string {
  return typeof value === 'string' ? value : value?.name ?? '';
}
function mapPublicProfile(user: PublicUser, fallback: StudentProfile): StudentProfile {
  const data = user.profile;
  const name = data?.fullName?.trim() || user.username;
  return {
    ...fallback,
    name,
    username: `@${user.username.replace(/^@/, '')}`,
    bio: data?.bio ?? '',
    university: placeName(data?.university) || fallback.university,
    campus: placeName(data?.campus) || fallback.campus,
    course: data?.course ?? '',
    year: data?.yearOfStudy == null ? '' : String(data.yearOfStudy),
    interests: data?.interests ?? [],
    skills: data?.skills ?? [],
    avatar: name.split(/\\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'ST',
    avatarImage: data?.photoUrl ?? undefined,
    verifiedAt: data?.verifiedAt ?? null,
    coverImage: data?.coverUrl ?? undefined,
    visibility: 'Public',
  };
}

export function ProfilePage({ profile, posts, isOwn, username, viewerUsername, onEdit, onMessage, onFollow, following: initialFollowing, listings, onToast }: ProfilePageProps) {
  const [tab, setTab] = useState('Posts');
  const [preferences] = useLocalState<Record<string, boolean>>('preferences', {});
  const [remoteProfile, setRemoteProfile] = useState<StudentProfile | null>(null);
  const [counts, setCounts] = useState<Counts>({});
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [profileLoading, setProfileLoading] = useState(Boolean(username && !isOwn));
  const [profileError, setProfileError] = useState('');
  const [followBusy, setFollowBusy] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationConsent, setVerificationConsent] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState(profile.email ?? '');
  const [verificationForm, setVerificationForm] = useState({ fullName: profile.name, studentId: '', phone: '', course: profile.course, campus: profile.campus, reason: '' });
  const targetUsername = (username || profile.username).replace(/^@/, '');
  const ownView = isOwn || Boolean(viewerUsername && targetUsername.toLowerCase() === viewerUsername.toLowerCase());
  const displayedProfile = ownView ? profile : remoteProfile ?? profile;

  useEffect(() => {
    if (ownView) {
      let cancelled = false;
      setRemoteProfile(null);
      setCounts({});
      setProfileLoading(false);
      setProfileError('');
      setIsFollowing(false);
      const loadOwnCounts = async () => {
        try { const result = await getOwnProfile(); if (!cancelled) { setCounts(result.user.counts ?? {}); setVerificationEmail(result.user.email ?? profile.email ?? ''); setVerificationStatus(result.user.profile?.verifiedAt ? 'APPROVED' : null); } }
        catch { /* Keep counts unavailable rather than showing invented values. */ }
        try { const verification = await getMyVerificationRequest(); if (!cancelled && verification.request) setVerificationStatus(verification.request.status); } catch { /* Request status unavailable. */ }
      };
      void loadOwnCounts();
      return () => { cancelled = true; };
    }
    if (!username) { setRemoteProfile(null); setCounts({}); setProfileLoading(false); setProfileError(''); setIsFollowing(false); return; }

    let cancelled = false;
    setProfileLoading(true);
    setProfileError('');
    setRemoteProfile(null);
    setCounts({});
    setIsFollowing(false);

    const load = async () => {
      try {
        const result = await getPublicProfile(username);
        if (cancelled) return;
        setRemoteProfile(mapPublicProfile(result.user, profile));
        setCounts(result.user.counts ?? {});
        if (!cancelled) setIsFollowing(Boolean(result.user.isFollowing));
      } catch (error) {
        if (!cancelled) {
          setProfileError(error instanceof ApiError && error.status === 403
            ? 'This student’s profile is private.'
            : error instanceof Error ? error.message : 'Could not load this profile.');
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [username, viewerUsername, ownView, profile]);

  const copyProfile = async () => {
    try { await navigator.clipboard.writeText(window.location.href); onToast('Profile link copied'); }
    catch { onToast('Could not copy the profile link on this device'); }
  };

  const toggleFollow = async () => {
    if (ownView || followBusy || !username) return;
    setFollowBusy(true);
    const previous = isFollowing;
    setIsFollowing(!previous);
    setCounts(current => ({ ...current, followedBy: Math.max(0, (current.followedBy ?? 0) + (previous ? -1 : 1)) }));
    try {
      if (previous) await unfollowStudent(username);
      else await followStudent(username);
      onToast(previous ? 'Unfollowed student' : 'Following student');
    } catch (error) {
      setIsFollowing(previous);
      setCounts(current => ({ ...current, followedBy: Math.max(0, (current.followedBy ?? 0) + (previous ? 1 : -1)) }));
      onToast(error instanceof Error ? error.message : 'Could not update follow status.');
    } finally {
      setFollowBusy(false);
    }
  };

  const submitVerification = async (event: FormEvent) => {
    event.preventDefault(); if (verificationBusy) return; setVerificationBusy(true);
    try { const result = await submitVerificationRequest({ ...verificationForm, attestationsAccepted: true }); setVerificationStatus(result.request.status); setVerificationConsent(false); setVerificationOpen(false); onToast('Verification request submitted. It is pending review.'); }
    catch (error) { onToast(error instanceof Error ? error.message : 'Could not submit verification request.'); }
    finally { setVerificationBusy(false); }
  };

  const isVisible = displayedProfile.visibility === 'Public' || ownView;
  const displayPostsCount = counts.posts ?? posts.length;
  const displayFollowers = counts.followedBy;
  const displayFollowing = counts.follows;

  if (!ownView && profileLoading) return <section className="card empty-state profile-loading"><p>Loading student profile…</p></section>;
  if (!ownView && profileError) return <section className="card empty-state profile-loading"><UserRound size={24}/><h2>Profile unavailable</h2><p>{profileError}</p></section>;
  if (!isVisible) return <section className="card profile-private"><span><UserRound size={24}/></span><h1>This profile is private</h1><p>Only this student can see their campus details and posts.</p>{!ownView && <button className="outline-btn" onClick={toggleFollow} disabled={followBusy}>{isFollowing ? 'Following' : 'Follow'}</button>}</section>;

  return <section className="profile-page profile-page-v2">
    <div className="profile-cover" style={displayedProfile.coverImage ? { backgroundImage: `linear-gradient(0deg,#10264f66,transparent),url(${displayedProfile.coverImage})` } : undefined}><div className="cover-art">UNIVERSITY OF KABIANGA · CAMPUS COMMUNITY</div></div>
    <div className="profile-main">
      <div className="profile-top"><Avatar initials={displayedProfile.avatar} image={displayedProfile.avatarImage} imagePosition={displayedProfile.avatarCrop} large/><div className="profile-actions">{ownView ? <><button className="outline-btn" onClick={onEdit}>Edit profile</button><button className="outline-btn verification-request-button" onClick={() => setVerificationOpen(true)}><Shield size={15}/>{verificationStatus === 'PENDING' ? 'Verification pending' : verificationStatus === 'APPROVED' ? 'Verified' : 'Request verification'}</button></> : <><button className="primary-btn" onClick={toggleFollow} disabled={followBusy}>{followBusy ? 'Updating…' : isFollowing ? 'Following' : 'Follow'}</button>{preferences.messages !== false && <button className="outline-btn" onClick={onMessage}><MessageCircle size={15}/> Message</button>}</> }<button className="outline-btn" onClick={() => void copyProfile()}><Share2 size={15}/> Share</button></div></div>
      <h1>{displayedProfile.name}{(displayedProfile.verifiedAt || (ownView && verificationStatus === 'APPROVED')) && <span className="campuslink-verified" title="CampusLink verified"><Shield size={15}/><Check size={10}/></span>}</h1><p className="profile-handle">{displayedProfile.username}{preferences.showUniversity === true ? ` · ${displayedProfile.university} · ${displayedProfile.campus}` : ''}</p>
      {displayedProfile.bio && <p className="profile-bio">{displayedProfile.bio}</p>}
      <div className="profile-facts"><span><b>{displayPostsCount}</b> posts</span><span><b>{displayFollowers ?? '—'}</b> followers</span><span><b>{displayFollowing ?? '—'}</b> following</span></div>
      <div className="profile-meta">{preferences.showCourse === true && displayedProfile.course && <span>{displayedProfile.course}</span>}{preferences.showYear === true && displayedProfile.year && <span>Year {displayedProfile.year}</span>}{preferences.showInterests === true && displayedProfile.interests.map(interest => <span className="tag" key={interest}>{interest}</span>)}{preferences.showInterests === true && (displayedProfile.skills ?? []).map(skill => <span className="tag skill-tag" key={skill}>{skill}</span>)}</div>
      <div className="profile-tabs">{['Posts', 'About', 'Marketplace listings'].map(item => <button className={tab === item ? 'selected' : ''} key={item} onClick={() => setTab(item)}>{item}</button>)}</div>
      {tab === 'Posts' && <div className="profile-post-grid">{posts.map(post => <article className="card profile-post" key={post.id}>{post.image && <img src={post.image} alt=""/>}<p>{post.content}</p><small>{post.likes} likes · {post.comments} comments</small></article>)}{posts.length === 0 && <div className="card empty-state">No posts available in this profile yet.</div>}</div>}
      {tab === 'About' && <section className="card about-card"><h2>About {ownView ? 'you' : displayedProfile.name.split(' ')[0]}</h2><p>{displayedProfile.bio || 'This student has not added a bio yet.'}</p><dl>{preferences.showUniversity === true && <><dt>University</dt><dd>{displayedProfile.university}</dd><dt>Campus</dt><dd>{displayedProfile.campus}</dd></>}{preferences.showCourse === true && <><dt>Course or program</dt><dd>{displayedProfile.course}</dd></>}{preferences.showYear === true && <><dt>Year of study</dt><dd>{displayedProfile.year || '—'}</dd></>}{preferences.showInterests === true && <><dt>Interests</dt><dd>{displayedProfile.interests.join(' · ') || '—'}</dd><dt>Skills</dt><dd>{(displayedProfile.skills ?? []).join(' · ') || '—'}</dd></>}</dl></section>}
      {tab === 'Marketplace listings' && <div className="profile-listings">{listings.filter(item => item.seller === displayedProfile.name).map(item => <article className="card profile-post" key={item.id}><img className="profile-listing-image" src={item.image} alt=""/><h3>{item.title}</h3><b>{item.price}</b></article>)}{listings.every(item => item.seller !== displayedProfile.name) && <div className="card empty-state"><Bookmark size={22}/><p>No marketplace listings yet.</p></div>}</div>}
    </div>
    {verificationOpen && <div className="verification-overlay" role="dialog" aria-modal="true" aria-labelledby="verification-title"><form className="verification-modal" onSubmit={submitVerification}><header><div><span className="verification-kicker">CAMPUSLINK TRUST</span><h2 id="verification-title">Request verification</h2><p>Verification is selective and never automatic. Requests remain pending until reviewed.</p></div><button type="button" className="verification-close" onClick={() => setVerificationOpen(false)} aria-label="Close"><X size={18}/></button></header><div className="verification-note"><Shield size={18}/><span>Submitting details does not grant a badge. Phone, email and student identity checks will be required before approval.</span></div><label>Account email<input type="email" readOnly value={verificationEmail} placeholder="Email on your CampusLink account"/></label><label>Full legal name<input required minLength={2} maxLength={100} value={verificationForm.fullName} onChange={e=>setVerificationForm(v=>({...v,fullName:e.target.value}))}/></label><label>Student ID number<input required minLength={6} maxLength={40} value={verificationForm.studentId} onChange={e=>setVerificationForm(v=>({...v,studentId:e.target.value}))}/></label><label>Phone number<input required type="tel" pattern="\+?[0-9]{9,15}" placeholder="e.g. +2547XXXXXXXX" value={verificationForm.phone} onChange={e=>setVerificationForm(v=>({...v,phone:e.target.value}))}/></label><label>Course / program<input required maxLength={120} value={verificationForm.course} onChange={e=>setVerificationForm(v=>({...v,course:e.target.value}))}/></label><label>Campus<input required maxLength={120} value={verificationForm.campus} onChange={e=>setVerificationForm(v=>({...v,campus:e.target.value}))}/></label><label>Why should this account be verified?<textarea required minLength={20} maxLength={800} rows={3} value={verificationForm.reason} onChange={e=>setVerificationForm(v=>({...v,reason:e.target.value}))}/></label><p className="verification-privacy">Your student ID is stored as a one-way hash, not plain text. Email is taken from your account. This request currently records details only; document upload, phone OTP, and email OTP checks are not yet available, so no badge is awarded automatically.</p><label className="verification-consent"><input type="checkbox" checked={verificationConsent} onChange={e=>setVerificationConsent(e.target.checked)} required/><span>I confirm these details are accurate and consent to their use for verification review.</span></label><footer><button type="button" className="outline-btn" onClick={() => setVerificationOpen(false)}>Cancel</button><button type="submit" className="primary-btn" disabled={verificationBusy || verificationStatus === 'PENDING' || !verificationConsent}>{verificationBusy ? 'Submitting…' : 'Submit request'}</button></footer></form></div>}
  </section>;
}
