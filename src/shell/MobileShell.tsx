import { ReactNode, useEffect, useState } from "react";
import { Menu, MessageSquare } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "../auth/AuthProvider";
import { useProfile } from "../profile/useProfile";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { getVisibilityState } from "../state/visibilityState";
import { LoginButton } from "../auth/LoginButton";
import { LogoutButton } from "../auth/LogoutButton";
import { NAV_LINKS } from "./navLinks";
import { MobilePopupHost } from "./MobilePopupHost";
import { MobileChatDrawer } from "./MobileChatDrawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * The mobile app shell — three slots in one bar, drawn once in the wireframe
 * and ghosted onto every page from there.
 *
 *   left    nav drawer opener
 *   centre  the wordmark, or your own face once you're signed in
 *   right   sign-in, or the chat drawer opener once you're signed in
 *
 * The centre swap is exactly as wireframed, and it is the one choice here
 * most likely to read as a mistake: **a signed-in user never sees the
 * wordmark.** It is deliberate. The brand is what you need before you have an
 * account; your own face is what you need after, and it buys back the header
 * row that a separate account slot would have cost.
 *
 * Dropped from the desktop header, per the golden rule: the "Paylaş" button
 * (the OS share sheet is a long-press away) and the inline nav strip (which
 * below 1024px was a horizontally-scrolling row of links nobody could see the
 * end of — the thing this shell exists to replace).
 */
export function MobileShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const phase = useTournamentPhase();
  const location = useLocation();
  const state = getVisibilityState(Boolean(user), phase);
  const { profile } = useProfile(user?.uid ?? null);

  const [navOpen, setNavOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // A drawer that survives a route change is a drawer covering a page you
  // just asked for.
  useEffect(() => {
    setNavOpen(false);
    setChatOpen(false);
  }, [location.pathname]);

  const signedIn = !loading && Boolean(user);

  return (
    <MobilePopupHost>
      <div className="flex min-h-dvh cursor-default flex-col bg-background">
        {/* Cursorify (DESIGN.md §6): the root cursor reset, same as
            AppShell's — no I-beam anywhere by default, interactive elements
            opt back into a pointer individually. */}
        <header className="sticky top-0 z-40 shrink-0 border-b border-color_border1/50 bg-color_secondary pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-2 px-3 py-2">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Menüyü aç"
              aria-expanded={navOpen}
              className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-color_border1 text-color_text transition-colors duration-150 ease-[var(--ease-cotton)] active:bg-color_hoverfill outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_text"
            >
              <Menu className="size-[1.15rem]" />
            </button>

            {/* Centre slot — the wordmark, or the signed-in viewer's own
                profile opener. */}
            <div className="flex min-w-0 flex-1 justify-center">
              {signedIn && profile ? (
                <Link
                  to="/profile"
                  className="flex min-w-0 items-center gap-2 rounded-full px-2 py-1 no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_text"
                >
                  <Avatar size="sm">
                    <AvatarImage src={profile.photoURL} alt="" />
                    <AvatarFallback className="font-mono text-[0.65rem] text-color_text">
                      {profile.firstName.charAt(0)}
                      {profile.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate font-display text-sm font-medium text-color_text">
                    {profile.firstName}
                  </span>
                </Link>
              ) : (
                <Link
                  to="/"
                  className="flex items-center gap-2 rounded-sm leading-none no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-color_text"
                >
                  <img
                    src="/brand/kupatakip-logo-white.svg"
                    alt=""
                    aria-hidden
                    className="size-5 shrink-0"
                  />
                  <span className="font-display text-lg tracking-[-0.01em] text-color_text">
                    <span className="font-[450]">#kupatakip</span>
                    <span className="font-thin">ucl</span>
                  </span>
                </Link>
              )}
            </div>

            {/* Right slot — chat once signed in, sign-in before that. */}
            {signedIn ? (
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                aria-label="Sohbeti aç"
                aria-expanded={chatOpen}
                className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-color_border1 text-color_text transition-colors duration-150 ease-[var(--ease-cotton)] active:bg-color_hoverfill outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_text"
              >
                <MessageSquare className="size-[1.05rem]" />
              </button>
            ) : (
              <div className="shrink-0 [&_button]:cursor-pointer [&_button]:rounded-full [&_button]:border [&_button]:border-color_border1 [&_button]:px-3 [&_button]:py-2 [&_button]:font-mono [&_button]:text-[0.68rem] [&_button]:text-color_text [&_[role=alert]]:sr-only [&_svg]:size-4">
                {!loading && <LoginButton />}
              </div>
            )}
          </div>
        </header>

        <Toaster closeButton position="top-center" />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Capped and centred rather than stretched: everything below
              1024px renders the phone composition, and a 1000px-wide phone
              layout is worse than a centred column with air either side. */}
          <div
            key={location.pathname}
            className="mx-auto flex w-full max-w-[34rem] min-h-0 min-w-0 flex-1 flex-col animate-cotton-fade"
          >
            {children}
          </div>
        </main>

        <MobileNavDrawer
          open={navOpen}
          onOpenChange={setNavOpen}
          links={NAV_LINKS[state]}
          currentPath={location.pathname}
          signedIn={signedIn}
        />

        {signedIn && user && (
          <MobileChatDrawer open={chatOpen} onOpenChange={setChatOpen} uid={user.uid} />
        )}
      </div>
    </MobilePopupHost>
  );
}

function MobileNavDrawer({
  open,
  onOpenChange,
  links,
  currentPath,
  signedIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: { path: string; label: string }[];
  currentPath: string;
  signedIn: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="p-0">
        <SheetHeader>
          <SheetTitle>Menü</SheetTitle>
        </SheetHeader>

        <nav aria-label="Ana gezinme" className="min-h-0 flex-1 overflow-y-auto py-2">
          {links.map((link) => {
            const active =
              link.path === "/" ? currentPath === "/" : currentPath.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center px-5 py-3.5 font-mono text-[0.75rem] tracking-[0.14em] uppercase no-underline transition-colors duration-150 ease-[var(--ease-cotton)] outline-none focus-visible:bg-color_hoverfill",
                  active ? "text-color_text" : "text-color_textsecondary"
                )}
              >
                {/* The accent rule sits on the leading edge here rather than
                    underlining the label, since a drawer row is read
                    left-to-right against a hard edge, not centred like the
                    desktop strip. */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-color_accent transition-opacity duration-300 ease-[var(--ease-cotton)]",
                    active ? "opacity-100" : "opacity-0"
                  )}
                />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-color_border1/60 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {/* Dev-only shortcut, same DEV gate as the desktop header's —
              kept on mobile specifically because reaching any logged-in or
              started-phase composition to verify it needs the phase
              override (PROJECT_STATE §6.9). */}
          {import.meta.env.DEV && (
            <Link
              to="/dev"
              className="mb-3 block rounded-md border border-color_border1 px-3 py-2 text-center font-mono text-[0.7rem] text-color_text no-underline"
            >
              Dev Panel
            </Link>
          )}
          {signedIn && (
            <div className="[&_button]:w-full [&_button]:cursor-pointer [&_button]:rounded-md [&_button]:border [&_button]:border-color_border1 [&_button]:px-3 [&_button]:py-2 [&_button]:font-mono [&_button]:text-[0.7rem] [&_button]:text-color_text">
              <LogoutButton />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
