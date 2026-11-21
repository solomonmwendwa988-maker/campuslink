import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Compass, Heart, MessageCircle, Search, ShoppingBag, Users, X } from 'lucide-react';
import { Avatar } from '../components/shared/Avatar';
import { Post } from '../types/post';
import { launchUniversity } from '../data/universities';
import { discoverStudents, DiscoverStudent } from '../services/api';

type Listing = { id: number; title: string; price: string; campus: string; category: string; image: string; seller: string };
type ExploreProps = { posts: Post[]; listings: Listing[]; search: string; setSearch: (value: string) => void; onProfile: (username: string) => void; onMarketplace: () => void; onEvents: () => void };
export function ExplorePage({ posts, listings, search, setSearch, onProfile, onMarketplace, onEvents }: ExploreProps) {
  const [tab, setTab] = useState('All');
  const [people, setPeople] = useState<DiscoverStudent[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [peopleError, setPeopleError] = useState('');
  useEffect(() => {
    let active = true;
    setPeopleLoading(true);
    setPeopleError('');
    discoverStudents(search).then(result => { if (active) setPeople(result); }).catch(error => { if (active) setPeopleError(error instanceof Error ? error.message : 'Could not load students.'); }).finally(() => { if (active) setPeopleLoading(false); });
    return () => { active = false; };
  }, [search]);
  const normalized = search.trim().toLowerCase();
  const filtered = useMemo(() => ({
    people: people,
    posts: posts.filter(post => `${post.name} ${post.handle} ${post.content}`.toLowerCase().includes(normalized)),
    listings: listings.filter(item => `${item.title} ${item.category} ${item.campus}`.toLowerCase().includes(normalized)),
  }), [normalized, posts, listings]);
  return <div className="explore-page kabianga-explore">
    <div className="page-heading"><div><p className="eyebrow">{launchUniversity.name.toUpperCase()}</p><h1>Discover your campus</h1><p className="muted">People, conversations and student finds from your community.</p></div><button className="outline-btn" onClick={onEvents}><CalendarDays size={15}/> Campus events</button></div>
    <label className="explore-search"><Search size={18}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search Kabianga students, posts and finds" aria-label="Search campus"/><button onClick={() => setSearch('')} aria-label="Clear search"><X size={16}/></button></label>
    <div className="explore-tabs">{['All','People','Posts','Marketplace'].map(item => <button key={item} className={tab === item ? 'selected' : ''} onClick={() => setTab(item)}>{item}</button>)}</div>
    {(tab === 'All' || tab === 'People') && <section className="kabianga-explore-section"><div className="section-title"><span><Users size={17}/> Students to meet</span><small>University of Kabianga</small></div>{peopleLoading ? <div className="card empty-state"><p>Finding students…</p></div> : peopleError ? <div className="card empty-state"><h3>Students could not be loaded</h3><p>{peopleError}</p></div> : filtered.people.map(person => { const name = person.profile?.fullName || person.username; const initials = name.split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase(); return <button className="explore-person card" key={person.id} onClick={() => onProfile(person.username)}><Avatar initials={initials || 'CL'} image={person.profile?.photoUrl || undefined}/><span><b>{name}</b><small>@{person.username} · {person.profile?.course || 'Student'}</small></span><ChevronRight size={16}/></button>; })}{!peopleLoading && !peopleError && filtered.people.length === 0 && <div className="card empty-state"><Users size={22}/><h3>{normalized ? 'No students match your search' : 'No students to discover yet'}</h3><p>Students who register will appear here as they join CampusLink.</p></div>}</section>}
    {(tab === 'All' || tab === 'Posts') && <section className="kabianga-explore-section"><div className="section-title"><span><MessageCircle size={17}/> Campus conversations</span></div>{filtered.posts.map(post => <article className="card explore-post" key={post.id}><b>{post.name}</b><small>{post.handle} · {post.time}</small><p>{post.content}</p><span><Heart size={14}/> {post.likes} <MessageCircle size={14}/> {post.comments}</span></article>)}</section>}
    {(tab === 'All' || tab === 'Marketplace') && <section className="kabianga-explore-section"><div className="section-title"><span><ShoppingBag size={17}/> Student marketplace</span><button onClick={onMarketplace}>Browse all <ChevronRight size={14}/></button></div><div className="explore-products">{filtered.listings.map(item => <button className="card explore-product" key={item.id} onClick={onMarketplace}><img src={item.image} alt=""/><span><b>{item.title}</b><strong>{item.price}</strong><small>{launchUniversity.campuses[0]} · {item.category}</small></span></button>)}</div></section>}
    {normalized && filtered.posts.length + filtered.listings.length === 0 && <div className="card empty-state"><Compass size={22}/><h3>No matches yet</h3><p>Try another search within the University of Kabianga community.</p></div>}
    <button className="text-link kabianga-events-link" onClick={onEvents}>Explore campus events <ChevronRight size={15}/></button>
  </div>;
}
