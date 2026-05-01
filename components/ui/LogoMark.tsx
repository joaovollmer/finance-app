export default function LogoMark({
  size = 28,
  variant = "brand",
}: {
  size?: number;
  variant?: "brand" | "white";
}) {
  const fill = variant === "brand" ? "var(--brand)" : "rgba(255,255,255,0.18)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="28" height="28" rx="7" fill={fill} />
      <path
        d="M7 19 L11 13 L14 16 L18 9 L21 13"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="21" cy="10" r="2" fill="white" />
    </svg>
  );
}

export function Wordmark({ size = 17 }: { size?: number }) {
  return (
    <span
      className="font-bold text-ink"
      style={{ fontSize: size, letterSpacing: "-0.02em" }}
    >
      O <span style={{ color: "var(--brand)" }}>Investidor</span>
    </span>
  );
}
