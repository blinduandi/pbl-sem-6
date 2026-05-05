interface LogoProps {
  size?: number;
}

export default function Logo({ size = 28 }: LogoProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Room Manager logo"
      role="img"
    >
      <circle cx="16" cy="16" r="15" fill="var(--brand-green)" />
      <text
        x="16"
        y="20"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="11"
        fontWeight={500}
        fill="#0f0f0f"
        letterSpacing="0.5"
      >
        RM
      </text>
    </svg>
  );
}
