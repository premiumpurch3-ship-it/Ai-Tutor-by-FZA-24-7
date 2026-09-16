import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#141225] to-[#0a0b12] p-10 lg:flex">
        <div className="pointer-events-none absolute -top-20 -left-20 h-96 w-96 rounded-full bg-[var(--primary)]/25 blur-[120px]" />
        <Link href="/" className="relative flex items-center gap-2 font-semibold text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)]">
            <GraduationCap size={18} />
          </div>
          AI Tutor
        </Link>
        <div className="relative">
          <p className="text-2xl font-medium leading-relaxed text-white/80">
            &ldquo;It felt like having a tutor who actually read my textbook.&rdquo;
          </p>
          <p className="mt-4 text-sm text-white/40">Built for students, self-learners, and tutors.</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-[var(--background)] p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
