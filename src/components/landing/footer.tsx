export function LandingFooter() {
  return (
    <footer className="border-t border-white/5 px-6 py-10 text-center text-sm text-white/40">
      © {new Date().getFullYear()} AI Tutor. Built with Next.js, Supabase, and Gemini.
    </footer>
  );
}
