"""Monta o arquivo `.shortcut` do iPhone, pronto pra importar.

Montar o Atalho à mão é onde o recurso morre: são sete telas num aparelho, com
nomes de ação que mudam conforme o idioma do sistema. Um arquivo pronto troca
tudo isso por "abrir o link e tocar em adicionar".

Um `.shortcut` é um plist. O que o torna chato de gerar não é o formato — é
como uma ação usa a saída de outra: o texto guarda um caractere invisível
(U+FFFC) no lugar da variável, e um dicionário à parte diz, por *intervalo de
caracteres*, de qual ação aquele buraco vem. Errar o índice em um caractere
quebra o Atalho inteiro, então os índices aqui são calculados, nunca escritos.

Requer "Permitir Atalhos Não Confiáveis" ligado em Ajustes → Atalhos → Avançado
(a opção só aparece depois de rodar algum atalho uma vez).
"""

import plistlib
import uuid

# O caractere que marca o buraco de uma variável dentro de um texto.
MARCADOR = "￼"


def _texto_com_variaveis(partes: list[str | tuple[str, str]]) -> dict:
    """Monta um campo de texto que costura pedaços fixos e saídas de ações.

    Cada parte é uma string literal ou um par `(uuid_da_acao, nome_da_saida)`.
    A posição de cada variável é medida enquanto o texto é montado — que é a
    única forma de os índices não saírem errados quando alguém edita a URL.
    """
    texto = ""
    anexos: dict[str, dict] = {}

    for parte in partes:
        if isinstance(parte, str):
            texto += parte
            continue
        acao_uuid, nome = parte
        anexos[f"{{{len(texto)}, 1}}"] = {
            "Type": "ActionOutput",
            "OutputUUID": acao_uuid,
            "OutputName": nome,
        }
        texto += MARCADOR

    return {
        "Value": {"string": texto, "attachmentsByRange": anexos},
        "WFSerializationType": "WFTextTokenString",
    }


def _acao(identificador: str, parametros: dict) -> dict:
    return {
        "WFWorkflowActionIdentifier": identificador,
        "WFWorkflowActionParameters": parametros,
    }


def montar_atalho(base_url: str, token: str, categorias: list[str]) -> bytes:
    """O Atalho do vídeo: valor, categoria, confirmação.

    `base_url` e `token` entram na URL já montada — o Atalho sai personalizado,
    sem nenhum campo pra preencher depois.
    """
    perguntar_valor = str(uuid.uuid4()).upper()
    escolher_categoria = str(uuid.uuid4()).upper()
    chamar_api = str(uuid.uuid4()).upper()
    ler_mensagem = str(uuid.uuid4()).upper()

    acoes = [
        # 1. O teclado numérico. `Number` é o que faz o iPhone abrir o teclado
        #    de números em vez do de letras — digitar dinheiro com teclado de
        #    letras é o tipo de atrito que faz alguém parar de usar.
        _acao(
            "is.workflow.actions.ask",
            {
                "UUID": perguntar_valor,
                "WFAskActionPrompt": "Quanto foi?",
                "WFInputType": "Number",
                "CustomOutputName": "Valor",
            },
        ),
        # 2. A lista de categorias, com os nomes reais da conta.
        _acao("is.workflow.actions.list", {"WFItems": categorias}),
        _acao(
            "is.workflow.actions.choosefromlist",
            {
                "UUID": escolher_categoria,
                "WFChooseFromListActionPrompt": "Foi com o quê?",
                "CustomOutputName": "Categoria",
            },
        ),
        # 3. A chamada. Tudo na URL: o corpo em JSON exigiria montar campos à
        #    mão, e aqui não há mão nenhuma pra isso.
        _acao(
            "is.workflow.actions.downloadurl",
            {
                "UUID": chamar_api,
                "WFHTTPMethod": "POST",
                "WFURL": _texto_com_variaveis(
                    [
                        f"{base_url}/shortcut/{token}/gasto?valor=",
                        (perguntar_valor, "Valor"),
                        "&categoria=",
                        (escolher_categoria, "Categoria"),
                    ]
                ),
            },
        ),
        # 4. A resposta é um JSON; a notificação mostra só a frase pronta.
        _acao(
            "is.workflow.actions.getvalueforkey",
            {"UUID": ler_mensagem, "WFDictionaryKey": "mensagem", "CustomOutputName": "Mensagem"},
        ),
        _acao(
            "is.workflow.actions.notification",
            {
                "WFNotificationActionTitle": "Gasto registrado 💸",
                "WFNotificationActionBody": _texto_com_variaveis([(ler_mensagem, "Mensagem")]),
                "WFNotificationActionSound": True,
            },
        ),
    ]

    workflow = {
        "WFWorkflowClientVersion": "1146.7",
        "WFWorkflowMinimumClientVersion": 900,
        "WFWorkflowMinimumClientVersionString": "900",
        "WFWorkflowHasOutputFallback": False,
        "WFWorkflowHasShortcutInputVariables": False,
        "WFWorkflowIcon": {
            # Verde, com o cifrão. Ícone é o que faz o Atalho ser achável na
            # lista depois de três meses sem abrir.
            "WFWorkflowIconStartColor": 4292093695,
            "WFWorkflowIconGlyphNumber": 59511,
        },
        "WFWorkflowImportQuestions": [],
        "WFWorkflowTypes": ["NCWidget", "WatchKit"],
        "WFWorkflowInputContentItemClasses": [],
        "WFWorkflowActions": acoes,
    }

    return plistlib.dumps(workflow, fmt=plistlib.FMT_XML)
