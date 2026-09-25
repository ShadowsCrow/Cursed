import type { GlyphName } from "../../../ui/Display";
import { EquipmentSlot } from "../../../ui/Display";
import { campoEditavel } from "../fieldPolicy";
import { useEquipCommand } from "./sheetApi";
import type { ApiClient, ItemInventarioResumo, PermissoesFicha } from "../types";

const tipoLabel: Record<ItemInventarioResumo["tipo"], string> = {
  arma: "Arma",
  armadura: "Armadura",
  outro: "Outro",
};

const tipoIcon: Record<ItemInventarioResumo["tipo"], GlyphName> = {
  arma: "sword",
  armadura: "shield",
  outro: "bag",
};

function detalhe(item: ItemInventarioResumo): string | undefined {
  const partes: string[] = [];
  if (item.quantidade > 1) partes.push(`Quantidade: ${item.quantidade}`);
  if (item.cargas_maximas !== null && item.cargas_maximas !== undefined) {
    partes.push(`Cargas: ${item.cargas_atuais ?? 0}/${item.cargas_maximas}`);
  }
  if (item.efeitos && item.efeitos.length > 0) {
    partes.push(item.equipado ? "Efeito ativo enquanto equipado" : "Efeito suspenso até equipar");
  }
  return partes.length > 0 ? partes.join(" · ") : undefined;
}

function ItemRow({
  api,
  mesaId,
  personagemId,
  item,
  versao,
  editable,
  online,
  onVersaoConfirmada,
}: {
  api: ApiClient;
  mesaId: string;
  personagemId: string;
  item: ItemInventarioResumo;
  versao: number;
  editable: boolean;
  online: boolean;
  onVersaoConfirmada: (versao: number) => void;
}) {
  const command = useEquipCommand({ api, mesaId, personagemId, item, versaoEsperada: versao, online, onVersaoConfirmada });
  const atual = command.value;
  return (
    <div>
      <EquipmentSlot
        category={tipoLabel[atual.tipo]}
        state="ocupado"
        icon={tipoIcon[atual.tipo]}
        item={atual.nome}
        detail={detalhe(atual)}
        onAction={editable ? () => void command.execute(!atual.equipado) : undefined}
        actionLabel={command.isPending ? "Enviando…" : atual.equipado ? "Desequipar" : "Equipar"}
      />
      {command.errorMessage && <p role="alert">{command.errorMessage}</p>}
    </div>
  );
}

export interface InventoryPanelProps {
  api: ApiClient;
  mesaId: string;
  personagemId: string;
  itens: ItemInventarioResumo[];
  versao: number;
  permissoes: PermissoesFicha | undefined;
  online: boolean;
  onVersaoConfirmada: (versao: number) => void;
}

/** Área "Equipado" — visualmente distinta do inventário, mostrando apenas itens equipados. */
export function EquippedItemsPanel({ api, mesaId, personagemId, itens, versao, permissoes, online, onVersaoConfirmada }: InventoryPanelProps) {
  const editable = campoEditavel("inventario.equipado", permissoes);
  const equipados = itens.filter((item) => item.equipado);
  return (
    <section className="panel" aria-label="Equipamentos equipados">
      <div className="section-heading"><div><span className="eyebrow">PRONTO PARA USO</span><h2>Equipado</h2></div></div>
      {equipados.length === 0 ? (
        <p className="preview-note">Nenhum item equipado no momento.</p>
      ) : (
        <div className="equipment-list">
          {equipados.map((item) => (
            <ItemRow key={item.id} api={api} mesaId={mesaId} personagemId={personagemId} item={item} versao={versao} editable={editable} online={online} onVersaoConfirmada={onVersaoConfirmada} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Área "Inventário" — visualmente distinta do equipamento, mostrando itens possuídos mas não equipados. */
export function InventoryItemsPanel({ api, mesaId, personagemId, itens, versao, permissoes, online, onVersaoConfirmada }: InventoryPanelProps) {
  const editable = campoEditavel("inventario.equipado", permissoes);
  const outros = itens.filter((item) => !item.equipado);
  return (
    <section className="panel" aria-label="Inventário">
      <div className="section-heading"><div><span className="eyebrow">PERTENCES</span><h2>Inventário</h2></div></div>
      {outros.length === 0 ? (
        <p className="preview-note">Nenhum item no inventário.</p>
      ) : (
        <div className="equipment-list">
          {outros.map((item) => (
            <ItemRow key={item.id} api={api} mesaId={mesaId} personagemId={personagemId} item={item} versao={versao} editable={editable} online={online} onVersaoConfirmada={onVersaoConfirmada} />
          ))}
        </div>
      )}
    </section>
  );
}
