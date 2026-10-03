/**
 * Cena 3D dos dados por cima do tabuleiro (melhorias-da-sala, item 3, D8, D11 e D12).
 * Carregada por `import()` só na primeira rolagem animada. O arremesso é simulado antes; os números
 * das faces são trocados para a face de cima mostrar o valor sorteado; depois os quadros são reproduzidos.
 */
import {
  ACESFilmicToneMapping, AmbientLight, BufferGeometry, CanvasTexture, DirectionalLight, Float32BufferAttribute,
  HemisphereLight, Mesh, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Scene, ShadowMaterial,
  SRGBColorSpace, WebGLRenderer, type Material,
} from "three";

import { simularArremesso, POR_QUADRO } from "./fisica";
import { solido, type Forma } from "./geometria";
import { forcarResultado, indiceDeCima, rotulosDaFaceDoD4, rotulosIniciais, type DadoParaAnimar } from "./rotulos";
import { ARTE_DA_PEDRA, carregarFonte, carregarImagem, desenharFace, LADO_DA_TEXTURA, uvDaFace } from "./texturas";

/** Pixels de tela por unidade do mundo: um dado de raio 1 tem uns 80 px de diâmetro. */
const PIXELS_POR_UNIDADE = 40;
const CAMPO_DE_VISAO = 32;

export interface MesaDeDados {
  rolar(dados: DadoParaAnimar[]): Promise<void>;
  destruir(): void;
}

function geometriaDo(forma: Forma): BufferGeometry {
  const s = solido(forma);
  const posicoes: number[] = [];
  const normais: number[] = [];
  const uvs: number[] = [];
  const geometria = new BufferGeometry();
  let inicio = 0;
  s.faces.forEach((face, f) => {
    const uv = uvDaFace(forma, f);
    const n = s.normais[f]!;
    // Leque de triângulos a partir do primeiro vértice; um grupo (material) por face.
    for (let k = 1; k < face.length - 1; k += 1) {
      for (const j of [0, k, k + 1]) {
        posicoes.push(...s.vertices[face[j]!]!);
        normais.push(...n);
        uvs.push(...uv[j]!);
      }
    }
    const quantos = (face.length - 2) * 3;
    geometria.addGroup(inicio, quantos, f);
    inicio += quantos;
  });
  geometria.setAttribute("position", new Float32BufferAttribute(posicoes, 3));
  geometria.setAttribute("normal", new Float32BufferAttribute(normais, 3));
  geometria.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  return geometria;
}

/** O navegador desenha em WebGL? Sem isso, a Sala mostra o resultado direto. */
export function temWebGL(): boolean {
  try {
    const teste = document.createElement("canvas");
    return Boolean(teste.getContext("webgl2") ?? teste.getContext("webgl"));
  } catch {
    return false;
  }
}

export async function criarMesaDeDados(container: HTMLElement): Promise<MesaDeDados> {
  if (!temWebGL()) throw new Error("Sem WebGL.");
  const [pedra] = await Promise.all([carregarImagem(ARTE_DA_PEDRA), carregarFonte()]);
  const renderizador = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderizador.setClearColor(0x000000, 0);
  renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderizador.outputColorSpace = SRGBColorSpace;
  renderizador.toneMapping = ACESFilmicToneMapping;
  renderizador.toneMappingExposure = 1.05;
  renderizador.shadowMap.enabled = true;
  const canvas = renderizador.domElement;
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  const cena = new Scene();
  const camera = new PerspectiveCamera(CAMPO_DE_VISAO, 1, 1, 200);
  cena.add(new HemisphereLight(0xc9d4ff, 0x1a1408, 0.75));
  cena.add(new AmbientLight(0xffffff, 0.18));
  // Luz quente do alto à esquerda, como nas pinturas do jogo.
  const sol = new DirectionalLight(0xffe2b0, 1.9);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  cena.add(sol);
  cena.add(sol.target);
  const chao = new Mesh(new PlaneGeometry(1, 1), new ShadowMaterial({ opacity: 0.38 }));
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  cena.add(chao);

  const geometrias = new Map<Forma, BufferGeometry>();
  const materiais = new Map<string, MeshStandardMaterial>();
  const desenho = document.createElement("canvas");
  desenho.width = desenho.height = LADO_DA_TEXTURA;
  const ctx = desenho.getContext("2d");

  function material(forma: Forma, rotulos: string[]): Material {
    const chave = `${forma}:${rotulos.join(",")}`;
    let pronto = materiais.get(chave);
    if (!pronto) {
      const canvasDaFace = document.createElement("canvas");
      canvasDaFace.width = canvasDaFace.height = LADO_DA_TEXTURA;
      const ctxDaFace = canvasDaFace.getContext("2d") ?? ctx;
      if (ctxDaFace) desenharFace(ctxDaFace, forma, rotulos, pedra, materiais.size);
      const textura = new CanvasTexture(canvasDaFace);
      textura.colorSpace = SRGBColorSpace;
      textura.anisotropy = 4;
      pronto = new MeshStandardMaterial({ map: textura, roughness: 0.5, metalness: 0.1 });
      materiais.set(chave, pronto);
    }
    return pronto;
  }

  let malhas: Mesh[] = [];
  let quadro = 0;
  let encerrar: (() => void) | null = null;

  function enquadrar() {
    const largura = Math.max(1, container.clientWidth);
    const altura = Math.max(1, container.clientHeight);
    renderizador.setSize(largura, altura, false);
    canvas.style.width = `${largura}px`;
    canvas.style.height = `${altura}px`;
    const area = { largura: largura / PIXELS_POR_UNIDADE, profundidade: altura / PIXELS_POR_UNIDADE };
    camera.aspect = largura / altura;
    // A câmera olha de cima; o chão visível tem exatamente o tamanho da área (as paredes ficam nas bordas).
    camera.position.set(0, area.profundidade / 2 / Math.tan((CAMPO_DE_VISAO * Math.PI) / 360), 0);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    chao.scale.set(area.largura, area.profundidade, 1);
    sol.position.set(-area.largura * 0.8, 18, -area.profundidade * 0.9);
    const sombra = sol.shadow.camera;
    sombra.left = -area.largura / 2; sombra.right = area.largura / 2;
    sombra.top = area.profundidade / 2; sombra.bottom = -area.profundidade / 2;
    sombra.near = 1; sombra.far = 80;
    sombra.updateProjectionMatrix();
    return area;
  }

  function limparDados() {
    for (const malha of malhas) cena.remove(malha);
    malhas = [];
  }

  return {
    rolar(dados) {
      encerrar?.();
      limparDados();
      const area = enquadrar();
      const arremesso = simularArremesso(dados.map((d) => d.forma), area);
      malhas = dados.map((dado, i) => {
        const cima = indiceDeCima(dado.forma, arremesso.finais[i]!);
        const rotulos = forcarResultado(rotulosIniciais(dado.forma, dado.conjunto), cima, dado.rotulo);
        const s = solido(dado.forma);
        const materiaisDasFaces = s.faces.map((_, f) => material(dado.forma,
          dado.forma === "d4" ? rotulosDaFaceDoD4(rotulos, f) : [rotulos[f]!]));
        let geometria = geometrias.get(dado.forma);
        if (!geometria) { geometria = geometriaDo(dado.forma); geometrias.set(dado.forma, geometria); }
        const malha = new Mesh(geometria, materiaisDasFaces);
        malha.castShadow = true;
        cena.add(malha);
        return malha;
      });
      const posicionar = (passo: number) => {
        malhas.forEach((malha, i) => {
          const q = arremesso.quadros[i]!;
          const k = passo * POR_QUADRO;
          malha.position.set(q[k]!, q[k + 1]!, q[k + 2]!);
          malha.quaternion.set(q[k + 3]!, q[k + 4]!, q[k + 5]!, q[k + 6]!);
        });
        renderizador.render(cena, camera);
      };
      return new Promise<void>((resolver) => {
        // O relógio começa no primeiro quadro desenhado: com a página oculta, o navegador não desenha, e a
        // animação não deve pular para o fim quando ela volta a aparecer.
        let inicio: number | null = null;
        let ativo = true;
        encerrar = () => { ativo = false; cancelAnimationFrame(quadro); encerrar = null; resolver(); };
        const animar = (agora: number) => {
          if (!ativo) return;
          inicio ??= agora;
          const passo = Math.min(arremesso.passos - 1, Math.floor(((agora - inicio) / 1000) / (1 / 60)));
          posicionar(passo);
          if (passo >= arremesso.passos - 1) { encerrar?.(); return; }
          quadro = requestAnimationFrame(animar);
        };
        posicionar(0);
        quadro = requestAnimationFrame(animar);
      });
    },
    destruir() {
      encerrar?.();
      limparDados();
      for (const geometria of geometrias.values()) geometria.dispose();
      for (const m of materiais.values()) { m.map?.dispose(); m.dispose(); }
      chao.geometry.dispose();
      (chao.material as Material).dispose();
      renderizador.dispose();
      renderizador.forceContextLoss();
      canvas.remove();
    },
  };
}
