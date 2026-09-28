"""Acervo de personagens entre mesas e cópia independente para outra campanha (design D7 e D8)."""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from cursed_platform import acervo, auditoria, imagens, narrador
from cursed_platform.acesso_privado import BUCKET_PRIVADO
from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.contracts import AcervoPersonagem, CopiarPersonagemRequest, PersonagemResumo
from cursed_platform.migracao_ativos import AtivoInvalido
from cursed_platform.persistence import PersonagemRegistro
from cursed_platform.repositories import FichaRepository, MesaRepository

from .auth import Ator, get_actor
from .catalogo_ficha import atualizar_cartas
from .characters import _personagem_resumo
from .dependencies import get_correlacao, get_session
from .validacao import exigir_ficha_valida, preparar_ficha_nova

router = APIRouter(tags=["Acervo"])


@router.get("/acervo/personagens", response_model=list[AcervoPersonagem])
def listar_acervo(
    colecao: acervo.Colecao,
    ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session),
) -> list[AcervoPersonagem]:
    return [
        AcervoPersonagem(mesa_id=mesa.id, mesa_nome=mesa.nome, personagem_id=personagem.id, tipo=personagem.tipo,
                         nome=acervo.nome(personagem), visibilidade=personagem.visibilidade,
                         **acervo.dados_da_vitrine(personagem))
        for personagem, mesa in acervo.listar(session, ator.usuario_id, colecao)
    ]


def _copiar_retrato(request: Request, origem: PersonagemRegistro, destino_mesa: str, novo_id: str) -> str | None:
    """Copia o retrato (original e versão de exibição) para o espaço do personagem novo."""
    objeto = ((origem.ficha or {}).get("personagem") or {}).get("imagem_ativo")
    armazenamento = request.app.state.armazenamento_objetos
    if not isinstance(objeto, str) or not objeto or armazenamento is None:
        return None
    arquivo = objeto.rsplit("/", 1)[-1]
    novo = f"mesas/{destino_mesa}/personagens/{novo_id}/imagens/{arquivo}"
    try:
        dados = armazenamento.ler(BUCKET_PRIVADO, objeto)
        if dados is None:
            return None
        tipos = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}
        armazenamento.gravar(BUCKET_PRIVADO, novo, dados, tipos.get(arquivo.rsplit(".", 1)[-1].lower(),
                                                                     "application/octet-stream"))
        reduzida = armazenamento.ler(BUCKET_PRIVADO, imagens.caminho_exibicao(objeto))
        if reduzida is not None:
            armazenamento.gravar(BUCKET_PRIVADO, imagens.caminho_exibicao(novo), reduzida, "image/webp")
    except AtivoInvalido as erro:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Falha ao copiar o retrato.") from erro
    return novo


@router.post("/mesas/{mesa_id}/personagens/copias", response_model=PersonagemResumo,
             status_code=status.HTTP_201_CREATED)
def copiar_personagem(
    mesa_id: str, pedido: CopiarPersonagemRequest, request: Request,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> PersonagemResumo:
    """Cria na mesa ``mesa_id`` (narrada pela pessoa) uma cópia independente de um personagem que ela pode ler."""
    autorizador = Autorizador(session)
    destino = autorizador.decidir(Acao.ADMINISTRAR_ENTIDADES, usuario_id=ator.usuario_id, mesa_id=mesa_id)
    if not destino.permitido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if destino.ocultar_existencia else status.HTTP_403_FORBIDDEN,
            detail="Mesa não encontrada." if destino.ocultar_existencia else "Só o Narrador da campanha recebe cópias.",
        )
    leitura = autorizador.decidir(Acao.LER_FICHA, usuario_id=ator.usuario_id, mesa_id=pedido.mesa_origem_id,
                                  personagem_id=pedido.personagem_origem_id)
    origem = FichaRepository(session).get(pedido.mesa_origem_id, pedido.personagem_origem_id)
    if not leitura.permitido or origem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personagem não encontrado.")

    tipo = acervo.TIPO_DA_COPIA[origem.tipo]
    ficha = acervo.ficha_da_copia(origem)
    preparar_ficha_nova(ficha, tipo=tipo, pelo_narrador=True)
    # A mesma validação da criação de NPCs e monstros pelo Narrador; nada é ajustado para caber.
    exigir_ficha_valida(None, ficha, tipo=tipo)

    novo_id = uuid4().hex
    retrato = _copiar_retrato(request, origem, mesa_id, novo_id)
    if retrato:
        ficha.setdefault("personagem", {})["imagem_ativo"] = retrato
    copia = PersonagemRegistro(
        id=novo_id, mesa_id=mesa_id, proprietario_id=None, tipo=tipo, visibilidade="narrador", versao=0,
        ficha=ficha, revelacao=narrador.normalizar_revelacao(None, False), procedencia=acervo.procedencia(origem),
    )
    session.add(copia)
    session.flush()
    mesa_origem = MesaRepository(session).get(origem.mesa_id)
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="personagem", acao="personagem.copiado",
        relevancia="organizacional", personagem=copia,
        resumo=f"{auditoria.nome_personagem(copia)}: {tipo} copiado de {mesa_origem.nome if mesa_origem else 'outra campanha'}"[:500],
        detalhes={"procedencia": copia.procedencia}, correlacao_id=correlacao,
    )
    atualizar_cartas(session, copia, None, ficha, ator_id=ator.usuario_id, correlacao_id=correlacao)
    session.commit()
    return _personagem_resumo(copia)
