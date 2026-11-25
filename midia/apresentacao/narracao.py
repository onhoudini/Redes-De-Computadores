"""Gera a narração com o Kokoro a partir de roteiro.json: um WAV por cena e o áudio completo.

Uso: python narracao.py PASTA_DO_MODELO PASTA_DE_SAIDA

Precisa do ffmpeg no PATH. Em roteiro.json, "legenda" é o texto mostrado e "fala" (opcional) é a grafia fonética lida pela voz.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

modelo, saida = Path(sys.argv[1]), Path(sys.argv[2])
roteiro = json.loads((Path(__file__).parent / "roteiro.json").read_text(encoding="utf-8"))
saida.mkdir(parents=True, exist_ok=True)
kokoro = Kokoro(str(modelo / "kokoro-v1.0.onnx"), str(modelo / "voices-v1.0.bin"))

audios = []
for n, cena in enumerate(roteiro["cenas"], 1):
    texto = cena.get("fala") or " ".join(cena["legenda"])
    audio, taxa = kokoro.create(texto, voice=roteiro["voz"], speed=roteiro["velocidade"], lang="pt-br")
    audios.append(np.asarray(audio, dtype=np.float32).squeeze())
    print(n, f"{len(audios[-1]) / taxa:.2f}s", kokoro.tokenizer.phonemize(texto, "pt-br"))

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
    cru, final = saida / f"cru{n}.wav", saida / f"cena{n}.wav"
    sf.write(cru, a, taxa, subtype="FLOAT")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(cru), "-af",
                    f"volume={ganho:.2f}dB,alimiter=limit=0.891:attack=5:release=80:level=false:latency=true",
                    "-ar", str(taxa), "-c:a", "pcm_s16le", str(final)], check=True)
    cru.unlink()
    nivelados.append(sf.read(final, dtype="float32")[0])
    dur = len(nivelados[-1]) / taxa
    tempos.append({"cena": n, "inicio": round(inicio, 3), "fala": round(dur, 3)})
    inicio += dur + roteiro["pausa"]
completo = saida / "narracao.wav"
sf.write(completo, np.concatenate([p for a in nivelados for p in (a, silencio)]), taxa)
(saida / "tempos.json").write_text(json.dumps(tempos, indent=1), encoding="utf-8")
bruto.unlink()
pico = max(float(abs(a).max()) for a in nivelados)
print(f"total {inicio:.1f}s | volume {original:.1f} -> {volume(completo):.1f} LUFS | pico {pico:.2f}")
