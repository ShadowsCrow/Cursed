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
        post?: never;
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
            estado: "ativo" | "suspenso";
            /** Fontes */
            fontes?: components["schemas"]["FonteEfeitoResumo"][];
            /** Id */
            id: string;
            /** Modificadores */
            modificadores?: components["schemas"]["ModificadorResumo"][];
            /** Nome */
            nome: string;
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
        /** ModificadorResumo */
        ModificadorResumo: {
            /** Alvo */
            alvo: string;
            /** Contexto */
            contexto?: string | null;
            /** Valor */
            valor: number;
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
