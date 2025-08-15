// components/RouteLoadingFallback.tsx
import { LoadingSpinner } from "./loading-spinner";

export function RouteLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-100 p-6">
      <LoadingSpinner text="Loading page..." />
    </div>
  );
}