import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";

import { createPlatformClients } from "./app/clients";
import { App } from "./app/App";
import { ComponentCatalog } from "./app/ComponentCatalog";
import { PreviewApp } from "./app/PreviewApp";
import { ErrorBoundary } from "./app/ErrorBoundary";
import "./style.css";
import "./design/preview.css";
import "./ui/primitives/primitives.css";

const root = document.getElementById("root");
if (!root) throw new Error("Elemento raiz da aplicação não encontrado.");

const apiUrl = import.meta.env.VITE_API_URL;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (window.location.pathname.startsWith("/preview")) {
  createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/preview/componentes" element={<ComponentCatalog />} />
            <Route path="*" element={<PreviewApp />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>,
  );
} else if (!apiUrl || !supabaseUrl || !supabasePublishableKey) {
  createRoot(root).render(
    <main className="page" role="alert">
      <h1>Configuração incompleta</h1>
      <p>Defina VITE_API_URL, VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.</p>
      <p><a href="/preview">Abrir prévia visual sem configurar serviços</a></p>
    </main>,
  );
} else {
  const clients = createPlatformClients({ apiUrl, supabaseUrl, supabasePublishableKey });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });
  createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter><App clients={clients} /></BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
