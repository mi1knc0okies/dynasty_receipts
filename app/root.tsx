import {
  isRouteErrorResponse,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { Button } from "./components/ui/button";
import { Trophy, ArrowLeftRight, ClipboardList, Users, Search, Shield, Settings } from "lucide-react";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

function Navigation() {
  const linkClass = (isActive: boolean) =>
    isActive
      ? "text-foreground font-semibold"
      : "text-muted-foreground hover:text-foreground transition-colors";

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <NavLink
            to="/"
            className="flex items-center gap-2 text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
          >
            <Shield className="w-6 h-6 text-primary" />
            <span className="hidden sm:inline">Die Nasty</span>
          </NavLink>
          <div className="flex items-center gap-1 sm:gap-2">
            <NavLink to="/">
              {({ isActive }) => (
                <Button variant="ghost" size="sm" className={linkClass(isActive)}>
                  <Trophy className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Standings</span>
                </Button>
              )}
            </NavLink>
            <NavLink to="/trades">
              {({ isActive }) => (
                <Button variant="ghost" size="sm" className={linkClass(isActive)}>
                  <ArrowLeftRight className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Trades</span>
                </Button>
              )}
            </NavLink>
            <NavLink to="/drafts">
              {({ isActive }) => (
                <Button variant="ghost" size="sm" className={linkClass(isActive)}>
                  <ClipboardList className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Drafts</span>
                </Button>
              )}
            </NavLink>
            <NavLink to="/waivers">
              {({ isActive }) => (
                <Button variant="ghost" size="sm" className={linkClass(isActive)}>
                  <Users className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Waivers</span>
                </Button>
              )}
            </NavLink>
            <NavLink to="/players">
              {({ isActive }) => (
                <Button variant="ghost" size="sm" className={linkClass(isActive)}>
                  <Search className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Free Agents</span>
                </Button>
              )}
            </NavLink>
            <NavLink to="/settings">
              {({ isActive }) => (
                <Button variant="ghost" size="sm" className={linkClass(isActive)}>
                  <Settings className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              )}
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Navigation />
        <main className="min-h-[calc(100vh-3.5rem)] bg-muted/30">
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
      <h1 className="text-2xl font-bold text-foreground mb-2">{message}</h1>
      <p className="text-muted-foreground mb-4">{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto bg-muted rounded-lg text-sm">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
