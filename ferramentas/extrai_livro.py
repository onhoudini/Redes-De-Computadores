"""Extrai do livro.pdf o texto de cada seção usada pelo tutor de IA.

Gera assets/tutor/livro-capNN.txt, uma página do PDF por bloco, cada uma
marcada com [pág. N do PDF] (a mesma numeração citada nas páginas do site).

Uso, na raiz do repositório (precisa do pdftotext, do pacote poppler):
    python ferramentas/extrai_livro.py          # todos os capítulos
    python ferramentas/extrai_livro.py 3 5      # só os capítulos 3 e 5

Para um capítulo novo, acrescente a faixa de páginas em CAPITULOS.
As páginas de fronteira (onde uma seção termina e a outra começa) entram
nos dois capítulos.
"""
import pathlib
import re
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
PDF = RAIZ / "livro.pdf"
SAIDA = RAIZ / "assets" / "tutor"

# capítulo do site: (seção do livro, título, primeira página, última página do PDF)
CAPITULOS = {
    1: ("2.1", "Connecting two hosts", 9, 31),
    2: ("2.2", "Building a network", 31, 55),
    3: ("2.3", "Applications", 55, 58),
    4: ("2.4", "The transport layer", 58, 76),
    5: ("2.5", "Naming and addressing", 76, 80),
    6: ("2.6", "Sharing resources", 80, 115),
    7: ("2.7", "The reference models", 115, 119),
    8: ("2.8", "Network security", 119, 133),
}

CABECALHO = "Computer Networking : Principles, Protocols and Practice, Release 2021"
TITULO_CORRIDO = re.compile(r"^(Chapter \d+\. .+|\d+\.\d+\. .+)$")
LIGADURAS = {"ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi", "ﬄ": "ffl"}

CREDITO = (
    "Fonte: Olivier Bonaventure, Computer Networking: Principles, Protocols and Practice,\n"
    "Release 2021 (livro aberto, licença Creative Commons). Seção {secao} {titulo},\n"
    "páginas {ini} a {fim} do PDF. Texto extraído com pdftotext para o tutor do site;\n"
    "figuras e diagramas aparecem só como fragmentos de texto.\n"
)


def pagina(n):
    bruto = subprocess.run(
        ["pdftotext", "-enc", "UTF-8", "-f", str(n), "-l", str(n), str(PDF), "-"],
        capture_output=True, check=True,
    ).stdout.decode("utf-8")
    for lig, rep in LIGADURAS.items():
        bruto = bruto.replace(lig, rep)
    linhas = [l.strip() for l in bruto.replace("\f", "").splitlines()]
    # o cabeçalho às vezes vem depois do texto de uma figura, não na 1ª linha
    linhas = [l for l in linhas if l and l != CABECALHO]
    # rodapé: número da página impressa e título corrido, nas últimas linhas
    for _ in range(2):
        if linhas and (linhas[-1].isdigit() or TITULO_CORRIDO.match(linhas[-1])):
            linhas.pop()
    return "\n".join(linhas)


def extrai(cap):
    secao, titulo, ini, fim = CAPITULOS[cap]
    partes = [CREDITO.format(secao=secao, titulo=titulo, ini=ini, fim=fim)]
    for n in range(ini, fim + 1):
        partes.append(f"[pág. {n} do PDF]\n{pagina(n)}\n")
    destino = SAIDA / f"livro-cap{cap:02d}.txt"
    destino.write_text("\n".join(partes), encoding="utf-8", newline="\n")
    print(f"{destino.relative_to(RAIZ)}: {destino.stat().st_size // 1024} KB")


if __name__ == "__main__":
    SAIDA.mkdir(parents=True, exist_ok=True)
    caps = [int(a) for a in sys.argv[1:]] or sorted(CAPITULOS)
    for c in caps:
        extrai(c)
