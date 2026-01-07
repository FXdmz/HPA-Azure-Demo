# HPA 2026 OMC Agent

## Overview
AI-powered chat assistant for MovieLabs OMC ontology, built with React, Vite, and TypeScript. Uses Microsoft Entra ID for authentication and Azure AI Foundry for AI capabilities.

## Architecture

### Frontend (React/Vite)
- `src/` - React application source code
- `src/components/` - React components (ChatInterface, Login, etc.)
- `src/services/agentService.ts` - API client for backend communication
- `src/config/auth.ts` - MSAL authentication configuration

### Backend (Node.js/Express)
- `server.js` - Unified Express server that:
  - Serves API endpoints at `/api/*`
  - Serves static frontend files from `dist/`
  - Handles Azure AI Foundry communication with ClientSecretCredential

### Development
- Vite dev server on port 5000 with hot reload
- Vite proxies `/api/*` requests to Node server on port 3001
- Run: `node server.js & npm run dev`

### Production
- Single Node server on port 5000
- Serves both API and static files
- Run: `PORT=5000 node server.js`

## Key Files
- `server.js` - Unified backend server
- `src/components/ChatInterface.tsx` - Main chat UI
- `src/components/Login.tsx` - Microsoft Entra ID login page
- `src/services/agentService.ts` - Backend API client
- `vite.config.ts` - Vite configuration with dev proxy

## Environment Variables
- `AZURE_TENANT_ID` - Azure AD tenant ID
- `AZURE_CLIENT_ID` - Azure AD client ID
- `AZURE_CLIENT_SECRET` - Azure AD client secret
- `AI_FOUNDRY_ENDPOINT` - Azure AI Foundry endpoint URL
- `AI_AGENT_NAME` - Agent name (aescher2)

## Recent Changes
- 2026-01-07: Consolidated to unified server architecture
- 2026-01-07: Added dark/light theme toggle with localStorage persistence
- 2026-01-07: Implemented backend API for secure Azure communication
