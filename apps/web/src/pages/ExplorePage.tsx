import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Compass, Heart, MessageCircle, Search, ShoppingBag, Users, X } from 'lucide-react';
import { Avatar } from '../components/shared/Avatar';
import { VerifiedName } from '../components/shared/VerifiedName';
import { Post } from '../types/post';
import { launchUniversity } from '../data/universities';
import { discoverStudents, DiscoverStudent } from '../services/api';

type Listing = { id: number; title: string; price: string; campus: string; category: string; image: string; seller: string };
type ExploreProps = {
  posts: Post[];
  listings: Listing[];
  search: string;
  setSearch: (value: string) => void;
  onProfile: (username: string) => void;
  onMarketplace: () => void;
  onEvents: () => void;
};

type StudentRecord = DiscoverStudent & {
  id?: string;
  username?: string;
  profile?: {
    fullName?: string | null;
    photoUrl?: string | null;
    course?: string | null;
    verifiedAt?: string | null;
  } | null;
};

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** Handles both the normal student object and API envelopes such as { user: ... }. */
function normalizeStudent(raw: unknown): StudentRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const outer = raw as Record<string, unknown>;
  const candidate = outer.user && typeof outer.user === 'object'
    ? outer.user as Record<string, unknown>
    : outer;
  const profileRaw = candidate.profile && typeof candidate.profile === 'object'
    ? candidate.profile as Record<string, unknown>
    : {};
  const username = asText(candidate.username);
  const id = asText(candidate.id, username);
  if (!username && !id) return null;

  return {
    ...(candidate as unknown as DiscoverStudent),
    id,
    username,
    profile: {
      fullName: asText(profileRaw.fullName, username || 'Student'),
      photoUrl: asText(profileRaw.photoUrl) || null,
      course: asText(profileRaw.course),
      verifiedAt: asText(profileRaw.verifiedAt) || null,
    },
  };
}

function extractStudents(result: unknown): DiscoverStudent[] {
  let rows: unknown = result;
  if (rows && typeof rows === 'object' && !Array.isArray(rows)) {
    const envelope = rows as Record<string, unknown>;
    rows = envelope.data ?? envelope.students ?? envelope.results;
  }
  if (rows && typeof rows === 'object' && !Array.isArray(rows)) {
    const envelope = rows as Record<string, unknown>;
    rows = envelope.data ?? envelope.students ?? envelope.results;
  }
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeStudent).filter((person): person is StudentRecord => person !== null) as DiscoverStudent[];
}

function initialsFor(name: unknown, username: unknown): string {
  const safeName = asText(name, asText(username, 'Student')).trim();
  const initials = safeName
    .split(/\\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();
  return initials || 'CL';
}

function safePostText(value: unknown): string {
  return asText(value);
}

export function ExplorePage({ posts, listings, search, setSearch, onProfile, onMarketplace, onEvents }: ExploreProps) {
  const [tab, setTab] = useState('All');
  const [people, setPeople] = useState<DiscoverStudent[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [peopleError, setPeopleError] = useState('');
  const normalized = search.trim().toLowerCase();

  useEffect(() => {
    let active = true;
    setPeopleLoading(true);
    setPeopleError('');

    discoverStudents(search)
      .then(result => {
        if (active) setPeople(extractStudents(result));
      })
      .catch(error => {
        if (active) {
          setPeople([]);
          setPeopleError(error instanceof Error ? error.message : 'Could not load students.');
        }
      })
      .finally(() => {
        if (active) setPeopleLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search]);

  const filtered = useMemo(() => ({
    people,
    posts: (Array.isArray(posts) ? posts : []).filter(post => {
      const searchable = [post?.name, post?.handle, post?.content].map(value => asText(value)).join(' ').toLowerCase();
      return searchable.includes(normalized);
    }),
    listings: (Array.isArray(listings) ? listings : []).filter(item => {
      const searchable = [item?.title, item?.category, item?.campus, item?.seller].map(value => asText(value)).join(' ').toLowerCase();
      return searchable.includes(normalized);
    }),
  }), [normalized, people, posts, listings]);

  const showPeople = tab === 'All' || tab === 'People';
  const showPosts = tab === 'All' || tab === 'Posts';
  const showMarketplace = tab === 'All' || tab === 'Marketplace';
  const hasSearchResults = filtered.people.length + filtered.posts.length + filtered.listings.length > 0;

  return (
    <div className="explore-page kabianga-explore">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{launchUniversity.name.toUpperCase()}</p>
          <h1>Discover your campus</h1>
          <p className="muted">People, conversations and student finds from your community.</p>
        </div>
        <button className="outline-btn" onClick={onEvents}><CalendarDays size={15}/> Campus events</button>
      </div>

      <label className="explore-search">
        <Search size={18}/>
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search Kabianga students, posts and finds" aria-label="Search campus"/>
        {search.trim() && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X size={16}/></button>}
      </label>

      <div className="explore-tabs">
        {['All', 'People', 'Posts', 'Marketplace'].map(item => (
          <button key={item} className={tab === item ? 'selected' : ''} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>

      {showPeople && (
        <section className="kabianga-explore-section">
          <div className="section-title"><span><Users size={17}/> Students to meet</span><small>{launchUniversity.name}</small></div>
          {peopleLoading ? (
            <div className="card empty-state"><p>Finding students…</p></div>
          ) : peopleError ? (
            <div className="card empty-state"><h3>Students could not be loaded</h3><p>{peopleError}</p></div>
          ) : (
            filtered.people.map(rawPerson => {
              const person = normalizeStudent(rawPerson);
              if (!person) return null;
              const username = asText(person.username);
              const name = asText(person.profile?.fullName, username || 'Student');
              const initials = initialsFor(name, username);
              return (
                <button className="explore-person card" key={asText(person.id, username)} onClick={() => username && onProfile(username)} disabled={!username}>
                  <Avatar initials={initials} image={person.profile?.photoUrl || undefined}/>
                  <span><b><VerifiedName name={name} verified={Boolean(person.profile?.verifiedAt)} /></b><small>{username ? `@${username}` : 'Campus community'} · {asText(person.profile?.course, 'Student')}</small></span>
                  <ChevronRight size={16}/>
                </button>
              );
            })
          )}
          {!peopleLoading && !peopleError && filtered.people.length === 0 && (
            <div className="card empty-state"><Users size={22}/><h3>{normalized ? 'No students match your search' : 'No students to discover yet'}</h3><p>Students who register will appear here as they join CampusLink.</p></div>
          )}
        </section>
      )}

      {showPosts && (
        <section className="kabianga-explore-section">
          <div className="section-title"><span><MessageCircle size={17}/> Campus conversations</span></div>
          {filtered.posts.map(post => (
            <article className="card explore-post" key={post.id}>
              <b>{safePostText(post.name)}</b>
              <small>{safePostText(post.handle)} · {safePostText(post.time)}</small>
              <p>{safePostText(post.content)}</p>
              <span><Heart size={14}/> {post.likes ?? 0} <MessageCircle size={14}/> {post.comments ?? 0}</span>
            </article>
          ))}
          {filtered.posts.length === 0 && normalized && <div className="card empty-state"><h3>No matching conversations</h3><p>Try a different search term.</p></div>}
        </section>
      )}

      {showMarketplace && (
        <section className="kabianga-explore-section">
          <div className="section-title"><span><ShoppingBag size={17}/> Student marketplace</span><button onClick={onMarketplace}>Browse all <ChevronRight size={14}/></button></div>
          <div className="explore-products">
            {filtered.listings.map(item => (
              <button className="card explore-product" key={item.id} onClick={onMarketplace}>
                <img src={item.image} alt={asText(item.title, 'Marketplace item')}/>
                <span><b>{item.title}</b><strong>{item.price}</strong><small>{item.campus || launchUniversity.campuses[0]} · {item.category}</small></span>
              </button>
            ))}
          </div>
          {filtered.listings.length === 0 && normalized && <div className="card empty-state"><h3>No matching marketplace items</h3><p>Try another search term.</p></div>}
        </section>
      )}

      {normalized && !hasSearchResults && !peopleLoading && (
        <div className="card empty-state"><Compass size={22}/><h3>No matches yet</h3><p>Try another search within the University of Kabianga community.</p></div>
      )}
      <button className="text-link kabianga-events-link" onClick={onEvents}>Explore campus events <ChevronRight size={15}/></button>
    </div>
  );
}
