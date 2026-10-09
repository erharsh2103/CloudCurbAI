import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  Gauge,
  Sparkles,
  Cpu,
  Bot,
  ScrollText,
  ArrowLeft,
  Bell,
  Search,
  ChevronDown,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CloudCurb AI" },
      {
        name: "description",
        content:
          "Carbon-aware cloud intelligence. Lower emissions, lower cost, protected production.",
      },

      { property: "og:title", content: "CloudCurb AI" },
      {
        property: "og:description",
        content:
          "Carbon-aware cloud intelligence. Lower emissions, lower cost, protected production.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,600;0,700;0,800;0,900;1,600;1,700;1,800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const workspaceNav = [
  { to: "/dashboard", label: "Command Center", icon: Gauge },
  { to: "/resource", label: "Resource Intelligence", icon: Cpu },
  { to: "/scheduler", label: "Scheduler + Relocator", icon: CalendarClock },
  { to: "/opportunities", label: "AI Action Plan", icon: Sparkles },
  { to: "/pilot", label: "CurbPilot", icon: Bot },
  { to: "/impact", label: "Impact & Audit", icon: ScrollText },
] as const;
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = ["/", "/login", "/signup"].includes(path);
  return (
    <QueryClientProvider client={queryClient}>
      {isPublic ? (
        <Outlet />
      ) : (
        <div className="workspace-wrap">
          <aside className="workspace-sidebar">
            <Link
              to="/"
              aria-label="CloudCurb AI home"
              title="CloudCurb AI home"
              className="brand-mark"
            >
              <BrandLogo size={38} />
            </Link>
            <nav>
              {workspaceNav.map((n) => (
                <Button
                  asChild
                  key={n.to}
                  size="icon"
                  variant={path === n.to ? "default" : "ghost"}
                >
                  <Link to={n.to} title={n.label} aria-label={n.label} className="sidebar-link">
                    <n.icon size={17} />
                    <span className="sidebar-label">{n.label}</span>
                  </Link>
                </Button>
              ))}
            </nav>
            <Button asChild variant="ghost" size="icon" className="mt-auto">
              <Link
                to="/"
                title="Back to website"
                aria-label="Back to website"
                className="sidebar-link"
              >
                <ArrowLeft />
                <span className="sidebar-label">Back to website</span>
              </Link>
            </Button>
          </aside>
          <main className="workspace-main">
            <header className="workspace-header">
              <div className="flex items-center gap-5">
                <Link to="/" className="workspace-brand-name">
                  CloudCurb <span className="brand-logo-ai">AI</span>
                </Link>
                <div className="workspace-pills">
                  <span className="workspace-pill">
                    <span className="status-dot" />
                    500 resources
                  </span>
                  <span className="workspace-pill">3 clouds</span>
                  <span className="workspace-pill">Production protected 100%</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button asChild variant="ghost" size="icon">
                  <Link to="/opportunities" title="AI Action Plan" aria-label="AI Action Plan">
                    <Search />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon">
                  <Link to="/pilot" title="Pending actions" aria-label="Pending actions">
                    <Bell />
                  </Link>
                </Button>
                <span className="workspace-avatar">CC</span>
                <span className="workspace-user text-xs">Demo workspace</span>
                <ChevronDown size={12} />
              </div>
            </header>
            <Outlet />
          </main>
        </div>
      )}
    </QueryClientProvider>
  );
}
