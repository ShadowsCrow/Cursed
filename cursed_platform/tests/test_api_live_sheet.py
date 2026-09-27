from __future__ import annotations

from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform.config import PlatformSettings
from cursed_platform.domain.efeitos_codec import encode_effect_e1
from cursed_platform.domain.equip_codec import encode_equipment_eq1, encode_equipment_eq2
from cursed_platform.persistence import (
    Base, EfeitoAplicadoRegistro, FonteEfeitoRegistro, ItemInventarioRegistro,
    MembroRegistro, MesaRegistro, OperacaoEfeitoRegistro, PersonagemRegistro,
)


API_ROOT = Path(__file__).resolve().parents[2] / "platform" / "api"
sys.path.insert(0, str(API_ROOT))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402


FICHA = {
    "personagem": {"nome": "Lia", "tamanho": "Médio"},
    "atributos": {"valores": {"Destreza": 2, "Vigor": 3, "Força": 3}, "ajustes": {"Destreza": 1}, "totais": {}},
    "pericias": {"valores": {"Esquiva": 1, "Arcanismo": 4}, "ajustes": {"Arcanismo": 1}, "totais": {}},
}
BASE = "/mesas/mesa-1/personagens/lia"

ARMADURA = encode_equipment_eq1(
    "armadura",
    {"nome": "Cota de malha", "armadura": 2, "rdb": 1, "peso": 10.5, "quantidade": 1},
    [{
        "kind": "externo", "nome": "Guarda firme", "descricao": "+1 na Defesa (Armadura).",
        "modificadores": [
            {"alvo": "defesa:armadura", "valor": 1},
            {"alvo": "defesa:armadura", "valor": 2, "quando": "contra projéteis"},
        ],
    }],
)
AMULETO = encode_effect_e1({
    "nome": "Marca arcana", "descricao": "+2 em Arcanismo.", "imagem_base64": "aGVsbG8=",
    "modificadores": [{"alvo": "pericia:arcanismo", "valor": 2}, {"alvo": "ataque", "valor": 1}],
})


class ApiLiveSheetTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add(MesaRegistro(id="mesa-1", nome="Mesa", narrador_id="mestre"))
            session.flush()
            session.add_all([
                MembroRegistro(mesa_id="mesa-1", usuario_id="mestre", papel="narrador"),
                MembroRegistro(mesa_id="mesa-1", usuario_id="jogador", papel="jogador"),
                MembroRegistro(mesa_id="mesa-1", usuario_id="outro", papel="jogador"),
            ])
            session.flush()
            session.add(PersonagemRegistro(id="lia", mesa_id="mesa-1", proprietario_id="jogador", ficha=FICHA))
            session.commit()
        settings = PlatformSettings(
            environment="test", database_url="sqlite:///:memory:",
            api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",),
        )
        self.app = create_app(settings, engine=self.engine)
        self.actor = "jogador"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.actor)
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def contagens(self) -> tuple[int, ...]:
        with Session(self.engine) as session:
            return tuple(
                session.scalar(select(func.count()).select_from(modelo))
                for modelo in (ItemInventarioRegistro, EfeitoAplicadoRegistro, OperacaoEfeitoRegistro, FonteEfeitoRegistro)
            ) + (session.get(PersonagemRegistro, "lia").versao,)

    def derivado(self, chave: str) -> dict:
        response = self.client.get(f"{BASE}/valores-derivados")
        self.assertEqual(response.status_code, 200, response.text)
        return next(v for v in response.json() if v["chave"] == chave)

    def importar(self, codigo: str, versao: int) -> dict:
        response = self.client.post(f"{BASE}/importacoes", json={"codigo": codigo, "versao_esperada": versao})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def colocar_na_grade(self, item_id: str, formato: dict) -> int:
        """O Narrador define o formato e o jogador coloca o item na grade; devolve a versão da ficha."""
        ator, self.actor = self.actor, "mestre"
        versao = self.client.get(f"{BASE}/inventario/grade").json()["versao"]
        definido = self.client.put(f"{BASE}/inventario/{item_id}/formato", json={"formato": formato, "versao_esperada": versao})
        self.assertEqual(definido.status_code, 200, definido.text)
        self.actor = ator
        colocado = self.client.put(f"{BASE}/inventario/arrumacao", json={"versao_esperada": definido.json()["versao"], "itens": [
            {"item_id": item_id, "coluna": 0, "linha": 0, "girado": False, "equipado": False}]})
        self.assertEqual(colocado.status_code, 200, colocado.text)
        return colocado.json()["versao"]

    def test_item_so_se_equipa_colocado_na_grade(self):
        """carga-por-espacos: só é levado o que está na grade; sem formato, não há como colocar nem equipar."""
        item_id = self.importar(ARMADURA, 0)["item"]["id"]
        sem_formato = self.client.post(f"{BASE}/inventario/{item_id}/equipar", json={"equipado": True, "versao_esperada": 1})
        self.assertEqual(sem_formato.status_code, 422)
        self.assertIn("defina o formato e coloque o item na grade", sem_formato.json()["detail"])
        self.actor = "mestre"
        definido = self.client.put(f"{BASE}/inventario/{item_id}/formato", json={
            "formato": {"subtipo": "peitoral", "largura": 2, "altura": 3}, "versao_esperada": 1})
        self.actor = "jogador"
        na_bandeja = self.client.post(f"{BASE}/inventario/{item_id}/equipar", json={
            "equipado": True, "versao_esperada": definido.json()["versao"]})
        self.assertEqual(na_bandeja.status_code, 422)
        self.assertIn("precisa estar na grade", na_bandeja.json()["detail"])
        self.assertFalse(self.client.get(f"{BASE}/inventario").json()[0]["equipado"])

    def test_valores_derivados_explicam_atributo_equipamento_e_efeito(self):
        self.assertEqual(self.derivado("defesa:armadura")["total"], 3)
        resultado = self.importar(ARMADURA, 0)
        item_id = resultado["item"]["id"]
        self.assertFalse(resultado["item"]["equipado"])
        self.assertEqual([e["estado"] for e in resultado["efeitos"]], ["suspenso"])
        self.assertEqual(self.derivado("defesa:armadura")["total"], 3)
        versao = self.colocar_na_grade(item_id, {"subtipo": "peitoral", "largura": 2, "altura": 3})

        equipar = self.client.post(f"{BASE}/inventario/{item_id}/equipar", json={"equipado": True, "versao_esperada": versao})
        self.assertEqual(equipar.status_code, 200, equipar.text)
        self.assertEqual(equipar.json()["versao"], versao + 1)
        self.assertEqual(self.client.get(f"{BASE}/efeitos").json()[0]["estado"], "ativo")

        defesa = self.derivado("defesa:armadura")
        self.assertEqual(defesa["total"], 6)
        self.assertEqual(
            [(f["tipo"], f["descricao"], f["valor"]) for f in defesa["fontes"]],
            [("atributo", "Vigor", 3), ("equipamento", "Cota de malha", 2),
             ("efeito", "Cota de malha — Guarda firme", 1)],
        )
        self.assertEqual(
            [(s["valor"], s["contexto"]) for s in defesa["situacionais"]], [(2, "contra projéteis")]
        )
        self.assertEqual(self.derivado("rdb:armadura")["total"], 1)
        chaves = [v["chave"] for v in self.client.get(f"{BASE}/valores-derivados").json()]
        self.assertNotIn("carga:peso", chaves, "O peso é só descrição; a carga é a grade.")
        self.assertEqual(self.derivado("defesa:esquiva")["total"], 4)

        desequipar = self.client.post(
            f"{BASE}/inventario/{item_id}/equipar", json={"equipado": False, "versao_esperada": versao + 1}
        )
        self.assertEqual(desequipar.status_code, 200)
        self.assertEqual(self.client.get(f"{BASE}/efeitos").json()[0]["estado"], "suspenso")
        self.assertEqual(self.derivado("defesa:armadura")["total"], 3)

        antigo = self.client.post(f"{BASE}/inventario/{item_id}/equipar", json={"equipado": True, "versao_esperada": versao + 1})
        self.assertEqual(antigo.status_code, 409)
        self.assertFalse(self.client.get(f"{BASE}/inventario").json()[0]["equipado"])

    def test_equipamento_importado_chega_sem_dimensao_com_peso_so_como_descricao(self):
        """carga-por-espacos 7.2: códigos EQ1 antigos não trazem formato e nada é convertido de kg."""
        item = self.importar(ARMADURA, 0)["item"]
        self.assertEqual((item["subtipo"], item["largura"], item["altura"], item["coluna"], item["linha"]), (None,) * 5)
        self.assertEqual(item["dados"]["peso"], 10.5)
        with Session(self.engine) as session:
            registro = session.get(ItemInventarioRegistro, item["id"])
            self.assertEqual((registro.subtipo, registro.largura, registro.coluna), (None, None, None))

    def test_importacao_de_efeito_soma_somente_modificadores_do_alvo(self):
        self.assertEqual(self.derivado("pericia:arcanismo")["total"], 5)
        previa = self.client.post(f"{BASE}/importacoes/previa", json={"codigo": AMULETO})
        self.assertEqual(previa.status_code, 200, previa.text)
        self.assertEqual(previa.json()["tipo"], "efeito")
        self.assertEqual(len(previa.json()["avisos"]), 1)
        self.assertEqual(self.contagens(), (0, 0, 0, 0, 0))

        resultado = self.importar(AMULETO, 0)
        [efeito] = resultado["efeitos"]
        self.assertEqual((efeito["estado"], efeito["fontes"][0]["tipo"]), ("ativo", "importacao"))
        arcanismo = self.derivado("pericia:arcanismo")
        self.assertEqual(arcanismo["total"], 7)
        self.assertEqual([f["tipo"] for f in arcanismo["fontes"]], ["base", "ajuste", "efeito"])
        self.assertEqual(self.derivado("atributo:destreza")["total"], 3)
        with Session(self.engine) as session:
            self.assertNotIn("imagem_base64", session.scalars(select(EfeitoAplicadoRegistro)).one().conteudo)

    def test_importacao_invalida_ou_desatualizada_nao_grava_nada(self):
        casos = (
            ("EQ1:nao-e-base64", 0, 422),
            ("X9:algo", 0, 422),
            (encode_equipment_eq2("arma", {"nome": "Arco"}, [
                {"kind": "default", "associacao": "inexistente"},
            ]), 0, 422),
            (encode_equipment_eq1("outro", {"nome": "Odre", "cargas_atuais": 5, "cargas_maximas": 2}, []), 0, 422),
            (ARMADURA, 7, 409),
        )
        for codigo, versao, esperado in casos:
            with self.subTest(codigo=codigo[:12], esperado=esperado):
                response = self.client.post(f"{BASE}/importacoes", json={"codigo": codigo, "versao_esperada": versao})
                self.assertEqual(response.status_code, esperado, response.text)
                self.assertEqual(self.contagens(), (0, 0, 0, 0, 0))
        self.assertEqual(self.client.post(f"{BASE}/importacoes/previa", json={"codigo": "EQ2:x"}).status_code, 422)

    def test_equipamento_do_catalogo_e_ativacao_nao_automatica(self):
        codigo = encode_equipment_eq2("outro", {"nome": "Mochila pesada", "peso": 30}, [
            {"kind": "default", "associacao": "cc_above"},
            {"kind": "default", "associacao": "cc_above", "ativacao": {"tipo": "manual"}},
        ])
        resultado = self.importar(codigo, 0)
        self.assertEqual([e["nome"] for e in resultado["efeitos"]], ["Sobrepeso", "Sobrepeso"])
        item_id = resultado["item"]["id"]
        versao = self.colocar_na_grade(item_id, {"subtipo": "outro", "largura": 2, "altura": 2, "maos": 1})
        equipado = self.client.post(f"{BASE}/inventario/{item_id}/equipar", json={"equipado": True, "versao_esperada": versao})
        self.assertEqual(equipado.status_code, 200, equipado.text)
        estados = sorted((e["ativacao"], e["estado"]) for e in self.client.get(f"{BASE}/efeitos").json())
        self.assertEqual(estados, [("enquanto_equipado", "ativo"), ("manual", "suspenso")])
        self.assertEqual(self.derivado("defesa:esquiva")["total"], 2)

    def test_permissoes_e_acesso(self):
        permissoes = self.client.get(f"{BASE}/permissoes").json()
        self.assertEqual(
            (permissoes["papel"], permissoes["editar"], permissoes["excluir"], permissoes["transferir"]),
            ("jogador", True, True, False),
        )
        self.actor = "mestre"
        self.assertTrue(self.client.get(f"{BASE}/permissoes").json()["transferir"])
        politica = {
            "permitir_criacao_propria": True, "permitir_edicao_propria": True,
            "permitir_exclusao_propria": False, "campos_bloqueados": ["inventario"],
            "campos_exigem_aprovacao": ["efeitos"],
        }
        self.assertEqual(self.client.put("/mesas/mesa-1/politicas", json=politica).status_code, 200)
        item_id = self.importar(ARMADURA, 0)["item"]["id"]

        self.actor = "jogador"
        permissoes = self.client.get(f"{BASE}/permissoes").json()
        self.assertFalse(permissoes["excluir"])
        self.assertEqual(permissoes["campos_bloqueados"], ["inventario"])
        bloqueado = self.client.post(f"{BASE}/inventario/{item_id}/equipar", json={"equipado": True, "versao_esperada": 1})
        self.assertEqual(bloqueado.status_code, 403)
        aprovacao = self.client.post(f"{BASE}/importacoes", json={"codigo": AMULETO, "versao_esperada": 1})
        self.assertEqual(aprovacao.status_code, 403)
        self.assertIn("aprovação", aprovacao.json()["detail"])
        self.assertEqual(self.contagens()[0:2], (1, 1))

        self.actor = "outro"
        for metodo, caminho, corpo in (
            ("get", "/permissoes", None), ("get", "/inventario", None), ("get", "/efeitos", None),
            ("get", "/valores-derivados", None),
            ("post", f"/inventario/{item_id}/equipar", {"equipado": True, "versao_esperada": 1}),
            ("post", "/importacoes/previa", {"codigo": AMULETO}),
            ("post", "/importacoes", {"codigo": AMULETO, "versao_esperada": 1}),
        ):
            with self.subTest(metodo=metodo, caminho=caminho):
                response = getattr(self.client, metodo)(f"{BASE}{caminho}", **({"json": corpo} if corpo else {}))
                self.assertEqual(response.status_code, 404)
                self.assertNotIn("Cota", response.text)


    def test_desgaste_expoe_faixas_do_dominio(self):
        [exaustao, estresse] = self.client.get(f"{BASE}/desgaste").json()
        self.assertEqual((exaustao["recurso"], exaustao["atual"], exaustao["registrado"]), ("exaustao", 0, False))
        self.assertEqual(exaustao["faixa"]["nome"], "Estável")
        self.assertEqual(estresse["pontos_ate_proxima"], 5)
        with Session(self.engine) as session:
            personagem = session.get(PersonagemRegistro, "lia")
            personagem.ficha = {**personagem.ficha, "desgaste": {"exaustao": 9, "estresse": 5}}
            session.commit()
        [exaustao, estresse] = self.client.get(f"{BASE}/desgaste").json()
        self.assertEqual((exaustao["faixa"]["nome"], exaustao["registrado"], exaustao["proxima_faixa"]["nome"]),
                         ("Exausto", True, "No Limite"))
        self.assertIn("−2 em testes físicos", exaustao["faixa"]["efeito"])
        self.assertEqual(estresse["faixa"]["nome"], "Pressionado")
        self.actor = "outro"
        self.assertEqual(self.client.get(f"{BASE}/desgaste").status_code, 404)


if __name__ == "__main__":
    unittest.main()

