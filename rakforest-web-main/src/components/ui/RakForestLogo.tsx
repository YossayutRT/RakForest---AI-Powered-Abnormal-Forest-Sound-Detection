"use client";

export type LogoVariant = "shield-radar" | "pine-sonar" | "official-badge";

export default function RakForestLogo({
  variant = "shield-radar",
  size = 38,
  className = "",
}: {
  variant?: LogoVariant;
  size?: number;
  className?: string;
}) {
  if (variant === "pine-sonar") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="RakForest Logo"
      >
        <rect width="64" height="64" rx="16" fill="#143325" />
        <rect
          x="1.5"
          y="1.5"
          width="61"
          height="61"
          rx="14.5"
          stroke="#40916C"
          strokeOpacity="0.65"
          strokeWidth="1.5"
        />
        {/* Concentric Sonar Rings */}
        <circle
          cx="32"
          cy="28"
          r="20"
          stroke="#52B788"
          strokeWidth="1.75"
          strokeDasharray="4 4"
          opacity="0.55"
        />
        <circle
          cx="32"
          cy="28"
          r="14"
          stroke="#95D5B2"
          strokeWidth="1.75"
          opacity="0.7"
        />
        {/* Stylized Pine Tree */}
        <path
          d="M32 10L20 26H26.5L18 39H26.5L22 48H42L37.5 39H46L37.5 26H44L32 10Z"
          fill="url(#pineGrad)"
          stroke="#D8F3DC"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Trunk & Acoustic Bars */}
        <rect x="29.5" y="48" width="5" height="7" rx="1.5" fill="#F59E0B" />
        <rect x="11" y="25" width="2.5" height="8" rx="1.25" fill="#FBBF24" />
        <rect x="50.5" y="25" width="2.5" height="8" rx="1.25" fill="#FBBF24" />
        <defs>
          <linearGradient
            id="pineGrad"
            x1="32"
            y1="10"
            x2="32"
            y2="48"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#74C69D" />
            <stop offset="1" stopColor="#2D6A4F" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  if (variant === "official-badge") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="RakForest Logo"
      >
        <circle cx="32" cy="32" r="30" fill="#112A1F" stroke="#F59E0B" strokeWidth="2.5" />
        <circle
          cx="32"
          cy="32"
          r="25.5"
          stroke="#74C69D"
          strokeWidth="1.2"
          strokeDasharray="3 2"
        />
        {/* Mountain & Forest Silhouette */}
        <path
          d="M12 42L24 24L33 35L41 25L52 42H12Z"
          fill="#2D6A4F"
          stroke="#95D5B2"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Acoustic Sensor Wave Arcs at Top */}
        <path
          d="M23 19C27.5 14.5 36.5 14.5 41 19"
          stroke="#FBBF24"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M27 22.5C29.8 19.8 34.2 19.8 37 22.5"
          stroke="#FDE68A"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="32" cy="25" r="2.5" fill="#EF4444" />
        {/* Bottom Soundwave Strip */}
        <path
          d="M18 47H23L26 43L29.5 51L33.5 41L37 49L40 45L42.5 47H46"
          stroke="#B7E4C7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Default: Concept 1 — Tactical Forest Shield & Acoustic Radar Pulse
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="RakForest Logo"
    >
      {/* Shield Base */}
      <path
        d="M32 4L55 13V30.5C55 45.2 45.1 56.8 32 60C18.9 56.8 9 45.2 9 30.5V13L32 4Z"
        fill="url(#shieldGrad)"
        stroke="#74C69D"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Inner Shield Highlight */}
      <path
        d="M32 8.5L50.5 15.8V30.2C50.5 42.4 42.5 52.1 32 55C21.5 52.1 13.5 42.4 13.5 30.2V15.8L32 8.5Z"
        stroke="#B7E4C7"
        strokeOpacity="0.35"
        strokeWidth="1.2"
      />
      {/* Acoustic Radar Waves around Tree */}
      <path
        d="M20 23C17.2 26.8 17.2 32.2 20 36"
        stroke="#FBBF24"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M44 23C46.8 26.8 46.8 32.2 44 36"
        stroke="#FBBF24"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M16 19.5C11.8 25.4 11.8 33.6 16 39.5"
        stroke="#F59E0B"
        strokeOpacity="0.7"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M48 19.5C52.2 25.4 52.2 33.6 48 39.5"
        stroke="#F59E0B"
        strokeOpacity="0.7"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Center Forest Tree Silhouette */}
      <path
        d="M32 14L23 26.5H28L21.5 36.5H28.5V43H35.5V36.5H42.5L36 26.5H41L32 14Z"
        fill="#D8F3DC"
      />
      {/* Live Acoustic Pulse Waveform at Shield Bottom */}
      <path
        d="M19 46.5H25L27.5 42.5L30.5 50.5L33.5 40.5L36.5 48.5L39 45L41 46.5H45"
        stroke="#52B788"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="shieldGrad"
          x1="32"
          y1="4"
          x2="32"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1B4332" />
          <stop offset="1" stopColor="#0D2319" />
        </linearGradient>
      </defs>
    </svg>
  );
}
