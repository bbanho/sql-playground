
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="512" height="512" rx="120" className="fill-slate-900"/>
    <path d="M256 120C185.307 120 128 141.487 128 168C128 194.513 185.307 216 256 216C326.693 216 384 194.513 384 168C384 141.487 326.693 120 256 120Z" stroke="#3B82F6" strokeWidth="24"/>
    <path d="M128 168V344C128 370.513 185.307 392 256 392C326.693 392 384 370.513 384 344V168" stroke="#3B82F6" strokeWidth="24" strokeLinecap="round"/>
    <path d="M128 256C128 282.513 185.307 304 256 304C326.693 304 384 282.513 384 256" stroke="#3B82F6" strokeWidth="24" strokeLinecap="round" strokeDasharray="40 40"/>
    <path d="M210 230L270 280L340 190" stroke="#60A5FA" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
