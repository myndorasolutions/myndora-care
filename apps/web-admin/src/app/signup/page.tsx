import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">
        ← Back to Home
      </Link>
      <Link href="/">
        <Logo />
      </Link>
      <div>
        <h1 className="text-3xl font-semibold">Create an account</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Patients, sponsors, community health workers, pharmacies, and clinicians can sign up. Admin accounts are issued by Myndora.
        </p>
      </div>
      <SignupForm />
      <p className="text-sm">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-primary">
          Log in
        </Link>
      </p>
    </main>
  );
}
