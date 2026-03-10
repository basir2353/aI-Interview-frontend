import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <h1 className="text-6xl font-bold text-white">404</h1>
      <p className="mt-2 text-gray-400">This page could not be found.</p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-primary-600 px-6 py-3 font-medium text-white hover:bg-primary-500"
      >
        Go home
      </Link>
    </div>
  );
}
