import Image from "next/image";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/brand/myndora-care-emblem.png"
        alt=""
        width={206}
        height={240}
        className="h-8 w-auto"
        priority
        unoptimized
      />
      <span className="whitespace-nowrap text-[13px] font-semibold leading-none tracking-tight sm:text-base">
        <span className="text-[#0B2545]">Myndora</span>{" "}
        <span className="text-[#00A896]">Care</span>
      </span>
    </span>
  );
}

export function LogoLockup({
  className = "mx-auto h-auto w-full max-w-[19rem]",
}: {
  className?: string;
}) {
  return (
    <Image
      src="/brand/myndora-care-lockup.png"
      alt="Myndora Care. Connected care. Stronger families. Peace of mind."
      width={760}
      height={733}
      className={className}
      priority
      unoptimized
    />
  );
}

export function ParentMark() {
  return (
    <span className="inline-flex items-center gap-2 text-muted">
      <Image
        src="/brand/myndora-logo.png"
        alt=""
        width={20}
        height={20}
        className="h-5 w-5"
        unoptimized
      />
      <span>A product of Myndora Solutions</span>
    </span>
  );
}
