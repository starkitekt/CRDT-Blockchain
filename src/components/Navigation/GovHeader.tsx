'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function GovHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.startsWith('/hi') ? 'hi' : 'en';
  const [fontSize, setFontSize] = useState(0);

  useEffect(() => {
    document.documentElement.style.fontSize =
      fontSize === -1 ? '14px' : fontSize === 1 ? '18px' : '16px';
    return () => { document.documentElement.style.fontSize = ''; };
  }, [fontSize]);

  const switchLocale = () => {
    const target = locale === 'en' ? 'hi' : 'en';
    const rest = pathname.replace(/^\/(en|hi)/, '');
    router.push(`/${target}${rest}`);
  };

  return (
    <div className="gov-header-bar" role="banner">
      {/* Tricolor stripe */}
      <div className="gov-tricolor" aria-hidden="true">
        <span className="gov-tricolor-saffron" />
        <span className="gov-tricolor-white" />
        <span className="gov-tricolor-green" />
      </div>

      <div className="gov-header-inner">
        {/* Left: Government branding */}
        <div className="gov-header-brand">
          <img
            src="/logos/ministry-tribal-affairs.svg"
            alt="Ministry of Tribal Affairs, Government of India"
            className="gov-logo"
            width={160}
            height={48}
          />
        </div>

        {/* Right: Accessibility toolbar (GIGW §4.3) */}
        <div className="gov-header-tools" role="toolbar" aria-label="Accessibility tools">
          <div className="gov-font-sizer" role="group" aria-label="Font size">
            <button
              onClick={() => setFontSize(-1)}
              className={`gov-tool-btn ${fontSize === -1 ? 'active' : ''}`}
              aria-label="Decrease font size"
              title="A-"
            >
              A<sup>-</sup>
            </button>
            <button
              onClick={() => setFontSize(0)}
              className={`gov-tool-btn ${fontSize === 0 ? 'active' : ''}`}
              aria-label="Default font size"
              title="A"
            >
              A
            </button>
            <button
              onClick={() => setFontSize(1)}
              className={`gov-tool-btn ${fontSize === 1 ? 'active' : ''}`}
              aria-label="Increase font size"
              title="A+"
            >
              A<sup>+</sup>
            </button>
          </div>

          <span className="gov-divider" aria-hidden="true" />

          <button
            onClick={switchLocale}
            className="gov-tool-btn gov-lang-btn"
            aria-label={locale === 'en' ? 'Switch to Hindi' : 'Switch to English'}
          >
            {locale === 'en' ? 'हिन्दी' : 'English'}
          </button>
        </div>
      </div>
    </div>
  );
}
