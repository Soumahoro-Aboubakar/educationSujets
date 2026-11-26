"""Musique originale générée par programme (libre de droits) : 100 BPM, la mineur → do majeur,
nappe chaude + basse + pulsation douce + scintillement, montée finale. Sortie : public/music/bed.wav (stéréo 48 kHz)."""
import numpy as np, wave, sys
SR, BPM = 48000, 100
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 92
beat = 60 / BPM
t = np.arange(int(SR * DUR)) / SR
def n2f(n): return 440 * 2 ** ((n - 69) / 12)
# progression 2 mesures par accord : Am - F - C - G (MIDI)
prog = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]
bar = 4 * beat
L = np.zeros_like(t); R = np.zeros_like(t)
def env(x, a, r, length):
    e = np.clip(x / a, 0, 1) * np.clip((length - x) / r, 0, 1); return e
seg = 2 * bar
for k in range(int(DUR / seg) + 1):
    s0 = k * seg; ch = prog[k % 4]
    i0, i1 = int(s0 * SR), min(len(t), int((s0 + seg + 0.6) * SR))
    x = t[i0:i1] - s0
    e = env(x, 1.2, 1.4, seg + 0.6)
    for j, n in enumerate(ch):
        f = n2f(n)
        det = 1 + 0.0025 * (j - 1.5)
        v = (np.sin(2*np.pi*f*det*x) + 0.35*np.sin(2*np.pi*2*f*x + 0.3) + 0.12*np.sin(2*np.pi*3*f*det*x)) * e * 0.045
        L[i0:i1] += v * (1 - 0.15*j/3); R[i0:i1] += v * (0.85 + 0.15*j/3)
    # basse : noire pointée
    fb = n2f(ch[0] - 12)
    for b in range(8):
        bs = s0 + b * beat; bi0 = int(bs*SR); bi1 = min(len(t), int((bs+beat*0.95)*SR))
        if bi0 >= len(t): break
        xb = t[bi0:bi1] - bs; eb = np.exp(-xb*3.5) * np.clip(xb/0.01, 0, 1)
        v = (np.sin(2*np.pi*fb*xb) + 0.2*np.sin(2*np.pi*2*fb*xb)) * eb * 0.11
        L[bi0:bi1] += v; R[bi0:bi1] += v
    # arpège scintillant (croches) après l'intro
    if s0 >= 8:
        for b in range(16):
            ns = s0 + b * beat/2; ni0 = int(ns*SR); ni1 = min(len(t), int((ns+0.5)*SR))
            if ni0 >= len(t): break
            n = ch[[0,2,1,3,2,1,3,2][b % 8]] + 12; xn = t[ni0:ni1] - ns
            v = np.sin(2*np.pi*n2f(n)*xn) * np.exp(-xn*7) * 0.022
            pan = 0.5 + 0.35*np.sin(b)
            L[ni0:ni1] += v*(1-pan)*2*0.7; R[ni0:ni1] += v*pan*2*0.7
# pulsation douce (kick feutré) sur les temps, à partir de 9 s
for b in range(int(DUR / beat)):
    bs = b * beat
    if bs < 9.0: continue
    i0 = int(bs*SR); i1 = min(len(t), int((bs+0.35)*SR)); x = t[i0:i1] - bs
    f = 55 + 70*np.exp(-x*30)
    v = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-x*9) * 0.16
    L[i0:i1] += v; R[i0:i1] += v
# intensité : montée vers la fin, fondu final
mix = 0.75 + 0.25*np.clip((t - 60)/20, 0, 1)
fade = np.clip(t/1.5, 0, 1) * np.clip((DUR - t)/3.0, 0, 1)
L *= mix*fade; R *= mix*fade
# réverbération simple (échos)
for d, g in [(0.113, 0.28), (0.197, 0.2), (0.331, 0.14)]:
    k = int(d*SR); L[k:] += g*R[:-k]; R[k:] += g*L[:-k]
m = max(np.abs(L).max(), np.abs(R).max()); L /= m/0.7; R /= m/0.7
data = (np.stack([L, R], 1) * 32767).astype(np.int16)
with wave.open('public/music/bed.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
print('ok', DUR)
