import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthShell, GoogleBtn, inputCls } from "@/components/auth-shell";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — CloudCurb AI" },
      { name: "description", content: "Sign in to your CloudCurb AI GreenOps workspace." },
      { property: "og:title", content: "Sign in — CloudCurb AI" },
      { property: "og:description", content: "Sign in to your CloudCurb AI GreenOps workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <AuthShell title="Welcome back" sub="Preview your GreenOps workspace. No account is required.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setTimeout(() => nav({ to: "/dashboard" }), 500);
        }}
      >
        <input required type="email" placeholder="you@company.com" className={inputCls} />
        <div className="relative">
          <input
            required
            type={show ? "text" : "password"}
            placeholder="Password"
            className={inputCls}
          />
          <Button
            type="button"
            aria-label="Toggle password"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-2.5 text-muted-foreground"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </Button>
        </div>
        <div className="flex justify-between text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-primary" />
            Remember me
          </label>
          <Link to="/dashboard" className="text-primary">
            Skip to demo
          </Link>
        </div>
        <Button className="w-full justify-center !py-2.5" disabled={busy}>
          {busy ? "Opening preview…" : "Open demo workspace"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link to="/signup" className="text-primary">
            Create account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
