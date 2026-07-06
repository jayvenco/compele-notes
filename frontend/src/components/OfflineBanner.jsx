export default function OfflineBanner() {
  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-amber-950 text-center text-sm py-1.5 px-4"
    >
      You&apos;re offline — cached notes are available; new changes will sync when you reconnect.
    </div>
  );
}
