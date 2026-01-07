# Dark/Light Mode Implementation Guide

## Files to Add

Copy these files to your `src/components/` folder:
- `ThemeProvider.tsx` - Context provider for theme state
- `ThemeToggle.tsx` - Toggle button components

## Step 1: Update tailwind.config.ts

Add the `darkMode` setting:

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",  // <-- Add this line
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // your existing theme extensions
    },
  },
  plugins: [],
} satisfies Config;
```

## Step 2: Update main.tsx or App.tsx

Wrap your app with the ThemeProvider:

```tsx
// main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./components/ThemeProvider";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
```

## Step 3: Add the Toggle to Your Header

In your Header component (or wherever you want the toggle):

```tsx
import { ThemeToggle } from "./ThemeToggle";
// Or use the switch style:
// import { ThemeToggleSwitch } from "./ThemeToggle";

export function Header() {
  return (
    <header className="...">
      {/* Your existing header content */}
      
      {/* Add the toggle */}
      <ThemeToggle />
      
      {/* Or use the switch style */}
      {/* <ThemeToggleSwitch /> */}
    </header>
  );
}
```

## Step 4: Update Your CSS Classes

Make sure your components use Tailwind's dark mode variants. Example:

```tsx
// Before (only dark)
<div className="bg-gray-900 text-white">

// After (supports both)
<div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
```

## Step 5: Update index.css (if needed)

Add base styles for both themes:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* Light mode (default) */
  :root {
    --background: 255 255 255;
    --foreground: 17 24 39;
  }

  /* Dark mode */
  .dark {
    --background: 17 24 39;
    --foreground: 255 255 255;
  }

  body {
    @apply bg-white text-gray-900 dark:bg-gray-900 dark:text-white;
    transition: background-color 0.3s, color 0.3s;
  }
}
```

## Quick Test

After implementing, you should be able to:
1. Click the toggle to switch between dark and light modes
2. The preference is saved to localStorage
3. On page refresh, the last selected theme persists
4. If no preference is saved, it respects the system preference

## Components That Need Dark Mode Updates

Update these components to support both themes:
- `ChatInterface.tsx` - main chat area
- `ChatMessage.tsx` - message bubbles
- `ChatInput.tsx` - input field
- `Header.tsx` - top navigation
- `Login.tsx` - login screen

Example pattern:
```tsx
// Dark-only style
className="bg-[#1a1b2e] border-[#2d2e4a]"

// Both themes
className="bg-white border-gray-200 dark:bg-[#1a1b2e] dark:border-[#2d2e4a]"
```
