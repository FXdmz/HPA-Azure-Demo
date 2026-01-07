import { Configuration, LogLevel, PopupRequest } from "@azure/msal-browser";

// Microsoft Entra ID (Azure AD) configuration for aescher2 app
export const msalConfig: Configuration = {
  auth: {
    clientId: "8bf8bcb9-2228-452f-9a1c-3f764f4c34b6", // Aesher-HPA-1-7-25
    authority: "https://login.microsoftonline.com/e97f9fc7-2bba-4957-bf26-f340d78414b7",
    redirectUri: typeof window !== 'undefined' ? window.location.origin : "http://localhost:5173",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Verbose:
            console.debug(message);
            break;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

// Scopes for user login
export const loginRequest: PopupRequest = {
  scopes: ["openid", "profile", "email"],
};

// Scopes for calling Azure AI Foundry / Cognitive Services API
export const agentTokenRequest = {
  scopes: ["https://ai.azure.com/.default"],
};

// Agent configuration - aescheraicanadaeast project with aescher2 agent
export const agentConfig = {
  endpoint: "https://aescheraicanadaeast-resource.services.ai.azure.com/api/projects/aescheraicanadaeast",
  agentName: "aescher2",
  apiVersion: "2025-04-01-preview",
};
