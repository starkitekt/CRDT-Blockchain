'use client';

import React, { useEffect, useState } from 'react';

interface ResponsiveLayoutProps {
  mobile?: React.ReactNode;
  tablet?: React.ReactNode;
  desktop: React.ReactNode;
}

export default function ResponsiveLayout({ mobile, tablet, desktop }: ResponsiveLayoutProps) {
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hydration guard
  if (width === 0) return <div className="p-8 opacity-0">Loading...</div>;

  // Mobile: < 672px (Carbon 'sm' breakpoint)
  if (width < 672 && mobile) {
    return <div className="layout-mobile">{mobile}</div>;
  }

  // Tablet: < 1056px (Carbon 'md' and 'lg' start)
  if (width < 1056 && tablet) {
    return <div className="layout-tablet">{tablet}</div>;
  }

  // Desktop: default
  return <div className="layout-desktop">{desktop}</div>;
}
