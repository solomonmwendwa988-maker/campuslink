import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Compass, MessageCircle, ShoppingBag, Users } from 'lucide-react';

type LandingPageProps = { open: (page: string) => void; dark: boolean; toggleTheme: () => void };

export function LandingPage({ open, dark, toggleTheme }: LandingPageProps) {
  return <div className="landing-page landing-v2 kabianga-landing">
    <header className="landing-nav">
      <a className="kabianga-logo" href="#top" aria-label="CampusLink home"><img src="/brand/campuslink-logo.svg" alt="CampusLink"/></a>
      <nav aria-label="Main navigation"><a href="#community">Community</a><a href="#how-it-works">How it works</a><button onClick={() => open('Marketplace')}>Marketplace</button><button onClick={() => open('Events')}>Events</button></nav>
      <div className="landing-nav-actions"><button className="icon-btn" aria-label="Toggle theme" onClick={toggleTheme}>{dark ? '☀' : '☾'}</button><button className="text-btn" onClick={() => open('Login')}>Sign in</button><button className="primary-btn" onClick={() => open('Register')}>Join CampusLink <ArrowRight size={15}/></button></div>
      <details className="landing-mobile-menu"><summary aria-label="Open site navigation">☰</summary><div><a href="#community">Community</a><a href="#how-it-works">How it works</a><button onClick={() => open('Marketplace')}>Marketplace</button><button onClick={() => open('Events')}>Events</button><button onClick={() => open('Login')}>Sign in</button></div></details>
    </header>
    <main id="top">
      <section className="landing-hero landing-hero-v2 kabianga-hero">
        <motion.div className="hero-copy" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .42 }}>
          <span className="hero-kicker"><span/> UNIVERSITY OF KABIANGA · STUDENT COMMUNITY</span>
          <h1>Your campus.<br/><em>Your people.</em><br/>Your next opportunity.</h1>
          <p>CampusLink is the University of Kabianga community to meet fellow students, share campus moments, discover events and find student essentials.</p>
          <div className="hero-cta"><button className="primary-btn" onClick={() => open('Register')}>Join your campus <ArrowRight size={16}/></button><button className="secondary-btn" onClick={() => open('Explore')}><Compass size={16}/> Explore CampusLink</button></div>
          <div className="hero-proof"><span className="hero-proof-dot"/><span><strong>Connect. Discover. Trade. Grow.</strong> Built for University of Kabianga students.</span></div>
        </motion.div>
        <motion.div className="campus-illustration campus-photo-hero" role="img" aria-label="University of Kabianga campus building" initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .5, delay: .1 }}>
          <img src="https://portal.kabianga.ac.ke/uploads/e296fbd0-f30c-4775-b8db-4bfba1bf45b9.jpg?v=aUUyoCzJoxhxyE9B2jnP9fTOlQfbEDg7P2f8xSiQ7DA" alt="University of Kabianga main campus academic building" loading="eager" fetchPriority="high" />
          <div className="campus-photo-caption"><span>UNIVERSITY OF KABIANGA</span><strong>Life happens<br/>between lectures.</strong><small>Connect with your campus community.</small></div>
        </motion.div>
      </section>
      <section className="landing-strip landing-strip-v2"><span>ONE CAMPUS, MANY WAYS TO CONNECT</span><b><Users size={15}/> Student community</b><i/><b><MessageCircle size={15}/> Conversations</b><i/><b><CalendarDays size={15}/> Campus events</b><i/><b><ShoppingBag size={15}/> Student finds</b></section>
      <section className="landing-explainer" id="community"><div className="section-intro"><span className="hero-kicker"><span/> MADE FOR UNIVERSITY OF KABIANGA</span><h2>Make your campus<br/>feel more <em>connected.</em></h2><p>A dedicated home for University of Kabianga students to meet, share and find useful things around campus.</p></div><div className="landing-feature-grid">
        {[{icon:Users,n:'01 / CONNECT',title:'Find your people',copy:'Meet fellow students, follow campus conversations and share moments from student life.',cta:'Explore the community',page:'Explore'},{icon:Compass,n:'02 / DISCOVER',title:'Discover campus life',copy:'Find campus events, updates and conversations worth joining.',cta:'See what’s happening',page:'Events'},{icon:ShoppingBag,n:'03 / MARKETPLACE',title:'Trade student essentials',copy:'Buy and sell books, electronics and everyday essentials with other students.',cta:'Browse student finds',page:'Marketplace'},{icon:CalendarDays,n:'04 / EVENTS',title:'Show up and take part',copy:'Discover student-led events, workshops, sports and meetups.',cta:'Explore campus events',page:'Events'}].map(({icon:Icon,n,title,copy,cta,page})=><motion.article className="landing-feature" key={n} whileHover={{ y: -3 }}><div className="feature-icon"><Icon size={19}/></div><span className="feature-number">{n}</span><h3>{title}</h3><p>{copy}</p><button className="feature-link" onClick={() => open(page)}>{cta} <ArrowRight size={14}/></button></motion.article>)}
      </div></section>
      <section className="how-it-works" id="how-it-works"><div className="section-intro"><span className="hero-kicker"><span/> GET STARTED</span><h2>Your campus,<br/><em>one connection away.</em></h2><p>Join the University of Kabianga student community in a few simple steps.</p></div><ol><li><span>01</span><div><b>Create your account</b><small>Choose a username and set up your student profile.</small></div></li><li><span>02</span><div><b>Make it yours</b><small>Add your course, interests and the details you want to share.</small></div></li><li><span>03</span><div><b>Connect and discover</b><small>Find fellow students, conversations, events and student finds.</small></div></li></ol></section>
      <section className="landing-bottom landing-bottom-v2"><div><span className="hero-kicker"><span/> UNIVERSITY OF KABIANGA · CAMPUSLINK</span><h2>Campus life is better<br/>when we’re <em>connected.</em></h2><p>Find your people and make more of every campus day.</p></div><button className="primary-btn" onClick={() => open('Register')}>Join CampusLink <ArrowRight size={16}/></button></section>
    </main>
    <footer className="landing-footer landing-footer-v2"><img src="/brand/campuslink-logo.svg" alt="CampusLink"/><span>Connect. Discover. Trade. Grow.</span><nav><a href="#community">Community</a><a href="mailto:solomonmwendwa@gmail.com?subject=CampusLink%20Support">Help &amp; support</a><a href="mailto:solomonmwendwa@gmail.com?subject=CampusLink%20Feedback">Feedback</a><a href="#how-it-works">How it works</a></nav><small>University of Kabianga student community · © 2026 CampusLink · <a href="mailto:solomonmwendwa@gmail.com?subject=CampusLink%20Report">Report a problem</a></small></footer>
  </div>;
}
