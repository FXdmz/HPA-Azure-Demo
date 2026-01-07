import { MsalProvider, AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "@/config/auth";
import { Header } from "@/components/Header";
import { Login } from "@/components/Login";
import { ChatInterface } from "@/components/ChatInterface";

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

function AuthenticatedApp() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 overflow-hidden">
        <ChatInterface />
      </main>
    </div>
  );
}

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthenticatedTemplate>
        <AuthenticatedApp />
      </AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <Login />
      </UnauthenticatedTemplate>
    </MsalProvider>
  );
}

export default App;
