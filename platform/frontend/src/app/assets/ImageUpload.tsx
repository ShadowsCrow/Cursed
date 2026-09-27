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
}

/**
 * Envio de imagem reutilizado em retrato, itens, efeitos, cartas, mapas e ícones. Aceita PNG,
 * JPEG e WEBP; o servidor confere o conteúdo e o limite, e a recusa aparece em texto junto ao botão.
 */
export function ImageUpload({ api, mesaId, destino, alvo, versao, rotulo, temImagem = false, onConcluido }: ImageUploadProps) {
  const entrada = useRef<HTMLInputElement>(null);
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const idErro = useId();
  const limite = LIMITE_MB[destino];

  async function executar(acao: () => Promise<ImagemResposta>, sucesso: string) {
    setPendente(true);
    setErro(null);
    setAviso(null);
    try {
      onConcluido(await acao());
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
    void executar(() => enviarImagem(api, mesaId, destino, alvo, arquivo, versao), `Imagem de ${rotulo} atualizada.`);
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
          onClick={() => void executar(() => removerImagem(api, mesaId, destino, alvo, versao), `Imagem de ${rotulo} removida.`)}>
          Remover {rotulo}
        </button>
      )}
      <small className="image-upload__hint">PNG, JPEG ou WEBP, até {limite} MB.</small>
      {erro && <p id={idErro} role="alert" className="field-error">{erro}</p>}
      {aviso && <p role="status" className="preview-note">{aviso}</p>}
    </div>
  );
}
