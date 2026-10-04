export const metadata = { title: "Contact | Micron Computers" };

export default function ContactPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-6">
      <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eef2fb] text-accent">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Contact</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-navy sm:text-4xl">Coming Soon</h1>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
        We&apos;re working on it. In the meantime, reach out to us directly on WhatsApp for any queries.
      </p>
    </div>
  );
}
