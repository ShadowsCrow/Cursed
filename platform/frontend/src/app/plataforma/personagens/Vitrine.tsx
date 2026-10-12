import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";

import { Dialog } from "../../../ui/primitives";
import { Icone, MolduraOrnamentada } from "../../../ui/Ornamentos";
import { useCartasDoPersonagem } from "../../cards/api";
import { useClasses, useListasFicha } from "../../characters/sheet/catalogoApi";
import { ResumoFicha } from "../../characters/sheet/resumo/ResumoFicha";
import { useFichaSnapshot, useInventario, useValoresDerivados } from "../../characters/sheet/sheetApi";
import type { ApiClient } from "../../characters/types";
import { routes } from "../../routes";
import { chaves, copiarPersonagem, useMesas, type AcervoPersonagem, type Colecao } from "../dados";

function DialogoCopiar({ api, userId, personagem, aberto, onFechar }: {
  api: ApiClient; userId: string; personagem: AcervoPersonagem; aberto: boolean; onFechar: () => void;
}) {
  const mesas = useMesas(api, userId);
  const narradas = (mesas.data ?? []).filter((mesa) => mesa.papel === "narrador");
  const [destino, setDestino] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const nome = useId();
  const copiar = useMutation({
    mutationFn: (mesaId: string) => copiarPersonagem(api, mesaId, personagem),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["acervo"] });
      void queryClient.invalidateQueries({ queryKey: chaves.personagensDaMesa(destino ?? "") });
    },
  });
  const tipoDaCopia = personagem.tipo === "monstro" ? "monstro" : "NPC";
  // Ao concluir, o formulário some: o foco vai para o resultado, dentro do diálogo (Esc continua fechando).
  const resultado = useRef<HTMLAnchorElement>(null);
  useEffect(() => { if (copiar.isSuccess) resultado.current?.focus(); }, [copiar.isSuccess]);
  const escolhida = narradas.find((mesa) => mesa.id === destino);
  return (
    <Dialog open={aberto} onClose={onFechar} title="Copiar para campanha"
      description={`Cria uma cópia independente de ${personagem.nome} como ${tipoDaCopia}, oculta até você revelar. Recursos cheios, sem itens, efeitos, Desgaste nem Consequências.`}>
      {mesas.isPending && <p role="status">Carregando campanhas…</p>}
      {mesas.isSuccess && narradas.length === 0 && <p>Para copiar, você precisa narrar uma campanha. Crie uma no Início ou em Campanhas.</p>}
      {copiar.isSuccess && escolhida
        ? (
          <div role="status" className="formulario-dialogo">
            <p>{personagem.nome} agora é {tipoDaCopia} em <strong>{escolhida.nome}</strong>.</p>
            <Link ref={resultado} className="button button--primary" to={routes.campanha(escolhida.id)}>Abrir a campanha</Link>
          </div>
        )
        : narradas.length > 0 && (
          <form className="formulario-dialogo" onSubmit={(evento) => { evento.preventDefault(); if (destino) copiar.mutate(destino); }}>
            <fieldset className="copia-opcoes">
              <legend>Campanha de destino</legend>
              {narradas.map((mesa) => (
                <label key={mesa.id}>
                  <input type="radio" name={nome} value={mesa.id} checked={destino === mesa.id} onChange={() => setDestino(mesa.id)} />
                  {mesa.nome}
                </label>
              ))}
            </fieldset>
            {copiar.isError && <p role="alert" className="field-error">{copiar.error.message}</p>}
            <button type="submit" className="button button--primary" disabled={!destino || copiar.isPending}>
              {copiar.isPending ? "Copiando…" : "Copiar"}
            </button>
          </form>
        )}
    </Dialog>
  );
}

/**
 * Vitrine do acervo no formato do Resumo da ficha (decisão do usuário, 2026-09-28): o mesmo
 * `ResumoFicha`, com as mesmas consultas da página da ficha, só de leitura (sem permissões, então
 * sem troca de ilustração nem convite para a História). Os atalhos dos quadros abrem a ficha.
 */
export function Vitrine({ api, userId, personagem, colecao }: {
  api: ApiClient; userId: string; personagem: AcervoPersonagem; colecao: Colecao;
}) {
  const { mesa_id: mesaId, personagem_id: personagemId } = personagem;
  const navigate = useNavigate();
  const ficha = useFichaSnapshot(api, mesaId, personagemId);
  const valores = useValoresDerivados(api, mesaId, personagemId);
  const inventario = useInventario(api, mesaId, personagemId);
  const cartas = useCartasDoPersonagem(api, mesaId, personagemId);
  const classes = useClasses(api, mesaId);
  const listas = useListasFicha(api, mesaId);
  const [copiando, setCopiando] = useState(false);
  const fichaCompleta = routes.character(mesaId, personagemId);

  return (
    <MolduraOrnamentada tipo="painel" className="vitrine-painel">
      <div className="vitrine__barra sangria-lateral">
        <p className="vitrine__campanha">
          Campanha: <strong>{personagem.mesa_nome}</strong>
          {personagem.visibilidade === "narrador" ? " · oculto para os jogadores" : ""}
        </p>
        <div className="vitrine__acoes">
          <Link className="button button--secondary" to={fichaCompleta}>
            <Icone nome="pergaminho" tamanho={18} /> Abrir ficha
          </Link>
          <button type="button" className="button button--primary" onClick={() => setCopiando(true)}>
            <Icone nome="copiar" tamanho={18} /> Copiar para campanha
          </button>
        </div>
      </div>
      {(ficha.isPending || valores.isPending) && <p role="status" className="vitrine__estado">Carregando o resumo…</p>}
      {ficha.isError && <p role="alert" className="vitrine__estado">{ficha.error.message}</p>}
      {valores.isError && <p role="alert" className="vitrine__estado">{valores.error.message}</p>}
      {ficha.isSuccess && valores.isSuccess && (
        <div className="vitrine__resumo">
          <ResumoFicha
            api={api} mesaId={mesaId} personagemId={personagemId}
            ficha={ficha.data.ficha} versao={ficha.data.versao}
            valores={valores.data} inventario={inventario.data ?? []} cartas={cartas.data ?? []}
            listas={listas.data} classes={classes.data}
            onAbrir={(secao) => navigate(`${fichaCompleta}?secao=${secao}`)}
            onIlustracaoAlterada={() => undefined}
          />
        </div>
      )}
      <DialogoCopiar api={api} userId={userId} personagem={personagem} aberto={copiando} onFechar={() => setCopiando(false)} key={colecao} />
    </MolduraOrnamentada>
  );
}
