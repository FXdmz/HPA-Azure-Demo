import { useState } from "react";
import { useMsal, useAccount } from "@azure/msal-react";
import { Button } from "@/components/ui/button";
import { LogOut, User, Shield, Key, X } from "lucide-react";
import movieLabsLogo from "@assets/2030_vision_logo_r-w_1767803990818.png";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const { instance, accounts } = useMsal();
  const account = useAccount(accounts[0] || {});
  const claims = account?.idTokenClaims as any;
  const [showDebug, setShowDebug] = useState(false);

  const userRoles = claims?.roles || [];

  const getIamSource = (claims: any) => {
    if (!claims) return "Unknown";
    if (claims.idp === "live.com") return "Microsoft Personal (Live.com)";
    if (claims.idp) return claims.idp;
    return "Azure AD (Work/School)";
  };

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
              <div className="relative flex items-center gap-2">
                <div 
                  className="h-8 w-8 rounded-full bg-fx-light-blue flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-fx-light-blue/50 transition"
                  onClick={() => setShowDebug(!showDebug)}
                  title="Click to view Identity Token"
                >
                  <User className="h-4 w-4 text-fx-dark-blue" />
                </div>
                <div className="hidden sm:block">
                  <div 
                    className="cursor-pointer hover:opacity-80 transition"
                    onClick={() => setShowDebug(!showDebug)}
                    title="Click to view Identity Token"
                  >
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      {account.name || account.username}
                      {userRoles.includes("App.Admin") && (
                        <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-700 uppercase tracking-wider font-bold">
                          ADMIN
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-fx-light-blue font-mono">
                      IAM: {getIamSource(claims)}
                    </p>
                  </div>
                  {userRoles.length > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Shield className="h-3 w-3 text-emerald-500" />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {userRoles.join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Identity Debugger Popup */}
                {showDebug && (
                  <div className="absolute right-0 top-full mt-2 w-96 bg-gray-900 text-green-400 p-4 rounded-lg shadow-xl text-xs font-mono z-50 overflow-hidden border border-gray-700">
                    <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
                      <span className="text-white font-bold flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        RAW ID TOKEN CLAIMS
                      </span>
                      <button 
                        onClick={() => setShowDebug(false)} 
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-1 overflow-auto max-h-64">
                      <p><span className="text-purple-400">iss (Issuer):</span> {claims?.iss}</p>
                      <p><span className="text-purple-400">oid (User ID):</span> {claims?.oid}</p>
                      <p><span className="text-purple-400">tid (Tenant):</span> {claims?.tid}</p>
                      <p><span className="text-purple-400">name:</span> {claims?.name}</p>
                      <p><span className="text-purple-400">email:</span> {claims?.preferred_username || claims?.email}</p>
                      <p><span className="text-purple-400">roles:</span> {JSON.stringify(claims?.roles || "None")}</p>
                      <div className="border-t border-gray-700 my-2 pt-2">
                        <span className="text-gray-500">// Full Payload:</span>
                        <pre className="whitespace-pre-wrap break-all text-[10px] text-gray-400 mt-1 max-h-40 overflow-auto">
                          {JSON.stringify(claims, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
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
