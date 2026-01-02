import React from 'react';

export const RaspberryIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M12 2c2 0 3.6 2 4.4 4h0a4 4 0 0 1 3.6 4c0 2.2-1.8 4-4 4h-8a4 4 0 0 1-4-4c0-2 .4-3.8 2-5.05" opacity="0.4" />
        <path d="M12 22s-6-4.5-6-10" />
        <path d="M12 22s6-4.5 6-10" />
        <path d="M12 2v6" />
        <path d="M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" fill="currentColor" className="text-pink-600" />
        <circle cx="9" cy="14" r="2" fill="currentColor" className="text-pink-600" />
        <circle cx="15" cy="14" r="2" fill="currentColor" className="text-pink-600" />
        <circle cx="12" cy="17" r="2" fill="currentColor" className="text-pink-600" />
        <circle cx="9" cy="10" r="1.5" />
        <circle cx="15" cy="10" r="1.5" />
    </svg>
);
