import * as React from "react";
import { cn } from "@/lib/utils";

// Import raw SVG strings using Vite's ?raw modifier to preserve all animate and animateTransform tags.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import spinnerRaw from "@/lib/loading-spinner.svg?raw";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import completeRaw from "@/lib/loading-complete.svg?raw";

// ─── SVG-file-based components (SMIL animated) ───────────────────────────────

/**
 * Animated loading spinner — renders loading-spinner.svg inline.
 * Uses SMIL <animate> and <animateTransform> for a pulsing dot animation.
 */
export function LoadingSpinnerSVG({
  className,
  size = "default",
}: {
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const sizePx = { sm: 32, default: 56, lg: 80 }[size];
  return (
    <span
      className={cn("inline-block", className)}
      style={{ width: sizePx, height: sizePx }}
      dangerouslySetInnerHTML={{ __html: spinnerRaw }}
    />
  );
}

/**
 * Completion animation — renders loading-complete.svg inline.
 * Shows an orbiting-ring-to-checkmark SMIL animation.
 */
export function LoadingCompleteSVG({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <span
        className="inline-block"
        style={{ width: 120, height: 120 }}
        dangerouslySetInnerHTML={{ __html: completeRaw }}
      />
      {message && (
        <p className="text-sm font-medium text-foreground animate-in fade-in duration-500">
          {message}
        </p>
      )}
    </div>
  );
}

// ─── CSS-animated fallback spinner (kept for backward compat) ─────────────────

export function LoadingSpinner({
  className,
  size = "default",
}: {
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <svg
      className={cn("animate-spin", sizeClasses[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ─── Composite components ─────────────────────────────────────────────────────

/** Full-page loading overlay — uses the branded SMIL spinner. */
export function LoadingPage({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background">
      <LoadingSpinnerSVG size="lg" />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

/** Inline loading skeleton for content areas. */
export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted", className)} />
  );
}

export { LoadingSpinnerSVG as LoadingComplete };
