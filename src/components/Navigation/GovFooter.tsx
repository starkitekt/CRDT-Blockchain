'use client';

import { useTranslations } from 'next-intl';

export default function GovFooter() {
  const t = useTranslations('Footer');

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="site-footer-inner">
        <div className="site-footer-grid">
          <div className="site-footer-col">
            <div className="site-footer-logos">
              <img src="/logos/ministry-tribal-affairs.svg" alt="Ministry of Tribal Affairs" />
              <img src="/logos/iit-delhi.svg" alt="IIT Delhi" />
            </div>
            <p className="site-footer-copy">{t('copyright')}</p>
          </div>

          <div className="site-footer-col">
            <h4>{t('quickLinks')}</h4>
            <ul>
              <li><a href="https://tribal.nic.in" target="_blank" rel="noopener noreferrer">{t('ministryPortal')}</a></li>
              <li><a href="https://www.iitd.ac.in" target="_blank" rel="noopener noreferrer">{t('iitDelhi')}</a></li>
              <li><a href="https://india.gov.in" target="_blank" rel="noopener noreferrer">{t('indiaGov')}</a></li>
            </ul>
          </div>

          <div className="site-footer-col">
            <h4>{t('legal')}</h4>
            <ul>
              <li><a href="#privacy">{t('privacyPolicy')}</a></li>
              <li><a href="#terms">{t('termsOfUse')}</a></li>
              <li><a href="#accessibility">{t('accessibility')}</a></li>
            </ul>
          </div>

          <div className="site-footer-col">
            <h4>{t('technology')}</h4>
            <ul className="site-footer-tech-list">
              <li>Base Sepolia (L2)</li>
              <li>GS1 EPCIS 2.0</li>
              <li>Codex Stan 12-1981</li>
            </ul>
          </div>
        </div>

        <div className="site-footer-bottom">
          <span>{t('designedBy')}</span>
        </div>
      </div>

      <div className="site-footer-tricolor" aria-hidden="true">
        <span /><span /><span />
      </div>
    </footer>
  );
}
