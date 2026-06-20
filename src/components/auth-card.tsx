import { Link } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type Props = {
  mode: "login" | "signup";
};

export function AuthCard({ mode }: Props) {
  const isLogin = mode === "login";
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 text-foreground">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/15 text-primary">
            <CalendarClock className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Cadence</span>
        </Link>

        <div className="rounded-xl border border-border bg-card p-8">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLogin ? "Sign in to continue to your dashboard." : "Start scheduling smarter in minutes."}
          </p>

          <Button variant="outline" className="mt-6 w-full">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.996 3.018v2.51h3.232c1.89-1.74 2.982-4.305 2.982-7.35Z"/><path fill="currentColor" d="M12 22c2.7 0 4.964-.895 6.618-2.422l-3.232-2.51c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.596-4.123H3.064v2.59A9.996 9.996 0 0 0 12 22Z"/><path fill="currentColor" d="M6.404 13.9A6.012 6.012 0 0 1 6.09 12c0-.659.114-1.3.314-1.9V7.51H3.064A9.996 9.996 0 0 0 2 12c0 1.614.386 3.14 1.064 4.49l3.34-2.59Z"/><path fill="currentColor" d="M12 5.977c1.468 0 2.786.504 3.823 1.495l2.868-2.868C16.96 2.991 14.696 2 12 2 8.09 2 4.708 4.246 3.064 7.51l3.34 2.59C7.19 7.737 9.395 5.977 12 5.977Z"/></svg>
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" placeholder="Jane Doe" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full">
              {isLogin ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? (
              <>Don't have an account? <Link to="/signup" className="text-foreground underline-offset-4 hover:underline">Sign up</Link></>
            ) : (
              <>Already have an account? <Link to="/login" className="text-foreground underline-offset-4 hover:underline">Sign in</Link></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
