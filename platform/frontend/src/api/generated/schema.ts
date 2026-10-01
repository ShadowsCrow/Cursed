export interface paths {
    "/acervo/personagens": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Acervo */
        get: operations["listar_acervo_acervo_personagens_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/convites/aceitar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Aceitar Convite */
        post: operations["aceitar_convite_convites_aceitar_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health */
        get: operations["health_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Mesas */
        get: operations["listar_mesas_mesas_get"];
        put?: never;
        /** Criar Mesa */
        post: operations["criar_mesa_mesas_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Detalhar Mesa
         * @description Apresentação da campanha: dados, capa e participantes com apelido e foto.
         */
        get: operations["detalhar_mesa_mesas__mesa_id__get"];
        /** Atualizar Mesa */
        put: operations["atualizar_mesa_mesas__mesa_id__put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/apresentacoes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Apresentacoes */
        get: operations["listar_apresentacoes_mesas__mesa_id__apresentacoes_get"];
        put?: never;
        /**
         * Apresentar Carta
         * @description Mostra a carta sem criar posse para nenhum personagem.
         */
        post: operations["apresentar_carta_mesas__mesa_id__apresentacoes_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/apresentacoes/{apresentacao_id}/recolhimento": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Recolher Carta */
        post: operations["recolher_carta_mesas__mesa_id__apresentacoes__apresentacao_id__recolhimento_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/apresentacoes/{apresentacao_id}/visualizacao": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Marcar Apresentacao Vista
         * @description O participante fechou a carta: ela é apresentada uma vez e não volta ao recarregar a página.
         */
        post: operations["marcar_apresentacao_vista_mesas__mesa_id__apresentacoes__apresentacao_id__visualizacao_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/ativos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Ler Ativo
         * @description ``exibicao=true`` entrega a versão reduzida (WEBP) quando ela existe; senão, a original.
         */
        get: operations["ler_ativo_mesas__mesa_id__ativos_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/auditoria": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar Eventos
         * @description Eventos do mais recente ao mais antigo; jogadores recebem somente o que podem ver.
         */
        get: operations["listar_eventos_mesas__mesa_id__auditoria_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/auditoria/{evento_id}/correcao": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Corrigir Evento */
        post: operations["corrigir_evento_mesas__mesa_id__auditoria__evento_id__correcao_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/canais": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Canais */
        get: operations["listar_canais_mesas__mesa_id__canais_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/cartas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Catalogo */
        get: operations["listar_catalogo_mesas__mesa_id__cartas_get"];
        put?: never;
        /** Criar Carta */
        post: operations["criar_carta_mesas__mesa_id__cartas_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/cartas/importacoes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Importar Carta
         * @description Cria um rascunho a partir do código; publicar continua sendo uma decisão do Narrador.
         */
        post: operations["importar_carta_mesas__mesa_id__cartas_importacoes_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/cartas/importacoes/previa": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Previsualizar Importacao Carta
         * @description Mostra conteúdo, procedência e avisos sem alterar o catálogo.
         */
        post: operations["previsualizar_importacao_carta_mesas__mesa_id__cartas_importacoes_previa_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/cartas/{carta_id}/publicacao": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Publicar Carta */
        post: operations["publicar_carta_mesas__mesa_id__cartas__carta_id__publicacao_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/cartas/{carta_id}/rascunho": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Salvar Rascunho
         * @description Rascunhos não geram auditoria: somente a publicação é uma alteração confirmada.
         */
        put: operations["salvar_rascunho_mesas__mesa_id__cartas__carta_id__rascunho_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/cartas/{carta_id}/validacao": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Validar Rascunho */
        post: operations["validar_rascunho_mesas__mesa_id__cartas__carta_id__validacao_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/cartas/{carta_id}/versoes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Versoes */
        get: operations["listar_versoes_mesas__mesa_id__cartas__carta_id__versoes_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/catalogos/classes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Classes */
        get: operations["listar_classes_mesas__mesa_id__catalogos_classes_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/catalogos/efeitos-default": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Efeitos Default */
        get: operations["listar_efeitos_default_mesas__mesa_id__catalogos_efeitos_default_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/catalogos/estado": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Estado Do Catalogo
         * @description Versão carregada e último erro de recarga do JSON, para o Narrador.
         */
        get: operations["estado_do_catalogo_mesas__mesa_id__catalogos_estado_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/catalogos/itens": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Catalogo De Itens */
        get: operations["listar_catalogo_de_itens_mesas__mesa_id__catalogos_itens_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/catalogos/listas-ficha": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Listas */
        get: operations["listar_listas_mesas__mesa_id__catalogos_listas_ficha_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/catalogos/racas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Racas */
        get: operations["listar_racas_mesas__mesa_id__catalogos_racas_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/convites": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Criar Convite */
        post: operations["criar_convite_mesas__mesa_id__convites_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/descansos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Confirmar Descanso
         * @description Recalcula no servidor e aplica a todos os alvos, ou a nenhum.
         */
        post: operations["confirmar_descanso_mesas__mesa_id__descansos_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/descansos/previa": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Previsualizar Descanso
         * @description Resultado previsto por personagem; nada é gravado.
         */
        post: operations["previsualizar_descanso_mesas__mesa_id__descansos_previa_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/entidades": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Criar Entidade
         * @description Personagem, NPC ou monstro do Narrador; oculto por padrão.
         */
        post: operations["criar_entidade_mesas__mesa_id__entidades_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/entidades-publicas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar Entidades Publicas
         * @description O que qualquer participante vê: nome público e retrato, nunca a ficha.
         */
        get: operations["listar_entidades_publicas_mesas__mesa_id__entidades_publicas_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/imagens/{destino}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Enviar Imagem */
        put: operations["enviar_imagem_mesas__mesa_id__imagens__destino__put"];
        post?: never;
        /** Remover Imagem */
        delete: operations["remover_imagem_mesas__mesa_id__imagens__destino__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/modulos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ler Modulos */
        get: operations["ler_modulos_mesas__mesa_id__modulos_get"];
        /** Configurar Modulos */
        put: operations["configurar_modulos_mesas__mesa_id__modulos_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/ofertas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Ofertas */
        get: operations["listar_ofertas_mesas__mesa_id__ofertas_get"];
        put?: never;
        /** Criar Oferta */
        post: operations["criar_oferta_mesas__mesa_id__ofertas_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/ofertas-item": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar Ofertas
         * @description Ofertas pendentes em que o usuário pode agir: dadas ou recebidas por personagens que ele edita.
         */
        get: operations["listar_ofertas_mesas__mesa_id__ofertas_item_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/ofertas-item/{oferta_id}/aceitar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Aceitar Oferta */
        post: operations["aceitar_oferta_mesas__mesa_id__ofertas_item__oferta_id__aceitar_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/ofertas-item/{oferta_id}/cancelar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cancelar Oferta */
        post: operations["cancelar_oferta_mesas__mesa_id__ofertas_item__oferta_id__cancelar_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/ofertas-item/{oferta_id}/recusar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Recusar Oferta */
        post: operations["recusar_oferta_mesas__mesa_id__ofertas_item__oferta_id__recusar_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/ofertas/{oferta_id}/cancelamento": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cancelar Oferta */
        post: operations["cancelar_oferta_mesas__mesa_id__ofertas__oferta_id__cancelamento_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/ofertas/{oferta_id}/respostas/{personagem_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Responder Oferta */
        post: operations["responder_oferta_mesas__mesa_id__ofertas__oferta_id__respostas__personagem_id__post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/participantes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Participantes */
        get: operations["listar_participantes_mesas__mesa_id__participantes_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/participantes/{usuario_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Remover Participante */
        delete: operations["remover_participante_mesas__mesa_id__participantes__usuario_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar Personagens
         * @description Personagens que o ator pode abrir; excluídos recuperáveis somente para o Narrador.
         */
        get: operations["listar_personagens_mesas__mesa_id__personagens_get"];
        put?: never;
        /** Criar Personagem */
        post: operations["criar_personagem_mesas__mesa_id__personagens_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/copias": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Copiar Personagem
         * @description Cria na mesa ``mesa_id`` (narrada pela pessoa) uma cópia independente de um personagem que ela pode ler.
         */
        post: operations["copiar_personagem_mesas__mesa_id__personagens_copias_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/previa": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Previsualizar Personagem
         * @description Valores e problemas da ficha como seria criada, sem gravar, auditar nem conceder cartas.
         */
        post: operations["previsualizar_personagem_mesas__mesa_id__personagens_previa_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Excluir Personagem */
        delete: operations["excluir_personagem_mesas__mesa_id__personagens__personagem_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/cartas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Cartas Do Personagem */
        get: operations["listar_cartas_do_personagem_mesas__mesa_id__personagens__personagem_id__cartas_get"];
        put?: never;
        /** Conceder Carta */
        post: operations["conceder_carta_mesas__mesa_id__personagens__personagem_id__cartas_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/migracao": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Migrar Carta */
        post: operations["migrar_carta_mesas__mesa_id__personagens__personagem_id__cartas__carta_id__migracao_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/migracao/previa": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Previsualizar Migracao */
        get: operations["previsualizar_migracao_mesas__mesa_id__personagens__personagem_id__cartas__carta_id__migracao_previa_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/transicoes/{acao}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Transicionar Carta */
        post: operations["transicionar_carta_mesas__mesa_id__personagens__personagem_id__cartas__carta_id__transicoes__acao__post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/consequencias": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar Consequencias
         * @description Traumas, Ferimentos Graves, Sequelas, Aflições e Outras Consequências, inclusive encerradas.
         */
        get: operations["listar_consequencias_mesas__mesa_id__personagens__personagem_id__consequencias_get"];
        put?: never;
        /**
         * Criar Consequencia
         * @description Cria a consequência; uma equivalente (mesma categoria, nome e origem) é intensificada.
         */
        post: operations["criar_consequencia_mesas__mesa_id__personagens__personagem_id__consequencias_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/consequencias/{consequencia_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Editar Consequencia */
        patch: operations["editar_consequencia_mesas__mesa_id__personagens__personagem_id__consequencias__consequencia_id__patch"];
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/consequencias/{consequencia_id}/{acao}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Transicionar Consequencia */
        post: operations["transicionar_consequencia_mesas__mesa_id__personagens__personagem_id__consequencias__consequencia_id___acao__post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/desgaste": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Ler Desgaste
         * @description Exaustão e Estresse com faixa e penalidade vindas do domínio; a interface não recalcula regras.
         */
        get: operations["ler_desgaste_mesas__mesa_id__personagens__personagem_id__desgaste_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/desgaste/alteracoes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Alterar Desgaste
         * @description O Narrador soma ou reduz pontos de uma trilha, com origem, e registra o que a regra exige.
         */
        post: operations["alterar_desgaste_mesas__mesa_id__personagens__personagem_id__desgaste_alteracoes_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/desgaste/colapso-mental/encerrar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Encerrar Colapso Mental
         * @description Auxílio pertinente ou fim do conflito imediato: Estresse volta a 8 e o Trauma permanece.
         */
        post: operations["encerrar_colapso_mental_mesas__mesa_id__personagens__personagem_id__desgaste_colapso_mental_encerrar_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/desgaste/esforco": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Registrar Esforco
         * @description Custo do Esforço voluntário, aplicado depois de resolvida a ação com o bônus escolhido.
         */
        post: operations["registrar_esforco_mesas__mesa_id__personagens__personagem_id__desgaste_esforco_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/desgaste/esforco/previa": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Previsualizar Esforco */
        post: operations["previsualizar_esforco_mesas__mesa_id__personagens__personagem_id__desgaste_esforco_previa_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/desgaste/previa": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Previsualizar Alteracao
         * @description Faixa, colapso e exigências de uma alteração; nada é gravado.
         */
        post: operations["previsualizar_alteracao_mesas__mesa_id__personagens__personagem_id__desgaste_previa_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/efeitos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Efeitos */
        get: operations["listar_efeitos_mesas__mesa_id__personagens__personagem_id__efeitos_get"];
        put?: never;
        /** Aplicar Efeito */
        post: operations["aplicar_efeito_mesas__mesa_id__personagens__personagem_id__efeitos_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/efeitos/{efeito_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Ajustar Efeito */
        patch: operations["ajustar_efeito_mesas__mesa_id__personagens__personagem_id__efeitos__efeito_id__patch"];
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/efeitos/{efeito_id}/{acao}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Transicionar Efeito */
        post: operations["transicionar_efeito_mesas__mesa_id__personagens__personagem_id__efeitos__efeito_id___acao__post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/ficha": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ler Ficha */
        get: operations["ler_ficha_mesas__mesa_id__personagens__personagem_id__ficha_get"];
        /** Gravar Ficha */
        put: operations["gravar_ficha_mesas__mesa_id__personagens__personagem_id__ficha_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/importacoes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Importar Codigo */
        post: operations["importar_codigo_mesas__mesa_id__personagens__personagem_id__importacoes_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/importacoes/previa": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Previsualizar Importacao
         * @description Valida o código e mostra o que será criado, sem gravar nada.
         */
        post: operations["previsualizar_importacao_mesas__mesa_id__personagens__personagem_id__importacoes_previa_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/inventario": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Inventario */
        get: operations["listar_inventario_mesas__mesa_id__personagens__personagem_id__inventario_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/inventario/arrumacao": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Gravar Arrumacao
         * @description Grava a arrumação inteira da grade (tudo ou nada). Mover itens dentro da grade não gera evento no
         *     histórico; colocar na grade, retirar para a bandeja, equipar, desequipar e entrar ou sair de sobrecarga geram.
         */
        put: operations["gravar_arrumacao_mesas__mesa_id__personagens__personagem_id__inventario_arrumacao_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/inventario/grade": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ler Grade */
        get: operations["ler_grade_mesas__mesa_id__personagens__personagem_id__inventario_grade_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/inventario/mochila/largar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Largar Mochila
         * @description Interação livre: a mochila vai para o chão da cena ativa com os itens das linhas que ela acrescentava.
         */
        post: operations["largar_mochila_mesas__mesa_id__personagens__personagem_id__inventario_mochila_largar_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/inventario/moedas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Gravar Moedas
         * @description Adiciona ou retira moedas, define os totais (o servidor junta em pilhas) ou as pilhas (para dividir).
         *     Nenhuma moeda some: pilhas sem espaço vão para a área vermelha ou ficam fora da grade.
         */
        put: operations["gravar_moedas_mesas__mesa_id__personagens__personagem_id__inventario_moedas_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/inventario/{item_id}/equipar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Equipar Item */
        post: operations["equipar_item_mesas__mesa_id__personagens__personagem_id__inventario__item_id__equipar_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/inventario/{item_id}/formato": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Definir Formato
         * @description O Narrador define tipo e dimensão de um item (por exemplo, os que chegaram sem dimensão).
         *     Se o formato muda, o item sai da grade para ser recolocado; se o subtipo muda, ele é desequipado.
         */
        put: operations["definir_formato_mesas__mesa_id__personagens__personagem_id__inventario__item_id__formato_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/inventario/{item_id}/largar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Largar Item */
        post: operations["largar_item_mesas__mesa_id__personagens__personagem_id__inventario__item_id__largar_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/inventario/{item_id}/ofertas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Ofertar Item */
        post: operations["ofertar_item_mesas__mesa_id__personagens__personagem_id__inventario__item_id__ofertas_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/permissoes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ler Permissoes */
        get: operations["ler_permissoes_mesas__mesa_id__personagens__personagem_id__permissoes_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/recursos/ajustes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Ajustar Recurso
         * @description O Narrador soma um ajuste com origem e justificativa a PV/PP máximo ou a uma Escala.
         */
        post: operations["ajustar_recurso_mesas__mesa_id__personagens__personagem_id__recursos_ajustes_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/restauracao": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Restaurar Personagem */
        post: operations["restaurar_personagem_mesas__mesa_id__personagens__personagem_id__restauracao_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/transferencia": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Transferir Personagem
         * @description Narrador define o proprietário; `null` deixa o personagem sob controle exclusivo do Narrador.
         */
        post: operations["transferir_personagem_mesas__mesa_id__personagens__personagem_id__transferencia_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/valores-derivados": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Valores Derivados */
        get: operations["listar_valores_derivados_mesas__mesa_id__personagens__personagem_id__valores_derivados_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/personagens/{personagem_id}/visibilidade": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Alterar Visibilidade */
        put: operations["alterar_visibilidade_mesas__mesa_id__personagens__personagem_id__visibilidade_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/politicas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ler Politicas */
        get: operations["ler_politicas_mesas__mesa_id__politicas_get"];
        /** Configurar Politicas */
        put: operations["configurar_politicas_mesas__mesa_id__politicas_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/sala": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Ler Sala
         * @description Estado confirmado visível ao leitor; clientes o recarregam ao entrar e ao reconectar.
         */
        get: operations["ler_sala_mesas__mesa_id__sala_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/sala/cenas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Criar Cena */
        post: operations["criar_cena_mesas__mesa_id__sala_cenas_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/sala/cenas/{cena_id}/ativacao": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Ativar Cena */
        post: operations["ativar_cena_mesas__mesa_id__sala_cenas__cena_id__ativacao_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/sala/cenas/{cena_id}/tokens": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Criar Token */
        post: operations["criar_token_mesas__mesa_id__sala_cenas__cena_id__tokens_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/sala/recipientes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar Recipientes
         * @description Chão e baús da cena ativa, visíveis a todos os participantes.
         */
        get: operations["listar_recipientes_mesas__mesa_id__sala_recipientes_get"];
        put?: never;
        /** Criar Bau */
        post: operations["criar_bau_mesas__mesa_id__sala_recipientes_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/sala/recipientes/{recipiente_id}/cartas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Colocar Carta */
        post: operations["colocar_carta_mesas__mesa_id__sala_recipientes__recipiente_id__cartas_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/sala/recipientes/{recipiente_id}/itens/{retrato_id}/pegar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Pegar Item
         * @description O primeiro pedido confirmado leva o item; os seguintes recebem 409.
         */
        post: operations["pegar_item_mesas__mesa_id__sala_recipientes__recipiente_id__itens__retrato_id__pegar_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/sala/tokens/{token_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Remover Token */
        delete: operations["remover_token_mesas__mesa_id__sala_tokens__token_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/sala/tokens/{token_id}/movimento": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Mover Token
         * @description Movimentos não geram evento de auditoria: são estado tático frequente, não decisões a revisar.
         */
        post: operations["mover_token_mesas__mesa_id__sala_tokens__token_id__movimento_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/sala/tokens/{token_id}/visibilidade": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Alterar Visibilidade */
        post: operations["alterar_visibilidade_mesas__mesa_id__sala_tokens__token_id__visibilidade_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/solicitacoes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar Solicitacoes */
        get: operations["listar_solicitacoes_mesas__mesa_id__solicitacoes_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mesas/{mesa_id}/solicitacoes/{pedido_id}/decisao": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Decidir Solicitacao */
        post: operations["decidir_solicitacao_mesas__mesa_id__solicitacoes__pedido_id__decisao_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/perfil": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ler Perfil */
        get: operations["ler_perfil_perfil_get"];
        /** Atualizar Perfil */
        put: operations["atualizar_perfil_perfil_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/perfil/foto": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Enviar Foto */
        put: operations["enviar_foto_perfil_foto_put"];
        post?: never;
        /** Remover Foto */
        delete: operations["remover_foto_perfil_foto_delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/perfis/{usuario_id}/foto": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Ler Foto
         * @description Versão de exibição da foto; 404 igual para "sem foto" e "sem permissão".
         */
        get: operations["ler_foto_perfis__usuario_id__foto_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** AceitarConviteRequest */
        AceitarConviteRequest: {
            /** Codigo */
            codigo: string;
        };
        /** AceitarOfertaRequest */
        AceitarOfertaRequest: {
            /**
             * Coluna
             * @description Sem lugar, o item chega fora da grade.
             */
            coluna?: number | null;
            /**
             * Girado
             * @default false
             */
            girado: boolean;
            /** Linha */
            linha?: number | null;
            /**
             * Versao Esperada
             * @description Versão da ficha de quem recebe.
             */
            versao_esperada: number;
        };
        /**
         * AcervoPersonagem
         * @description Personagem visto fora da mesa, no acervo; valores exatamente como estão na ficha.
         */
        AcervoPersonagem: {
            /** Arquetipo */
            arquetipo?: string | null;
            /** Classe */
            classe?: string | null;
            /** Mesa Id */
            mesa_id: string;
            /** Mesa Nome */
            mesa_nome: string;
            /** Nivel */
            nivel?: number | null;
            /** Nome */
            nome: string;
            /** Personagem Id */
            personagem_id: string;
            /** Raca */
            raca?: string | null;
            /**
             * Retrato Objeto
             * @description Ler por /mesas/{mesa_id}/ativos com exibicao=true.
             */
            retrato_objeto?: string | null;
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "personagem" | "npc" | "monstro";
            /**
             * Visibilidade
             * @enum {string}
             */
            visibilidade: "mesa" | "narrador";
        };
        /**
         * AjustarEfeitoRequest
         * @description Somente os campos enviados são alterados; `duracao_rodadas: null` remove a duração.
         */
        AjustarEfeitoRequest: {
            /** Descricao */
            descricao?: string | null;
            /** Duracao Rodadas */
            duracao_rodadas?: number | null;
            /** Modificadores */
            modificadores?: components["schemas"]["ModificadorResumo"][] | null;
            /** Motivo */
            motivo?: string | null;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /**
         * AjustarRecursoRequest
         * @description Ajuste do Narrador em PV/PP máximo ou Escala, quando uma regra específica prevalece.
         */
        AjustarRecursoRequest: {
            /**
             * Alvo
             * @enum {string}
             */
            alvo: "pv_maximo" | "pp_maximo" | "escala_pv" | "escala_pp";
            /** Justificativa */
            justificativa: string;
            /** Origem */
            origem: string;
            /** Valor */
            valor: number;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** AjusteRecursoResposta */
        AjusteRecursoResposta: {
            /** Valores */
            valores: components["schemas"]["ValorDerivadoResumo"][];
            /** Versao */
            versao: number;
        };
        /** AljavaFormato */
        AljavaFormato: {
            /** Capacidade Flechas */
            capacidade_flechas: number;
        };
        /** AlterarDesgasteRequest */
        AlterarDesgasteRequest: {
            colapso_mental?: components["schemas"]["ColapsoMentalEntrada"] | null;
            consequencia_excedente?: components["schemas"]["ConsequenciaEntrada"] | null;
            /** Delta */
            delta: number;
            /** Justificativa */
            justificativa?: string | null;
            origem: components["schemas"]["OrigemConsequencia"];
            /**
             * Trilha
             * @enum {string}
             */
            trilha: "exaustao" | "estresse";
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** AlterarVisibilidadeRequest */
        AlterarVisibilidadeRequest: {
            revelacao?: components["schemas"]["RevelacaoContrato"];
            /** Versao Esperada */
            versao_esperada: number;
            /**
             * Visibilidade
             * @enum {string}
             */
            visibilidade: "mesa" | "narrador";
        };
        /** AlvoDescanso */
        AlvoDescanso: {
            /**
             * Ajustes
             * @description Substitui a quantidade calculada pela regra (recuperação ou redução).
             */
            ajustes?: {
                [key: string]: number;
            };
            /** Foco */
            foco?: ("pv" | "pp" | "exaustao" | "estresse") | null;
            /** Personagem Id */
            personagem_id: string;
        };
        /** AmpliacaoGradeResumo */
        AmpliacaoGradeResumo: {
            /** Colunas */
            colunas: number;
            /**
             * Fonte
             * @enum {string}
             */
            fonte: "mochila" | "magia" | "habilidade";
            /** Linhas */
            linhas: number;
            /** Rotulo */
            rotulo: string;
        };
        /** AplicarEfeitoRequest */
        AplicarEfeitoRequest: {
            /**
             * Associacao
             * @description Efeito do catálogo.
             */
            associacao?: string | null;
            /** Descricao */
            descricao?: string | null;
            /** Duracao Rodadas */
            duracao_rodadas?: number | null;
            /** Modificadores */
            modificadores?: components["schemas"]["ModificadorResumo"][];
            /** Motivo */
            motivo?: string | null;
            /** Nome */
            nome?: string | null;
            /**
             * Origem
             * @description O que causou o efeito na ficção.
             */
            origem?: string | null;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** ApresentacaoResumo */
        ApresentacaoResumo: {
            /**
             * Apresentada Em
             * Format: date-time
             */
            apresentada_em: string;
            carta: components["schemas"]["CartaVisivel"];
            /**
             * Destinatarios
             * @description Somente para o Narrador.
             */
            destinatarios?: string[] | null;
            /**
             * Estado
             * @enum {string}
             */
            estado: "apresentada" | "recolhida";
            /** Id */
            id: string;
            /**
             * Vista Por
             * @description Somente para o Narrador: quem já viu e fechou a carta.
             */
            vista_por?: string[] | null;
        };
        /** ApresentarCartaRequest */
        ApresentarCartaRequest: {
            /**
             * Destinatarios
             * @description Usuários; vazio = toda a mesa.
             */
            destinatarios?: string[];
            /** Versao Id */
            versao_id: string;
        };
        /** AquisicaoCartasResposta */
        AquisicaoCartasResposta: {
            /** Cartas */
            cartas: components["schemas"]["CartaPersonagemResumo"][];
            /** Versao */
            versao: number;
        };
        /** ArquetipoResumo */
        ArquetipoResumo: {
            /** Conceito */
            conceito: string;
            /** Habilidades */
            habilidades: components["schemas"]["HabilidadeCatalogoResumo"][];
            /** Nome */
            nome: string;
        };
        /** ArrumacaoGradeRequest */
        ArrumacaoGradeRequest: {
            /** Itens */
            itens: components["schemas"]["PosicaoItemGrade"][];
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** AtivoResposta */
        AtivoResposta: {
            /** Base64 */
            base64: string;
            /** Tipo */
            tipo: string;
        };
        /** AtualizarFichaComando */
        AtualizarFichaComando: {
            /** Ator Id */
            ator_id: string;
            ficha: components["schemas"]["FichaContrato"];
            /** Id */
            id: string;
            /** Mesa Id */
            mesa_id: string;
            /** Personagem Id */
            personagem_id: string;
            /**
             * Tipo
             * @default atualizar_ficha
             * @constant
             */
            tipo: "atualizar_ficha";
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** AtualizarMesaRequest */
        AtualizarMesaRequest: {
            /** Nome */
            nome: string;
            /** Sinopse */
            sinopse?: string | null;
            /**
             * Sistema
             * @description Só "cursed" nesta versão.
             */
            sistema?: "cursed" | null;
        };
        /** AtualizarPerfilRequest */
        AtualizarPerfilRequest: {
            /** Apelido */
            apelido: string;
        };
        /** BaseClasseResumo */
        BaseClasseResumo: {
            /**
             * Atributo
             * @description Chave normalizada do atributo: vigor ou proposito.
             */
            atributo: string;
            /** Texto */
            texto: string;
            /** Valor */
            valor: number;
        };
        /** Body_enviar_foto_perfil_foto_put */
        Body_enviar_foto_perfil_foto_put: {
            /** Arquivo */
            arquivo: string;
        };
        /** Body_enviar_imagem_mesas__mesa_id__imagens__destino__put */
        Body_enviar_imagem_mesas__mesa_id__imagens__destino__put: {
            /** Alvo */
            alvo: string;
            /** Arquivo */
            arquivo: string;
            /** Versao Esperada */
            versao_esperada?: number | null;
        };
        /** CamadaSala */
        CamadaSala: {
            /** Id */
            id: string;
            /** Nome */
            nome: string;
            /** Ordem */
            ordem: number;
            /**
             * Visibilidade
             * @enum {string}
             */
            visibilidade: "mesa" | "narrador";
        };
        /** CampoDoSubtipoResumo */
        CampoDoSubtipoResumo: {
            /** Campo */
            campo: string;
            /**
             * Sugestoes
             * @description Lista de sugestões, nos campos de etiquetas.
             */
            sugestoes?: string | null;
        };
        /**
         * CampoItemResumo
         * @description Campo de item, guardado em ``dados[id]`` (simplificar-criacao-de-cartas).
         */
        CampoItemResumo: {
            /** Exemplo */
            exemplo?: string | null;
            /** Icone */
            icone: string;
            /** Id */
            id: string;
            /**
             * Lista
             * @description Lista de escolhas, nos campos de escolha.
             */
            lista?: string | null;
            /** Rotulo */
            rotulo: string;
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "inteiro" | "texto" | "escolha" | "escolhas" | "etiquetas";
            /** Unidade */
            unidade?: string | null;
        };
        /** CampoPersonalidadeResumo */
        CampoPersonalidadeResumo: {
            /** Chave */
            chave: string;
            /** Dica */
            dica: string;
            /**
             * Icone
             * @description Ícone da linha na aba Personalidade.
             */
            icone?: string | null;
            /**
             * Limite
             * @description Máximo de caracteres aceito; vazio = sem limite. Nos traços, o de cada traço.
             */
            limite?: number | null;
            /**
             * Longo
             * @description Texto longo (ex.: História): área de texto maior.
             * @default false
             */
            longo: boolean;
            /**
             * Maximo
             * @description Quantidade máxima de traços; só no tipo tracos.
             */
            maximo?: number | null;
            /** Rotulo */
            rotulo: string;
            /**
             * Tipo
             * @description Texto (vazio também é texto) ou lista de palavras curtas (traços).
             */
            tipo?: ("texto" | "tracos") | null;
        };
        /** CanalPrivado */
        CanalPrivado: {
            /**
             * Escopo
             * @enum {string}
             */
            escopo: "mesa" | "narrador" | "personagem";
            /** Personagem Id */
            personagem_id?: string | null;
            /** Topico */
            topico: string;
        };
        /** CartaDefinicaoResumo */
        CartaDefinicaoResumo: {
            /**
             * Arquivada
             * @default false
             */
            arquivada: boolean;
            /** Id */
            id: string;
            /**
             * Origem Sistema
             * @description Habilidade do catálogo que a carta materializa; o JSON prevalece sobre edições.
             */
            origem_sistema?: string | null;
            /** Procedencia Rascunho */
            procedencia_rascunho?: {
                [key: string]: unknown;
            };
            publicada?: components["schemas"]["CartaVersaoResumo"] | null;
            /** Rascunho */
            rascunho?: {
                [key: string]: unknown;
            } | null;
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "habilidade" | "magia" | "item" | "efeito";
            /**
             * Versao
             * @description Versão do rascunho para controle de concorrência.
             */
            versao: number;
            /** Versao Publicada */
            versao_publicada?: number | null;
        };
        /** CartaPersonagemResumo */
        CartaPersonagemResumo: {
            /**
             * Adquirida Em
             * Format: date-time
             */
            adquirida_em: string;
            carta: components["schemas"]["CartaVisivel"];
            /**
             * Concedida Por
             * @description Escolha que concedeu a carta (ex.: classe:Druida); vazio para ofertas e concessões avulsas.
             */
            concedida_por?: string | null;
            /** Efeito Id */
            efeito_id?: string | null;
            /**
             * Estado
             * @enum {string}
             */
            estado: "disponivel" | "em_aprendizado" | "aprendida" | "no_inventario" | "aplicada" | "removida";
            /** Excecao Aprendizado */
            excecao_aprendizado: boolean;
            /** Id */
            id: string;
            /** Item Id */
            item_id?: string | null;
            /**
             * Origem
             * @enum {string}
             */
            origem: "concessao" | "oferta";
            /** Personagem Id */
            personagem_id: string;
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "habilidade" | "magia" | "item" | "efeito";
            /**
             * Versao Mais Recente
             * @description Somente para o Narrador.
             */
            versao_mais_recente?: number | null;
        };
        /** CartaVersaoResumo */
        CartaVersaoResumo: {
            /** Conteudo */
            conteudo: {
                [key: string]: unknown;
            };
            /** Definicao Id */
            definicao_id: string;
            /** Id */
            id: string;
            /** Numero */
            numero: number;
            /** Procedencia */
            procedencia: {
                [key: string]: unknown;
            };
            /**
             * Publicado Em
             * Format: date-time
             */
            publicado_em: string;
            /** Publicado Por */
            publicado_por: string;
            /** Revisao Pendente */
            revisao_pendente?: string[];
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "habilidade" | "magia" | "item" | "efeito";
        };
        /**
         * CartaVisivel
         * @description Conteúdo publicado que um participante pode ver; sem procedência nem notas do catálogo.
         */
        CartaVisivel: {
            /** Conteudo */
            conteudo: {
                [key: string]: unknown;
            };
            /** Definicao Id */
            definicao_id: string;
            /** Numero */
            numero: number;
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "habilidade" | "magia" | "item" | "efeito";
            /** Versao Id */
            versao_id: string;
        };
        /**
         * CatalogoItensResumo
         * @description Raridades e categorias de item (reformular-visual-da-ficha), só etiqueta e organização, e os campos de
         *     cada subtipo, tirados de Equipamentos.md (simplificar-criacao-de-cartas).
         */
        CatalogoItensResumo: {
            /** Campos */
            campos?: components["schemas"]["CampoItemResumo"][];
            /** Campos Por Subtipo */
            campos_por_subtipo?: {
                [key: string]: components["schemas"]["CampoDoSubtipoResumo"][];
            };
            /** Categorias */
            categorias: components["schemas"]["CategoriaItemResumo"][];
            /** Listas */
            listas?: {
                [key: string]: string[];
            };
            /** Raridades */
            raridades: components["schemas"]["RaridadeResumo"][];
        };
        /** CategoriaItemResumo */
        CategoriaItemResumo: {
            /**
             * Escolha Em Outros
             * @description Escolhida pelo Narrador em itens do tipo Outros.
             * @default false
             */
            escolha_em_outros: boolean;
            /** Icone */
            icone: string;
            /** Id */
            id: string;
            /**
             * Padrao Outros
             * @description Categoria dos itens Outros sem escolha.
             * @default false
             */
            padrao_outros: boolean;
            /** Rotulo */
            rotulo: string;
            /**
             * Subtipos
             * @description Subtipos que caem nesta categoria sem escolha.
             */
            subtipos?: string[];
        };
        /** CenaResumoSala */
        CenaResumoSala: {
            /** Ativa */
            ativa: boolean;
            /** Id */
            id: string;
            /** Nome */
            nome: string;
        };
        /** CenaSala */
        CenaSala: {
            /** Ativa */
            ativa: boolean;
            /** Camadas */
            camadas: components["schemas"]["CamadaSala"][];
            /** Colunas */
            colunas: number;
            /** Id */
            id: string;
            /** Linhas */
            linhas: number;
            /** Mapa Objeto */
            mapa_objeto?: string | null;
            /** Nome */
            nome: string;
            /** Tokens */
            tokens: components["schemas"]["TokenSala"][];
            /** Versao */
            versao: number;
        };
        /** ClasseCatalogoResumo */
        ClasseCatalogoResumo: {
            /** Arquetipos */
            arquetipos: components["schemas"]["ArquetipoResumo"][];
            /** Cor */
            cor?: string | null;
            escala_pp?: components["schemas"]["BaseClasseResumo"] | null;
            escala_pv?: components["schemas"]["BaseClasseResumo"] | null;
            /** Habilidades */
            habilidades: components["schemas"]["HabilidadeCatalogoResumo"][];
            /** Nome */
            nome: string;
            pp?: components["schemas"]["BaseClasseResumo"] | null;
            pv?: components["schemas"]["BaseClasseResumo"] | null;
        };
        /**
         * ColapsoMentalEntrada
         * @description Manifestação escolhida e o Trauma que o colapso cria (novo) ou intensifica (existente).
         */
        ColapsoMentalEntrada: {
            /** Manifestacao */
            manifestacao: string;
            trauma?: components["schemas"]["ConsequenciaEntrada"] | null;
            /** Trauma Id */
            trauma_id?: string | null;
        };
        /** ColocarCartaRequest */
        ColocarCartaRequest: {
            /** Versao Id */
            versao_id: string;
        };
        /** ConcederCartaRequest */
        ConcederCartaRequest: {
            /**
             * Excecao Aprendizado
             * @default false
             */
            excecao_aprendizado: boolean;
            /** Motivo */
            motivo?: string | null;
            /** Versao Esperada */
            versao_esperada: number;
            /** Versao Id */
            versao_id: string;
        };
        /** ConfirmarDescansoRequest */
        ConfirmarDescansoRequest: {
            /** Alvos */
            alvos: components["schemas"]["AlvoDescanso"][];
            /** Conforto */
            conforto?: number | null;
            /** Motivo */
            motivo?: string | null;
            /** Seguranca */
            seguranca?: number | null;
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "curto" | "longo";
            /**
             * Versoes
             * @description Versão esperada de cada personagem selecionado.
             */
            versoes: {
                [key: string]: number;
            };
        };
        /** ConsequenciaComandoResposta */
        ConsequenciaComandoResposta: {
            /** @description Ausente quando foi removida. */
            consequencia?: components["schemas"]["ConsequenciaResumo"] | null;
            /** Consequencias */
            consequencias: components["schemas"]["ConsequenciaResumo"][];
            /** Versao */
            versao: number;
        };
        /**
         * ConsequenciaEntrada
         * @description Campos mínimos de uma consequência persistente; Trauma também exige gatilho.
         */
        ConsequenciaEntrada: {
            /**
             * Categoria
             * @enum {string}
             */
            categoria: "trauma" | "ferimento_grave" | "sequela" | "aflicao" | "outro";
            /** Descricao */
            descricao: string;
            /**
             * Efeito
             * @description Manifestação ou efeito atual.
             */
            efeito: string;
            /** Gatilho */
            gatilho?: string | null;
            /** Nome */
            nome: string;
            origem?: components["schemas"]["OrigemConsequencia"] | null;
            /**
             * Tratamento Regra
             * @description Como é tratada ou encerrada.
             */
            tratamento_regra: string;
        };
        /** ConsequenciaResumo */
        ConsequenciaResumo: {
            /** Atualizado Em */
            atualizado_em?: string | null;
            /**
             * Categoria
             * @enum {string}
             */
            categoria: "trauma" | "ferimento_grave" | "sequela" | "aflicao" | "outro";
            /** Criado Em */
            criado_em?: string | null;
            /** Descricao */
            descricao: string;
            /**
             * Efeito Atual
             * @default
             */
            efeito_atual: string;
            /**
             * Gatilho
             * @default
             */
            gatilho: string;
            /** Historico */
            historico?: components["schemas"]["RegistroConsequencia"][];
            /** Id */
            id: string;
            /**
             * Intensidade
             * @default 1
             */
            intensidade: number;
            /** Nome */
            nome: string;
            origem: components["schemas"]["OrigemResumo"];
            tratamento: components["schemas"]["TratamentoResumo"];
        };
        /** ConviteCriado */
        ConviteCriado: {
            /** Codigo */
            codigo: string;
            /**
             * Expira Em
             * Format: date-time
             */
            expira_em: string;
        };
        /** CopiarPersonagemRequest */
        CopiarPersonagemRequest: {
            /** Mesa Origem Id */
            mesa_origem_id: string;
            /** Personagem Origem Id */
            personagem_origem_id: string;
        };
        /** CorrigirEventoRequest */
        CorrigirEventoRequest: {
            /** Motivo */
            motivo?: string | null;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** CriarBauRequest */
        CriarBauRequest: {
            /** Colunas */
            colunas: number;
            /** Linhas */
            linhas: number;
            /** Nome */
            nome: string;
        };
        /** CriarCartaRequest */
        CriarCartaRequest: {
            /**
             * Rascunho
             * @description Conteúdo em edição; validado ao publicar.
             */
            rascunho?: {
                [key: string]: unknown;
            };
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "habilidade" | "magia" | "item" | "efeito";
        };
        /** CriarCenaRequest */
        CriarCenaRequest: {
            /**
             * Colunas
             * @default 20
             */
            colunas: number;
            /**
             * Linhas
             * @default 15
             */
            linhas: number;
            /** Mapa Objeto */
            mapa_objeto?: string | null;
            /** Nome */
            nome: string;
        };
        /** CriarConsequenciaRequest */
        CriarConsequenciaRequest: {
            consequencia: components["schemas"]["ConsequenciaEntrada"];
            /** Justificativa */
            justificativa: string;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** CriarConviteRequest */
        CriarConviteRequest: {
            /**
             * Validade Dias
             * @default 7
             */
            validade_dias: number;
        };
        /** CriarEntidadeRequest */
        CriarEntidadeRequest: {
            ficha: components["schemas"]["FichaContrato"];
            /** Proprietario Id */
            proprietario_id?: string | null;
            revelacao?: components["schemas"]["RevelacaoContrato"];
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "personagem" | "npc" | "monstro";
            /**
             * Visibilidade
             * @default narrador
             * @enum {string}
             */
            visibilidade: "mesa" | "narrador";
        };
        /** CriarMesaRequest */
        CriarMesaRequest: {
            /** Nome */
            nome: string;
        };
        /** CriarOfertaRequest */
        CriarOfertaRequest: {
            /** Expira Em */
            expira_em?: string | null;
            /**
             * Max Escolhas
             * @default 1
             */
            max_escolhas: number;
            /**
             * Min Escolhas
             * @default 1
             */
            min_escolhas: number;
            /** Personagem Ids */
            personagem_ids: string[];
            /** Titulo */
            titulo: string;
            /** Versao Ids */
            versao_ids: string[];
        };
        /** CriarPersonagemRequest */
        CriarPersonagemRequest: {
            ficha: components["schemas"]["FichaContrato"];
        };
        /** CriarTokenRequest */
        CriarTokenRequest: {
            /** Camada Id */
            camada_id: string;
            /** Controladores */
            controladores?: string[];
            /**
             * Oculto
             * @default false
             */
            oculto: boolean;
            /** Personagem Id */
            personagem_id?: string | null;
            /** Rotulo */
            rotulo: string;
            /**
             * Tamanho
             * @default 1
             */
            tamanho: number;
            /** X */
            x: number;
            /** Y */
            y: number;
        };
        /** DecidirPedidoRequest */
        DecidirPedidoRequest: {
            /** Aprovar */
            aprovar: boolean;
        };
        /** DefinirFormatoRequest */
        DefinirFormatoRequest: {
            formato: components["schemas"]["FormatoItemGrade"];
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** DesgasteComandoResposta */
        DesgasteComandoResposta: {
            /** Consequencias */
            consequencias: components["schemas"]["ConsequenciaResumo"][];
            previa?: components["schemas"]["PreviaDesgaste"] | null;
            /** Trilhas */
            trilhas: components["schemas"]["TrilhaDesgaste"][];
            /** Versao */
            versao: number;
        };
        /** DestinatarioOferta */
        DestinatarioOferta: {
            /** Escolhas */
            escolhas?: string[];
            /**
             * Estado
             * @enum {string}
             */
            estado: "pendente" | "respondida" | "expirada" | "cancelada";
            /** Personagem Id */
            personagem_id: string;
            /** Respondido Em */
            respondido_em?: string | null;
        };
        /** DiferencaCarta */
        DiferencaCarta: {
            /** Antes */
            antes?: unknown;
            /** Campo */
            campo: string;
            /** Depois */
            depois?: unknown;
        };
        /**
         * EditarConsequenciaRequest
         * @description Somente os campos enviados são alterados.
         */
        EditarConsequenciaRequest: {
            /** Descricao */
            descricao?: string | null;
            /** Efeito */
            efeito?: string | null;
            /** Gatilho */
            gatilho?: string | null;
            /** Justificativa */
            justificativa: string;
            /** Nome */
            nome?: string | null;
            /** Objetivo */
            objetivo?: number | null;
            origem?: components["schemas"]["OrigemConsequencia"] | null;
            /** Progresso */
            progresso?: number | null;
            /** Tratamento Regra */
            tratamento_regra?: string | null;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** EfeitoComandoResposta */
        EfeitoComandoResposta: {
            efeito: components["schemas"]["EfeitoResumo"];
            /** Versao */
            versao: number;
        };
        /** EfeitoDefaultResumo */
        EfeitoDefaultResumo: {
            /** Associacao */
            associacao: string;
            /** Descricao */
            descricao: string;
            /** Grupo */
            grupo?: string | null;
            icone: components["schemas"]["IconeResumo"];
            /** Modificadores */
            modificadores?: components["schemas"]["ModificadorCatalogoResumo"][];
            /** Nome */
            nome: string;
            /**
             * Substitui
             * @description Associações que este efeito encerra ao ser aplicado.
             */
            substitui?: string[];
            /** Substitui Nomes */
            substitui_nomes?: string[];
        };
        /** EfeitoPrevia */
        EfeitoPrevia: {
            /** Ativacao */
            ativacao?: string | null;
            /** Descricao */
            descricao: string;
            /** Modificadores */
            modificadores?: components["schemas"]["ModificadorResumo"][];
            /** Nome */
            nome: string;
        };
        /** EfeitoResumo */
        EfeitoResumo: {
            /**
             * Associacao
             * @description Código do efeito default, quando vem do catálogo.
             */
            associacao?: string | null;
            /** Ativacao */
            ativacao?: string | null;
            /**
             * Consequencias
             * @description Consequências sem valor numérico na ficha.
             */
            consequencias?: string[];
            /**
             * Derivado
             * @description Calculado pelo sistema (ex.: Sobrecarga); não se encerra nem se ajusta.
             * @default false
             */
            derivado: boolean;
            /** Descricao */
            descricao: string;
            /** Duracao Rodadas */
            duracao_rodadas?: number | null;
            /**
             * Estado
             * @enum {string}
             */
            estado: "ativo" | "suspenso" | "encerrado";
            /** Fontes */
            fontes?: components["schemas"]["FonteEfeitoResumo"][];
            icone: components["schemas"]["IconeResumo"];
            /** Id */
            id: string;
            /** Modificadores */
            modificadores?: components["schemas"]["ModificadorResumo"][];
            /** Nome */
            nome: string;
        };
        /** EncerrarColapsoRequest */
        EncerrarColapsoRequest: {
            /**
             * Motivo
             * @description Auxílio pertinente ou fim do conflito imediato.
             */
            motivo: string;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** EntidadePublica */
        EntidadePublica: {
            /** Id */
            id: string;
            /**
             * Imagem
             * @description Retrato em base64, quando revelado.
             */
            imagem?: string | null;
            /** Nome Publico */
            nome_publico?: string | null;
        };
        /** EquiparItemRequest */
        EquiparItemRequest: {
            /** Equipado */
            equipado: boolean;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** EquiparItemResposta */
        EquiparItemResposta: {
            item: components["schemas"]["ItemInventarioResumo"];
            /** Versao */
            versao: number;
        };
        /** ErroCatalogoResumo */
        ErroCatalogoResumo: {
            /** Arquivo */
            arquivo: string;
            /**
             * Em
             * Format: date-time
             */
            em: string;
            /** Motivo */
            motivo: string;
        };
        /** EsforcoRequest */
        EsforcoRequest: {
            /**
             * Acao
             * @description Ação ou teste em que o esforço foi usado.
             */
            acao: string;
            /**
             * Bonus Movimento
             * @description Pontos convertidos em +1 m cada (só físico).
             * @default 0
             */
            bonus_movimento: number;
            colapso_mental?: components["schemas"]["ColapsoMentalEntrada"] | null;
            /** Pontos */
            pontos: number;
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "fisico" | "mental";
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** EstadoCatalogoResumo */
        EstadoCatalogoResumo: {
            erro?: components["schemas"]["ErroCatalogoResumo"] | null;
            /** Versao */
            versao: string;
        };
        /** EventoAuditoriaResumo */
        EventoAuditoriaResumo: {
            /** Acao */
            acao: string;
            /** Alvo Id */
            alvo_id?: string | null;
            /** Alvo Tipo */
            alvo_tipo?: string | null;
            /** Ator Id */
            ator_id?: string | null;
            /** Ator Nome */
            ator_nome?: string | null;
            /**
             * Categoria
             * @enum {string}
             */
            categoria: "mesa" | "permissao" | "personagem" | "ficha" | "inventario" | "efeito" | "carta";
            /** Correlacao Id */
            correlacao_id?: string | null;
            /** Corrige Evento Id */
            corrige_evento_id?: number | null;
            /** Corrigido Por */
            corrigido_por?: number[];
            /**
             * Corrigivel
             * @default false
             */
            corrigivel: boolean;
            /** Id */
            id: number;
            /** Motivo */
            motivo?: string | null;
            /** Mudancas */
            mudancas?: components["schemas"]["MudancaAuditoria"][];
            /**
             * Ocorrido Em
             * Format: date-time
             */
            ocorrido_em: string;
            /**
             * Origem
             * @enum {string}
             */
            origem: "usuario" | "automacao" | "migracao";
            /** Personagem Id */
            personagem_id?: string | null;
            /**
             * Relevancia
             * @enum {string}
             */
            relevancia: "mecanica" | "narrativa" | "organizacional";
            /** Resumo */
            resumo: string;
            /** Sessao Id */
            sessao_id?: string | null;
        };
        /** FaixaAlturaResumo */
        FaixaAlturaResumo: {
            /** Maxima */
            maxima?: number | null;
            /** Minima */
            minima: number;
            /** Tamanho */
            tamanho: string;
        };
        /** FaixaDesgaste */
        FaixaDesgaste: {
            /** Efeito */
            efeito: string;
            /** Id */
            id: string;
            /** Max */
            max: number;
            /** Min */
            min: number;
            /** Nome */
            nome: string;
        };
        /**
         * FichaContrato
         * @description Representação compatível de uma ficha transportada pela API.
         */
        FichaContrato: {
            /** Armaduras */
            armaduras?: {
                [key: string]: unknown;
            }[];
            /** Armas */
            armas?: {
                [key: string]: unknown;
            }[];
            /** Atributos */
            atributos?: {
                [key: string]: unknown;
            };
            /** Efeitos Externos */
            efeitos_externos?: {
                [key: string]: unknown;
            }[];
            /** Outros */
            outros?: {
                [key: string]: unknown;
            }[];
            /** Pericias */
            pericias?: {
                [key: string]: unknown;
            };
            /** Personagem */
            personagem?: {
                [key: string]: unknown;
            };
            /** Personalidade */
            personalidade?: {
                [key: string]: unknown;
            };
        } & {
            [key: string]: unknown;
        };
        /** FichaSnapshot */
        FichaSnapshot: {
            /**
             * Avisos
             * @description Valores fora das regras ou do catálogo, mantidos até o Narrador corrigir.
             */
            avisos?: components["schemas"]["ProblemaValidacao"][];
            ficha: components["schemas"]["FichaContrato"];
            /** Mesa Id */
            mesa_id: string;
            /** Personagem Id */
            personagem_id: string;
            /**
             * Tipo
             * @description personagem, npc ou monstro: só personagens seguem limites e catálogo.
             * @default personagem
             */
            tipo: string;
            /** Versao */
            versao: number;
        };
        /** FonteEfeitoResumo */
        FonteEfeitoResumo: {
            /** Descricao */
            descricao?: string | null;
            /** Equipamento Id */
            equipamento_id?: string | null;
            /** Tipo */
            tipo: string;
        };
        /** FonteValorResumo */
        FonteValorResumo: {
            /** Descricao */
            descricao: string;
            /** Efeito Id */
            efeito_id?: string | null;
            /** Item Id */
            item_id?: string | null;
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "base" | "ajuste" | "atributo" | "pericia" | "equipamento" | "efeito" | "classe" | "nivel" | "ajuste_narrador";
            /** Valor */
            valor: number;
        };
        /**
         * FormatoItemGrade
         * @description Formato do item na grade de carga, definido na criação (carga-por-espacos).
         */
        FormatoItemGrade: {
            aljava?: components["schemas"]["AljavaFormato"] | null;
            /** Altura */
            altura: number;
            /**
             * Categoria
             * @description Só itens do tipo Outros, entre as escolhas do catálogo; nos demais, a categoria vem do subtipo.
             */
            categoria?: string | null;
            /**
             * Icone Grade
             * @description Imagem na proporção da dimensão.
             */
            icone_grade?: string | null;
            /** Largura */
            largura: number;
            /**
             * Maos
             * @description Só itens do tipo Outros.
             */
            maos?: number | null;
            mochila?: components["schemas"]["MochilaFormato"] | null;
            /**
             * Pilha Max
             * @description Só itens do tipo Outros.
             */
            pilha_max?: number | null;
            /**
             * Raridade
             * @description Id do catálogo de itens; só etiqueta, sem efeito mecânico.
             * @default comum
             */
            raridade: string;
            /**
             * Subtipo
             * @enum {string}
             */
            subtipo: "peitoral" | "capacete" | "luvas" | "botas" | "uma_mao" | "duas_maos" | "escudo" | "mochila" | "aljava" | "moedas" | "outro";
            /**
             * Versatil
             * @description Só armas de uma mão: podem ser empunhadas com uma ou duas mãos.
             * @default false
             */
            versatil: boolean;
        };
        /**
         * GradeInventario
         * @description Grade de carga calculada pelo servidor: é a autoridade sobre posições e sobrecarga.
         */
        GradeInventario: {
            /** Ampliacoes */
            ampliacoes?: components["schemas"]["AmpliacaoGradeResumo"][];
            /** Celulas Ocupadas */
            celulas_ocupadas: number;
            /** Celulas Verdes */
            celulas_verdes: number;
            /**
             * Colunas
             * @description Colunas exibidas, incluindo áreas perdidas ocupadas.
             */
            colunas: number;
            /** Colunas Verdes */
            colunas_verdes: number;
            /** Forca */
            forca: number;
            /** Itens */
            itens: components["schemas"]["ItemInventarioResumo"][];
            /** Itens Em Sobrecarga */
            itens_em_sobrecarga?: string[];
            /**
             * Linhas
             * @description Linhas exibidas: verdes, a vermelha extra e áreas perdidas ocupadas.
             */
            linhas: number;
            /** Linhas Verdes */
            linhas_verdes: number;
            /** Maos Ocupadas */
            maos_ocupadas: number;
            /** Sobrecarga */
            sobrecarga: boolean;
            /**
             * Tamanho
             * @enum {string}
             */
            tamanho: "minusculo" | "pequeno" | "medio" | "grande" | "enorme" | "colossal";
            /**
             * Tamanho Origem
             * @enum {string}
             */
            tamanho_origem: "ficha" | "raca";
            /** Versao */
            versao: number;
        };
        /** GrupoPersonalidadeResumo */
        GrupoPersonalidadeResumo: {
            /**
             * Campos
             * @description Chaves dos campos, na ordem das linhas; inclui alinhamento e pecado.
             */
            campos: string[];
            /**
             * Emblema
             * @description Ícone do medalhão do quadro.
             */
            emblema: string;
            /** Id */
            id: string;
            /** Subtitulo */
            subtitulo: string;
            /** Titulo */
            titulo: string;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** HabilidadeCatalogoResumo */
        HabilidadeCatalogoResumo: {
            /** Descricao */
            descricao: string;
            /** Nome */
            nome: string;
            /** Tipo */
            tipo: string;
        };
        /** HealthResponse */
        HealthResponse: {
            /** Status */
            status: string;
        };
        /**
         * IconeResumo
         * @description Ícone resolvido de um efeito: mesa → catálogo → padrão.
         */
        IconeResumo: {
            /**
             * Caminho
             * @description Objeto do armazenamento (mesa, efeito) ou caminho público do frontend.
             */
            caminho: string;
            /**
             * Origem
             * @enum {string}
             */
            origem: "mesa" | "efeito" | "catalogo" | "padrao";
        };
        /**
         * ImagemResposta
         * @description Referência gravada no ponto de envio; a imagem nunca volta na resposta.
         */
        ImagemResposta: {
            /** Alvo */
            alvo: string;
            /**
             * Destino
             * @enum {string}
             */
            destino: "retrato" | "ilustracao" | "item" | "icone-grade" | "efeito" | "carta" | "mapa" | "icone-efeito" | "capa" | "foto";
            /**
             * Exibicao
             * @description Versão reduzida em WEBP, quando o destino tem uma.
             */
            exibicao?: string | null;
            /**
             * Objeto
             * @description Objeto original no armazenamento privado; vazio após remover.
             */
            objeto?: string | null;
            /**
             * Versao
             * @description Nova versão do personagem ou do rascunho da carta.
             */
            versao?: number | null;
        };
        /** ImportacaoResultado */
        ImportacaoResultado: {
            /** Efeitos */
            efeitos: components["schemas"]["EfeitoResumo"][];
            item?: components["schemas"]["ItemInventarioResumo"] | null;
            /** Versao */
            versao: number;
        };
        /** ImportarCartaRequest */
        ImportarCartaRequest: {
            /** Codigo */
            codigo: string;
        };
        /** ImportarCodigoRequest */
        ImportarCodigoRequest: {
            /** Codigo */
            codigo: string;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /**
         * IntervaloAlturaResumo
         * @description Altura em metros; `maxima` vazia é sem limite superior.
         */
        IntervaloAlturaResumo: {
            /** Maxima */
            maxima?: number | null;
            /** Minima */
            minima: number;
        };
        /** ItemInventarioResumo */
        ItemInventarioResumo: {
            /** Altura */
            altura?: number | null;
            /** Cargas Atuais */
            cargas_atuais?: number | null;
            /** Cargas Maximas */
            cargas_maximas?: number | null;
            /**
             * Categoria
             * @description Id da categoria no catálogo de itens.
             * @default diversos
             */
            categoria: string;
            /** Coluna */
            coluna?: number | null;
            /** Dados */
            dados?: {
                [key: string]: unknown;
            };
            /**
             * Descricao
             * @description Texto da carta de origem ou descrição importada.
             */
            descricao?: string | null;
            /**
             * Efeitos
             * @description Efeitos cuja fonte é este item.
             */
            efeitos?: string[];
            /** Equipado */
            equipado: boolean;
            /**
             * Girado
             * @default false
             */
            girado: boolean;
            /** Id */
            id: string;
            /** Largura */
            largura?: number | null;
            /** Linha */
            linha?: number | null;
            /** Maos */
            maos?: number | null;
            /** Nome */
            nome: string;
            /** Pilha Max */
            pilha_max?: number | null;
            /** Quantidade */
            quantidade: number;
            /**
             * Raridade
             * @description Id da raridade no catálogo de itens.
             * @default comum
             */
            raridade: string;
            /** Subtipo */
            subtipo?: ("peitoral" | "capacete" | "luvas" | "botas" | "uma_mao" | "duas_maos" | "escudo" | "mochila" | "aljava" | "moedas" | "outro") | null;
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "arma" | "armadura" | "outro";
        };
        /** ItemPrevia */
        ItemPrevia: {
            /** Dados */
            dados?: {
                [key: string]: unknown;
            };
            /** Nome */
            nome: string;
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "arma" | "armadura" | "outro";
        };
        /** ItemRecipienteResumo */
        ItemRecipienteResumo: {
            /** Altura */
            altura?: number | null;
            /** Coluna */
            coluna?: number | null;
            /**
             * Efeitos
             * @description Nomes dos efeitos que o item carrega.
             */
            efeitos?: string[];
            /**
             * Girado
             * @default false
             */
            girado: boolean;
            /**
             * Grupo
             * @description Itens largados juntos (por exemplo, com a mochila).
             */
            grupo?: string | null;
            /** Icone Grade */
            icone_grade?: string | null;
            /** Id */
            id: string;
            /** Largura */
            largura?: number | null;
            /** Linha */
            linha?: number | null;
            /** Nome */
            nome: string;
            /** Quantidade */
            quantidade: number;
            /** Subtipo */
            subtipo?: ("peitoral" | "capacete" | "luvas" | "botas" | "uma_mao" | "duas_maos" | "escudo" | "mochila" | "aljava" | "moedas" | "outro") | null;
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "arma" | "armadura" | "outro";
        };
        /** LargarItemRequest */
        LargarItemRequest: {
            /**
             * Recipiente Id
             * @description Sem recipiente, vai para o chão da cena ativa.
             */
            recipiente_id?: string | null;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** ListasFichaResumo */
        ListasFichaResumo: {
            /** Alinhamentos */
            alinhamentos: string[];
            /** Campos Personalidade */
            campos_personalidade: components["schemas"]["CampoPersonalidadeResumo"][];
            /**
             * Faixas De Altura
             * @description Faixa de altura de cada Tamanho, do menor ao maior (fora da média).
             */
            faixas_de_altura?: components["schemas"]["FaixaAlturaResumo"][];
            /**
             * Grupos Personalidade
             * @description Quadros da aba Personalidade, na ordem de exibição.
             */
            grupos_personalidade?: components["schemas"]["GrupoPersonalidadeResumo"][];
            /**
             * Icones Ficha
             * @description Ícone do Resumo por nome de atributo, perícia ou grupo, como gravado na ficha.
             */
            icones_ficha?: {
                [key: string]: string;
            };
            /**
             * Icones Personalidade
             * @description Ícone dos campos com lista própria (alinhamento e pecado).
             */
            icones_personalidade?: {
                [key: string]: string;
            };
            /** Pecados */
            pecados: components["schemas"]["PecadoResumo"][];
            /** @description Campos do topo da aba Personalidade; vazio sem arrumação no catálogo. */
            personalidade_topo?: components["schemas"]["TopoPersonalidadeResumo"] | null;
            /** Sexos */
            sexos: string[];
        };
        /** MesaDetalhe */
        MesaDetalhe: {
            /**
             * Capa Objeto
             * @description Capa no armazenamento privado da mesa; ler por /mesas/{id}/ativos com exibicao=true.
             */
            capa_objeto?: string | null;
            /** Id */
            id: string;
            /** Nome */
            nome: string;
            /**
             * Papel
             * @enum {string}
             */
            papel: "narrador" | "jogador";
            /** Participantes */
            participantes: components["schemas"]["ParticipanteResumo"][];
            /** Sinopse */
            sinopse?: string | null;
            /**
             * Sistema
             * @default cursed
             * @constant
             */
            sistema: "cursed";
        };
        /** MesaResumo */
        MesaResumo: {
            /**
             * Capa Objeto
             * @description Capa no armazenamento privado da mesa; ler por /mesas/{id}/ativos com exibicao=true.
             */
            capa_objeto?: string | null;
            /** Id */
            id: string;
            /** Nome */
            nome: string;
            /**
             * Papel
             * @enum {string}
             */
            papel: "narrador" | "jogador";
            /** Sinopse */
            sinopse?: string | null;
            /**
             * Sistema
             * @default cursed
             * @constant
             */
            sistema: "cursed";
        };
        /** MigrarCartaRequest */
        MigrarCartaRequest: {
            /** Versao Destino Id */
            versao_destino_id: string;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** MochilaFormato */
        MochilaFormato: {
            /**
             * Colunas
             * @default 0
             */
            colunas: number;
            /**
             * Linhas
             * @default 0
             */
            linhas: number;
            /** Requisito Forca */
            requisito_forca?: number | null;
        };
        /** ModificadorCatalogoResumo */
        ModificadorCatalogoResumo: {
            /** Alvo */
            alvo: string;
            /** Quando */
            quando?: string | null;
            /** Valor */
            valor: number;
        };
        /** ModificadorResumo */
        ModificadorResumo: {
            /** Alvo */
            alvo: string;
            /** Contexto */
            contexto?: string | null;
            /** Valor */
            valor: number;
        };
        /** ModulosMesa */
        ModulosMesa: {
            /**
             * Sala
             * @default false
             */
            sala: boolean;
        };
        /**
         * MoedasRequest
         * @description Um modo por pedido: `adicionar` enche as pilhas com espaço e cria novas; `retirar` tira das últimas pilhas;
         *     `bolsa` define os totais e o servidor junta tudo em pilhas; `pilhas` define cada pilha (para dividir).
         */
        MoedasRequest: {
            adicionar?: components["schemas"]["PilhaMoedas"] | null;
            bolsa?: components["schemas"]["PilhaMoedas"] | null;
            /** Pilhas */
            pilhas?: components["schemas"]["PilhaMoedas"][] | null;
            retirar?: components["schemas"]["PilhaMoedas"] | null;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** MoverTokenRequest */
        MoverTokenRequest: {
            /** Versao Esperada */
            versao_esperada: number;
            /** X */
            x: number;
            /** Y */
            y: number;
        };
        /** MudancaAuditoria */
        MudancaAuditoria: {
            /** Antes */
            antes?: unknown;
            /** Campo */
            campo: string;
            /**
             * Completo
             * @default true
             */
            completo: boolean;
            /** Depois */
            depois?: unknown;
            /** Rotulo */
            rotulo?: string | null;
        };
        /** OfertaItemResumo */
        OfertaItemResumo: {
            /** Altura */
            altura?: number | null;
            /**
             * Criado Em
             * Format: date-time
             */
            criado_em: string;
            /** De Nome */
            de_nome: string;
            /** De Personagem Id */
            de_personagem_id: string;
            /**
             * Estado
             * @enum {string}
             */
            estado: "pendente" | "aceita" | "recusada" | "cancelada";
            /** Id */
            id: string;
            /** Item Id */
            item_id: string;
            /** Item Nome */
            item_nome: string;
            /** Largura */
            largura?: number | null;
            /** Para Nome */
            para_nome: string;
            /** Para Personagem Id */
            para_personagem_id: string;
            /** Subtipo */
            subtipo?: ("peitoral" | "capacete" | "luvas" | "botas" | "uma_mao" | "duas_maos" | "escudo" | "mochila" | "aljava" | "moedas" | "outro") | null;
        };
        /** OfertaResumo */
        OfertaResumo: {
            /** Candidatas */
            candidatas: components["schemas"]["CartaVisivel"][];
            /**
             * Criado Em
             * Format: date-time
             */
            criado_em: string;
            /**
             * Destinatarios
             * @description Jogadores veem apenas os próprios personagens.
             */
            destinatarios: components["schemas"]["DestinatarioOferta"][];
            /**
             * Estado
             * @enum {string}
             */
            estado: "aberta" | "encerrada" | "cancelada";
            /** Expira Em */
            expira_em?: string | null;
            /** Expirada */
            expirada: boolean;
            /** Id */
            id: string;
            /** Max Escolhas */
            max_escolhas: number;
            /** Min Escolhas */
            min_escolhas: number;
            /** Titulo */
            titulo: string;
        };
        /** OfertarItemRequest */
        OfertarItemRequest: {
            /** Para Personagem Id */
            para_personagem_id: string;
        };
        /**
         * OrigemConsequencia
         * @description O que causou a alteração ou a consequência na ficção (carta, arma, magia, decisão do Narrador...).
         */
        OrigemConsequencia: {
            /** Id */
            id?: string | null;
            /** Nome */
            nome: string;
            /**
             * Tipo
             * @default mestre
             * @enum {string}
             */
            tipo: "sistema" | "mestre" | "arma" | "armadura" | "magia" | "habilidade" | "classe" | "outro";
        };
        /** OrigemResumo */
        OrigemResumo: {
            /** Id */
            id?: string | null;
            /**
             * Nome
             * @default
             */
            nome: string;
            /** Tipo */
            tipo: string;
        };
        /** PaginaAuditoria */
        PaginaAuditoria: {
            /** Eventos */
            eventos: components["schemas"]["EventoAuditoriaResumo"][];
            /** Proximo Cursor */
            proximo_cursor?: number | null;
        };
        /** ParticipanteResumo */
        ParticipanteResumo: {
            /** Nome */
            nome?: string | null;
            /**
             * Papel
             * @enum {string}
             */
            papel: "narrador" | "jogador";
            /**
             * Tem Foto
             * @description A foto do perfil sai em /perfis/{usuario_id}/foto.
             * @default false
             */
            tem_foto: boolean;
            /** Usuario Id */
            usuario_id: string;
        };
        /** PecadoResumo */
        PecadoResumo: {
            /** Equivalentes */
            equivalentes?: string[];
            /** Icone */
            icone: string;
            /** Nome */
            nome: string;
        };
        /** PedidoAlteracaoResumo */
        PedidoAlteracaoResumo: {
            /** Campos Alterados */
            campos_alterados: string[];
            /**
             * Estado
             * @enum {string}
             */
            estado: "pendente" | "aprovado" | "rejeitado";
            ficha_proposta: components["schemas"]["FichaContrato"];
            /** Id */
            id: string;
            /** Mesa Id */
            mesa_id: string;
            /** Personagem Id */
            personagem_id: string;
            /** Solicitante Id */
            solicitante_id: string;
            /** Versao Base */
            versao_base: number;
        };
        /** PegarItemRequest */
        PegarItemRequest: {
            /** Coluna */
            coluna?: number | null;
            /**
             * Girado
             * @default false
             */
            girado: boolean;
            /** Linha */
            linha?: number | null;
            /** Personagem Id */
            personagem_id: string;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** PerfilResposta */
        PerfilResposta: {
            /**
             * Apelido
             * @description Vazio até o primeiro acesso ser confirmado.
             */
            apelido?: string | null;
            /** Apelido Sugerido */
            apelido_sugerido: string;
            /** Confirmado */
            confirmado: boolean;
            /** Email */
            email?: string | null;
            /** Nome Exibido */
            nome_exibido: string;
            /** Provedor */
            provedor?: string | null;
            /** Tem Foto */
            tem_foto: boolean;
            /** Usuario Id */
            usuario_id: string;
        };
        /** PermissoesFicha */
        PermissoesFicha: {
            /** Campos Bloqueados */
            campos_bloqueados?: string[];
            /** Campos Exigem Aprovacao */
            campos_exigem_aprovacao?: string[];
            /** Editar */
            editar: boolean;
            /** Excluir */
            excluir: boolean;
            /**
             * Papel
             * @enum {string}
             */
            papel: "narrador" | "jogador";
            /** Transferir */
            transferir: boolean;
        };
        /** PersonagemResumo */
        PersonagemResumo: {
            /** Excluido Em */
            excluido_em?: string | null;
            /** Id */
            id: string;
            /** Mesa Id */
            mesa_id: string;
            /** Nome */
            nome: string;
            /** Proprietario Id */
            proprietario_id: string | null;
            /** Restauravel Ate */
            restauravel_ate?: string | null;
            /**
             * Retrato Objeto
             * @description Ler por /mesas/{mesa_id}/ativos com exibicao=true.
             */
            retrato_objeto?: string | null;
            revelacao?: components["schemas"]["RevelacaoContrato"] | null;
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "personagem" | "npc" | "monstro";
            /** Versao */
            versao: number;
            /**
             * Visibilidade
             * @enum {string}
             */
            visibilidade: "mesa" | "narrador";
        };
        /** PilhaMoedas */
        PilhaMoedas: {
            /**
             * Cobre
             * @default 0
             */
            cobre: number;
            /**
             * Ouro
             * @default 0
             */
            ouro: number;
            /**
             * Prata
             * @default 0
             */
            prata: number;
        };
        /** PoliticaMesaContrato */
        PoliticaMesaContrato: {
            /** Campos Bloqueados */
            campos_bloqueados?: string[];
            /** Campos Exigem Aprovacao */
            campos_exigem_aprovacao?: string[];
            /**
             * Moedas Por Pilha
             * @description Moedas (de qualquer tipo) por pilha, ou seja, por célula da grade. Ausente mantém o valor atual.
             */
            moedas_por_pilha?: number | null;
            /** Permitir Criacao Propria */
            permitir_criacao_propria: boolean;
            /** Permitir Edicao Propria */
            permitir_edicao_propria: boolean;
            /** Permitir Exclusao Propria */
            permitir_exclusao_propria: boolean;
        };
        /** PosicaoItemGrade */
        PosicaoItemGrade: {
            /** Coluna */
            coluna?: number | null;
            /**
             * Equipado
             * @default false
             */
            equipado: boolean;
            /**
             * Girado
             * @default false
             */
            girado: boolean;
            /** Item Id */
            item_id: string;
            /** Linha */
            linha?: number | null;
            /**
             * Maos
             * @description Só armas versáteis: empunhadura com uma ou duas mãos.
             */
            maos?: number | null;
        };
        /**
         * PreviaCriacaoResposta
         * @description PV, PP e Escalas de uma ficha ainda não gravada e os problemas que impediriam criá-la.
         */
        PreviaCriacaoResposta: {
            /** Problemas */
            problemas?: components["schemas"]["ProblemaValidacao"][];
            /** Valores */
            valores: components["schemas"]["ValorDerivadoResumo"][];
        };
        /** PreviaDescansoRequest */
        PreviaDescansoRequest: {
            /** Alvos */
            alvos: components["schemas"]["AlvoDescanso"][];
            /** Conforto */
            conforto?: number | null;
            /** Seguranca */
            seguranca?: number | null;
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "curto" | "longo";
        };
        /** PreviaDesgaste */
        PreviaDesgaste: {
            /** Antes */
            antes: number;
            /** Bonus Movimento */
            bonus_movimento?: number | null;
            /** Bonus Teste */
            bonus_teste?: number | null;
            /** Colapso Fisico */
            colapso_fisico: boolean;
            /**
             * Colapso Mental
             * @description Exige manifestação e Trauma novo ou intensificado.
             */
            colapso_mental: boolean;
            /** Delta Aplicado */
            delta_aplicado: number;
            /** Delta Solicitado */
            delta_solicitado: number;
            /** Depois */
            depois: number;
            /**
             * Excedente Fisico
             * @description Já estava em 15: o Narrador aplica no máximo uma consequência física.
             */
            excedente_fisico: boolean;
            faixa_antes: components["schemas"]["FaixaDesgaste"];
            faixa_depois: components["schemas"]["FaixaDesgaste"];
            /** Maximo */
            maximo: number;
            /** Mudou Faixa */
            mudou_faixa: boolean;
            /** Tipo Esforco */
            tipo_esforco?: ("fisico" | "mental") | null;
            /**
             * Trilha
             * @enum {string}
             */
            trilha: "exaustao" | "estresse";
        };
        /** PreviaDesgasteRequest */
        PreviaDesgasteRequest: {
            /** Delta */
            delta: number;
            /**
             * Trilha
             * @enum {string}
             */
            trilha: "exaustao" | "estresse";
        };
        /** PreviaEsforcoRequest */
        PreviaEsforcoRequest: {
            /**
             * Bonus Movimento
             * @description Pontos convertidos em +1 m cada (só físico).
             * @default 0
             */
            bonus_movimento: number;
            /** Pontos */
            pontos: number;
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "fisico" | "mental";
        };
        /** PreviaImportacaoCarta */
        PreviaImportacaoCarta: {
            /** Avisos */
            avisos?: string[];
            /** Rascunho */
            rascunho: {
                [key: string]: unknown;
            };
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "item" | "efeito";
            validacao: components["schemas"]["ValidacaoCarta"];
        };
        /** PreviaImportacaoRequest */
        PreviaImportacaoRequest: {
            /** Codigo */
            codigo: string;
        };
        /** PreviaImportacaoResumo */
        PreviaImportacaoResumo: {
            /** Avisos */
            avisos?: string[];
            /** Efeitos */
            efeitos: components["schemas"]["EfeitoPrevia"][];
            item?: components["schemas"]["ItemPrevia"] | null;
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "efeito" | "equipamento";
        };
        /** PreviaMigracaoCarta */
        PreviaMigracaoCarta: {
            /** Destino Numero */
            destino_numero: number;
            /** Diferencas */
            diferencas: components["schemas"]["DiferencaCarta"][];
            /** Observacao */
            observacao?: string | null;
            /** Origem Numero */
            origem_numero: number;
        };
        /** ProblemaArrumacao */
        ProblemaArrumacao: {
            /** Item Id */
            item_id?: string | null;
            /** Mensagem */
            mensagem: string;
            /** Motivo */
            motivo: string;
        };
        /** ProblemaValidacao */
        ProblemaValidacao: {
            /** Campo */
            campo: string;
            /** Mensagem */
            mensagem: string;
        };
        /** PublicarCartaRequest */
        PublicarCartaRequest: {
            /**
             * Promover Ativos
             * @default false
             */
            promover_ativos: boolean;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** RacaCatalogoResumo */
        RacaCatalogoResumo: {
            /** @description Intervalo típico de altura da raça, na média. */
            altura?: components["schemas"]["IntervaloAlturaResumo"] | null;
            /** Deslocamento */
            deslocamento?: number | null;
            /** Habilidades */
            habilidades: components["schemas"]["HabilidadeCatalogoResumo"][];
            /** Nome */
            nome: string;
            /** Tamanho */
            tamanho?: string | null;
        };
        /** RaridadeResumo */
        RaridadeResumo: {
            /** Cor */
            cor: string;
            /** Id */
            id: string;
            /** Rotulo */
            rotulo: string;
        };
        /** RecipienteResumo */
        RecipienteResumo: {
            /** Colunas */
            colunas: number;
            /** Id */
            id: string;
            /** Itens */
            itens: components["schemas"]["ItemRecipienteResumo"][];
            /** Linhas */
            linhas: number;
            /** Nome */
            nome: string;
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "chao" | "bau";
            /** Versao */
            versao: number;
        };
        /** RegistroConsequencia */
        RegistroConsequencia: {
            /** Acao */
            acao: string;
            /** Criado Em */
            criado_em?: string | null;
            /** Justificativa */
            justificativa?: string | null;
        };
        /** ResponderOfertaRequest */
        ResponderOfertaRequest: {
            /** Escolhas */
            escolhas?: string[];
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** ResultadoDescansoPersonagem */
        ResultadoDescansoPersonagem: {
            /** Altera */
            altera: boolean;
            /** Avisos */
            avisos?: string[];
            /** Foco */
            foco?: ("pv" | "pp" | "exaustao" | "estresse") | null;
            /** Nome */
            nome: string;
            /** Personagem Id */
            personagem_id: string;
            /** Recursos */
            recursos: components["schemas"]["ResultadoRecursoDescanso"][];
            /** Trilhas */
            trilhas: components["schemas"]["ResultadoTrilhaDescanso"][];
            /** Versao */
            versao: number;
        };
        /** ResultadoDescansoResumo */
        ResultadoDescansoResumo: {
            /** Conforto */
            conforto?: number | null;
            /** Permite Foco */
            permite_foco: boolean;
            /** Resultados */
            resultados: components["schemas"]["ResultadoDescansoPersonagem"][];
            /** Seguranca */
            seguranca?: number | null;
            /**
             * Tipo
             * @enum {string}
             */
            tipo: "curto" | "longo";
        };
        /** ResultadoRecursoDescanso */
        ResultadoRecursoDescanso: {
            /** Antes */
            antes?: number | null;
            /** Aplicado */
            aplicado: number;
            /** Aviso */
            aviso?: string | null;
            /** Calculado */
            calculado?: number | null;
            /** Depois */
            depois?: number | null;
            /** Maximo */
            maximo?: number | null;
            /**
             * Recurso
             * @enum {string}
             */
            recurso: "pv" | "pp";
        };
        /** ResultadoTrilhaDescanso */
        ResultadoTrilhaDescanso: {
            /** Antes */
            antes: number;
            /** Aplicado */
            aplicado: number;
            /** Calculado */
            calculado: number;
            /** Depois */
            depois: number;
            /** Faixa Antes */
            faixa_antes: string;
            /** Faixa Depois */
            faixa_depois: string;
            /**
             * Trilha
             * @enum {string}
             */
            trilha: "exaustao" | "estresse";
        };
        /**
         * RevelacaoContrato
         * @description Informações públicas de uma entidade; em entidades ocultas, nada além disso é exposto.
         */
        RevelacaoContrato: {
            /**
             * Imagem
             * @default false
             */
            imagem: boolean;
            /** Nome Publico */
            nome_publico?: string | null;
        };
        /** SalaSnapshot */
        SalaSnapshot: {
            cena?: components["schemas"]["CenaSala"] | null;
            /**
             * Cenas
             * @description Somente para o Narrador.
             */
            cenas?: components["schemas"]["CenaResumoSala"][];
            /** Modulo Ativo */
            modulo_ativo: boolean;
        };
        /** SalvarRascunhoRequest */
        SalvarRascunhoRequest: {
            /** Rascunho */
            rascunho: {
                [key: string]: unknown;
            };
            /**
             * Tipo
             * @description Troca o tipo da carta; só antes da primeira publicação.
             */
            tipo?: ("habilidade" | "magia" | "item" | "efeito") | null;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** SituacionalResumo */
        SituacionalResumo: {
            /** Contexto */
            contexto: string;
            /** Descricao */
            descricao: string;
            /** Efeito Id */
            efeito_id: string;
            /** Valor */
            valor: number;
        };
        /** TokenSala */
        TokenSala: {
            /** Camada Id */
            camada_id: string;
            /**
             * Controladores
             * @description Somente para o Narrador.
             */
            controladores?: string[] | null;
            /** Controlavel */
            controlavel: boolean;
            /** Id */
            id: string;
            /**
             * Oculto
             * @description Somente para o Narrador.
             */
            oculto?: boolean | null;
            /** Personagem Id */
            personagem_id?: string | null;
            /** Rotulo */
            rotulo: string;
            /** Tamanho */
            tamanho: number;
            /** Versao */
            versao: number;
            /**
             * Visivel Para Jogadores
             * @description Somente para o Narrador.
             */
            visivel_para_jogadores?: boolean | null;
            /** X */
            x: number;
            /** Y */
            y: number;
        };
        /** TopoPersonalidadeResumo */
        TopoPersonalidadeResumo: {
            /**
             * Citacao
             * @description Campo mostrado como citação no topo da aba.
             */
            citacao?: string | null;
            /**
             * Etiquetas
             * @description Campo de traços mostrado como etiquetas no topo da aba.
             */
            etiquetas?: string | null;
        };
        /** TransferirPersonagemRequest */
        TransferirPersonagemRequest: {
            /** Proprietario Id */
            proprietario_id?: string | null;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** TransicaoCartaRequest */
        TransicaoCartaRequest: {
            /** Motivo */
            motivo?: string | null;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** TransicaoConsequenciaRequest */
        TransicaoConsequenciaRequest: {
            /** Justificativa */
            justificativa: string;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** TransicaoEfeitoRequest */
        TransicaoEfeitoRequest: {
            /** Motivo */
            motivo?: string | null;
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** TratamentoResumo */
        TratamentoResumo: {
            /**
             * Estado
             * @enum {string}
             */
            estado: "ativo" | "mitigado" | "em_tratamento" | "encerrado";
            /** Objetivo */
            objetivo?: number | null;
            /**
             * Progresso
             * @default 0
             */
            progresso: number;
            /**
             * Regra
             * @default
             */
            regra: string;
        };
        /**
         * TrilhaDesgaste
         * @description Exaustão ou Estresse com a faixa atual e o próximo limiar, conforme as regras do domínio.
         */
        TrilhaDesgaste: {
            /** Atual */
            atual: number;
            faixa: components["schemas"]["FaixaDesgaste"];
            /** Maximo */
            maximo: number;
            /** Pontos Ate Proxima */
            pontos_ate_proxima?: number | null;
            proxima_faixa?: components["schemas"]["FaixaDesgaste"] | null;
            /**
             * Recurso
             * @enum {string}
             */
            recurso: "exaustao" | "estresse";
            /**
             * Registrado
             * @description Falso quando a ficha ainda não registra a trilha (valor 0 presumido).
             */
            registrado: boolean;
        };
        /** ValidacaoCarta */
        ValidacaoCarta: {
            /** Problemas */
            problemas?: components["schemas"]["ProblemaValidacao"][];
            /** Revisao Pendente */
            revisao_pendente?: string[];
            /** Valida */
            valida: boolean;
        };
        /** ValidationError */
        ValidationError: {
            /** Context */
            ctx?: Record<string, never>;
            /** Input */
            input?: unknown;
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
        };
        /** ValorDerivadoResumo */
        ValorDerivadoResumo: {
            /**
             * Calculavel
             * @default true
             */
            calculavel: boolean;
            /** Chave */
            chave: string;
            /**
             * Divergencia Legada
             * @description Valor gravado à mão numa ficha antiga, quando difere do calculado.
             */
            divergencia_legada?: number | null;
            /** Fontes */
            fontes: components["schemas"]["FonteValorResumo"][];
            /**
             * Grupo
             * @enum {string}
             */
            grupo: "atributo" | "pericia" | "status" | "recurso";
            /**
             * Motivo
             * @description Entrada que falta quando o valor não é calculável.
             */
            motivo?: string | null;
            /** Rotulo */
            rotulo: string;
            /** Situacionais */
            situacionais?: components["schemas"]["SituacionalResumo"][];
            /**
             * Total
             * @description Vazio quando o valor não é calculável.
             */
            total: number | null;
        };
        /** VersaoRequest */
        VersaoRequest: {
            /** Versao Esperada */
            versao_esperada: number;
        };
        /** VisibilidadeTokenRequest */
        VisibilidadeTokenRequest: {
            /** Camada Id */
            camada_id?: string | null;
            /** Oculto */
            oculto?: boolean | null;
            /** Versao Esperada */
            versao_esperada: number;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    listar_acervo_acervo_personagens_get: {
        parameters: {
            query: {
                colecao: "meus" | "npcs" | "monstros";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AcervoPersonagem"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    aceitar_convite_convites_aceitar_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AceitarConviteRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MesaResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    health_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthResponse"];
                };
            };
        };
    };
    listar_mesas_mesas_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MesaResumo"][];
                };
            };
        };
    };
    criar_mesa_mesas_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CriarMesaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MesaResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    detalhar_mesa_mesas__mesa_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MesaDetalhe"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    atualizar_mesa_mesas__mesa_id__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AtualizarMesaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MesaResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_apresentacoes_mesas__mesa_id__apresentacoes_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApresentacaoResumo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    apresentar_carta_mesas__mesa_id__apresentacoes_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ApresentarCartaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApresentacaoResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    recolher_carta_mesas__mesa_id__apresentacoes__apresentacao_id__recolhimento_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                apresentacao_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApresentacaoResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    marcar_apresentacao_vista_mesas__mesa_id__apresentacoes__apresentacao_id__visualizacao_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                apresentacao_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    ler_ativo_mesas__mesa_id__ativos_get: {
        parameters: {
            query: {
                caminho: string;
                exibicao?: boolean;
            };
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AtivoResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_eventos_mesas__mesa_id__auditoria_get: {
        parameters: {
            query?: {
                sessao_id?: string | null;
                ator_id?: string | null;
                personagem_id?: string | null;
                categoria?: ("mesa" | "permissao" | "personagem" | "ficha" | "inventario" | "efeito" | "carta") | null;
                relevancia?: ("mecanica" | "narrativa" | "organizacional") | null;
                antes_de?: number | null;
                limite?: number;
            };
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginaAuditoria"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    corrigir_evento_mesas__mesa_id__auditoria__evento_id__correcao_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                evento_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CorrigirEventoRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EventoAuditoriaResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_canais_mesas__mesa_id__canais_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CanalPrivado"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_catalogo_mesas__mesa_id__cartas_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CartaDefinicaoResumo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    criar_carta_mesas__mesa_id__cartas_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CriarCartaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CartaDefinicaoResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    importar_carta_mesas__mesa_id__cartas_importacoes_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ImportarCartaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CartaDefinicaoResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    previsualizar_importacao_carta_mesas__mesa_id__cartas_importacoes_previa_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ImportarCartaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PreviaImportacaoCarta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    publicar_carta_mesas__mesa_id__cartas__carta_id__publicacao_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                carta_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PublicarCartaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CartaVersaoResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    salvar_rascunho_mesas__mesa_id__cartas__carta_id__rascunho_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                carta_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SalvarRascunhoRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CartaDefinicaoResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    validar_rascunho_mesas__mesa_id__cartas__carta_id__validacao_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                carta_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ValidacaoCarta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_versoes_mesas__mesa_id__cartas__carta_id__versoes_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                carta_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CartaVersaoResumo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_classes_mesas__mesa_id__catalogos_classes_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClasseCatalogoResumo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_efeitos_default_mesas__mesa_id__catalogos_efeitos_default_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EfeitoDefaultResumo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    estado_do_catalogo_mesas__mesa_id__catalogos_estado_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EstadoCatalogoResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_catalogo_de_itens_mesas__mesa_id__catalogos_itens_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CatalogoItensResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_listas_mesas__mesa_id__catalogos_listas_ficha_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListasFichaResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_racas_mesas__mesa_id__catalogos_racas_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RacaCatalogoResumo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    criar_convite_mesas__mesa_id__convites_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CriarConviteRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConviteCriado"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    confirmar_descanso_mesas__mesa_id__descansos_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConfirmarDescansoRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResultadoDescansoResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    previsualizar_descanso_mesas__mesa_id__descansos_previa_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PreviaDescansoRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResultadoDescansoResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    criar_entidade_mesas__mesa_id__entidades_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CriarEntidadeRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PersonagemResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_entidades_publicas_mesas__mesa_id__entidades_publicas_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EntidadePublica"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    enviar_imagem_mesas__mesa_id__imagens__destino__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                destino: "retrato" | "ilustracao" | "item" | "icone-grade" | "efeito" | "carta" | "mapa" | "icone-efeito" | "capa";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_enviar_imagem_mesas__mesa_id__imagens__destino__put"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImagemResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    remover_imagem_mesas__mesa_id__imagens__destino__delete: {
        parameters: {
            query: {
                alvo: string;
                versao_esperada?: number | null;
            };
            header?: never;
            path: {
                mesa_id: string;
                destino: "retrato" | "ilustracao" | "item" | "icone-grade" | "efeito" | "carta" | "mapa" | "icone-efeito" | "capa";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImagemResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    ler_modulos_mesas__mesa_id__modulos_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ModulosMesa"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    configurar_modulos_mesas__mesa_id__modulos_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ModulosMesa"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ModulosMesa"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_ofertas_mesas__mesa_id__ofertas_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OfertaResumo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    criar_oferta_mesas__mesa_id__ofertas_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CriarOfertaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OfertaResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_ofertas_mesas__mesa_id__ofertas_item_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OfertaItemResumo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    aceitar_oferta_mesas__mesa_id__ofertas_item__oferta_id__aceitar_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                oferta_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AceitarOfertaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemInventarioResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    cancelar_oferta_mesas__mesa_id__ofertas_item__oferta_id__cancelar_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                oferta_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OfertaItemResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    recusar_oferta_mesas__mesa_id__ofertas_item__oferta_id__recusar_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                oferta_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OfertaItemResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    cancelar_oferta_mesas__mesa_id__ofertas__oferta_id__cancelamento_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                oferta_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OfertaResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    responder_oferta_mesas__mesa_id__ofertas__oferta_id__respostas__personagem_id__post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                oferta_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResponderOfertaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AquisicaoCartasResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_participantes_mesas__mesa_id__participantes_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ParticipanteResumo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    remover_participante_mesas__mesa_id__participantes__usuario_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                usuario_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_personagens_mesas__mesa_id__personagens_get: {
        parameters: {
            query?: {
                excluidos?: boolean;
            };
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PersonagemResumo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    criar_personagem_mesas__mesa_id__personagens_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CriarPersonagemRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FichaSnapshot"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    copiar_personagem_mesas__mesa_id__personagens_copias_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CopiarPersonagemRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PersonagemResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    previsualizar_personagem_mesas__mesa_id__personagens_previa_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CriarPersonagemRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PreviaCriacaoResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    excluir_personagem_mesas__mesa_id__personagens__personagem_id__delete: {
        parameters: {
            query: {
                versao_esperada: number;
            };
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_cartas_do_personagem_mesas__mesa_id__personagens__personagem_id__cartas_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CartaPersonagemResumo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    conceder_carta_mesas__mesa_id__personagens__personagem_id__cartas_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConcederCartaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AquisicaoCartasResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    migrar_carta_mesas__mesa_id__personagens__personagem_id__cartas__carta_id__migracao_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
                carta_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MigrarCartaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AquisicaoCartasResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    previsualizar_migracao_mesas__mesa_id__personagens__personagem_id__cartas__carta_id__migracao_previa_get: {
        parameters: {
            query: {
                versao_destino_id: string;
            };
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
                carta_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PreviaMigracaoCarta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    transicionar_carta_mesas__mesa_id__personagens__personagem_id__cartas__carta_id__transicoes__acao__post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
                carta_id: string;
                acao: "iniciar_aprendizado" | "interromper_aprendizado" | "concluir_aprendizado" | "remover";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TransicaoCartaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AquisicaoCartasResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_consequencias_mesas__mesa_id__personagens__personagem_id__consequencias_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConsequenciaResumo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    criar_consequencia_mesas__mesa_id__personagens__personagem_id__consequencias_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CriarConsequenciaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConsequenciaComandoResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    editar_consequencia_mesas__mesa_id__personagens__personagem_id__consequencias__consequencia_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
                consequencia_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EditarConsequenciaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConsequenciaComandoResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    transicionar_consequencia_mesas__mesa_id__personagens__personagem_id__consequencias__consequencia_id___acao__post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
                consequencia_id: string;
                acao: "intensificar" | "mitigar" | "iniciar_tratamento" | "reativar" | "encerrar" | "remover";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TransicaoConsequenciaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConsequenciaComandoResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    ler_desgaste_mesas__mesa_id__personagens__personagem_id__desgaste_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrilhaDesgaste"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    alterar_desgaste_mesas__mesa_id__personagens__personagem_id__desgaste_alteracoes_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AlterarDesgasteRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DesgasteComandoResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    encerrar_colapso_mental_mesas__mesa_id__personagens__personagem_id__desgaste_colapso_mental_encerrar_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EncerrarColapsoRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DesgasteComandoResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    registrar_esforco_mesas__mesa_id__personagens__personagem_id__desgaste_esforco_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EsforcoRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DesgasteComandoResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    previsualizar_esforco_mesas__mesa_id__personagens__personagem_id__desgaste_esforco_previa_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PreviaEsforcoRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PreviaDesgaste"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    previsualizar_alteracao_mesas__mesa_id__personagens__personagem_id__desgaste_previa_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PreviaDesgasteRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PreviaDesgaste"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_efeitos_mesas__mesa_id__personagens__personagem_id__efeitos_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EfeitoResumo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    aplicar_efeito_mesas__mesa_id__personagens__personagem_id__efeitos_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AplicarEfeitoRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EfeitoComandoResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    ajustar_efeito_mesas__mesa_id__personagens__personagem_id__efeitos__efeito_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
                efeito_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AjustarEfeitoRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EfeitoComandoResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    transicionar_efeito_mesas__mesa_id__personagens__personagem_id__efeitos__efeito_id___acao__post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
                efeito_id: string;
                acao: "suspender" | "retomar" | "encerrar";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TransicaoEfeitoRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EfeitoComandoResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    ler_ficha_mesas__mesa_id__personagens__personagem_id__ficha_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FichaSnapshot"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    gravar_ficha_mesas__mesa_id__personagens__personagem_id__ficha_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AtualizarFichaComando"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FichaSnapshot"];
                };
            };
            /** @description Accepted */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PedidoAlteracaoResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    importar_codigo_mesas__mesa_id__personagens__personagem_id__importacoes_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ImportarCodigoRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportacaoResultado"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    previsualizar_importacao_mesas__mesa_id__personagens__personagem_id__importacoes_previa_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PreviaImportacaoRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PreviaImportacaoResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_inventario_mesas__mesa_id__personagens__personagem_id__inventario_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemInventarioResumo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    gravar_arrumacao_mesas__mesa_id__personagens__personagem_id__inventario_arrumacao_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ArrumacaoGradeRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GradeInventario"];
                };
            };
            /** @description Arrumação inválida; nada foi gravado. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProblemaArrumacao"][];
                };
            };
        };
    };
    ler_grade_mesas__mesa_id__personagens__personagem_id__inventario_grade_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GradeInventario"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    largar_mochila_mesas__mesa_id__personagens__personagem_id__inventario_mochila_largar_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VersaoRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GradeInventario"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    gravar_moedas_mesas__mesa_id__personagens__personagem_id__inventario_moedas_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MoedasRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GradeInventario"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    equipar_item_mesas__mesa_id__personagens__personagem_id__inventario__item_id__equipar_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
                item_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EquiparItemRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EquiparItemResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    definir_formato_mesas__mesa_id__personagens__personagem_id__inventario__item_id__formato_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
                item_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DefinirFormatoRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EquiparItemResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    largar_item_mesas__mesa_id__personagens__personagem_id__inventario__item_id__largar_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
                item_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LargarItemRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RecipienteResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    ofertar_item_mesas__mesa_id__personagens__personagem_id__inventario__item_id__ofertas_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
                item_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OfertarItemRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OfertaItemResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    ler_permissoes_mesas__mesa_id__personagens__personagem_id__permissoes_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PermissoesFicha"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    ajustar_recurso_mesas__mesa_id__personagens__personagem_id__recursos_ajustes_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AjustarRecursoRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AjusteRecursoResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    restaurar_personagem_mesas__mesa_id__personagens__personagem_id__restauracao_post: {
        parameters: {
            query: {
                versao_esperada: number;
            };
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PersonagemResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    transferir_personagem_mesas__mesa_id__personagens__personagem_id__transferencia_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TransferirPersonagemRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PersonagemResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_valores_derivados_mesas__mesa_id__personagens__personagem_id__valores_derivados_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ValorDerivadoResumo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    alterar_visibilidade_mesas__mesa_id__personagens__personagem_id__visibilidade_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                personagem_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AlterarVisibilidadeRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PersonagemResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    ler_politicas_mesas__mesa_id__politicas_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PoliticaMesaContrato"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    configurar_politicas_mesas__mesa_id__politicas_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PoliticaMesaContrato"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PoliticaMesaContrato"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    ler_sala_mesas__mesa_id__sala_get: {
        parameters: {
            query?: {
                cena_id?: string | null;
            };
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SalaSnapshot"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    criar_cena_mesas__mesa_id__sala_cenas_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CriarCenaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SalaSnapshot"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    ativar_cena_mesas__mesa_id__sala_cenas__cena_id__ativacao_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                cena_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SalaSnapshot"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    criar_token_mesas__mesa_id__sala_cenas__cena_id__tokens_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                cena_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CriarTokenRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenSala"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_recipientes_mesas__mesa_id__sala_recipientes_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RecipienteResumo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    criar_bau_mesas__mesa_id__sala_recipientes_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CriarBauRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RecipienteResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    colocar_carta_mesas__mesa_id__sala_recipientes__recipiente_id__cartas_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                recipiente_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ColocarCartaRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RecipienteResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    pegar_item_mesas__mesa_id__sala_recipientes__recipiente_id__itens__retrato_id__pegar_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                recipiente_id: string;
                retrato_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PegarItemRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemInventarioResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    remover_token_mesas__mesa_id__sala_tokens__token_id__delete: {
        parameters: {
            query: {
                versao_esperada: number;
            };
            header?: never;
            path: {
                mesa_id: string;
                token_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    mover_token_mesas__mesa_id__sala_tokens__token_id__movimento_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                token_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MoverTokenRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenSala"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    alterar_visibilidade_mesas__mesa_id__sala_tokens__token_id__visibilidade_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                token_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VisibilidadeTokenRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenSala"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    listar_solicitacoes_mesas__mesa_id__solicitacoes_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PedidoAlteracaoResumo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    decidir_solicitacao_mesas__mesa_id__solicitacoes__pedido_id__decisao_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mesa_id: string;
                pedido_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DecidirPedidoRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PedidoAlteracaoResumo"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    ler_perfil_perfil_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PerfilResposta"];
                };
            };
        };
    };
    atualizar_perfil_perfil_put: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AtualizarPerfilRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PerfilResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    enviar_foto_perfil_foto_put: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_enviar_foto_perfil_foto_put"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImagemResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    remover_foto_perfil_foto_delete: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImagemResposta"];
                };
            };
        };
    };
    ler_foto_perfis__usuario_id__foto_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                usuario_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AtivoResposta"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
}
