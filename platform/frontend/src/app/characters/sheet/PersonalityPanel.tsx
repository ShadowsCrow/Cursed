import { asRecord, asString, type FichaContrato, type PermissoesFicha } from "../types";
import type { ListasFicha } from "./catalogoApi";
import { EditableField } from "./EditableField";
import { SelectField, type AlteracaoCampo } from "./SelectField";

export interface PersonalityPanelProps {
  nome: string;
  ficha: FichaContrato;
  permissoes: PermissoesFicha | undefined;
  listas: ListasFicha | undefined;
  avisos: Record<string, string>;
  onSave: (alteracoes: AlteracaoCampo[]) => Promise<{ status: "salvo" | "pendente" }>;
}

/**
 * Personalidade da ficha original: alinhamento e pecado em listas do sistema e os campos
 * narrativos com as dicas de preenchimento. Listas e dicas vêm do JSON do catálogo.
 */
export function PersonalityPanel({ nome, ficha, permissoes, listas, avisos, onSave }: PersonalityPanelProps) {
  const personalidade = asRecord(ficha.personalidade);
  const valor = (chave: string) => asString(personalidade[chave]) ?? "";
  const pecadoGravado = valor("pecado");
  // A grafia antiga "Ganancia" é a mesma opção que "Ganância".
  const pecado = (listas?.pecados ?? []).find((p) => p.nome === pecadoGravado || (p.equivalentes ?? []).includes(pecadoGravado));
  const rotuloPecado = (p: { nome: string; icone: string }) => `${p.icone} ${p.nome}`.trim();

  return (
    <section className="panel">
      <div className="section-heading"><div><span className="eyebrow">QUEM É {nome.toUpperCase()}</span><h2>Personalidade</h2></div></div>
      <div className="detail-grid">
        <SelectField label="Alinhamento" path="personalidade.alinhamento" value={valor("alinhamento")}
          options={(listas?.alinhamentos ?? []).map((a) => ({ valor: a, rotulo: a }))} vazio="Não informado"
          permissoes={permissoes} onSave={onSave} aviso={avisos["personalidade.alinhamento"]} />
        <SelectField label="Pecado Capital" path="personalidade.pecado" value={pecado?.nome ?? pecadoGravado}
          options={(listas?.pecados ?? []).map((p) => ({ valor: p.nome, rotulo: rotuloPecado(p) }))} vazio="Não informado"
          exibicao={pecado ? rotuloPecado(pecado) : undefined}
          permissoes={permissoes} onSave={onSave} aviso={avisos["personalidade.pecado"]} />
        {(listas?.campos_personalidade ?? []).map((campo) => (
          <EditableField key={campo.chave} label={campo.rotulo} path={`personalidade.${campo.chave}`} kind="textarea"
            longo={campo.longo} limite={campo.limite}
            value={valor(campo.chave)} emptyLabel={campo.dica || "Não informado"} placeholder={campo.dica}
            permissoes={permissoes} onSave={(path, value) => onSave([{ path, value }])} />
        ))}
      </div>
    </section>
  );
}
