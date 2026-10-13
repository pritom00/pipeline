import type { ReactNode, SVGProps } from 'react';

function Svg({ children, ...p }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      {children}
    </svg>
  );
}

export const Plus = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const Search = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Svg>;
export const Close = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const Moon = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /></Svg>;
export const Sun = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>;
export const Board = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="10" y="4" width="5" height="10" rx="1.5" /><rect x="17" y="4" width="4" height="13" rx="1.5" /></Svg>;
export const Chart = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>;
export const Bell = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" /></Svg>;
export const Clock = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
export const Dots = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></Svg>;
export const Grip = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><circle cx="9" cy="6" r="1.2" /><circle cx="15" cy="6" r="1.2" /><circle cx="9" cy="12" r="1.2" /><circle cx="15" cy="12" r="1.2" /><circle cx="9" cy="18" r="1.2" /><circle cx="15" cy="18" r="1.2" /></Svg>;
export const Check = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const Arrow = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
export const Briefcase = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><path d="M3 7h18v13H3zM8 7V4h8v3" /></Svg>;
export const Undo = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" /></Svg>;
export const Download = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></Svg>;
export const Upload = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><path d="M12 15V3M7 8l5-5 5 5M4 21h16" /></Svg>;
export const Refresh = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><path d="M21 12a9 9 0 11-3-6.7M21 4v5h-5" /></Svg>;
export const Link = (p: SVGProps<SVGSVGElement>) => <Svg {...p}><path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" /></Svg>;
export const Logo = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect width="24" height="24" rx="6" fill="var(--accent-bg)" />
    <path d="M7 8h10M7 12h7M7 16h4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
