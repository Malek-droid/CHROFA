import * as React from "react";
import { cn } from "@/lib/utils";

function CheckmarkPath({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" className="stroke-primary/20" strokeWidth="2" fill="none" />
      <circle
        cx="12"
        cy="12"
        r="10"
        className="stroke-primary"
        strokeWidth="2"
        fill="none"
        strokeDasharray="62.83"
        strokeDashoffset="62.83"
        style={{
          animation: "complete-circle 0.5s ease-out 0.1s forwards",
        }}
      />
      <path
        d="M7 12.5l3 3 7-7"
        className="stroke-primary-foreground"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray="20"
        strokeDashoffset="20"
        style={{
          animation: "complete-check 0.35s ease-out 0.45s forwards",
        }}
      />
    </svg>
  );
}

function SpinnerRing({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" className="stroke-primary/10" strokeWidth="3" fill="none" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        className="stroke-primary"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function LoadingSpinnerSVG({
  className,
  size = "default",
}: {
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const sizeClasses = {
    sm: "h-8 w-8",
    default: "h-14 w-14",
    lg: "h-20 w-20",
  };
  return <SpinnerRing className={cn(sizeClasses[size], className)} />;
}

interface CompleteProps {
  message?: string;
  className?: string;
}

export function LoadingCompleteSVG({ message, className }: CompleteProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-5", className)}>
      <div className="relative h-20 w-20">
        <CheckmarkPath className="h-20 w-20" />
        <div
          className="absolute inset-0 rounded-full bg-primary/5"
          style={{
            animation: "complete-glow 0.6s ease-out 0.5s forwards",
            opacity: 0,
            transform: "scale(0.8)",
          }}
        />
      </div>
      {message && (
        <p
          className="text-sm font-medium text-foreground"
          style={{
            animation: "complete-fade-in 0.4s ease-out 0.6s both",
          }}
        >
          {message}
        </p>
      )}
      <style>{`
        @keyframes complete-circle {
          to { stroke-dashoffset: 0; }
        }
        @keyframes complete-check {
          to { stroke-dashoffset: 0; }
        }
        @keyframes complete-glow {
          to { opacity: 1; transform: scale(1.6); }
        }
        @keyframes complete-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

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
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" className="stroke-primary/10" strokeWidth="3" fill="none" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        className="stroke-primary"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function LoadingPage({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background">
      <LoadingSpinnerSVG size="lg" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export { LoadingSpinnerSVG as LoadingComplete };
