import { motion } from 'framer-motion';
import {
  ArrowRight, CalendarDays, Compass, MessageCircle, ShoppingBag, Users,
  BookOpen, Briefcase, ShieldCheck, HeartHandshake, ChevronRight, MapPin, ArrowUpRight,
} from 'lucide-react';

type LandingPageProps = { open: (page: string) => void; dark: boolean; toggleTheme: () => void };

const pillars = [
  { icon: Users, number: '01 / CONNECT', title: 'Find your people', copy: 'Meet students, share moments, join conversations and build friendships beyond your lecture room.', cta: 'Explore the community', page: 'Explore' },
  { icon: CalendarDays, number: '02 / DISCOVER', title: 'Make plans that matter', copy: 'Find campus events, workshops, meetups, sports and activities worth showing up for.', cta: 'Explore events', page: 'Events' },
  { icon: ShoppingBag, number: '03 / TRADE', title: 'Find student essentials', copy: 'Discover books, electronics, services and student businesses—or list something you no longer need.', cta: 'Browse marketplace', page: 'Marketplace' },
  { icon: Briefcase, number: '04 / GROW', title: 'Find your next opportunity', copy: 'Make room for collaborations, skills, projects, ideas and the connections that help you grow.', cta: 'Start discovering', page: 'Explore' },
];

const highlights = [
  { icon: MessageCircle, title: 'Campus conversations', copy: 'Share ideas, ask questions and stay in the loop with your campus community.' },
  { icon: CalendarDays, title: 'Events & activities', copy: 'Explore what is happening and find your next reason to get out and connect.' },
  { icon: BookOpen, title: 'Books & essentials', copy: 'Find useful student items, compare listings and connect with sellers.' },
  { icon: HeartHandshake, title: 'Student collaboration', copy: 'Meet people with shared interests and make projects, study sessions and ideas happen.' },
];

const steps = [
  { n: '01', title: 'Create your account', copy: 'Set up your profile and make your CampusLink identity.' },
  { n: '02', title: 'Make it yours', copy: 'Add your campus, course and interests to make discovery more relevant.' },
  { n: '03', title: 'Explore and connect', copy: 'Join conversations, discover events and find things around your student community.' },
];

const faqs = [
  { q: 'Who is CampusLink for?', a: 'CampusLink is currently being built around the University of Kabianga student community. The launch experience and available features are focused on that campus.' },
  { q: 'What can I do on CampusLink?', a: 'You can create a profile, connect with students, explore campus conversations, discover events and browse student marketplace listings. Available features may evolve as the platform grows.' },
  { q: 'Is CampusLink free to join?', a: 'Creating an account and joining the student community is designed to be accessible. Any paid promotion or future paid feature will be clearly identified before you use it.' },
  { q: 'How do I report something that feels unsafe?', a: 'Use the reporting options available within the platform where supported. If you are in immediate danger, contact local emergency services or campus support directly.' },
];

export function LandingPage({ open, dark, toggleTheme }: LandingPageProps) {
  return <div className="landing-page landing-v2 kabianga-landing landing-v3">
    <header className="landing-nav">
      <a className="kabianga-logo" href="#top" aria-label="CampusLink home"><img src="/brand/campuslink-logo.svg" alt="CampusLink" /></a>
      <nav aria-label="Main navigation">
        <a href="#community">Community</a><a href="#features">Features</a><a href="#how-it-works">How it works</a>
        <button onClick={() => open('Events')}>Events</button><button onClick={() => open('Marketplace')}>Marketplace</button>
      </nav>
      <div className="landing-nav-actions"><button className="icon-btn" aria-label="Toggle theme" onClick={toggleTheme}>{dark ? '☀' : '☾'}</button><button className="text-btn" onClick={() => open('Login')}>Sign in</button><button className="primary-btn" onClick={() => open('Register')}>Join CampusLink <ArrowRight size={15}/></button></div>
      <details className="landing-mobile-menu"><summary aria-label="Open site navigation">☰</summary><div><a href="#community">Community</a><a href="#features">Features</a><a href="#how-it-works">How it works</a><button onClick={() => open('Events')}>Events</button><button onClick={() => open('Marketplace')}>Marketplace</button><button onClick={() => open('Login')}>Sign in</button><button onClick={() => open('Register')}>Create account</button></div></details>
    </header>
    <main id="top">
      <section className="landing-hero landing-hero-v2 landing-hero-v3">
        <motion.div className="hero-copy" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .42 }}>
          <span className="hero-kicker"><span/> UNIVERSITY OF KABIANGA · STUDENT COMMUNITY</span>
          <h1>Your campus.<br/><em>Your people.</em><br/>Your next opportunity.</h1>
          <p>One place to connect with students, find campus events, discover student essentials and make more of university life.</p>
          <div className="hero-cta"><button className="primary-btn" onClick={() => open('Register')}>Join the community <ArrowRight size={16}/></button><button className="secondary-btn" onClick={() => open('Explore')}><Compass size={16}/> Explore CampusLink</button></div>
          <div className="hero-proof"><span className="hero-proof-dot"/><span><strong>Connect. Discover. Trade. Grow.</strong> Built around student life at Kabianga.</span></div>
        </motion.div>
        <motion.div className="campus-illustration campus-photo-hero" role="img" aria-label="University of Kabianga campus" initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .5, delay: .1 }}>
          <img src="https://portal.kabianga.ac.ke/uploads/e296fbd0-f30c-4775-b8db-4bfba1bf45b9.jpg?v=aUUyoCzJoxhxyE9B2jnP9fTOlQfbEDg7P2f8xSiQ7DA" alt="University of Kabianga campus building" loading="eager" fetchPriority="high" />
          <div className="campus-photo-caption"><span>UNIVERSITY OF KABIANGA</span><strong>Life happens<br/>between lectures.</strong><small>Find your people. Discover your campus.</small></div>
          <div className="landing-hero-floating landing-float-event"><CalendarDays size={17}/><span><b>Campus events</b><small>Find what's happening</small></span></div>
          <div className="landing-hero-floating landing-float-market"><ShoppingBag size={17}/><span><b>Student marketplace</b><small>Find your next useful thing</small></span></div>
        </motion.div>
      </section>
      <section className="landing-strip landing-strip-v2 landing-strip-v3"><span>YOUR CAMPUS, CONNECTED</span><b><Users size={15}/> Student community</b><i/><b><MessageCircle size={15}/> Conversations</b><i/><b><CalendarDays size={15}/> Events</b><i/><b><ShoppingBag size={15}/> Marketplace</b></section>
      <section className="landing-v3-intro" id="community"><div className="landing-v3-intro-copy"><span className="hero-kicker"><span/> MADE FOR CAMPUS LIFE</span><h2>University is more than<br/>lectures. <em>Live all of it.</em></h2><p>CampusLink brings the everyday parts of student life closer together—from the conversations you want to join to the events, essentials and people you haven't discovered yet.</p></div><div className="landing-v3-proof-grid"><div><Users/><b>Community first</b><small>People and shared experiences</small></div><div><MapPin/><b>Campus-focused</b><small>Built around your student life</small></div><div><ShieldCheck/><b>Safety matters</b><small>Tools and standards for responsible use</small></div></div></section>
      <section className="landing-v3-pillars" id="features"><div className="section-intro"><span className="hero-kicker"><span/> FOUR WAYS TO MAKE CAMPUS COUNT</span><h2>Everything campus life needs<br/>to feel more <em>connected.</em></h2><p>From your first conversation to your next opportunity, CampusLink is a place to discover and take part.</p></div><div className="landing-feature-grid landing-feature-grid-v3">{pillars.map(({icon:Icon,number,title,copy,cta,page})=><motion.article className="landing-feature" key={number} whileHover={{y:-3}}><div className="feature-icon"><Icon size={19}/></div><span className="feature-number">{number}</span><h3>{title}</h3><p>{copy}</p><button className="feature-link" onClick={() => open(page)}>{cta}<ArrowRight size={14}/></button></motion.article>)}</div></section>
      <section className="landing-v3-highlights"><div className="landing-v3-highlights-head"><div><span className="hero-kicker"><span/> BUILT FOR THE STUDENT EXPERIENCE</span><h2>Useful every day.<br/><em>Not just another app.</em></h2></div><p>CampusLink is designed around the things students actually need to discover, share and do with each other.</p></div><div className="landing-v3-highlight-grid">{highlights.map(({icon:Icon,title,copy})=><article key={title}><span className="landing-v3-highlight-icon"><Icon size={18}/></span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
      <section className="landing-v3-how" id="how-it-works"><div className="section-intro"><span className="hero-kicker"><span/> START WITH THREE SIMPLE STEPS</span><h2>Get connected.<br/><em>Get going.</em></h2><p>Joining should be easy. Spend less time setting up and more time discovering your community.</p><button className="primary-btn" onClick={() => open('Register')}>Create your account <ArrowRight size={15}/></button></div><ol>{steps.map(step=><li key={step.n}><span>{step.n}</span><div><b>{step.title}</b><small>{step.copy}</small></div><ChevronRight size={16}/></li>)}</ol></section>
      <section className="landing-v3-safety"><div className="landing-v3-safety-icon"><ShieldCheck size={23}/></div><div><span className="hero-kicker"><span/> COMMUNITY COMES WITH RESPONSIBILITY</span><h2>A community worth joining<br/>is a community worth <em>protecting.</em></h2><p>We believe campus communities should be welcoming and respectful. Use available safety tools, report content that violates community standards and make thoughtful choices when meeting or trading with others.</p><button className="feature-link" onClick={() => open('Settings')}>Explore your account controls <ArrowRight size={14}/></button></div></section>
      <section className="landing-v3-faq"><div className="section-intro"><span className="hero-kicker"><span/> GOOD TO KNOW</span><h2>Questions, <em>answered.</em></h2><p>A few things to know before you join.</p></div><div className="landing-v3-faq-list">{faqs.map((item,index)=><details key={item.q} open={index===0}><summary>{item.q}<span>+</span></summary><p>{item.a}</p></details>)}</div></section>
      <section className="landing-bottom landing-bottom-v2 landing-bottom-v3"><div><span className="hero-kicker"><span/> UNIVERSITY OF KABIANGA · CAMPUSLINK</span><h2>Your next campus connection<br/>starts <em>here.</em></h2><p>Join the community and make more of every campus day.</p></div><button className="primary-btn" onClick={() => open('Register')}>Create your account <ArrowRight size={16}/></button></section>
    </main>
    <footer className="landing-footer landing-footer-v2 landing-footer-v3"><div className="landing-footer-brand"><img src="/brand/campuslink-logo.svg" alt="CampusLink"/><p>Connect. Discover. Trade. Grow.<br/>A digital home for University of Kabianga student life.</p><a className="landing-footer-email" href="mailto:solomonmwendwa@gmail.com?subject=CampusLink%20Support">Contact support <ArrowUpRight size={13}/></a></div><div className="landing-footer-links"><div><b>Explore</b><button onClick={() => open('Explore')}>Student community</button><button onClick={() => open('Events')}>Events</button><button onClick={() => open('Marketplace')}>Marketplace</button></div><div><b>Account</b><button onClick={() => open('Login')}>Sign in</button><button onClick={() => open('Register')}>Create account</button><button onClick={() => open('Settings')}>Settings</button></div><div><b>CampusLink</b><a href="#community">About the community</a><a href="#how-it-works">How it works</a><a href="mailto:solomonmwendwa@gmail.com?subject=CampusLink%20Feedback">Feedback</a><a href="mailto:solomonmwendwa@gmail.com?subject=CampusLink%20Report">Report a concern</a></div></div><div className="landing-footer-bottom"><span>© {new Date().getFullYear()} CampusLink · University of Kabianga student community</span><span>Designed around student life.</span></div></footer>
  </div>;
}
