'use client';

import React from 'react';

interface ProfileAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number;
  onClick?: () => void;
  title?: string;
}

function initialOf(name: string): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

/**
 * Deterministic background colour from the name so two users with the same
 * initial still look different. Stable palette of readable pastels.
 */
const PALETTE = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#14B8A6', '#F97316', '#6366F1'];
function colorFor(name: string): string {
  const trimmed = (name ?? '').trim() || '?';
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) hash = (hash * 31 + trimmed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export default function ProfileAvatar({
  name,
  photoUrl,
  size = 48,
  onClick,
  title,
}: ProfileAvatarProps) {
  const common: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    cursor: onClick ? 'pointer' : 'default',
    border: '2px solid var(--border-subtle, #e5e7eb)',
    userSelect: 'none',
  };

  if (photoUrl) {
    return (
      <span
        onClick={onClick}
        title={title ?? name}
        style={common}
        role={onClick ? 'button' : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={`${name} profile photo`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </span>
    );
  }

  return (
    <span
      onClick={onClick}
      title={title ?? name}
      style={{
        ...common,
        background: colorFor(name),
        color: '#fff',
        fontWeight: 700,
        fontSize: Math.round(size * 0.42),
      }}
      role={onClick ? 'button' : undefined}
    >
      {initialOf(name)}
    </span>
  );
}
