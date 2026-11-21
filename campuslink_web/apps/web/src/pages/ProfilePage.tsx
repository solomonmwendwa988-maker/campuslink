import { useState } from 'react';
import { Bookmark, MessageCircle, Share2, UserRound } from 'lucide-react';
import { Avatar } from '../components/shared/Avatar';
import { useLocalState } from '../hooks/useLocalState';
import { StudentProfile } from './CorePages';
import { Post } from '../types/post';

type Listing = { id: number; title: string; price: string; campus: string; category: string; image: string; seller: string };
type ProfilePageProps = { profile: StudentProfile; posts: Post[]; isOwn: boolean; onEdit: () => void; onMessage: () => void; onFollow: () => void; following: boolean; listings: Listing[]; onToast: (message: string) => void };

export function ProfilePage({ profile, posts, isOwn, onEdit, onMessage, onFollow, following, listings, onToast }: ProfilePageProps) {
  const [tab, setTab] = useState('Posts');
  const [preferences] = useLocalState<Record<string, boolean>>('preferences', {});
  const isVisible = profile.visibility === 'Public' || isOwn;
  const copyProfile = async () => {
    try { await navigator.clipboard.writeText(window.location.href); onToast('Profile link copied'); }
    catch { onToast('Could not copy the profile link on this device'); }
  };

  if (!isVisible) return <section className="card profile-private"><span><UserRound size={24}/></span><h1>This profile is private</h1><p>Only this student can see their campus details and posts.</p>{!isOwn && <button className="outline-btn" onClick={onFollow}>{following ? 'Following' : 'Follow'}</button>}</section>;

  return <section className="profile-page profile-page-v2">
    <div className="profile-cover" style={profile.coverImage ? { backgroundImage: `linear-gradient(0deg,#10264f66,transparent),url(${profile.coverImage})` } : undefined}><div className="cover-art">UNIVERSITY OF KABIANGA · CAMPUS COMMUNITY</div></div>
    <div className="profile-main">
      <div className="profile-top"><Avatar initials={profile.avatar} image={profile.avatarImage} imagePosition={profile.avatarCrop} large/><div className="profile-actions">{isOwn ? <button className="outline-btn" onClick={onEdit}>Edit profile</button> : <><button className="primary-btn" onClick={onFollow}>{following ? 'Following' : 'Follow'}</button>{preferences.messages !== false && <button className="outline-btn" onClick={onMessage}>Message</button>}</>}<button className="outline-btn" onClick={() => void copyProfile()}><Share2 size={15}/> Share</button></div></div>
      <h1>{profile.name}</h1><p className="profile-handle">{profile.username}{preferences.showUniversity === true ? ` · ${profile.university} · ${profile.campus}` : ''}</p>
      {profile.bio && <p className="profile-bio">{profile.bio}</p>}
      <div className="profile-facts"><span><b>{posts.length}</b> posts</span><span><b>—</b> followers</span><span><b>—</b> following</span></div>
      <div className="profile-meta">{preferences.showCourse === true && profile.course && <span>{profile.course}</span>}{preferences.showYear === true && profile.year && <span>Year {profile.year}</span>}{preferences.showInterests === true && profile.interests.map(interest => <span className="tag" key={interest}>{interest}</span>)}{preferences.showInterests === true && (profile.skills ?? []).map(skill => <span className="tag skill-tag" key={skill}>{skill}</span>)}</div>
      <div className="profile-tabs">{['Posts', 'About', 'Marketplace listings'].map(item => <button className={tab === item ? 'selected' : ''} key={item} onClick={() => setTab(item)}>{item}</button>)}</div>
      {tab === 'Posts' && <div className="profile-post-grid">{posts.map(post => <article className="card profile-post" key={post.id}>{post.image && <img src={post.image} alt=""/>}<p>{post.content}</p><small>{post.likes} likes · {post.comments} comments</small></article>)}{posts.length === 0 && <div className="card empty-state">No posts yet.</div>}</div>}
      {tab === 'About' && <section className="card about-card"><h2>About {isOwn ? 'you' : profile.name.split(' ')[0]}</h2><p>{profile.bio || 'This student has not added a bio yet.'}</p><dl>{preferences.showUniversity === true && <><dt>University</dt><dd>{profile.university}</dd><dt>Campus</dt><dd>{profile.campus}</dd></>}{preferences.showCourse === true && <><dt>Course or program</dt><dd>{profile.course}</dd></>}{preferences.showYear === true && <><dt>Year of study</dt><dd>{profile.year || '—'}</dd></>}{preferences.showInterests === true && <><dt>Interests</dt><dd>{profile.interests.join(' · ') || '—'}</dd><dt>Skills</dt><dd>{(profile.skills ?? []).join(' · ') || '—'}</dd></>}</dl></section>}
      {tab === 'Marketplace listings' && <div className="profile-listings">{listings.filter(item => item.seller === profile.name).map(item => <article className="card profile-post" key={item.id}><img className="profile-listing-image" src={item.image} alt=""/><h3>{item.title}</h3><b>{item.price}</b></article>)}{listings.every(item => item.seller !== profile.name) && <div className="card empty-state"><Bookmark size={22}/><p>No marketplace listings yet.</p></div>}</div>}
    </div>
  </section>;
}
