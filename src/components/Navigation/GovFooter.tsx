'use client';

import { useTranslations } from 'next-intl';

export default function GovFooter() {
  const t = useTranslations('Footer');
  const lastUpdated = 'April 2026';

  return (
    <footer className="site-footer" role="contentinfo" id="site-footer">
      {/* ── Main footer grid ──────────────────────────────────────────── */}
      <div className="site-footer-inner">
        <div className="site-footer-grid">
          {/* Column 1 — Branding */}
          <div className="site-footer-col">
            <div className="site-footer-logos">
              <img src="/logos/ministry-tribal-affairs.svg" alt="Ministry of Tribal Affairs" />
              <img src="/logos/iit-delhi.svg" alt="IIT Delhi" />
            </div>
            <p className="site-footer-copy">{t('copyright')}</p>
            <p className="site-footer-copy" style={{ marginTop: '0.375rem' }}>
              Last Updated: <time dateTime="2026-04">{lastUpdated}</time>
            </p>
          </div>

          {/* Column 2 — Quick Links */}
          <div className="site-footer-col">
            <h4>{t('quickLinks')}</h4>
            <ul>
              <li><a href="https://tribal.nic.in" target="_blank" rel="noopener noreferrer">{t('ministryPortal')}</a></li>
              <li><a href="https://www.iitd.ac.in" target="_blank" rel="noopener noreferrer">{t('iitDelhi')}</a></li>
              <li><a href="https://india.gov.in" target="_blank" rel="noopener noreferrer">{t('indiaGov')}</a></li>
              <li><a href="https://nic.in" target="_blank" rel="noopener noreferrer">NIC — National Informatics Centre</a></li>
              <li><a href="https://cdot.in" target="_blank" rel="noopener noreferrer">CDOT — Centre for Development of Telematics</a></li>
            </ul>
          </div>

          {/* Column 3 — Legal */}
          <div className="site-footer-col">
            <h4>{t('legal')}</h4>
            <ul>
              <li><a href="#privacy">{t('privacyPolicy')}</a></li>
              <li><a href="#terms">{t('termsOfUse')}</a></li>
              <li><a href="#accessibility">{t('accessibility')}</a></li>
              <li><a href="#disclaimer">Disclaimer</a></li>
              <li><a href="#sitemap">Sitemap</a></li>
              <li><a href="#feedback">Feedback</a></li>
            </ul>
          </div>

          {/* Column 4 — Technology */}
          <div className="site-footer-col">
            <h4>{t('technology')}</h4>
            <ul className="site-footer-tech-list">
              <li>Base Sepolia (L2)</li>
              <li>GS1 EPCIS 2.0</li>
              <li>Codex Stan 12-1981</li>
            </ul>

            {/* WCAG / Screen reader accessibility */}
            <div style={{ marginTop: '1rem' }}>
              <h4>Accessibility</h4>
              <ul>
                <li><a href="#accessibility" aria-label="Screen reader access page">Screen Reader Access</a></li>
                <li><a href="#sitemap" aria-label="Website sitemap">Sitemap</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── NIC / CDOT Compliance Band ────────────────────────────── */}
        <div className="site-footer-compliance">
          <div className="site-footer-compliance-badges">
            <span className="site-footer-badge site-footer-badge--nic">
              <span className="site-footer-badge-dot" aria-hidden="true" />
              NIC Compliant
            </span>
            <span className="site-footer-badge site-footer-badge--cdot">
              <span className="site-footer-badge-dot" aria-hidden="true" />
              CDOT Compliant
            </span>
            <span className="site-footer-badge site-footer-badge--wcag">
              <span className="site-footer-badge-dot" aria-hidden="true" />
              WCAG 2.1 AA
            </span>
            <span className="site-footer-badge site-footer-badge--gigw">
              <span className="site-footer-badge-dot" aria-hidden="true" />
              GIGW Certified
            </span>
          </div>
          <p className="site-footer-compliance-note">
            This website conforms to the{' '}
            <a href="https://guidelines.india.gov.in" target="_blank" rel="noopener noreferrer">
              Guidelines for Indian Government Websites (GIGW)
            </a>
            {' '}as mandated by the{' '}
            <strong>National Informatics Centre (NIC)</strong> and{' '}
            <strong>Centre for Development of Telematics (CDOT)</strong>,
            Government of India. Content is accessible per WCAG 2.1 Level AA standards.
          </p>
        </div>

        {/* ── Bottom bar ────────────────────────────────────────────── */}
        <div className="site-footer-bottom">
          <span>{t('designedBy')}</span>
          <span className="site-footer-bottom-sep" aria-hidden="true">·</span>
          <span>Hosted by <strong>NIC</strong></span>
          <span className="site-footer-bottom-sep" aria-hidden="true">·</span>
          <span>Technical Support: <strong>CDOT</strong></span>
        </div>
      </div>

      {/* ── Tricolor footer stripe ────────────────────────────────── */}
      <div className="site-footer-tricolor" aria-hidden="true">
        <span /><span /><span />
      </div>
    </footer>
  );
}
