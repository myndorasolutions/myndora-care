import Link from "next/link";
import { LogoLockup } from "@/components/brand/logo";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">
        ← Back to Home
      </Link>
      <div className="flex flex-col gap-6 rounded-3xl bg-white px-6 py-8 shadow-[0_16px_40px_-28px_rgba(11,37,69,0.55)]">
        <Link href="/" className="mx-auto block w-full max-w-[19rem]">
          <LogoLockup />
        </Link>
        <div>
          <h1 className="text-3xl font-semibold">Log in</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Use the email on your Myndora Care profile. Demo accounts are listed in the database seed.
          </p>
        </div>
        <LoginForm />
        <p className="text-sm">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-primary">
            Create an account
          </Link>
        </p>
        <p className="text-sm leading-6">
          Are you a new CHW, pharmacy, or clinician?{" "}
          <Link href="/apply" className="font-semibold text-primary">
            Apply as a care partner
          </Link>
        </p>
      </div>
    </main>
  );
}
