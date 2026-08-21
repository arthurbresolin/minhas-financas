"""O catálogo de temas do backend e o do app precisam ser idênticos.

Isto não é preciosismo. `sync_presets` casa preset por **nome** e **APAGA** o
que não estiver no catálogo de fábrica — em todas as contas. E o app carrega
`FALLBACK_THEMES` do próprio código pra pintar a primeira tela sem rede.

Então divergir tem dois custos, os dois silenciosos:

- **nome diferente** dos dois lados: o backend apaga o preset da conta e cria
  outro no lugar. Quem estava com aquele tema ativo perde o tema. Já aconteceu.
- **cor diferente**: o app abre com uma cor e repinta com outra quando a
  resposta do servidor chega.

O jeito certo de resolver seria gerar um lado do outro. Enquanto os dois são
escritos à mão, este teste é o que segura — ele lê o arquivo TypeScript de
verdade e compara com o dicionário Python.
"""

import json
import re
from pathlib import Path

import pytest

from app.models import FACTORY_THEMES

TOKENS_TS = Path(__file__).resolve().parents[2] / "src" / "theme" / "tokens.ts"


def _ts_objeto_para_dict(corpo: str) -> dict:
    """Converte o corpo de um objeto TypeScript literal em dict.

    Aceita só o que os presets usam: chave sem aspas, string em aspas simples,
    lista de strings e vírgula sobrando no fim. Qualquer coisa além disso faz o
    `json.loads` estourar, que é o comportamento desejado — melhor o teste
    quebrar do que comparar um catálogo lido pela metade.
    """
    texto = re.sub(r"//[^\n]*", "", corpo)  # comentários de linha
    texto = re.sub(r"(\w+)\s*:", r'"\1":', texto)  # chave sem aspas
    texto = texto.replace("'", '"')
    # As chaves entram antes de tirar a vírgula sobrando: a última do objeto só
    # é "sobrando" depois que existe um `}` depois dela.
    texto = re.sub(r",(\s*[}\]])", r"\1", "{" + texto + "}")
    return json.loads(texto)


def _catalogo_do_app() -> list[tuple[str, dict]]:
    fonte = TOKENS_TS.read_text(encoding="utf-8")

    # 1. Cada `export const X_TOKENS: ThemeTokens = { ... };`
    blocos = {
        nome: _ts_objeto_para_dict(corpo)
        for nome, corpo in re.findall(
            r"export const (\w+): ThemeTokens = \{(.*?)\n\};", fonte, re.DOTALL
        )
    }

    # 2. A ordem e os nomes de exibição vêm do `FACTORY_PRESETS`.
    lista = re.search(r"FACTORY_PRESETS: .*?= \[(.*?)\n\];", fonte, re.DOTALL)
    assert lista, "não achei FACTORY_PRESETS em tokens.ts"

    pares = re.findall(r"\{\s*name:\s*'([^']+)',\s*tokens:\s*(\w+)\s*\}", lista.group(1))
    assert pares, "não achei nenhum preset dentro de FACTORY_PRESETS"

    return [(nome, blocos[const]) for nome, const in pares]


def test_o_arquivo_do_app_foi_encontrado():
    """Se o caminho mudar, os outros testes passariam vazios sem avisar."""
    assert TOKENS_TS.is_file(), f"esperava encontrar {TOKENS_TS}"


def test_os_dois_catalogos_tem_os_mesmos_nomes_na_mesma_ordem():
    do_app = [nome for nome, _ in _catalogo_do_app()]
    do_backend = [nome for nome, _ in FACTORY_THEMES]

    # Ordem importa: o primeiro do catálogo é o tema padrão do app.
    assert do_app == do_backend


@pytest.mark.parametrize("nome", [nome for nome, _ in FACTORY_THEMES])
def test_as_cores_de_cada_pack_batem(nome: str):
    do_app = dict(_catalogo_do_app())
    do_backend = dict(FACTORY_THEMES)

    assert nome in do_app, f'o pack "{nome}" existe no backend e não no app'
    # `swatch` é lista dos dois lados; o resto é string. A comparação direta
    # pega cor trocada, campo a mais e campo a menos de uma vez só.
    assert do_app[nome] == do_backend[nome]
