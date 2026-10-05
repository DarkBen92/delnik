import type { ReactNode, SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconLeft = (p: P) => <Svg {...p}><path d="M14.5 6 8.5 12l6 6" /></Svg>;
export const IconRight = (p: P) => <Svg {...p}><path d="m9.5 6 6 6-6 6" /></Svg>;
export const IconSearch = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2" /></Svg>;
export const IconMenu = (p: P) => (
  <Svg {...p}><path d="M5 8h14M5 12h14M5 16h9" /></Svg>
);
export const IconClose = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const IconTrash = (p: P) => (
  <Svg {...p}><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></Svg>
);
export const IconRepeat = (p: P) => (
  <Svg {...p}><path d="M5 11V9a3 3 0 0 1 3-3h10l-3-3M19 13v2a3 3 0 0 1-3 3H6l3 3" /></Svg>
);
export const IconColor = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="7" /><path d="M12 5a7 7 0 0 1 0 14z" fill="currentColor" /></Svg>;
export const IconBell = (p: P) => (
  <Svg {...p}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" /></Svg>
);
export const IconMore = (p: P) => (
  <Svg {...p}><circle cx="6" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="18" cy="12" r="1.2" fill="currentColor" /></Svg>
);
export const IconCalendar = (p: P) => (
  <Svg {...p}><rect x="4" y="5.5" width="16" height="14" rx="2.5" /><path d="M4 10h16M9 3.5v4M15 3.5v4" /></Svg>
);
export const IconClip = (p: P) => (
  <Svg {...p}><path d="m19 11.5-6.8 6.8a4.2 4.2 0 0 1-6-6L13 5.5a2.8 2.8 0 0 1 4 4l-6.8 6.8a1.4 1.4 0 0 1-2-2l6.2-6.2" /></Svg>
);
export const IconPlusCircle = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 8.5v7M8.5 12h7" /></Svg>;
export const IconTimer = (p: P) => <Svg {...p}><circle cx="12" cy="13" r="7" /><path d="M12 13V9.5M10 3h4" /></Svg>;
export const IconArrowRight = (p: P) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
export const IconArrowDown = (p: P) => <Svg {...p}><path d="M12 5v14M6 13l6 6 6-6" /></Svg>;
export const IconCopy = (p: P) => <Svg {...p}><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M5 15V6a1 1 0 0 1 1-1h9" /></Svg>;
export const IconWeek = (p: P) => <Svg {...p}><path d="M4 12h12M12 6l6 6-6 6M20 5v14" /></Svg>;

/** Кружок «выполнено»: пустой круг с галочкой. */
export function CheckCircle({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="9.6" stroke="currentColor" strokeWidth="1.6" />
      <path className="tick" d="m7 11.2 2.7 2.7L15.2 8.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export const IconChart = (p: P) => <Svg {...p}><path d="M5 19V11M10 19V6M15 19v-5M20 19V9" /></Svg>;
export const IconPrint = (p: P) => (
  <Svg {...p}><path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2" /><rect x="7" y="14" width="10" height="6" rx="1" /></Svg>
);
export const IconPage = (p: P) => <Svg {...p}><path d="M7 3.5h7l4 4V20H7zM14 3.5V8h4M9.5 12h6M9.5 15.5h6" /></Svg>;
export const IconKeyboard = (p: P) => (
  <Svg {...p}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" /></Svg>
);
