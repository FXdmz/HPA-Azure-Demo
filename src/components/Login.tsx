import { useMsal } from "@azure/msal-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginRequest } from "@/config/auth";
import { LogIn, Bot, FileText, Shield } from "lucide-react";

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
            <svg
              viewBox="0 0 40 40"
              className="h-8 w-8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
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
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fx-dark-blue">
              <Bot className="h-8 w-8 text-fx-light-blue" />
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
              Sign in with Microsoft
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
