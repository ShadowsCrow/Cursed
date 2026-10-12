import { Tooltip } from "../../ui/primitives";
import { REGRA_LEVANTAR } from "./regrasCarga";

export function RegraLevantar() {
  return (
    <span className="grade-inventario__regra">
      <Tooltip label={REGRA_LEVANTAR}>
        <button type="button" className="grade-inventario__regra-botao" aria-label="Regra de levantar, empurrar e arrastar">
          i
        </button>
      </Tooltip>
    </span>
  );
}
