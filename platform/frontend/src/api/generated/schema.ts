export interface paths {
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
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** AceitarConviteRequest */
        AceitarConviteRequest: {
            /** Codigo */
            codigo: string;
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
            /** Nome */
            nome: string;
            /** Tokens */
            tokens: components["schemas"]["TokenSala"][];
            /** Versao */
            versao: number;
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
        /** CorrigirEventoRequest */
        CorrigirEventoRequest: {
            /** Motivo */
            motivo?: string | null;
            /** Versao Esperada */
            versao_esperada: number;
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
            /** Nome */
            nome: string;
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
        /** EfeitoComandoResposta */
        EfeitoComandoResposta: {
            efeito: components["schemas"]["EfeitoResumo"];
            /** Versao */
            versao: number;
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
            /** Ativacao */
            ativacao?: string | null;
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
            /** Id */
            id: string;
            /** Modificadores */
            modificadores?: components["schemas"]["ModificadorResumo"][];
            /** Nome */
            nome: string;
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
            ficha: components["schemas"]["FichaContrato"];
            /** Mesa Id */
            mesa_id: string;
            /** Personagem Id */
            personagem_id: string;
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
            tipo: "base" | "ajuste" | "atributo" | "pericia" | "equipamento" | "efeito";
            /** Valor */
            valor: number;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** HealthResponse */
        HealthResponse: {
            /** Status */
            status: string;
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
        /** ItemInventarioResumo */
        ItemInventarioResumo: {
            /** Cargas Atuais */
            cargas_atuais?: number | null;
            /** Cargas Maximas */
            cargas_maximas?: number | null;
            /** Dados */
            dados?: {
                [key: string]: unknown;
            };
            /**
             * Efeitos
             * @description Efeitos cuja fonte é este item.
             */
            efeitos?: string[];
            /** Equipado */
            equipado: boolean;
            /** Id */
            id: string;
            /** Nome */
            nome: string;
            /** Quantidade */
            quantidade: number;
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
        /** MesaResumo */
        MesaResumo: {
            /** Id */
            id: string;
            /** Nome */
            nome: string;
            /**
             * Papel
             * @enum {string}
             */
            papel: "narrador" | "jogador";
        };
        /** MigrarCartaRequest */
        MigrarCartaRequest: {
            /** Versao Destino Id */
            versao_destino_id: string;
            /** Versao Esperada */
            versao_esperada: number;
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
            /** Usuario Id */
            usuario_id: string;
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
        /** PoliticaMesaContrato */
        PoliticaMesaContrato: {
            /** Campos Bloqueados */
            campos_bloqueados?: string[];
            /** Campos Exigem Aprovacao */
            campos_exigem_aprovacao?: string[];
            /** Permitir Criacao Propria */
            permitir_criacao_propria: boolean;
            /** Permitir Edicao Propria */
            permitir_edicao_propria: boolean;
            /** Permitir Exclusao Propria */
            permitir_exclusao_propria: boolean;
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
        /** ProblemaValidacao */
        ProblemaValidacao: {
            /** Campo */
            campo: string;
            /** Mensagem */
            mensagem: string;
        };
        /** PublicarCartaRequest */
        PublicarCartaRequest: {
            /** Versao Esperada */
            versao_esperada: number;
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
        /** TransicaoEfeitoRequest */
        TransicaoEfeitoRequest: {
            /** Motivo */
            motivo?: string | null;
            /** Versao Esperada */
            versao_esperada: number;
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
            /** Chave */
            chave: string;
            /** Fontes */
            fontes: components["schemas"]["FonteValorResumo"][];
            /**
             * Grupo
             * @enum {string}
             */
            grupo: "atributo" | "pericia" | "status";
            /** Rotulo */
            rotulo: string;
            /** Situacionais */
            situacionais?: components["schemas"]["SituacionalResumo"][];
            /** Total */
            total: number;
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
}
