// src/components/ui/BonsaiLogo.jsx
// Square mark with rounded rect, branching bonsai, celadon foliage accent.
export default function BonsaiLogo({ size = 28, className = '' }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 40 40" fill="none"
      aria-label="Bonsai logo"
      className={className}
    >
      {/* Background */}
      <rect width="40" height="40" rx="10" fill="#1C1F1A"/>

      {/* Pot/tray */}
      <path d="M13 33h14" stroke="#7DEBA0" strokeWidth="1.8"
        strokeLinecap="round" opacity=".45"/>

      {/* Main trunk — organic curve */}
      <path d="M20 33 C19.5 28 20.5 24 20 19 C19.5 15 18 12 20 9"
        stroke="#4A5248" strokeWidth="2.2" strokeLinecap="round" fill="none"/>

      {/* Left branch */}
      <path d="M20 24 C16 21 12 20 9 17"
        stroke="#4A5248" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      {/* Right branch */}
      <path d="M20 21 C24 18 28 17 31 14"
        stroke="#4A5248" strokeWidth="1.6" strokeLinecap="round" fill="none"/>

      {/* Left foliage cluster */}
      <ellipse cx="9" cy="15"  rx="5.5" ry="4.2" fill="#1C2E22" opacity=".9"/>
      <ellipse cx="9" cy="15"  rx="3.5" ry="2.8" fill="#243B2A"/>
      {/* Right foliage cluster */}
      <ellipse cx="31" cy="12" rx="5.5" ry="4.2" fill="#1C2E22" opacity=".9"/>
      <ellipse cx="31" cy="12" rx="3.5" ry="2.8" fill="#243B2A"/>

      {/* Main canopy */}
      <ellipse cx="20" cy="9"  rx="8.5" ry="6.5" fill="#1C2E22" opacity=".95"/>
      <ellipse cx="20" cy="9"  rx="6.5" ry="5"   fill="#243B2A"/>
      <ellipse cx="20" cy="7"  rx="4.5" ry="3.5" fill="#2D4A33"/>

      {/* Apex — celadon living tip */}
      <ellipse cx="20" cy="4.5" rx="3"   ry="2.5" fill="#7DEBA0" fillOpacity=".3"/>
      <ellipse cx="20" cy="3.5" rx="1.8" ry="1.5" fill="#7DEBA0" fillOpacity=".5"/>
    </svg>
  )
}
