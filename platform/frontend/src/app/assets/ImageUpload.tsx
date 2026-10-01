import { useId, useRef, useState, type ChangeEvent } from "react";

import type { ApiClient } from "../characters/types";
import {
  enviarImagem, LIMITE_MB, removerImagem, TIPOS_IMAGEM, type DestinoImagem, type ImagemResposta,
} from "./imagensApi";

export type { DestinoImagem, ImagemResposta } from "./imagensApi";

export interface ImageUploadProps {
  api: ApiClient;
  mesaId: string;
  destino: DestinoImagem;
  alvo: string;
  /** Versão esperada do personagem ou do rascunho da carta; mapas e ícones de efeito não usam. */
  versao?: number | null;
  /** Nome do ponto, usado nos rótulos (ex.: "retrato"). */
  rotulo: string;
  /** Há imagem atual? Mostra a ação de remover. */
  temImagem?: boolean;
  onConcluido: (resposta: ImagemResposta) => void;
  /**
   * Chamado antes de enviar ou remover (ex.: salvar o rascunho da carta com edições pendentes, porque a
   * imagem é gravada no rascunho do servidor). Devolve a versão a usar no envio, ou a versão e o alvo
   * quando o alvo só passa a existir agora (a carta criada no primeiro salvamento).
   */
  prepararEnvio?: () => Promise<number | null | undefined | { versao: number | null | undefined; alvo: string }>;
  /**
   * `camera`: só um botão redondo com o ícone de câmera (a arte do editor de cartas), com o nome no rótulo
   * acessível; a dica e as mensagens aparecem junto dele.
   */
  aparencia?: "texto" | "camera";
}

/** Câmera do Lucide (licença ISC), em traço. */
function IconeCamera() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

/**
 * Envio de imagem reutilizado em retrato, itens, efeitos, cartas, mapas e ícones. Aceita PNG,
 * JPEG e WEBP; o servidor confere o conteúdo e o limite, e a recusa aparece em texto junto ao botão.
 */
export function ImageUpload({
  api, mesaId, destino, alvo, versao, rotulo, temImagem = false, onConcluido, prepararEnvio, aparencia = "texto",
}: ImageUploadProps) {
  const entrada = useRef<HTMLInputElement>(null);
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const idErro = useId();
  const limite = LIMITE_MB[destino];

  async function executar(acao: (versaoAtual: number | null | undefined, alvoAtual: string) => Promise<ImagemResposta>, sucesso: string) {
    setPendente(true);
    setErro(null);
    setAviso(null);
    try {
      const preparo = prepararEnvio ? await prepararEnvio() : versao;
      const [versaoAtual, alvoAtual] = preparo !== null && typeof preparo === "object"
        ? [preparo.versao, preparo.alvo] : [preparo, alvo];
      onConcluido(await acao(versaoAtual, alvoAtual));
      setAviso(sucesso);
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível enviar a imagem.");
    } finally {
      setPendente(false);
    }
  }

  function escolher(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;
    if (arquivo.type && !TIPOS_IMAGEM.includes(arquivo.type)) {
      setErro("Envie uma imagem PNG, JPEG ou WEBP.");
      return;
    }
    if (arquivo.size > limite * 1024 * 1024) {
      setErro(`A imagem passa do limite de ${limite} MB para ${rotulo}.`);
      return;
    }
    void executar((v, a) => enviarImagem(api, mesaId, destino, a, arquivo, v), `Imagem de ${rotulo} atualizada.`);
  }

  const remover = () => void executar((v, a) => removerImagem(api, mesaId, destino, a, v), `Imagem de ${rotulo} removida.`);
  if (aparencia === "camera") {
    return (
      <div className="image-upload image-upload--camera">
        <input ref={entrada} type="file" accept={TIPOS_IMAGEM.join(",")} hidden onChange={escolher}
          aria-label={`Arquivo de imagem para ${rotulo}`} data-testid={`upload-${destino}`} />
        <button type="button" className="image-upload__camera" disabled={pendente} aria-describedby={erro ? idErro : undefined}
          aria-label={pendente ? "Enviando…" : temImagem ? `Trocar ${rotulo}` : `Enviar ${rotulo}`}
          title={`${temImagem ? "Trocar" : "Enviar"} ${rotulo} (PNG, JPEG ou WEBP, até ${limite} MB)`}
          onClick={() => entrada.current?.click()}>
          <IconeCamera />
        </button>
        {temImagem && (
          <button type="button" className="image-upload__remover" disabled={pendente} aria-label={`Remover ${rotulo}`}
            title={`Remover ${rotulo}`} onClick={remover}>×</button>
        )}
        {erro && <p id={idErro} role="alert" className="image-upload__mensagem field-error">{erro}</p>}
        {aviso && <p role="status" className="image-upload__mensagem">{aviso}</p>}
      </div>
    );
  }

  return (
    <div className="image-upload">
      <input ref={entrada} type="file" accept={TIPOS_IMAGEM.join(",")} hidden onChange={escolher}
        aria-label={`Arquivo de imagem para ${rotulo}`} data-testid={`upload-${destino}`} />
      <button type="button" className="text-action" disabled={pendente} aria-describedby={erro ? idErro : undefined}
        onClick={() => entrada.current?.click()}>
        {pendente ? "Enviando…" : temImagem ? `Trocar ${rotulo}` : `Enviar ${rotulo}`}
      </button>
      {temImagem && (
        <button type="button" className="text-action" disabled={pendente}
          onClick={remover}>
          Remover {rotulo}
        </button>
      )}
      <small className="image-upload__hint">PNG, JPEG ou WEBP, até {limite} MB.</small>
      {erro && <p id={idErro} role="alert" className="field-error">{erro}</p>}
      {aviso && <p role="status" className="preview-note">{aviso}</p>}
    </div>
  );
}
