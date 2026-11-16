import Image from "next/image";

export function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <Image
      src="/brand/myndora-logo.png"
      alt="Myndora Care"
      width={160}
      height={48}
      className={className}
      priority
    />
  );
}
