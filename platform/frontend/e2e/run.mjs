/** Executa Playwright contra API e Vite locais com banco SQLite descartável. */
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const raiz = resolve(frontend, "../..");
const python = process.env.CURSED_E2E_PYTHON ?? (process.platform === "win32"
  ? join(raiz, ".venv", "Scripts", "python.exe") : "python");

async function portaLivre() {
  return new Promise((resolvePorta, rejeitar) => {
    const servidor = createServer();
    servidor.once("error", rejeitar);
    servidor.listen(0, "127.0.0.1", () => {
      const endereco = servidor.address();
      servidor.close(() => resolvePorta(endereco.port));
    });
  });
}

function executar(comando, argumentos, opcoes) {
  return new Promise((resolver, rejeitar) => {
    const processo = spawn(comando, argumentos, { ...opcoes, stdio: "inherit" });
    processo.once("error", rejeitar);
    processo.once("exit", (codigo) => codigo === 0 ? resolver() : rejeitar(new Error(`${comando} terminou com código ${codigo}`)));
  });
}

async function esperar(url, processo) {
  const limite = Date.now() + 30_000;
  while (Date.now() < limite) {
    if (processo.exitCode !== null) throw new Error(`Serviço encerrou antes de responder: ${url}`);
    try {
      const resposta = await fetch(url);
      if (resposta.ok) return;
    } catch { /* Inicialização ainda em curso. */ }
    await new Promise((resolver) => setTimeout(resolver, 250));
  }
  throw new Error(`Serviço não respondeu em 30 s: ${url}`);
}

async function encerrar(processo) {
  if (!processo || processo.exitCode !== null) return;
  if (process.platform === "win32") {
    await executar("taskkill", ["/PID", String(processo.pid), "/T", "/F"], { cwd: raiz }).catch(() => undefined);
  } else {
    processo.kill("SIGTERM");
  }
}

const temporario = await mkdtemp(join(tmpdir(), "cursed-e2e-"));
let api;
let vite;
try {
  const portaApi = await portaLivre();
  const portaApp = await portaLivre();
  const apiUrl = `http://127.0.0.1:${portaApi}`;
  const appUrl = `http://127.0.0.1:${portaApp}`;
  const databaseUrl = `sqlite:///${join(temporario, "plataforma.sqlite").replaceAll("\\", "/")}`;
  const ambiente = {
    ...process.env,
    CURSED_PLATFORM_DATABASE_URL: databaseUrl,
    CURSED_DEV_AUTH: "1",
    CURSED_LOCAL_OBJECTS_DIR: join(temporario, "objetos"),
    CURSED_ENV: "test",
    CURSED_CORS_ORIGINS: appUrl,
  };
  await executar(python, ["-m", "alembic", "-c", "platform/migration/alembic.ini", "upgrade", "head"],
    { cwd: raiz, env: ambiente });
  api = spawn(python, ["-m", "uvicorn", "cursed_api.entrypoint:app", "--app-dir", "platform/api",
    "--host", "127.0.0.1", "--port", String(portaApi), "--no-access-log"], { cwd: raiz, env: ambiente, stdio: "inherit" });
  await esperar(`${apiUrl}/health`, api);
  vite = spawn(process.execPath, [join(frontend, "node_modules", "vite", "bin", "vite.js"),
    "--host", "127.0.0.1", "--port", String(portaApp), "--strictPort"], {
    cwd: frontend, env: { ...ambiente, VITE_API_URL: apiUrl, VITE_DEV_AUTH: "1" }, stdio: "inherit",
  });
  await esperar(appUrl, vite);
  await executar(process.execPath, [join(frontend, "node_modules", "@playwright", "test", "cli.js"),
    "test", "--config", "e2e/playwright.config.mjs"], {
    cwd: frontend, env: { ...ambiente, E2E_API_URL: apiUrl, E2E_APP_URL: appUrl },
  });
} finally {
  await encerrar(vite);
  await encerrar(api);
  await rm(temporario, { recursive: true, force: true });
}
