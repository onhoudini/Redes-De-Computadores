"""Gera a narração com o Chatterbox (português do Brasil) a partir de roteiro.json: um WAV por cena e o áudio completo.

Uso: python narracao.py PASTA_DO_CODIGO PASTA_DO_MODELO VOZ.wav PASTA_DE_SAIDA

PASTA_DO_CODIGO é a do Space ResembleAI/Chatterbox-Multilingual-TTS-pt-br; VOZ.wav é a gravação que a voz imita.
Precisa do ffmpeg no PATH. Em roteiro.json, "legenda" é o texto mostrado, "fala" (opcional) é a grafia lida pela voz
e "semente" (opcional, por cena) troca a versão sorteada. Cenas já geradas (cruN.wav) são reaproveitadas: apague para refazer.
"""
import json
import random
import re
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

codigo, modelo, voz, saida = (Path(a).resolve() for a in sys.argv[1:5])
sys.path.insert(0, str(codigo))
roteiro = json.loads((Path(__file__).parent / "roteiro.json").read_text(encoding="utf-8"))
saida.mkdir(parents=True, exist_ok=True)
tts = None


def gerar(texto, semente, arquivo):
    global tts
    if tts is None:
        from chatterbox.src.chatterbox.tts import ChatterboxTTS
        tts = ChatterboxTTS.from_local(modelo, "cuda" if torch.cuda.is_available() else "cpu")
    torch.manual_seed(semente), random.seed(semente), np.random.seed(semente)
    onda = tts.generate(texto, audio_prompt_path=str(voz), exaggeration=0.5, cfg_weight=0.5, temperature=0.7, language_id="pt")
    sf.write(arquivo, onda.squeeze(0).cpu().numpy(), tts.sr, subtype="FLOAT")


def aparar(a, taxa, maximo=0.6):
    """Tira o silêncio das pontas e limita as pausas internas a "maximo" segundos."""
    passo = taxa // 100
    nivel = np.array([np.sqrt(np.mean(a[i:i + passo] ** 2)) for i in range(0, len(a) - passo, passo)])
    falados = np.flatnonzero(nivel > 0.01 * nivel.max() + 0.002)
    ini, fim = max(0, falados[0] - 6), falados[-1] + 13
    partes, p = [], ini
    for x, y in zip(falados, falados[1:]):
        if (y - x) / 100 > maximo:
            meio = int(maximo * 50)
            partes.append(a[p * passo:(x + meio) * passo])
            p = y - meio
    partes.append(a[p * passo:fim * passo])
    for parte in partes:   # evita estalos nos cortes
        n = min(len(parte), taxa // 200)
        parte[:n] *= np.linspace(0, 1, n, dtype=np.float32)
        parte[-n:] *= np.linspace(1, 0, n, dtype=np.float32)
    return np.concatenate(partes)


audios = []
for n, cena in enumerate(roteiro["cenas"], 1):
    texto, cru, t = cena.get("fala") or " ".join(cena["legenda"]), saida / f"cru{n}.wav", time.time()
    print(f"cena {n}/{len(roteiro['cenas'])}: {texto}", flush=True)
    if not cru.exists():
        gerar(texto, cena.get("semente", roteiro["semente"]), cru)
    audio, taxa = sf.read(cru, dtype="float32")
    audios.append(aparar(audio, taxa))
    print(f"cena {n} pronta: {len(audio) / taxa:.2f}s, aparada {len(audios[-1]) / taxa:.2f}s, em {time.time() - t:.0f}s", flush=True)

silencio = np.zeros(int(roteiro["pausa"] * taxa), dtype=np.float32)
bruto = saida / "bruto.wav"
sf.write(bruto, np.concatenate([p for a in audios for p in (a, silencio)]), taxa)

# O mesmo ganho para todas as cenas, até o volume pedido; o limitador segura os picos em -1 dBFS.
def volume(arquivo):
    medida = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(arquivo), "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                            capture_output=True, text=True, encoding="utf-8", check=True).stderr
    return float(re.search(r'"input_i" : "(-?[\d.]+)"', medida).group(1))


original = volume(bruto)
ganho = roteiro["loudness"] - original
nivelados, inicio, tempos = [], 0.0, []
for n, a in enumerate(audios, 1):
    cru, final = saida / f"tmp{n}.wav", saida / f"cena{n}.wav"
    sf.write(cru, a, taxa, subtype="FLOAT")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(cru), "-af",
                    f"volume={ganho:.2f}dB,alimiter=limit=0.891:attack=5:release=80:level=false:latency=true",
                    "-ar", str(taxa), "-c:a", "pcm_s16le", str(final)], check=True)
    cru.unlink()
    nivelado = sf.read(final, dtype="float32")[0]
    nivelados.append(nivelado)
    dur = len(nivelados[-1]) / taxa
    tempos.append({"cena": n, "inicio": round(inicio, 3), "fala": round(dur, 3)})
    inicio += dur + roteiro["pausa"]
completo = saida / "narracao.wav"
sf.write(completo, np.concatenate([p for a in nivelados for p in (a, silencio)]), taxa)
(saida / "tempos.json").write_text(json.dumps(tempos, indent=1), encoding="utf-8")
bruto.unlink()
pico = max(float(abs(a).max()) for a in nivelados)
print(f"total {inicio:.1f}s | volume {original:.1f} -> {volume(completo):.1f} LUFS | pico {pico:.2f}")
