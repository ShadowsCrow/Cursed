/**
 * Simulação do arremesso dos dados 3D (melhorias-da-sala, item 3, D8 e D12), com cannon-es.
 * O arremesso inteiro é simulado antes de aparecer na tela, com passo fixo; os quadros gravados são
 * reproduzidos depois. O chão é o plano y = 0; as paredes ficam nas bordas da área visível.
 */
import { Body, ConvexPolyhedron, ContactMaterial, GSSolver, Material, Plane, Quaternion, Vec3, World } from "cannon-es";

import { solido, type Forma } from "./geometria";
import type { Quaternio } from "./rotulos";

export const PASSO = 1 / 60;
export const MAXIMO_DE_PASSOS = 600;
/** Valores por quadro de cada dado: posição (x, y, z) e orientação (x, y, z, w). */
export const POR_QUADRO = 7;

export interface Arremesso {
  /** Um Float32Array por dado, com `POR_QUADRO` valores por quadro. */
  quadros: Float32Array[];
  passos: number;
  finais: Quaternio[];
  parados: boolean;
}

/** Área do chão em unidades do mundo: x vai da esquerda à direita da tela, z de cima para baixo. */
export interface Area { largura: number; profundidade: number }

export type Aleatorio = () => number;

function parede(mundo: World, material: Material, normal: Vec3, distancia: number) {
  const corpo = new Body({ mass: 0, material, shape: new Plane() });
  // O plano do cannon-es tem a normal em +z local; gira para a normal pedida.
  corpo.quaternion.setFromVectors(new Vec3(0, 0, 1), normal);
  corpo.position.copy(normal.scale(-distancia));
  mundo.addBody(corpo);
}

export function simularArremesso(formas: Forma[], area: Area, aleatorio: Aleatorio = Math.random): Arremesso {
  const mundo = new World({ gravity: new Vec3(0, -60, 0), allowSleep: true });
  const solver = new GSSolver();
  solver.iterations = 14;
  mundo.solver = solver;
  const chao = new Material("chao");
  const borda = new Material("borda");
  const dado = new Material("dado");
  mundo.addContactMaterial(new ContactMaterial(chao, dado, { friction: 0.3, restitution: 0.42 }));
  mundo.addContactMaterial(new ContactMaterial(borda, dado, { friction: 0, restitution: 0.85 }));
  mundo.addContactMaterial(new ContactMaterial(dado, dado, { friction: 0.05, restitution: 0.6 }));

  const meiaLargura = area.largura / 2;
  const meiaProfundidade = area.profundidade / 2;
  parede(mundo, chao, new Vec3(0, 1, 0), 0);
  parede(mundo, borda, new Vec3(1, 0, 0), meiaLargura);
  parede(mundo, borda, new Vec3(-1, 0, 0), meiaLargura);
  parede(mundo, borda, new Vec3(0, 0, 1), meiaProfundidade);
  parede(mundo, borda, new Vec3(0, 0, -1), meiaProfundidade);
  parede(mundo, borda, new Vec3(0, -1, 0), 12);

  const sorteio = (minimo: number, maximo: number) => minimo + (maximo - minimo) * aleatorio();
  // Os dados entram pelo canto de baixo à direita (perto do painel) e são lançados para o meio.
  const corpos = formas.map((forma, i) => {
    const s = solido(forma);
    const forma3d = new ConvexPolyhedron({
      vertices: s.vertices.map(([x, y, z]) => new Vec3(x, y, z)),
      faces: s.faces.map((face) => [...face]),
    });
    const corpo = new Body({ mass: 1, material: dado, shape: forma3d, allowSleep: true,
      sleepSpeedLimit: 0.25, sleepTimeLimit: 0.3, linearDamping: 0.12, angularDamping: 0.12 });
    const coluna = i % 4;
    const linha = Math.floor(i / 4);
    corpo.position.set(
      Math.max(-meiaLargura + 1.5, meiaLargura - 2 - coluna * 2.3),
      sorteio(3, 5) + linha * 1.5,
      Math.max(-meiaProfundidade + 1.5, meiaProfundidade - 2 - linha * 2.3 - sorteio(0, 1)),
    );
    corpo.quaternion.setFromEuler(sorteio(0, Math.PI * 2), sorteio(0, Math.PI * 2), sorteio(0, Math.PI * 2));
    // A força acompanha o tamanho da área: os dados cruzam boa parte dela e param perto do meio.
    const velocidade = Math.min(20, Math.max(8, area.largura * 0.62)) * sorteio(0.85, 1.1);
    const angulo = Math.PI + sorteio(0.25, 0.75);
    corpo.velocity.set(Math.cos(angulo) * velocidade, sorteio(-2, 4), Math.sin(angulo) * velocidade);
    corpo.angularVelocity.set(sorteio(-25, 25), sorteio(-25, 25), sorteio(-25, 25));
    mundo.addBody(corpo);
    return corpo;
  });

  const quadros = corpos.map(() => new Float32Array(MAXIMO_DE_PASSOS * POR_QUADRO));
  let passos = 0;
  let parados = false;
  while (passos < MAXIMO_DE_PASSOS) {
    mundo.step(PASSO);
    corpos.forEach((corpo, i) => {
      const p = corpo.position;
      const q = corpo.quaternion;
      quadros[i]!.set([p.x, p.y, p.z, q.x, q.y, q.z, q.w], passos * POR_QUADRO);
    });
    passos += 1;
    if (corpos.every((corpo) => corpo.sleepState === Body.SLEEPING)) { parados = true; break; }
  }
  return {
    quadros: quadros.map((q) => q.slice(0, passos * POR_QUADRO)),
    passos,
    finais: corpos.map((corpo) => paraQuaternio(corpo.quaternion)),
    parados,
  };
}

function paraQuaternio(q: Quaternion): Quaternio {
  return [q.x, q.y, q.z, q.w];
}
