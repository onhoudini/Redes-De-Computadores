"""Gera as legendas (WebVTT) a partir de roteiro.json e dos WAVs da narração.

Uso: python legendas.py PASTA_DOS_WAVS SAIDA.vtt

Cada linha recebe um tempo proporcional ao texto; as que terminam em pontuação são ajustadas à pausa mais próxima da fala.
"""
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

ATRASO = 0.4   # data-start do <audio> em apresentacao.html
pasta, saida = Path(sys.argv[1]), Path(sys.argv[2])
cenas = json.loads((Path(__file__).parent / "roteiro.json").read_text(encoding="utf-8"))["cenas"]
tempos = json.loads((pasta / "tempos.json").read_text(encoding="utf-8"))


def pausas(audio, taxa, minimo=0.08, limiar=0.012):
    """Pausas internas, como (início, fim), e o fim da fala."""
    passo = int(taxa * 0.01)
    nivel = np.array([np.sqrt(np.mean(audio[i:i + passo] ** 2)) for i in range(0, len(audio) - passo, passo)])
    falados = np.flatnonzero(nivel > limiar)
    vaos = [((a + 1) / 100, b / 100) for a, b in zip(falados, falados[1:]) if (b - a) / 100 > minimo]
    return vaos, (falados[-1] + 1) / 100


def marca(t):
    ms = round(t * 1000)
    return f"{ms // 60000:02d}:{ms // 1000 % 60:02d}.{ms % 1000:03d}"


blocos = []
for cena, tempo in zip(cenas, tempos):
    audio, taxa = sf.read(pasta / f"cena{tempo['cena']}.wav", dtype="float32")
    vaos, fim = pausas(audio, taxa)
    linhas = cena["legenda"]
    fracoes = np.cumsum([len(l) for l in linhas]) / sum(len(l) for l in linhas)
    cortes = [(0.0, 0.0)]
    for linha, f in zip(linhas[:-1], fracoes):
        alvo = f * fim
        perto = [v for v in vaos if linha[-1] in ".,:?" and abs(sum(v) / 2 - alvo) < 0.8 and v[0] > cortes[-1][1]]
        cortes.append(min(perto, key=lambda v: abs(sum(v) / 2 - alvo)) if perto else (alvo, alvo))
    cortes.append((fim, fim))
    base = ATRASO + tempo["inicio"]
    for i, linha in enumerate(linhas):
        ini, ult = base + cortes[i][1], base + cortes[i + 1][0] + (0.2 if i == len(linhas) - 1 else 0)
        blocos.append(f"{marca(ini)} --> {marca(ult)}\n{linha}")
saida.write_text("WEBVTT\n\n" + "\n\n".join(blocos) + "\n", encoding="utf-8", newline="\n")
print("\n".join(b.replace("\n", "  ") for b in blocos))
