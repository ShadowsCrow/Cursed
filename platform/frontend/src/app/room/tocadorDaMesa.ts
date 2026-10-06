/**
 * Tocador da música da mesa (musica-da-sala, D5 e D6): recebe o que a mesa deve ouvir e faz o áudio deste navegador
 * seguir, com troca suave entre faixas, pausa suave, correção quando sai do compasso e liberação do som no primeiro
 * gesto. As rampas de volume usam temporizador, e não `requestAnimationFrame`, para terminarem com a aba em segundo
 * plano (lição do teste com o usuário).
 */
import { PAUSA_MS, TOLERANCIA_S, TRANSICAO_MS, type FaixaDeMusica, type Posicao } from "./musica";

export interface AlvoDoTocador {
  faixa: FaixaDeMusica | null;
  tocando: boolean;
  repetir: boolean;
  /** Onde a faixa deve estar agora; calculada na hora, para valer também depois de carregar o áudio. */
  posicao: () => Posicao;
}

interface Canal {
  faixaId: string;
  audio: HTMLAudioElement;
  /** Fator da rampa, de 0 a 1; o volume do áudio é ele vezes o volume da pessoa. */
  ganho: number;
  querTocar: boolean;
  rampa?: ReturnType<typeof setInterval>;
}

const PASSO_DA_RAMPA_MS = 30;

export class TocadorDaMesa {
  private atual: Canal | null = null;
  private readonly saindo = new Set<Canal>();
  private alvo: AlvoDoTocador | null = null;
  private fator = 1;

  constructor(
    private readonly aoBloquear: (bloqueado: boolean) => void,
    private readonly criarAudio: (endereco: string) => HTMLAudioElement = (endereco) => new Audio(endereco),
  ) {}

  /** Volume da pessoa (0 a 1), já com "Silenciar". */
  definirVolume(fator: number) {
    this.fator = Math.min(1, Math.max(0, fator));
    if (this.atual) this.aplicar(this.atual);
    for (const canal of this.saindo) this.aplicar(canal);
  }

  /** Faz o áudio seguir o alvo. Chamado a cada mudança do estado e de tempos em tempos. */
  sincronizar(alvo: AlvoDoTocador) {
    this.alvo = alvo;
    const { faixa } = alvo;
    if (!faixa) {
      if (this.atual) this.sair(this.atual, PAUSA_MS);
      this.atual = null;
      return;
    }
    const posicao = alvo.posicao();
    const deveTocar = alvo.tocando && !posicao.terminou;
    let canal = this.atual;
    if (canal && canal.faixaId !== faixa.id) {
      this.sair(canal, TRANSICAO_MS);
      this.atual = canal = null;
      if (!deveTocar) return;
      canal = this.atual = this.criar(faixa);
      canal.audio.loop = alvo.repetir;
      this.posicionar(canal.audio);
      this.tocar(canal, TRANSICAO_MS);
      return;
    }
    if (!deveTocar) {
      if (canal?.querTocar) {
        canal.querTocar = false;
        canal.audio.loop = alvo.repetir;
        this.rampa(canal, 0, PAUSA_MS, () => canal!.audio.pause());
      }
      return;
    }
    if (!canal) {
      canal = this.atual = this.criar(faixa);
      canal.audio.loop = alvo.repetir;
      this.posicionar(canal.audio);
      this.tocar(canal, PAUSA_MS);
      return;
    }
    canal.audio.loop = alvo.repetir;
    if (!canal.querTocar || canal.audio.paused) {
      this.posicionar(canal.audio);
      this.tocar(canal, PAUSA_MS);
      return;
    }
    if (canal.audio.readyState >= 1 && Math.abs(canal.audio.currentTime - posicao.segundos) > TOLERANCIA_S) {
      canal.audio.currentTime = posicao.segundos;
    }
  }

  /** Gesto da pessoa ("Ativar som" ou o primeiro clique): tenta tocar de novo, dentro do gesto. */
  liberar() {
    if (this.alvo) this.sincronizar(this.alvo);
  }

  /** Ao sair da Sala: para tudo. */
  destruir() {
    this.alvo = null;
    if (this.atual) this.descartar(this.atual);
    for (const canal of this.saindo) this.descartar(canal);
    this.atual = null;
    this.saindo.clear();
  }

  private criar(faixa: FaixaDeMusica): Canal {
    const audio = this.criarAudio(faixa.arquivo);
    audio.preload = "auto";
    const canal: Canal = { faixaId: faixa.id, audio, ganho: 0, querTocar: false };
    this.aplicar(canal);
    return canal;
  }

  private posicionar(audio: HTMLAudioElement) {
    const ir = () => {
      const alvo = this.alvo?.posicao();
      if (!alvo) return;
      try { audio.currentTime = alvo.segundos; } catch { /* ainda sem metadados */ }
    };
    if (audio.readyState >= 1) ir();
    else audio.addEventListener("loadedmetadata", ir, { once: true });
  }

  private tocar(canal: Canal, rampaMs: number) {
    canal.querTocar = true;
    const subir = () => {
      if (!canal.querTocar) return;
      this.aoBloquear(false);
      this.rampa(canal, 1, rampaMs);
    };
    let tentativa: Promise<void> | undefined;
    try {
      tentativa = canal.audio.play();
    } catch {
      tentativa = undefined;
    }
    if (!tentativa) { subir(); return; }
    tentativa.then(subir, (erro: unknown) => {
      if (canal !== this.atual) return;
      canal.querTocar = false;
      // O navegador só toca som depois de um gesto da pessoa (D6).
      if (erro instanceof DOMException && erro.name === "NotAllowedError") this.aoBloquear(true);
    });
  }

  private sair(canal: Canal, ms: number) {
    canal.querTocar = false;
    if (canal.audio.paused) { this.descartar(canal); return; }
    this.saindo.add(canal);
    this.rampa(canal, 0, ms, () => this.descartar(canal));
  }

  private descartar(canal: Canal) {
    clearInterval(canal.rampa);
    this.saindo.delete(canal);
    canal.audio.pause();
    canal.audio.removeAttribute("src");
    try { canal.audio.load(); } catch { /* sem suporte (testes) */ }
  }

  private rampa(canal: Canal, para: number, ms: number, fim?: () => void) {
    clearInterval(canal.rampa);
    const de = canal.ganho;
    const inicio = Date.now();
    const passo = () => {
      const p = ms > 0 ? Math.min(1, (Date.now() - inicio) / ms) : 1;
      canal.ganho = de + (para - de) * p;
      this.aplicar(canal);
      if (p >= 1) {
        clearInterval(canal.rampa);
        canal.rampa = undefined;
        fim?.();
      }
    };
    canal.rampa = setInterval(passo, PASSO_DA_RAMPA_MS);
    passo();
  }

  private aplicar(canal: Canal) {
    canal.audio.volume = Math.min(1, Math.max(0, canal.ganho * this.fator));
  }
}
