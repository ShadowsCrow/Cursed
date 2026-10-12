import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const args = process.argv.slice(2);
const check = args.includes("--check");
const probeIncompatible = args.includes("--probe-incompatible");
const schemaArg = args.indexOf("--schema");
if (schemaArg >= 0 && !args[schemaArg + 1]) {
  throw new Error("--schema exige um caminho para o OpenAPI JSON.");
}
const schemaPath = schemaArg >= 0
  ? resolve(args[schemaArg + 1])
  : fileURLToPath(new URL("../../api/openapi.json", import.meta.url));
const outputPath = fileURLToPath(new URL("../src/api/generated/schema.ts", import.meta.url));

const schema = JSON.parse(await readFile(schemaPath, "utf8"));
const generated = astToString(await openapiTS(schema));
if (probeIncompatible) {
  const changed = structuredClone(schema);
  const sheetPath = "/mesas/{mesa_id}/personagens/{personagem_id}/ficha";
  if (!changed.paths?.[sheetPath]?.put) {
    throw new Error("Operação de gravação ausente no contrato usado pelo teste de incompatibilidade.");
  }
  delete changed.paths[sheetPath].put;
  const incompatible = astToString(await openapiTS(changed));
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (incompatible === current) {
    console.error("A remoção de uma operação não invalidou o cliente gerado.");
    process.exitCode = 1;
  } else {
    console.log("Mudança incompatível detectada: cliente ficaria desatualizado.");
  }
} else if (check) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== generated) {
    console.error("Cliente TypeScript desatualizado: execute npm run generate:client.");
    process.exitCode = 1;
  } else {
    console.log("Cliente TypeScript atualizado.");
  }
} else {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, generated, "utf8");
  console.log(`Cliente TypeScript gerado: ${outputPath}`);
}
