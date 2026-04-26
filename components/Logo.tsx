import Link from "next/link";

type LogoProps = {
  variant?: "full" | "mark";
  size?: "sm" | "md" | "lg";
  className?: string;
  asLink?: boolean;
};

const sizeMap = {
  sm: { mark: 24, text: "text-base" },
  md: { mark: 32, text: "text-xl" },
  lg: { mark: 44, text: "text-2xl" },
} as const;

function Mark({ pixels }: { pixels: number }) {
  return (
    <svg
      width={pixels}
      height={pixels}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="School Connect"
      className="shrink-0"
    >
      <path
        d="M 44.73 19.27 A 18 18 0 1 0 44.73 44.73"
        stroke="#0F6E6E"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="38" cy="32" r="5" fill="#F4B740" />
    </svg>
  );
}

export default function Logo({
  variant = "full",
  size = "md",
  className = "",
  asLink = true,
}: LogoProps) {
  const { mark, text } = sizeMap[size];

  const inner = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark pixels={mark} />
      {variant === "full" && (
        <span
          className={`font-display font-semibold tracking-tight ${text} text-fg`}
        >
          School<span className="text-primary"> Connect</span>
        </span>
      )}
    </span>
  );

  if (!asLink) return inner;
  return (
    <Link href="/" className="inline-flex items-center" aria-label="School Connect, ir al inicio">
      {inner}
    </Link>
  );
}
