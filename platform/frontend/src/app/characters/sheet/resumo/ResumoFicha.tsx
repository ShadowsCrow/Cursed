import type { ReactNode } from "react";

import { Glyph, type GlyphName } from "../../../../ui/Display";
import type { CartaPersonagemResumo } from "../../../cards/types";
import { ImageUpload, type ImagemResposta } from "../../../assets/ImageUpload";
import { useAssetImage } from "../../../assets/useAssetImage";
import { campoEditavel } from "../../fieldPolicy";
import type { ApiClient, FichaContrato, ItemInventarioResumo, PermissoesFicha, ValorDerivadoResumo } from "../../types";
import { acharPorNome, type ClasseCatalogo, type ListasFicha } from "../catalogoApi";
import { personagemInfo } from "../fichaAccess";
import { GRUPOS_ATRIBUTOS, GRUPOS_PERICIAS } from "../sheetCatalog";
import { ARTE_DO_RESUMO, type ModeloDoResumo, type SecaoDoResumo } from "./modelo";
import {
  atributosAgrupados, habilidadesAprendidas, historiaDe, imagemCentral, itensEquipados, periciasEmDestaque, recursosDoResumo,
} from "./resumo";
import { ResumoVisual } from "./ResumoVisual";

/** Arte privada de item ou carta, carregada sob demanda; sem ela (ou se falhar), o ícone do tipo. */
function ArteDoAtivo({ api, mesaId, caminho, icone }: { api: ApiClient; mesaId: string; caminho?: string; icone: GlyphName }) {
  const imagem = useAssetImage(api, mesaId, caminho ?? "", { exibicao: true, enabled: Boolean(caminho) });
  return imagem.data ? <img src={imagem.data} alt="" loading="lazy" /> : <Glyph name={icone} size={26} />;
}

const ICONE_ITEM: Record<ItemInventarioResumo["tipo"], GlyphName> = { arma: "sword", armadura: "shield", outro: "bag" };

export interface ResumoFichaProps {
  api: ApiClient;
  mesaId: string;
  personagemId: string;
  ficha: FichaContrato;
  versao: number;
  valores: ValorDerivadoResumo[];
  inventario: ItemInventarioResumo[];
  cartas: CartaPersonagemResumo[];
  listas?: ListasFicha;
  classes?: ClasseCatalogo[];
  permissoes?: PermissoesFicha;
  onAbrir: (secao: SecaoDoResumo) => void;
  onIlustracaoAlterada: (resposta: ImagemResposta) => void;
}

/**
 * Aba Resumo da ficha (aba-resumo-da-ficha): monta o modelo com os dados já carregados pela
 * página e o entrega ao `ResumoVisual`. Só leitura; a única ação é a ilustração, para quem edita.
 */
export function ResumoFicha({
  api, mesaId, personagemId, ficha, versao, valores, inventario, cartas, listas, classes, permissoes, onAbrir, onIlustracaoAlterada,
}: ResumoFichaProps) {
  const info = personagemInfo(ficha);
  const ilustracao = useAssetImage(api, mesaId, info.ilustracaoAtivo ?? "", { exibicao: true, enabled: Boolean(info.ilustracaoAtivo) });
  const retrato = useAssetImage(api, mesaId, info.imagemAtivo ?? "", { exibicao: true, enabled: Boolean(info.imagemAtivo) });
  const icones = listas?.icones_ficha;

  const equipamentos = itensEquipados(inventario);
  const habilidades = habilidadesAprendidas(cartas);
  const arte = (caminho: string | undefined, icone: GlyphName): ReactNode =>
    caminho ? <ArteDoAtivo api={api} mesaId={mesaId} caminho={caminho} icone={icone} /> : undefined;

  const modelo: ModeloDoResumo = {
    nome: info.nome,
    classe: info.classe,
    arquetipo: info.arquetipo,
    raca: info.raca,
    nivel: info.nivel,
    corClasse: acharPorNome(classes, info.classe)?.cor ?? undefined,
    imagem: imagemCentral(ilustracao.data, retrato.data ?? info.imagemUrl),
    recursos: recursosDoResumo(ficha, valores),
    atributos: atributosAgrupados(valores, GRUPOS_ATRIBUTOS, icones),
    pericias: periciasEmDestaque(valores, GRUPOS_PERICIAS, undefined, icones),
    equipamentos: {
      restantes: equipamentos.restantes,
      visiveis: equipamentos.visiveis.map(({ caminhoArte, ...item }) => ({ ...item, arte: arte(caminhoArte, ICONE_ITEM[item.tipo]) })),
    },
    habilidades: {
      restantes: habilidades.restantes,
      visiveis: habilidades.visiveis.map(({ caminhoArte, ...h }) => ({ ...h, arte: arte(caminhoArte, h.tipo === "magia" ? "spark" : "bolt") })),
    },
    historia: historiaDe(ficha),
  };

  const podeTrocarIlustracao = campoEditavel("personagem.ilustracao_ativo", permissoes);
  return (
    <ResumoVisual
      modelo={modelo}
      onAbrir={onAbrir}
      podeEditar={campoEditavel("personalidade.historia", permissoes)}
      arte={ARTE_DO_RESUMO}
      acaoImagem={podeTrocarIlustracao ? (
        <ImageUpload api={api} mesaId={mesaId} destino="ilustracao" alvo={personagemId} versao={versao}
          rotulo="ilustração" temImagem={Boolean(info.ilustracaoAtivo)} onConcluido={onIlustracaoAlterada} />
      ) : undefined}
    />
  );
}
