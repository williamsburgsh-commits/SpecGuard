import Link from "next/link";

export default function NotFound() {
  return (
    <div className="sg-shell pb-24 pt-40 text-center">
      <p className="text-xs uppercase tracking-[0.18em] text-[#8888aa]">404</p>
      <h1 className="sg-headline mt-3">Page not found</h1>
      <p className="mx-auto mt-4 max-w-md text-[#8888aa]">
        This route is not part of SpecGuard. Check the URL or return home.
      </p>
      <Link href="/" className="sg-btn-primary mt-8">
        Back home
      </Link>
    </div>
  );
}
