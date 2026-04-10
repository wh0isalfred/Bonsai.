export default function BonsaiLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="#378ADD" />
      <path d="M18 29 L18 22" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 29 L22 29" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M18 22 C18 22 11 19 11 13 C11 9.5 14.1 7 18 7 C21.9 7 25 9.5 25 13 C25 19 18 22 18 22Z"
        fill="white" fillOpacity="0.22"
        stroke="white" strokeWidth="1.6" strokeLinejoin="round"
      />
      <path d="M18 22 C18 22 13 17.5 13.5 12.5" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
      <path d="M18 22 C18 22 22.5 17 22 12" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
      <path d="M18 18 C18 18 15 15 15.5 11.5" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}
