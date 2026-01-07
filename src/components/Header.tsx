import { useMsal, useAccount } from "@azure/msal-react";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function Header() {
  const { instance, accounts } = useMsal();
  const account = useAccount(accounts[0] || {});

  const handleLogout = () => {
    instance.logoutPopup();
  };

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 40 40"
              className="h-8 w-8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* ME-DMZ Logo - Hexagon with M */}
              <path
                d="M20 2L36.66 12v20L20 42 3.34 32V12L20 2z"
                fill="#232073"
                stroke="#CEECF2"
                strokeWidth="2"
              />
              <path
                d="M12 28V14l8 8 8-8v14"
                stroke="#CEECF2"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
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

        {/* User Info */}
        {account && (
          <div className="flex items-center gap-3">
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
          </div>
        )}
      </div>
    </header>
  );
}
