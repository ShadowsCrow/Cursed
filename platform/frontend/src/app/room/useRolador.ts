import { useCallback, useEffect, useRef, useState } from "react";

import {
  acrescentarDado, ajustarModificador, MONTAGEM_VAZIA, quantidadeDeDados, removerDado, rolar,
  type EscolhaDaFicha, type FonteAleatoria, type Faces, type Montagem, type Rolagem,
} from "./dados";

export const LIMITE_DO_HISTORICO = 20;

export interface EstadoDoRolador {
  montagem: Montagem;
  /** Por qual ficha se rola (item 8); `undefined` até a pessoa ou a Sala escolher. */
  ficha: EscolhaDaFicha | undefined;
  /** Muda a escolha; ao escolher Atributo ou Perícia sem dado montado, põe 1d20. */
  escolherFicha: (ficha: EscolhaDaFicha) => void;
  ultima: Rolagem | null;
  /** O servidor está sorteando ou os dados ainda rolam no tabuleiro: o total só aparece no fim. */
  rolando: boolean;
  /** Falha ao pedir a rolagem ao servidor. */
  erro: string | null;
  historico: Rolagem[];
  acrescentar: (faces: Faces) => void;
  /** Tira um dado daquele tipo (botão direito ou Delete no dado, item 10). */
  remover: (faces: Faces) => void;
  modificar: (passo: number) => void;
  limpar: () => void;
  rolarMontagem: () => void;
  rolarDeNovo: (rolagem: Rolagem) => void;
  limparHistorico: () => void;
  /** Rolagem de outra pessoa da mesa: entra no histórico com o nome dela, sem mudar o visor. */
  receber: (rolagem: Rolagem) => void;
}

export interface OpcoesDoRolador {
  /** Sorteio local, só sem servidor (testes da interface). */
  fonte?: FonteAleatoria;
  /** Sorteio pelo servidor (item 3): quando existe, é ele quem rola, somando a ficha escolhida (item 8). */
  sortear?: (montagem: Montagem, ficha: EscolhaDaFicha | undefined) => Promise<Rolagem>;
  /**
   * Chamado a cada rolagem própria, logo depois do sorteio (para enviar à mesa e animar os dados).
   * Se devolver uma promessa, o total e o item do histórico só aparecem quando ela terminar.
   */
  aoRolar?: (rolagem: Rolagem) => Promise<void> | void;
}

/**
 * Estado do rolador, guardado por quem monta o painel (o `RoomView`), para sobreviver à troca de aba
 * e ao recolher o painel. Fica só na memória deste navegador: nada vai ao servidor da aplicação.
 */
export function useRolador({ fonte, sortear, aoRolar }: OpcoesDoRolador = {}): EstadoDoRolador {
  const [montagem, setMontagem] = useState<Montagem>(MONTAGEM_VAZIA);
  const [ficha, setFicha] = useState<EscolhaDaFicha | undefined>(undefined);
  const fichaAtual = useRef<EscolhaDaFicha | undefined>(undefined);
  const [historico, setHistorico] = useState<Rolagem[]>([]);
  // O resultado do visor é separado do histórico: "Limpar" o apaga, e o histórico continua.
  const [ultima, setUltima] = useState<Rolagem | null>(null);
  const [rolando, setRolando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // A montagem mais recente também fica numa ref, para "Rolar" logo depois de um toque não usar a anterior.
  const atual = useRef<Montagem>(MONTAGEM_VAZIA);
  const proximoId = useRef(1);
  const vez = useRef(0);
  const avisar = useRef(aoRolar);
  useEffect(() => { avisar.current = aoRolar; }, [aoRolar]);
  const pedir = useRef(sortear);
  useEffect(() => { pedir.current = sortear; }, [sortear]);
  const mudar = useCallback((transformar: (montagem: Montagem) => Montagem) => {
    atual.current = transformar(atual.current);
    setMontagem(atual.current);
  }, []);
  const guardar = useCallback((rolagem: Rolagem) => {
    setHistorico((anteriores) => [rolagem, ...anteriores].slice(0, LIMITE_DO_HISTORICO));
  }, []);
  const registrar = useCallback((origem: Montagem, escolha: EscolhaDaFicha | undefined) => {
    if (quantidadeDeDados(origem) === 0) return;
    const minha = ++vez.current;
    setErro(null);
    const mostrar = (rolagem: Rolagem) => {
      const revelar = () => {
        guardar(rolagem);
        if (minha !== vez.current) return;
        setUltima(rolagem);
        setRolando(false);
      };
      const espera = avisar.current?.(rolagem);
      if (espera) {
        setRolando(true);
        void espera.then(revelar, revelar);
      } else revelar();
    };
    if (!pedir.current) {
      mostrar(rolar(origem, proximoId.current++, fonte));
      return;
    }
    setRolando(true);
    pedir.current(origem, escolha).then(mostrar, (falha: unknown) => {
      if (minha !== vez.current) return;
      setRolando(false);
      setErro(falha instanceof Error ? falha.message : "Não foi possível rolar. Tente de novo.");
    });
  }, [fonte, guardar]);
  return {
    montagem,
    ficha,
    escolherFicha: (nova) => {
      const antes = fichaAtual.current;
      fichaAtual.current = nova;
      setFicha(nova);
      const novoModificador = (nova.atributo && nova.atributo !== antes?.atributo) || (nova.pericia && nova.pericia !== antes?.pericia);
      if (novoModificador && quantidadeDeDados(atual.current) === 0) mudar((anterior) => acrescentarDado(anterior, 20));
    },
    ultima,
    rolando,
    erro,
    historico,
    acrescentar: (faces) => mudar((anterior) => acrescentarDado(anterior, faces)),
    remover: (faces) => mudar((anterior) => removerDado(anterior, faces)),
    modificar: (passo) => mudar((anterior) => ajustarModificador(anterior, passo)),
    limpar: () => { mudar(() => MONTAGEM_VAZIA); vez.current += 1; setUltima(null); setRolando(false); setErro(null); },
    rolarMontagem: () => registrar(atual.current, fichaAtual.current),
    rolarDeNovo: (rolagem) => registrar(rolagem.montagem, rolagem.ficha ?? fichaAtual.current),
    limparHistorico: () => setHistorico([]),
    receber: guardar,
  };
}
