"""Acesso persistente ao estado confirmado, independente de interface."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from cursed_platform.persistence import (
    EfeitoAplicadoRegistro,
    FonteEfeitoRegistro,
    ItemInventarioRegistro,
    MembroRegistro,
    MesaRegistro,
    ModuloMesaRegistro,
    PersonagemRegistro,
)


class MesaRepository:
    def __init__(self, session: Session):
        self.session = session

    def get(self, mesa_id: str) -> MesaRegistro | None:
        return self.session.get(MesaRegistro, mesa_id)

    def membro(self, mesa_id: str, usuario_id: str) -> MembroRegistro | None:
        return self.session.get(MembroRegistro, (mesa_id, usuario_id))

    def listar_para_usuario(self, usuario_id: str) -> list[tuple[MesaRegistro, str]]:
        return list(
            self.session.execute(
                select(MesaRegistro, MembroRegistro.papel)
                .join(MembroRegistro, MembroRegistro.mesa_id == MesaRegistro.id)
                .where(MembroRegistro.usuario_id == usuario_id, MembroRegistro.ativo.is_(True))
                .order_by(MesaRegistro.nome)
            )
        )

    def listar_membros(self, mesa_id: str) -> list[MembroRegistro]:
        return list(
            self.session.scalars(
                select(MembroRegistro)
                .where(MembroRegistro.mesa_id == mesa_id, MembroRegistro.ativo.is_(True))
                .order_by(MembroRegistro.usuario_id)
            )
        )

    def modulos_ativos(self, mesa_id: str) -> set[str]:
        return set(
            self.session.scalars(
                select(ModuloMesaRegistro.modulo).where(
                    ModuloMesaRegistro.mesa_id == mesa_id,
                    ModuloMesaRegistro.ativo.is_(True),
                )
            )
        )

    def configurar_modulo(self, mesa_id: str, modulo: str, ativo: bool) -> None:
        nome = modulo.strip()
        if not nome or len(nome) > 100:
            raise ValueError("O nome do módulo precisa ter entre 1 e 100 caracteres.")
        if self.get(mesa_id) is None:
            raise ValueError("Mesa inexistente.")
        configuracao = self.session.get(ModuloMesaRegistro, (mesa_id, nome))
        if configuracao is None:
            self.session.add(ModuloMesaRegistro(mesa_id=mesa_id, modulo=nome, ativo=ativo))
        else:
            configuracao.ativo = ativo


class FichaRepository:
    def __init__(self, session: Session):
        self.session = session

    def get(
        self, mesa_id: str, personagem_id: str, *, incluir_excluido: bool = False
    ) -> PersonagemRegistro | None:
        personagem = self.session.get(PersonagemRegistro, personagem_id)
        if (
            personagem is None
            or personagem.mesa_id != mesa_id
            or (personagem.excluido_em is not None and not incluir_excluido)
        ):
            return None
        return personagem

    def listar(self, mesa_id: str) -> list[PersonagemRegistro]:
        return list(
            self.session.scalars(
                select(PersonagemRegistro).where(
                    PersonagemRegistro.mesa_id == mesa_id,
                    PersonagemRegistro.excluido_em.is_(None),
                )
            )
        )

    def substituir_se_versao(
        self,
        mesa_id: str,
        personagem_id: str,
        versao_esperada: int,
        ficha: dict[str, Any],
    ) -> bool:
        resultado = self.session.execute(
            update(PersonagemRegistro)
            .where(
                PersonagemRegistro.id == personagem_id,
                PersonagemRegistro.mesa_id == mesa_id,
                PersonagemRegistro.versao == versao_esperada,
                PersonagemRegistro.excluido_em.is_(None),
            )
            .values(ficha=ficha, versao=PersonagemRegistro.versao + 1)
        )
        return resultado.rowcount == 1

    def excluir(
        self,
        mesa_id: str,
        personagem_id: str,
        versao_esperada: int,
        ator_id: str,
        *,
        agora: datetime | None = None,
    ) -> bool:
        momento = agora or datetime.now(UTC)
        resultado = self.session.execute(
            update(PersonagemRegistro)
            .where(
                PersonagemRegistro.id == personagem_id,
                PersonagemRegistro.mesa_id == mesa_id,
                PersonagemRegistro.versao == versao_esperada,
                PersonagemRegistro.excluido_em.is_(None),
            )
            .values(
                excluido_em=momento,
                excluido_por=ator_id,
                versao=PersonagemRegistro.versao + 1,
            )
        )
        return resultado.rowcount == 1

    def restaurar(
        self,
        mesa_id: str,
        personagem_id: str,
        versao_esperada: int,
        *,
        agora: datetime | None = None,
    ) -> bool:
        mesa = self.session.get(MesaRegistro, mesa_id)
        personagem = self.get(mesa_id, personagem_id, incluir_excluido=True)
        if mesa is None or personagem is None or personagem.excluido_em is None:
            return False
        if mesa.retencao_personagens_dias < 1:
            raise ValueError("A retenção de personagens precisa ser positiva.")
        momento = agora or datetime.now(UTC)
        exclusao = personagem.excluido_em
        if exclusao.tzinfo is None:
            exclusao = exclusao.replace(tzinfo=UTC)
        if momento > exclusao + timedelta(days=mesa.retencao_personagens_dias):
            return False
        resultado = self.session.execute(
            update(PersonagemRegistro)
            .where(
                PersonagemRegistro.id == personagem_id,
                PersonagemRegistro.mesa_id == mesa_id,
                PersonagemRegistro.versao == versao_esperada,
                PersonagemRegistro.excluido_em.is_not(None),
            )
            .values(
                excluido_em=None,
                excluido_por=None,
                versao=PersonagemRegistro.versao + 1,
            )
        )
        return resultado.rowcount == 1


class InventarioRepository:
    def __init__(self, session: Session):
        self.session = session

    def listar(self, mesa_id: str, personagem_id: str) -> list[ItemInventarioRegistro]:
        return list(
            self.session.scalars(
                select(ItemInventarioRegistro).where(
                    ItemInventarioRegistro.mesa_id == mesa_id,
                    ItemInventarioRegistro.personagem_id == personagem_id,
                )
            )
        )


class EfeitoRepository:
    def __init__(self, session: Session):
        self.session = session

    def listar(self, mesa_id: str, personagem_id: str) -> list[EfeitoAplicadoRegistro]:
        return list(
            self.session.scalars(
                select(EfeitoAplicadoRegistro).where(
                    EfeitoAplicadoRegistro.mesa_id == mesa_id,
                    EfeitoAplicadoRegistro.personagem_id == personagem_id,
                )
            )
        )

    def fontes(self, mesa_id: str, personagem_id: str, efeito_id: str) -> list[FonteEfeitoRegistro]:
        return list(
            self.session.scalars(
                select(FonteEfeitoRegistro).where(
                    FonteEfeitoRegistro.mesa_id == mesa_id,
                    FonteEfeitoRegistro.personagem_id == personagem_id,
                    FonteEfeitoRegistro.efeito_id == efeito_id,
                )
            )
        )
