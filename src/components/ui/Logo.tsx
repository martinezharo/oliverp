import Image from "next/image";

/**
 * The brand mark and wordmark, shared by the application sidebar and the
 * landing page so there is one definition of what the logo looks like.
 */

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary-500 to-indigo-600 shadow-lg shadow-primary-500/20 ${className}`}>
      <Image src="/icon.svg" alt="" width={24} height={24} className="h-6 w-6" />
    </span>
  );
}

/** The mark with the name beside it. `nameClassName` hides it where needed. */
export function Logo({ className = "", nameClassName = "" }: { className?: string; nameClassName?: string }) {
  return (
    <span className={`flex items-center ${className}`}>
      <LogoMark />
      <span className={`ml-3 bg-linear-to-r from-white to-slate-400 bg-clip-text text-xl font-bold tracking-tight text-transparent ${nameClassName}`}>
        OlivERP
      </span>
    </span>
  );
}
