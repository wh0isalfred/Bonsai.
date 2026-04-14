export default function BonsaiLogo({ size = 36, showText = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill="#1F3D2B" />
        {/* Trunk */}
        <path d="M20 33 L20 24" stroke="#F5F1E8" strokeWidth="2" strokeLinecap="round" />
        {/* Base */}
        <path d="M15 33 L25 33" stroke="#F5F1E8" strokeWidth="2" strokeLinecap="round" />
        {/* Main canopy */}
        <path
          d="M20 24 C20 24 11 20.5 11 13.5 C11 9.5 15 6.5 20 6.5 C25 6.5 29 9.5 29 13.5 C29 20.5 20 24 20 24Z"
          fill="#4CAF50" fillOpacity="0.3" stroke="#4CAF50" strokeWidth="1.5" strokeLinejoin="round"
        />
        {/* Left branch */}
        <path d="M20 24 C20 24 13.5 19 14 13" stroke="#4CAF50" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        {/* Right branch */}
        <path d="M20 24 C20 24 26.5 18.5 26 12.5" stroke="#4CAF50" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        {/* Inner detail */}
        <path d="M20 20 C20 20 16.5 17 17 12" stroke="#F5F1E8" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
      </svg>
      {showText && (
        <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, fontSize: 18, color: '#1F3D2B', letterSpacing: '-0.5px' }}>
          bonsai
        </span>
      )}
    </div>
  )
}
