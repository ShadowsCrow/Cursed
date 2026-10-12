import { Portrait } from "../../../ui/Display";
import { MolduraOrnamentada } from "../../../ui/Ornamentos";
import { ImageUpload, type ImagemResposta } from "../../assets/ImageUpload";
import { useAssetImage } from "../../assets/useAssetImage";
import { acharPorNome, type ClasseCatalogo } from "./catalogoApi";
import { personagemInfo } from "./fichaAccess";
import { ResourcesStatus, type ResourcesStatusProps } from "./ResourcesStatus";
import type { ApiClient, FichaContrato } from "../types";

function RetratoMigrado({ api, mesaId, caminho, nome }: { api: ApiClient; mesaId: string; caminho: string; nome: string }) {
  const imagem = useAssetImage(api, mesaId, caminho, { exibicao: true });
  return <Portrait name={nome} imageUrl={imagem.data} hue="violet" size="large" />;
}

/**
 * Cabeçalho da ficha (visual-da-ficha): quadro noturno com moldura dourada recortada e o castelo ao
 * fundo; retrato emoldurado com trocar/remover abaixo; classe · raça, nome e etiquetas; PV e PP num
 * quadro próprio. A pintura é só fundo em CSS: sem ela, fica o gradiente do tema.
 */
export function SheetHeader({ ficha, api, mesaId, classes, recursos, envioRetrato }: {
  ficha: FichaContrato; api?: ApiClient; mesaId?: string; classes?: ClasseCatalogo[];
  /** PV e PP calculados; sem eles o cabeçalho mostra só a identidade. */
  recursos?: Omit<ResourcesStatusProps, "ficha">;
  /** Quem pode editar a ficha troca o retrato aqui. */
  envioRetrato?: { personagemId: string; versao: number; onConcluido: (resposta: ImagemResposta) => void };
}) {
  const info = personagemInfo(ficha);
  const eyebrow = [info.classe, info.raca].filter(Boolean).join(" · ");
  // A cor da classe complementa o nome, que continua escrito.
  const cor = acharPorNome(classes, info.classe)?.cor ?? undefined;
  return (
    <MolduraOrnamentada as="section" tipo="painel" fundo="vazio" className="character-hero cabecalho-ficha" aria-label={`Cabeçalho de ${info.nome}`}>
      <div className="cabecalho-ficha__cena" aria-hidden="true" />
      <div className="character-hero__portrait cabecalho-ficha__retrato">
        <span className="cabecalho-ficha__moldura-retrato">
          {info.imagemAtivo && api && mesaId
            ? <RetratoMigrado api={api} mesaId={mesaId} caminho={info.imagemAtivo} nome={info.nome} />
            : <Portrait name={info.nome} imageUrl={info.imagemUrl} hue="violet" size="large" />}
        </span>
        {envioRetrato && api && mesaId && (
          <ImageUpload api={api} mesaId={mesaId} destino="retrato" alvo={envioRetrato.personagemId} versao={envioRetrato.versao}
            rotulo="retrato" temImagem={Boolean(info.imagemAtivo)} onConcluido={envioRetrato.onConcluido} />
        )}
      </div>
      <div className="character-hero__identity cabecalho-ficha__identidade">
        <span className="eyebrow cabecalho-ficha__classe">
          {cor && <span className="class-swatch" style={{ background: cor }} aria-hidden="true" />}
          {eyebrow || "Identidade não preenchida"}
        </span>
        <h1>{info.nome}</h1>
        <div className="tag-row">
          {info.arquetipo && <span className="tag">{info.arquetipo}</span>}
          {info.idade !== undefined && <span className="tag">{info.idade} anos</span>}
        </div>
      </div>
      {recursos && (
        <MolduraOrnamentada tipo="quadro" fundo="noite" className="character-hero__resources cabecalho-ficha__recursos">
          <ResourcesStatus ficha={ficha} {...recursos} />
        </MolduraOrnamentada>
      )}
    </MolduraOrnamentada>
  );
}
