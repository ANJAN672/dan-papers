import React from 'react';
console.log("Index.tsx is executing - FRESH LOAD " + new Date().toISOString());
import ReactDOM from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { AuthProvider } from "./src/context/AuthContext";
import App from './App';
import { convex } from "./src/lib/convex";

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ConvexProvider>
  </React.StrictMode>
);
