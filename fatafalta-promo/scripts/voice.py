"""Voix off par séquence (edge-tts, voix neuronale Microsoft fr-FR-RemyMultilingualNeural) + timings mot à mot.
Sortie : public/voice/sN.mp3 et src/voice-timings.json.
`text` = sous-titre affiché ; `spoken` = texte prononcé (graphie phonétique au besoin)."""
import asyncio, json, subprocess
import edge_tts

VOICE, RATE, PITCH = "fr-FR-RemyMultilingualNeural", "+4%", "-2Hz"
SCENES = [
 ("Tu prépares un concours ? Le BAC, le BEPC, le CAFOP, l'INFAS ou une grande école ? Tu passes des heures à chercher les bons sujets pour t'entraîner ?",
  "Tu prépares un concours ? Le BAC, le B.E.P.C., le Cafop, l'Infass, ou une grande école ? Tu passes des heures à chercher les bons sujets pour t'entraîner ?"),
 ("Et si tout ce dont tu avais besoin était réuni au même endroit ? Découvre Fatafalta, ta plateforme de préparation aux concours et examens en Côte d'Ivoire !", None),
 ("Tous les concours de Côte d'Ivoire, au même endroit : ENA, INPHB, ESATIC, INFJ, ENSEA, ENS, CAFOP… Plus de mille cent anciens sujets, avec les corrigés disponibles, sur ordinateur comme sur ton téléphone.",
  "Tous les concours de Côte d'Ivoire, au même endroit : Éna, I.N.P.H.B., Ésatic, I.N.F.J., ENSEA, E.N.S., Cafop… Plus de mille cent anciens sujets, avec les corrigés disponibles, sur ordinateur comme sur ton téléphone."),
 ("Mais Fatafalta, ce n'est pas seulement une bibliothèque de sujets. C'est une préparation pas à pas : chaque leçon est courte, avec sa vidéo explicative. Tu préfères lire ? Le cours complet est juste en dessous.", None),
 ("Ensuite, tu t'exerces : chaque réponse est corrigée aussitôt. Ton plan du jour te dit quoi travailler, tu suis ta progression, et tu vois ton rang parmi les candidats de ton concours.", None),
 ("Et pour te mettre dans les conditions de l'examen, passe des concours blancs chronométrés, notés sur vingt.", None),
 ("Derrière chaque concours, il y a un rêve. Un métier. Un avenir à construire. Chaque jour de préparation te rapproche de ce que tu veux devenir.", None),
 ("Ne laisse pas ta préparation au hasard. Rejoins Fatafalta : inscris-toi gratuitement sur fatafalta.com. Fatafalta : prépare aujourd'hui les réussites de demain !",
  "Ne laisse pas ta préparation au hasard. Rejoins Fatafalta : inscris-toi gratuitement sur fatafalta point com. Fatafalta : prépare aujourd'hui les réussites de demain !"),
]

async def gen(i, text, spoken):
    c = edge_tts.Communicate(spoken or text, VOICE, rate=RATE, pitch=PITCH, boundary="WordBoundary")
    words, path = [], f"public/voice/s{i+1}.mp3"
    with open(path, "wb") as f:
        async for ch in c.stream():
            if ch["type"] == "audio": f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"w": ch["text"], "start": round(ch["offset"] / 1e7, 3), "end": round((ch["offset"] + ch["duration"]) / 1e7, 3)})
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).decode())
    return {"id": i + 1, "text": text, "file": f"voice/s{i+1}.mp3", "duration": round(dur, 3), "words": words}

async def main():
    out = [await gen(i, t, s) for i, (t, s) in enumerate(SCENES)]
    json.dump(out, open("src/voice-timings.json", "w"), ensure_ascii=False, indent=1)
    for s in out: print(s["id"], s["duration"], len(s["words"]))
    print("total", round(sum(s["duration"] for s in out), 2))
asyncio.run(main())
