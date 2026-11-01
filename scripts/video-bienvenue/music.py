# Musique originale : D majeur, I–V–vi–IV ×2, 96 bpm, 8 mesures = 20 s. Pure numpy.
import numpy as np, wave, sys, os
SR=48000; BPM=96; BEAT=60/BPM; BAR=4*BEAT; NB=8; DUR=NB*BAR+1.5
N=int(DUR*SR); t=np.arange(N)/SR
L=np.zeros(N); R=np.zeros(N)
def hz(m): return 440*2**((m-69)/12)
def add(sig, start, pan=0.0, g=1.0):
    i=int(start*SR); j=min(N,i+len(sig)); s=sig[:j-i]*g
    L[i:j]+=s*np.sqrt((1-pan)/2); R[i:j]+=s*np.sqrt((1+pan)/2)
def env(n, a, r):
    e=np.ones(n); na=int(a*SR); nr=int(r*SR)
    if na: e[:na]=np.linspace(0,1,na)
    if nr: e[-nr:]*=np.linspace(1,0,nr)
    return e
def piano(m, d, vel=1.0):
    n=int((d+1.2)*SR); tt=np.arange(n)/SR; f=hz(m)
    s=sum(a*np.sin(2*np.pi*f*k*tt*(1+0.0004*k))*np.exp(-tt*(2.2+k*1.3)) for k,a in [(1,1),(2,.45),(3,.2),(4,.08)])
    s*=np.minimum(1,tt/0.004); return s*vel*0.22
def pad(ms, d):
    n=int(d*SR); tt=np.arange(n)/SR; s=np.zeros(n)
    for m in ms:
        for det in (-0.12,0.0,0.12):
            f=hz(m)*2**(det/12); s+=np.sin(2*np.pi*f*tt)+0.25*np.sin(2*np.pi*2*f*tt)
    s*=env(n,0.6,0.9)*(0.85+0.15*np.sin(2*np.pi*0.3*tt)); return s*0.018
def bass(m, d):
    n=int(d*SR); tt=np.arange(n)/SR; f=hz(m)
    s=np.sin(2*np.pi*f*tt)+0.3*np.sin(2*np.pi*2*f*tt); return s*env(n,0.01,0.25)*np.exp(-tt*0.6)*0.16
def kick():
    n=int(0.35*SR); tt=np.arange(n)/SR; f=48+70*np.exp(-tt*28)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*9)*0.35
rng=np.random.default_rng(7)
def shaker():
    n=int(0.08*SR); s=rng.standard_normal(n); s=np.diff(np.concatenate([[0],s]))  # passe-haut grossier
    return s*np.exp(-np.arange(n)/SR*55)*0.025
# D A Bm G — accords (MIDI)
CH=[("D",[62,66,69],50),("A",[61,64,69],45),("Bm",[62,66,71],47),("G",[62,67,71],43)]
for b in range(NB):
    name,notes,root=CH[b%4]; t0=b*BAR
    last=(b==NB-1)
    add(pad(notes+[notes[0]+12], BAR+(1.5 if last else 0.6)), t0)
    if b>=1: add(bass(root, BAR*0.95 if not last else BAR+1.2), t0)
    # arpège en croches : 1 5 3 8 ...
    arp=[notes[0],notes[2],notes[1],notes[0]+12,notes[2]+12,notes[1]+12,notes[2],notes[1]] if not last else [notes[0]+12,notes[1]+12,notes[2]+12,notes[0]+24]
    step=BEAT/2 if not last else BEAT
    for k,m in enumerate(arp):
        add(piano(m, step, 0.8 if k%2 else 1.0), t0+k*step, pan=(-0.3 if k%2 else 0.3))
    if 2<=b<NB-1:
        for q in range(4):
            if q in (0,2): add(kick(), t0+q*BEAT)
        for e in range(8): add(shaker(), t0+e*BEAT/2, pan=0.4, g=(1.0 if e%2 else 0.5))
# carillons de transition (D aigu) sur chaque coupe
for c in [float(x) for x in sys.argv[1:]]:
    add(piano(86,0.4,0.35), c, pan=0.2); add(piano(81,0.4,0.25), c+0.02, pan=-0.2)
# réverbe simple (quelques échos atténués)
for d,g in [(0.031,.25),(0.047,.2),(0.071,.15),(0.113,.1),(0.17,.07)]:
    k=int(d*SR); L[k:]+=g*R[:-k]; R[k:]+=g*L[:-k]
fade=int(1.2*SR); L[-fade:]*=np.linspace(1,0,fade); R[-fade:]*=np.linspace(1,0,fade)
m=max(np.abs(L).max(),np.abs(R).max()); L/=m/0.8; R/=m/0.8
out=(np.stack([L,R],1)*32767).astype(np.int16)
with wave.open(os.path.join(os.path.dirname(os.path.abspath(__file__)),"music.wav"),"wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print("ok", DUR)
