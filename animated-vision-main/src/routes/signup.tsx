import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell, GoogleBtn, inputCls } from "@/components/auth-shell";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — CloudCurb AI" },
      {
        name: "description",
        content: "Create your CloudCurb AI account and start cutting cloud carbon.",
      },
      { property: "og:title", content: "Create account — CloudCurb AI" },
      {
        property: "og:description",
        content: "Start cutting cloud carbon and cost with CloudCurb AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Signup,
});

function Signup() {
  const nav = useNavigate();
  const [err, setErr] = useState("");
  return (
    <AuthShell
      title="Explore your workspace"
      sub="Demo preview only. Account creation is not connected."
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          if (f.get("p") !== f.get("c")) return setErr("Passwords do not match");
          nav({ to: "/dashboard" });
        }}
      >
        <input required name="n" placeholder="Full name" className={inputCls} />
        <input required type="email" placeholder="Work email" className={inputCls} />
        <input required placeholder="Company / Organization" className={inputCls} />
        <input required name="p" type="password" placeholder="Password" className={inputCls} />
        <input
          required
          name="c"
          type="password"
          placeholder="Confirm password"
          className={inputCls}
        />
        {err && <p className="text-sm text-danger">{err}</p>}
        <Button className="w-full justify-center !py-2.5">Open demo workspace</Button>

        <p className="text-center text-sm text-muted-foreground">
          Have an account?{" "}
          <Link to="/login" className="text-primary">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
