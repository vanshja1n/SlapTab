import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
const EXTENSION_DOWNLOAD_URL =
  'https://github.com/vanshja1n/SlapTab/archive/refs/heads/main.zip';

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <main className="site">
      <header className="wrap topbar">
        <a className="brand" href="#top" aria-label="SlapTab home" onClick={closeMenu}>
          <img src="/assets/slaptab-icon.png" alt="" /> SlapTab
        </a>
        <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)} data-testid="button-menu">
          {menuOpen ? 'CLOSE' : 'MENU'}
        </button>
        <nav className={`nav${menuOpen ? ' open' : ''}`} aria-label="Main navigation">
          <a href="#features" onClick={closeMenu}>The features</a>
          <a href="#how-it-works" onClick={closeMenu}>How it works</a>
          <a href="#install" onClick={closeMenu}>Install guide</a>
          <a className="nav-cta" href={EXTENSION_DOWNLOAD_URL} onClick={closeMenu}>Download SlapTab</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="wrap hero-inner">
          <div>
            <span className="kicker">A CHROME EXTENSION</span>
            <h1>Get slapped<br /><span>back into</span> focus.</h1>
            <p className="hero-copy">You opened a tab “just for a second.” Two hours later… SlapTab gives your distracting sites a limit — then gives you a playful nudge when time’s up.</p>
            <div className="hero-actions">
              <a className="button" href={EXTENSION_DOWNLOAD_URL} data-testid="link-install-primary">Download the ZIP <span aria-hidden="true">↓</span></a>
              <a className="button light" href="#how-it-works">How it works</a>
            </div>
          </div>
          <div className="hero-art">
            <img src="/assets/slaptab-icon.png" alt="SlapTab's expressive slapping tab mascot" />
            <div className="burst">BLOCK.<br />SLAP.<br />FOCUS.</div>
          </div>
        </div>
      </section>

      <div className="strip" aria-label="SlapTab slogan">
        <div className="wrap strip-line"><span>Add.</span><b>✳</b><span>Limit.</span><b>✳</b><span>Slap.</span><b>✳</b><span>Get back to it.</span></div>
      </div>

      <section className="section problem">
        <div className="wrap problem-grid">
          <div>
            <span className="kicker">THE PROBLEM</span>
            <h2>You open a tab<br /><em>“just for a second”</em></h2>
            <p>Distractions sneak in between emails, tabs and your focus. SlapTab helps you set a boundary before your day gets away from you.</p>
          </div>
          <div className="mock-window" aria-label="Illustration of daily website time limits">
            <div className="mock-top"><i className="dot" /><i className="dot" /><i className="dot" /></div>
            <div className="address">slaptab / today’s time limits</div>
            <div className="mock-content">
              <h3>Your day, with a little less scroll.</h3>
              <div className="site-row"><span>instagram.com</span><strong>47 min</strong><div className="meter"><i /></div></div>
              <div className="site-row"><span>x.com</span><strong>32 min</strong><div className="meter yellow"><i /></div></div>
              <div className="site-row"><span>youtube.com</span><strong>68 min</strong><div className="meter"><i style={{ width: '88%' }} /></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section features" id="features">
        <div className="wrap">
          <div className="section-heading">
            <span className="kicker">THE GOOD STUFF</span>
            <h2>A small slap.<br />A bigger day.</h2>
            <p>Simple guardrails for the sites that steal your “just one minute.” No complicated system to learn.</p>
          </div>
          <div className="feature-rail">
            <article className="feature"><span className="feature-icon">×</span><div className="feature-num">01 / BLOCK</div><h3>Domain blocking</h3><p>Choose the distracting domains you want SlapTab to keep an eye on.</p></article>
            <article className="feature"><span className="feature-icon">◷</span><div className="feature-num">02 / SET</div><h3>Daily limits</h3><p>Give each site its own daily time allowance. Your limits, your call.</p></article>
            <article className="feature"><span className="feature-icon">!</span><div className="feature-num">03 / SLAP</div><h3>Instant blocking</h3><p>When your time is up, the page gets blocked with a quick slap.</p></article>
            <article className="feature"><span className="feature-icon">✓</span><div className="feature-num">04 / ANYWHERE</div><h3>Works offline</h3><p>No internet? Still works. Your focus shouldn’t depend on a connection.</p></article>
          </div>
        </div>
      </section>

      <section className="section how" id="how-it-works">
        <div className="wrap">
          <div className="section-heading">
            <span className="kicker">NO BIG SETUP</span>
            <h2>How it works</h2>
            <p>Three quick moves. Then SlapTab handles the tab you didn’t mean to open.</p>
          </div>
          <div className="how-art">
            <img src="/assets/how-it-works.png" alt="How it works: add the sites, set a daily limit, let SlapTab handle it." />
          </div>
        </div>
      </section>

      <section className="section" style={{ background: '#f7f4e9', paddingTop: 82, paddingBottom: 82 }}>
        <div className="wrap">
          <div className="section-heading">
            <span className="kicker">A QUICK LOOK</span>
            <h2>Your tabs have<br />met their match.</h2>
          </div>
          <div className="how-art" style={{ transform: 'rotate(-.5deg)' }}>
            <img src="/assets/banner.png" alt="SlapTab brand comic: distractions, daily limits, blocking features, and the SlapTab mascot." />
          </div>
        </div>
      </section>

      <section className="install" id="install">
        <div className="wrap install-grid">
          <div>
            <span className="kicker">READY TO GET SLAPTAB?</span>
            <h2>Five steps.<br /><span>Then you’re set.</span></h2>
            <p>Download the ZIP and extract the SlapTab-main folder. In Chrome, open chrome://extensions, turn on Developer mode, choose Load unpacked, then select the extracted folder that contains manifest.json.</p>
            <a className="button" href={EXTENSION_DOWNLOAD_URL} data-testid="link-install-download">Download SlapTab ZIP <span aria-hidden="true">↓</span></a>
            <p className="install-note">After extracting, choose the SlapTab-main folder—not the ZIP file.</p>
          </div>
          <div className="install-art" id="install-art">
            <img src="/assets/install-steps.png" alt="Install SlapTab in Chrome: download and extract the ZIP, open chrome://extensions, enable Developer mode, choose Load unpacked, then select the extracted SlapTab-main folder." />
          </div>
        </div>
      </section>

      <section className="section promise">
        <div className="wrap promise-grid">
          <div>
            <span className="kicker">YOUR TIME, YOUR RULES</span>
            <h2>Not a lecture.<br />A little slap.</h2>
            <p>SlapTab isn’t here to judge your tabs. It’s here to help you make a choice before the scroll makes it for you.</p>
          </div>
          <div className="promise-list">
            <div className="promise-item"><strong>Pick the sites</strong><span>Start with the domains that pull you off track.</span></div>
            <div className="promise-item"><strong>Set your minutes</strong><span>Choose how much time each site gets each day.</span></div>
            <div className="promise-item"><strong>Get back to your day</strong><span>When the limit’s reached, SlapTab blocks the page.</span></div>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="wrap">
          <h2>Stop scrolling.<br /><span>Start doing.</span></h2>
          <p>Get slapped back into productivity.</p>
          <a className="button light" href={EXTENSION_DOWNLOAD_URL}>Download SlapTab <span aria-hidden="true">↓</span></a>
        </div>
      </section>
      <footer className="footer">
        <div className="wrap footer-inner">
          <a className="brand" href="#top"><img src="/assets/slaptab-icon.png" alt="" /> SlapTab</a>
          <small>A Chrome extension. Block. Slap. Focus.</small>
          <div className="footer-links"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#install">Install guide</a></div>
        </div>
      </footer>
    </main>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
