// components/LoadingSpinner.tsx
export function LoadingSpinner({ text }: { text?: string }) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        {text && <p className="mt-4 text-sm opacity-70">{text}</p>}
      </div>
    );
  }