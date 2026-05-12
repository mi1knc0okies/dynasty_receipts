import {
  isRouteErrorResponse,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { useState, useEffect } from "react";

import type { Route } from "./+types/root";
import "./app.css";
import { Trophy, ArrowLeftRight, ClipboardList, Users, Search, Sun, Moon } from "lucide-react";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800&display=swap",
  },
];

const NAV_LINKS = [
  { to: "/", label: "Standings", icon: Trophy },
  { to: "/trades", label: "Trades", icon: ArrowLeftRight },
  { to: "/drafts", label: "Drafts", icon: ClipboardList },
  { to: "/waivers", label: "Waivers", icon: Users },
  { to: "/players", label: "Free Agents", icon: Search },
];

function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored ? stored === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      className="ml-2 w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

function Navigation() {
  return (
    <nav className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <NavLink
            to="/"
            className="flex items-center gap-2.5 group"
          >
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-primary-foreground" />
            </div>
            <span
              className="text-2xl font-bold tracking-wide uppercase text-foreground group-hover:text-primary transition-colors"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Die Nasty
            </span>
          </NavLink>

          {/* Nav links + theme toggle */}
          <div className="flex items-center">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === "/"}>
                {({ isActive }) => (
                  <div
                    className={`relative flex items-center gap-1.5 px-3 h-14 text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 hidden sm:block" />
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">
                      <Icon className="w-4 h-4" />
                    </span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                    )}
                  </div>
                )}
              </NavLink>
            ))}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script src="/theme-init.js" />
      </head>
      <body>
        <Navigation />
        <main className="min-h-[calc(100vh-3.5rem)]">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            {children}
          </div>
        </main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1
        className="text-5xl font-bold text-primary mb-2 uppercase tracking-wide"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {message}
      </h1>
      <p className="text-muted-foreground mb-4">{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto bg-muted rounded-lg text-sm">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
