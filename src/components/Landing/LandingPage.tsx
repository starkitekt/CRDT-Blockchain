'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bee,
  Chemistry,
  DataCheck,
  Globe,
  Locked,
  Partnership,
  Security,
  ArrowRight,
  Login,
  UserFollow,
} from '@carbon/icons-react';
import { authApi, ApiError } from '@/lib/api';

const SUPPLY_CHAIN_STEPS = [
  { icon: Bee, labelKey: 'step_harvest', descKey: 'step_harvest_desc', color: '#22c55e' },
  { icon: DataCheck, labelKey: 'step_warehouse', descKey: 'step_warehouse_desc', color: '#3b82f6' },
  { icon: Chemistry, labelKey: 'step_lab', descKey: 'step_lab_desc', color: '#a855f7' },
  { icon: Security, labelKey: 'step_certify', descKey: 'step_certify_desc', color: '#ef4444' },
  { icon: Partnership, labelKey: 'step_enterprise', descKey: 'step_enterprise_desc', color: '#14b8a6' },
  { icon: Globe, labelKey: 'step_consumer', descKey: 'step_consumer_desc', color: '#f97316' },
];

const STATS = [
  { value: '1,200+', labelKey: 'stat_farmers' },
  { value: '50,000+', labelKey: 'stat_batches' },
  { value: '99.8%', labelKey: 'stat_integrity' },
  { value: '12', labelKey: 'stat_states' },
];

const roles = [
  { id: 'farmer' }, { id: 'warehouse' }, { id: 'lab' }, { id: 'officer' },
  { id: 'enterprise' }, { id: 'consumer' }, { id: 'secretary' },
];

const DEMO_CREDENTIALS: Record<string, { email: string; password: string }> = {
  farmer: { email: 'farmer@honeytrace.gov', password: 'password123' },
  warehouse: { email: 'warehouse@honeytrace.gov', password: 'password123' },
  lab: { email: 'lab@honeytrace.gov', password: 'password123' },
  officer: { email: 'officer@honeytrace.gov', password: 'password123' },
  enterprise: { email: 'enterprise@honeytrace.gov', password: 'password123' },
  consumer: { email: 'consumer@honeytrace.gov', password: 'password123' },
  secretary: { email: 'secretary@honeytrace.gov', password: 'password123' },
};

export default function LandingPage() {
  const t = useTranslations('Landing');
  const tAuth = useTranslations('Auth');
  const tr = useTranslations('Roles');
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.startsWith('/hi') ? 'hi' : 'en';

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [selectedRole, setSelectedRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => { setIsHydrated(true); }, []);

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    setError(null);
    if (authMode === 'login') {
      const creds = DEMO_CREDENTIALS[roleId];
      if (creds) { setEmail(creds.email); setPassword(creds.password); }
    }
  };

  const handleLogin = async () => {
    setError(null);
    const role = selectedRole || Object.entries(DEMO_CREDENTIALS).find(([, c]) => c.email === email)?.[0] || '';
    if (!role) { setError('Please select a role.'); return; }
    setLoading(true);
    try {
      await authApi.login(email, password, role);
      window.location.assign(`/${locale}/dashboard/${role}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed.');
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedRole) { setError('Please select a role.'); return; }
    setLoading(true);
    try {
      await authApi.register({ name: signupName, email: signupEmail, password: signupPassword, role: selectedRole });
      setInfo('Account created. Sign in below.');
      setEmail(signupEmail);
      setPassword(signupPassword);
      setAuthMode('login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed.');
    } finally { setLoading(false); }
  };

  const switchLocale = () => {
    const target = locale === 'en' ? 'hi' : 'en';
    const rest = pathname.replace(/^\/(en|hi)/, '');
    router.push(`/${target}${rest}`);
  };

  return (
    <div className="lp" data-hydrated={isHydrated ? 'true' : 'false'}>
      {/* ── Skip Navigation (GIGW §4.1 / WCAG 2.1 SC 2.4.1) ─────────── */}
      <a href="#lp-main" className="lp-skip-nav">Skip to Main Content</a>

      {/* ── Tricolor stripe (GIGW mandatory) ────────────────────────── */}
      <div className="lp-gov-stripe" aria-hidden="true">
        <span /><span /><span />
      </div>

      {/* ── NIC-compliant Government Header ─────────────────────────── */}
      <header className="lp-gov-header" role="banner">
        <div className="lp-gov-header-inner">
          {/* Left: Emblem + Ministry branding */}
          <div className="lp-gov-brand">
            <img
              src="/logos/ministry-tribal-affairs.svg"
              alt="Government of India – Ministry of Tribal Affairs"
              className="lp-gov-emblem"
            />
            <div className="lp-gov-brand-text">
              <span className="lp-gov-title-hi" lang="hi">भारत सरकार | जनजातीय कार्य मंत्रालय</span>
              <span className="lp-gov-title-en">Government of India &nbsp;|&nbsp; Ministry of Tribal Affairs</span>
              <span className="lp-gov-subtitle">HoneyTRACE — Blockchain Traceability Portal</span>
            </div>
            <span className="lp-gov-sep" aria-hidden="true" />
            <img src="/logos/iit-delhi.jpg" alt="IIT Delhi" className="lp-gov-iit" />
          </div>

          {/* Right: Accessibility + Language (GIGW §4.3) */}
          <div className="lp-gov-tools" role="toolbar" aria-label="Accessibility and language tools">
            <div className="lp-font-sizer" role="group" aria-label="Adjust text size">
              <button className="lp-tool-btn" aria-label="Decrease text size" title="Decrease font size"
                onClick={() => { const s = parseFloat(getComputedStyle(document.documentElement).fontSize); document.documentElement.style.fontSize = Math.max(12, s - 2) + 'px'; }}>
                A<sup aria-hidden="true">-</sup>
              </button>
              <button className="lp-tool-btn lp-tool-btn--default" aria-label="Default text size" title="Default font size"
                onClick={() => { document.documentElement.style.fontSize = ''; }}>
                A
              </button>
              <button className="lp-tool-btn" aria-label="Increase text size" title="Increase font size"
                onClick={() => { const s = parseFloat(getComputedStyle(document.documentElement).fontSize); document.documentElement.style.fontSize = Math.min(24, s + 2) + 'px'; }}>
                A<sup aria-hidden="true">+</sup>
              </button>
            </div>
            <span className="lp-gov-divider" aria-hidden="true" />
            <button
              className="lp-tool-btn lp-tool-btn--contrast"
              aria-label="Toggle high contrast mode"
              title="High Contrast"
              onClick={() => document.body.classList.toggle('high-contrast')}
            >
              HC
            </button>
            <span className="lp-gov-divider" aria-hidden="true" />
            <button onClick={switchLocale} className="lp-tool-btn lp-tool-btn--lang"
              aria-label={locale === 'en' ? 'Switch to Hindi' : 'Switch to English'}>
              {locale === 'en' ? 'हिन्दी' : 'English'}
            </button>
          </div>
        </div>
      </header>

      {/* ── NIC navigation band ──────────────────────────────────────── */}
      <nav className="lp-nav-band" aria-label="Main navigation">
        <div className="lp-nav-inner">
          <a href="#lp-main" className="lp-nav-link lp-nav-link--active">Home</a>
          <a href="#supply-chain" className="lp-nav-link">Supply Chain</a>
          <a href="#features" className="lp-nav-link">Features</a>
          <a href="#auth" className="lp-nav-link">Portal Login</a>
          <a href="#contact" className="lp-nav-link">Contact Us</a>
        </div>
      </nav>

      {/* ── Hero split ──────────────────────────────────────────────── */}
      <main id="lp-main" tabIndex={-1}>
      <section className="lp-hero" aria-labelledby="lp-hero-title">
        <div className="lp-hero-bg" aria-hidden="true">
          <div className="lp-hero-gradient" />
          <div className="lp-hero-noise" />
        </div>

        <div className="lp-hero-inner">
          {/* Left: content */}
          <div className="lp-hero-content">
            <div className="lp-chip">
              <Locked size={14} />
              <span>{t('hero_chip')}</span>
            </div>

            <h1 id="lp-hero-title" className="lp-title">
              {t('hero_title_1')}
              <span className="lp-title-accent">{t('hero_title_accent')}</span>
              {t('hero_title_2')}
            </h1>

            <p className="lp-subtitle">{t('hero_subtitle')}</p>

            <div className="lp-stats">
              {STATS.map((s) => (
                <div key={s.labelKey} className="lp-stat">
                  <span className="lp-stat-val">{s.value}</span>
                  <span className="lp-stat-lbl">{t(s.labelKey)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: auth card */}
          <div className="lp-auth-card" id="auth">
            <div className="lp-auth-header">
              <h2>{authMode === 'login' ? tAuth('welcomeBack') : tAuth('registration')}</h2>
              <div className="lp-auth-accent" />
            </div>

            {error && <div className="lp-alert lp-alert--error">{error}</div>}
            {info && <div className="lp-alert lp-alert--success">{info}</div>}

            {/* Role pills */}
            <div className="lp-role-grid">
              {roles.map((r) => (
                <button
                  key={r.id}
                  className={`lp-role-pill ${selectedRole === r.id ? 'active' : ''}`}
                  onClick={() => handleRoleSelect(r.id)}
                  type="button"
                >
                  {tr(`${r.id}.title`)}
                </button>
              ))}
            </div>

            {authMode === 'login' ? (
              <form onSubmit={(e) => { e.preventDefault(); void handleLogin(); }} className="lp-auth-form">
                <div className="lp-field">
                  <label htmlFor="lp-email">{tAuth('emailLabel')}</label>
                  <input
                    id="lp-email"
                    type="email"
                    placeholder={tAuth('emailPlaceHolder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="lp-field">
                  <label htmlFor="lp-pass">{tAuth('passwordLabel')}</label>
                  <input
                    id="lp-pass"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="lp-submit-btn" disabled={loading}>
                  {loading ? tAuth('authenticating') : tAuth('signIn')}
                  {!loading && <Login size={18} />}
                </button>
                <p className="lp-switch-text">
                  {tAuth('newToHoneyTrace')}{' '}
                  <button type="button" onClick={() => { setAuthMode('signup'); setError(null); }}>
                    {tAuth('createAccount')}
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="lp-auth-form">
                <div className="lp-field">
                  <label htmlFor="lp-name">{tAuth('fullName')}</label>
                  <input id="lp-name" placeholder="John Doe" value={signupName} onChange={(e) => setSignupName(e.target.value)} required />
                </div>
                <div className="lp-field">
                  <label htmlFor="lp-signup-email">{tAuth('emailAddress')}</label>
                  <input id="lp-signup-email" type="email" placeholder="john@example.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                </div>
                <div className="lp-field">
                  <label htmlFor="lp-signup-pass">{tAuth('passwordLabel')}</label>
                  <input id="lp-signup-pass" type="password" placeholder="Min. 8 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
                </div>
                <button type="submit" className="lp-submit-btn" disabled={!selectedRole || loading}>
                  {loading ? tAuth('authenticating') : tAuth('continueIdentity')}
                  {!loading && <UserFollow size={18} />}
                </button>
                <p className="lp-switch-text">
                  <button type="button" onClick={() => { setAuthMode('login'); setError(null); }}>
                    {tAuth('alreadyHaveAccount')}
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── Supply Chain ────────────────────────────────────────────── */}
      <section id="supply-chain" className="lp-section" aria-labelledby="supply-chain-title">
        <div className="lp-section-inner">
          <div className="lp-section-hd">
            <span className="lp-overline">{t('chain_overline')}</span>
            <h2 id="supply-chain-title">{t('chain_title')}</h2>
            <p>{t('chain_desc')}</p>
          </div>

          <div className="lp-chain">
            {SUPPLY_CHAIN_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.labelKey} className="lp-chain-card">
                  <div className="lp-chain-num" style={{ color: step.color }}>{String(i + 1).padStart(2, '0')}</div>
                  <div className="lp-chain-icon" style={{ background: `${step.color}14`, color: step.color }}>
                    <Icon size={24} />
                  </div>
                  <h3>{t(step.labelKey)}</h3>
                  <p>{t(step.descKey)}</p>
                  {i < SUPPLY_CHAIN_STEPS.length - 1 && (
                    <div className="lp-chain-arrow"><ArrowRight size={14} /></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section id="features" className="lp-section lp-section--alt" aria-labelledby="features-title">
        <div className="lp-section-inner">
          <div className="lp-section-hd">
            <span className="lp-overline">{t('features_overline')}</span>
            <h2 id="features-title">{t('features_title')}</h2>
          </div>
          <div className="lp-features">
            {[
              { icon: Locked, title: t('feat_immutable_title'), desc: t('feat_immutable_desc'), c: '#3b82f6' },
              { icon: Security, title: t('feat_codex_title'), desc: t('feat_codex_desc'), c: '#22c55e' },
              { icon: Globe, title: t('feat_trace_title'), desc: t('feat_trace_desc'), c: '#a855f7' },
            ].map((f) => {
              const FIcon = f.icon;
              return (
                <div key={f.title} className="lp-feat-card">
                  <div className="lp-feat-icon" style={{ background: `${f.c}10`, color: f.c }}>
                    <FIcon size={22} />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="lp-cta" aria-labelledby="cta-title">
        <div className="lp-cta-inner">
          <span className="lp-overline lp-overline--light">{t('cta_overline')}</span>
          <h2 id="cta-title">{t('cta_title')}</h2>
          <p>{t('cta_desc')}</p>
          <a href="#auth" className="lp-cta-btn">
            {t('hero_cta')}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* ── Contact anchor ──────────────────────────────────────────── */}
      <div id="contact" aria-hidden="true" />
      </main>
    </div>
  );
}
