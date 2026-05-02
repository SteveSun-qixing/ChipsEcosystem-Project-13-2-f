import React from "react";

export type ScoreSymbolKind = "star" | "heart";

export interface ScoreSymbolIconProps {
  kind: ScoreSymbolKind;
  className?: string;
}

export function ScoreSymbolIcon({ kind, className }: ScoreSymbolIconProps) {
  if (kind === "heart") {
    return (
      <svg
        aria-hidden="true"
        className={className}
        focusable="false"
        viewBox="0 0 24 24"
      >
        <path
          d="M12 20.2C7.2 16.62 4 13.72 4 9.78 4 7.08 6.08 5 8.72 5c1.42 0 2.72.66 3.28 1.68C12.56 5.66 13.86 5 15.28 5 17.92 5 20 7.08 20 9.78c0 3.94-3.2 6.84-8 10.42Z"
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.4"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 3.2c.46 0 .86.27 1.04.69l1.55 3.55 3.82.36c.45.04.84.34 1 .77.15.43.04.91-.3 1.22l-2.86 2.58.84 3.75c.1.44-.08.9-.45 1.17-.37.27-.86.31-1.27.08L12 15.42l-3.33 1.97c-.4.23-.9.19-1.27-.08-.37-.27-.55-.73-.45-1.17l.84-3.75-2.86-2.58c-.34-.31-.45-.79-.3-1.22.16-.43.55-.73 1-.77l3.82-.36 1.55-3.55c.18-.42.58-.69 1.04-.69Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
