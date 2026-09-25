import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";

export type CommandPreviewStatus = "confirmado" | "previa-local" | "erro";

export interface UseCommandPreviewOptions<TValue, TVariables> {
  /** Último valor confirmado pelo servidor. */
  confirmed: TValue;
  /** Deriva a prévia local otimista a partir das variáveis do comando, antes da resposta do servidor. */
  previewFrom: (variables: TVariables) => TValue;
  /** Envia o comando ao servidor; a promessa resolvida deve trazer o novo valor confirmado. */
  run: (variables: TVariables) => Promise<TValue>;
  /** Chamado com o valor confirmado quando o servidor aceita o comando. */
  onConfirmed?: (value: TValue) => void;
  /** Verdadeiro quando a aplicação está online; comandos são bloqueados quando falso. */
  online: boolean;
  offlineMessage?: string;
}

export interface UseCommandPreviewResult<TValue, TVariables> {
  /** Valor a exibir: a prévia local enquanto pendente, senão o último valor confirmado. */
  value: TValue;
  status: CommandPreviewStatus;
  /** Mensagem de erro a anunciar (ex.: em uma região aria-live), ou null quando não há erro. */
  errorMessage: string | null;
  isPending: boolean;
  execute: (variables: TVariables) => Promise<void>;
}

const DEFAULT_OFFLINE_MESSAGE = "Você está offline. Não é possível enviar comandos agora — tente novamente quando a conexão for restabelecida.";

/**
 * Padrão reutilizável de "prévia local vs. confirmação remota" para comandos
 * autoritativos, integrado ao `useMutation` do TanStack Query: ao executar um
 * comando, mostra imediatamente uma prévia otimista; se o servidor confirmar,
 * a prévia vira o novo valor confirmado; se falhar, a prévia é descartada, o
 * valor confirmado anterior volta a ser exibido e o erro fica disponível para
 * ser anunciado. Não há escrita offline: comandos são recusados quando `online`
 * é falso, sem tentar o servidor.
 */
export function useCommandPreview<TValue, TVariables>({
  confirmed,
  previewFrom,
  run,
  onConfirmed,
  online,
  offlineMessage = DEFAULT_OFFLINE_MESSAGE,
}: UseCommandPreviewOptions<TValue, TVariables>): UseCommandPreviewResult<TValue, TVariables> {
  const [preview, setPreview] = useState<TValue | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation<TValue, Error, TVariables>({
    mutationFn: run,
    onSuccess: (data) => {
      setPreview(null);
      setErrorMessage(null);
      onConfirmed?.(data);
    },
    onError: (error) => {
      setPreview(null);
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível confirmar o comando.");
    },
  });

  const execute = useCallback(
    async (variables: TVariables) => {
      if (!online) {
        setErrorMessage(offlineMessage);
        return;
      }
      setErrorMessage(null);
      setPreview(previewFrom(variables));
      try {
        await mutation.mutateAsync(variables);
      } catch {
        // já tratado em onError: a prévia é descartada e o erro fica disponível.
      }
    },
    [online, offlineMessage, previewFrom, mutation],
  );

  const value = preview ?? confirmed;
  const status: CommandPreviewStatus = errorMessage ? "erro" : preview !== null ? "previa-local" : "confirmado";

  return { value, status, errorMessage, isPending: mutation.isPending, execute };
}
