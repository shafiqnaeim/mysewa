export default function AmenityIcon({ id }) {
  switch (id) {
    case 'wifi':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M2 8.5c5.5-4.5 14.5-4.5 20 0M5.5 12c3.8-3 9.2-3 13 0M9 15.5c2-1.6 4-1.6 6 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <circle cx="12" cy="19" r="1.25" fill="currentColor" />
        </svg>
      )
    case 'parking':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path d="M10 7h2.2a3 3 0 0 1 0 6H10V7Z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
      )
    case 'aircond':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3v18M6 7l12 10M18 7 6 17"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'furnished':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 10h16v8H4v-8ZM6 10V7h12v3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'washing':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="12" cy="13" r="4" fill="none" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      )
    case 'fridge':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="2" width="12" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path d="M6 11h12M9 6v2M9 15v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      )
    case 'water_heater':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3c2 3 4 5 4 8a4 4 0 1 1-8 0c0-3 2-5 4-8Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'kitchen':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="8" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      )
    case 'desk':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 10h16v3H4v-3ZM8 13v5M16 13v5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      )
    case 'wardrobe':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="3" width="12" height="18" rx="1" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path d="M12 7v10M9 10h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      )
    case 'private_bathroom':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 10h12v8H6v-8ZM8 10V6h8v4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="14" r="1" fill="currentColor" />
        </svg>
      )
    case 'cctv':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 8h2l2-2h8l2 2h2v8h-2l-2 2h-8l-2-2H4V8Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      )
    case 'security':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3 5 6v6c0 3.5 3 5.5 7 7 4-1.5 7-3.5 7-7V6l-7-3Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'balcony':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="10" width="16" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path d="M4 14h16M8 10V6h8v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      )
    case 'utilities':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 2 4 14h7l-1 8 10-14H9l4-6Z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      )
  }
}
