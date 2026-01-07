import { useMsal } from "@azure/msal-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginRequest } from "@/config/auth";
import { LogIn, FileText, Shield } from "lucide-react";
import greenlightLogo from "@assets/greenlight_logo_1767803838031.png";
import movieLabsLogo from "@assets/2030_vision_logo_r-w_1767803990818.png";

export function Login() {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginPopup(loginRequest).catch((error) => {
      console.error("Login failed:", error);
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
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
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img src={greenlightLogo} alt="Greenlight Logo" className="h-32 w-32" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Welcome to HPA 2026 OMC Agent
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              AI-powered assistant for MovieLabs OMC ontology
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Features */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-fx-dark-blue/20">
                  <FileText className="h-4 w-4 text-fx-light-blue" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">MovieLabs OMC Knowledge</p>
                  <p className="text-xs text-muted-foreground">
                    Query the complete OMC ontology for media production
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-fx-dark-blue/20">
                  <Shield className="h-4 w-4 text-fx-light-blue" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Secure Authentication</p>
                  <p className="text-xs text-muted-foreground">
                    Sign in with Microsoft Entra ID
                  </p>
                </div>
              </div>
            </div>

            {/* Login Button */}
            <Button 
              onClick={handleLogin} 
              className="w-full" 
              size="lg"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign in with Microsoft Entra ID
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By signing in, you agree to access the HPA 2026 OMC Agent demonstration
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          © 2025 ME-DMZ Inc. | Powered by Azure AI Foundry
        </div>
      </footer>
    </div>
  );
}
