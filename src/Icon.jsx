// Icon.jsx — inline stroke icons
export function Icon({ name }) {
  const paths = {
    pin: (
      <>
        <circle cx="12" cy="10" r="3" />
        <path d="M12 22s-7-7.5-7-12a7 7 0 0114 0c0 4.5-7 12-7 12z" />
      </>
    ),
    cal: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="1" />
        <path d="M3 9h18M8 3v4M16 3v4" />
      </>
    ),
    money: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9.5 9.5c0-1 1-2 2.5-2s2.5 1 2.5 2-1 1.5-2.5 1.5-2.5.5-2.5 1.5 1 2 2.5 2 2.5-1 2.5-2" />
      </>
    ),
    star: <path d="M12 3l2.6 6.2 6.4.6-4.9 4.4 1.5 6.3L12 17.3 6.4 20.5 7.9 14.2 3 9.8l6.4-.6L12 3z" />,
    check: <path d="M5 12l4 4 10-10" />,
    x: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </>
    ),
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    ext: (
      <>
        <path d="M14 4h6v6" />
        <path d="M10 14L20 4" />
        <path d="M19 13v6a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h6" />
      </>
    ),
    chevron: <path d="M6 9l6 6 6-6" />,
    trophy: (
      <>
        <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0V4z" />
        <path d="M7 6H4a3 3 0 003 3M17 6h3a3 3 0 01-3 3" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
    mic: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M6 11a6 6 0 0012 0M12 17v4" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
