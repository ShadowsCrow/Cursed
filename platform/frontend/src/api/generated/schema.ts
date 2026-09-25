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
        /** CriarConviteRequest */
        CriarConviteRequest: {
            /**
             * Validade Dias
             * @default 7
             */
            validade_dias: number;
        };
        /** CriarMesaRequest */
        CriarMesaRequest: {
            /** Nome */
            nome: string;
        };
        /** CriarPersonagemRequest */
        CriarPersonagemRequest: {
            ficha: components["schemas"]["FichaContrato"];
        };
        /** DecidirPedidoRequest */
        DecidirPedidoRequest: {
            /** Aprovar */
            aprovar: boolean;
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
        /** ParticipanteResumo */
        ParticipanteResumo: {
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
        /** TransferirPersonagemRequest */
        TransferirPersonagemRequest: {
            /** Proprietario Id */
            proprietario_id?: string | null;
            /** Versao Esperada */
            versao_esperada: number;
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
