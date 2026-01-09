import { useMsal, useAccount } from "@azure/msal-react";
import { Button } from "@/components/ui/button";
import { LogOut, User, Shield } from "lucide-react";
import movieLabsLogo from "@assets/2030_vision_logo_r-w_1767803990818.png";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const { instance, accounts } = useMsal();
  const account = useAccount(accounts[0] || {});

  const userRoles = (account?.idTokenClaims as any)?.roles || [];

  const handleLogout = () => {
    instance.logoutPopup();
  };

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img src={movieLabsLogo} alt="MovieLabs Logo" className="h-16 w-16" />
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                HPA 2026 OMC Agent
              </h1>
              <p className="text-xs text-muted-foreground">
                MovieLabs x Microsoft
              </p>
            </div>
          </div>
        </div>

        {/* User Info & Theme Toggle */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {account && (
            <>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-fx-light-blue flex items-center justify-center">
                  <User className="h-4 w-4 text-fx-dark-blue" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-foreground">
                    {account.name || account.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {account.username}
                  </p>
                  {userRoles.length > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Shield className="h-3 w-3 text-emerald-500" />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {userRoles.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
