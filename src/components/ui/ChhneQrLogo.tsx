import { useId } from "react";

interface ChhneQrLogoProps {
  size?: number;
  showWordmark?: boolean;
  showKhmerSub?: boolean;
  className?: string;
}

/**
 * ChhneQR (ឆ្នេរ QR) brand mark:
 * Deep ocean squircle with 3 authentic rounded QR finder eyes (TL, TR, BL)
 * and a sculpted Coconut Palm (ដើមដូង) rising organically from the 4th quadrant.
 */
export function ChhneQrMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const clipId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <clipPath id={clipId}>
          <rect width="64" height="64" rx="15" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {/* Deep Coastal Midnight Squircle */}
        <rect width="64" height="64" rx="15" fill="#0B2239" />

        {/* Top-Left Rounded QR Finder Eye */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M13.2 9H18.8C21.1196 9 23 10.8804 23 13.2V18.8C23 21.1196 21.1196 23 18.8 23H13.2C10.8804 23 9 21.1196 9 18.8V13.2C9 10.8804 10.8804 9 13.2 9ZM13.6 11.2C12.2745 11.2 11.2 12.2745 11.2 13.6V18.4C11.2 19.7255 12.2745 20.8 13.6 20.8H18.4C19.7255 20.8 20.8 19.7255 20.8 18.4V13.6C20.8 12.2745 19.7255 11.2 18.4 11.2H13.6Z"
          fill="#5EEAD4"
        />
        <rect x="13.5" y="13.5" width="5" height="5" rx="1.4" fill="#5EEAD4" />

        {/* Top-Right Rounded QR Finder Eye */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M45.2 9H50.8C53.1196 9 55 10.8804 55 13.2V18.8C55 21.1196 53.1196 23 50.8 23H45.2C42.8804 23 41 21.1196 41 18.8V13.2C41 10.8804 42.8804 9 45.2 9ZM45.6 11.2C44.2745 11.2 43.2 12.2745 43.2 13.6V18.4C43.2 19.7255 44.2745 20.8 45.6 20.8H50.4C51.7255 20.8 52.8 19.7255 52.8 18.4V13.6C52.8 12.2745 51.7255 11.2 50.4 11.2H45.6Z"
          fill="#5EEAD4"
        />
        <rect x="45.5" y="13.5" width="5" height="5" rx="1.4" fill="#5EEAD4" />

        {/* Bottom-Left Rounded QR Finder Eye */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M13.2 41H18.8C21.1196 41 23 42.8804 23 45.2V50.8C23 53.1196 21.1196 55 18.8 55H13.2C10.8804 55 9 53.1196 9 50.8V45.2C9 42.8804 10.8804 41 13.2 41ZM13.6 43.2C12.2745 43.2 11.2 44.2745 11.2 45.6V50.4C11.2 51.7255 12.2745 52.8 13.6 52.8H18.4C19.7255 52.8 20.8 51.7255 20.8 50.4V45.6C20.8 44.2745 19.7255 43.2 18.4 43.2H13.6Z"
          fill="#5EEAD4"
        />
        <rect x="13.5" y="45.5" width="5" height="5" rx="1.4" fill="#5EEAD4" />

        {/* Sculpted Filled Crescent Palm Fronds (ដើមដូង) */}
        <path
          d="M36.4 33.6C35.6 23.2 29.2 19.4 24.0 23.4C28.8 24.4 33.0 28.0 36.4 33.6Z"
          fill="#5EEAD4"
        />
        <path
          d="M35.8 34.2C30.5 26.8 23.4 28.8 20.6 35.8C25.4 33.8 30.8 33.6 35.8 34.2Z"
          fill="#5EEAD4"
        />
        <path
          d="M36.0 35.0C29.2 35.8 25.8 41.6 28.2 48.8C30.6 43.6 33.4 39.2 36.0 35.0Z"
          fill="#5EEAD4"
        />
        <path
          d="M37.0 33.6C41.2 24.4 49.4 23.4 54.6 29.2C48.8 28.6 42.6 30.4 37.0 33.6Z"
          fill="#5EEAD4"
        />
        <path
          d="M37.4 34.6C44.2 30.8 50.8 34.6 53.4 42.8C48.2 39.2 42.8 36.6 37.4 34.6Z"
          fill="#5EEAD4"
        />

        {/* Tapered Curved White Palm Trunk Rising from 4th Quadrant */}
        <path
          d="M43.4 65C43.0 54.5 40.4 44.2 36.1 36.3C35.8 35.7 36.6 35.1 37.3 35.6C42.6 43.2 47.4 53.5 50.2 65H43.4Z"
          fill="#FFFFFF"
        />
      </g>
    </svg>
  );
}

export function ChhneQrLogo({
  size = 30,
  showWordmark = true,
  showKhmerSub = false,
  className = "",
}: ChhneQrLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <ChhneQrMark size={size} />
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-[16.5px] font-extrabold tracking-[-0.03em] text-[#0B2239]">
            Chhne<span className="text-[#0D9488]">QR</span>
          </span>
          {showKhmerSub && (
            <span
              lang="km"
              className="mt-1 text-[10.5px] font-medium text-zinc-500"
            >
              ឆ្នេរ QR · ម៉ឺនុយឌីជីថល
            </span>
          )}
        </span>
      )}
    </span>
  );
}
