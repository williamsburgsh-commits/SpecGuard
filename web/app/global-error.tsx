"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#08080f] text-white">
        <div className="sg-shell py-24 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-[#8888aa]">Error</p>
          <h1 className="sg-headline mt-3">Something went wrong</h1>
          <p className="mx-auto mt-4 max-w-md text-[#8888aa]">
            {error.message || "An unexpected error occurred."}
          </p>
          <button type="button" onClick={() => reset()} className="sg-btn-primary mt-8">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
