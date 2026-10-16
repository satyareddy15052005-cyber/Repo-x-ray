import React from 'react';

export function BrandLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="3" stroke="#2563EB" strokeWidth="2" fill="#EFF6FF" />
      <path d="M7 7L17 17M17 7L7 17" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" fill="#2563EB" />
      <circle cx="7" cy="7" r="1.5" fill="#1D4ED8" />
      <circle cx="17" cy="7" r="1.5" fill="#1D4ED8" />
      <circle cx="7" cy="17" r="1.5" fill="#1D4ED8" />
      <circle cx="17" cy="17" r="1.5" fill="#1D4ED8" />
    </svg>
  );
}
