import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";

import { createPlatformClients } from "./app/clients";
import { App } from "./app/App";
import { DevApp } from "./app/DevApp";
import { ComponentCatalog } from "./app/ComponentCatalog";
import { PreviewApp } from "./app/PreviewApp";
import { ProvaDoTema } from "./app/ProvaDoTema";
import { ProvaDoResumo } from "./app/ProvaDoResumo";
import { ProvaDaPlataforma } from "./app/plataforma/ProvaDaPlataforma";
import { InventoryPrototype } from "./app/inventory/InventoryPrototype";
import { ErrorBoundary } from "./app/ErrorBoundary";
import "./style.css";
import "./ui/primitives/primitives.css";
import "./ui/tema.css";
import "./app/characters/creation/assistente.css";
import "./app/characters/sheet/resumo/resumo.css";
import "./design/preview.css";
import "./design/tema-telas.css";
import "./app/plataforma/plataforma.css";

const root = document.getElementById("root");
if (!root) throw new Error("Elemento raiz da aplicação não encontrado.");

const apiUrl = import.meta.env.VITE_API_URL;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const devAuth = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH === "1";

if (window.location.pathname.startsWith("/preview/plataforma")) {
  // Prévia da navegação inicial: as telas reais com o cliente de demonstração, sob uma base própria.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter basename="/preview/plataforma"><ProvaDaPlataforma /></BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
} else if (window.location.pathname.startsWith("/preview")) {
  createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/preview/componentes" element={<ComponentCatalog />} />
            <Route path="/preview/tema" element={<ProvaDoTema />} />
            <Route path="/preview/resumo" element={<ProvaDoResumo />} />
            <Route path="/preview/inventario" element={<InventoryPrototype />} />
            <Route path="*" element={<PreviewApp />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>,
  );
} else if (devAuth && apiUrl) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });
  createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter><DevApp apiUrl={apiUrl} /></BrowserRouter>
        </QueryClientProvider>
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
