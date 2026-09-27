(function () {
  const SFX = {
    ac: null, on: true, last: {}, vol: .8, master: null,
    ensure(){
      if (!this.ac){
        try {
          this.ac = new (window.AudioContext || window.webkitAudioContext)();
          this.master = this.ac.createGain();
          this.master.gain.value = this.vol;
          this.master.connect(this.ac.destination);
        } catch (e) {}
      }
      if (this.ac && this.ac.state === 'suspended') this.ac.resume();
    },
    setVol(v){ this.vol = v; if (this.master) this.master.gain.value = v; },
    tone(f0, f1, dur, type, vol, delay = 0){
      if (!this.ac || !this.on) return;
      const t0 = this.ac.currentTime + delay;
      const o = this.ac.createOscillator(), g = this.ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(this.master || this.ac.destination);
      o.start(t0); o.stop(t0 + dur + .02);
    },
    noise(dur, vol, cut = 1200, delay = 0){
      if (!this.ac || !this.on) return;
      const t0 = this.ac.currentTime + delay;
      const n = Math.floor(this.ac.sampleRate * dur);
      const buf = this.ac.createBuffer(1, n, this.ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ac.createBufferSource(); src.buffer = buf;
      const f = this.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut;
      const g = this.ac.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f).connect(g).connect(this.master || this.ac.destination);
      src.start(t0);
    },
    throttle(k, ms){
      const now = performance.now();
      if (this.last[k] && now - this.last[k] < ms) return false;
      this.last[k] = now; return true;
    },
    assign(skill){
      if (skill && typeof this[skill] === 'function'){
        this[skill]();
        return;
      }
      this.tone(660, 660, .05, 'square', .09);
      this.tone(990, 990, .07, 'square', .09, .05);
    },
    block(){ this.tone(250, 190, .11, 'triangle', .11); this.tone(125, 125, .07, 'square', .08, .09); },
    float(){ this.tone(420, 840, .22, 'sine', .09); this.tone(630, 1050, .18, 'triangle', .05, .05); },
    climb(){ this.tone(360, 440, .08, 'square', .07); this.tone(480, 560, .08, 'square', .07, .08); this.tone(620, 620, .1, 'triangle', .06, .16); },
    build(){ this.noise(.1, .1, 850); this.tone(300, 390, .12, 'triangle', .08, .04); },
    mine(){ if (this.throttle('mine', 110)) { this.noise(.07, .15, 420); this.tone(180, 120, .08, 'triangle', .06); } },
    bomb(){ this.tone(520, 760, .12, 'square', .1); this.tone(760, 920, .12, 'square', .1, .12); },
    err(){ this.tone(150, 90, .12, 'square', .11); },
    pop(){ this.noise(.08, .16, 900); this.tone(300, 180, .09, 'triangle', .11); },
    dig(){ if (this.throttle('dig', 110)) this.noise(.05, .11, 500); },
    bash(){ if (this.throttle('bash', 140)) this.noise(.06, .11, 700); },
    save(){ this.tone(520, 520, .07, 'square', .08); this.tone(780, 780, .09, 'square', .08, .07); this.tone(1040, 1040, .12, 'square', .08, .15); },
    splat(){ this.tone(300, 60, .25, 'sawtooth', .13); this.noise(.15, .14, 400); },
    offscreen(){ if (this.throttle('off', 250)) this.tone(420, 70, .3, 'triangle', .09); },
    boom(){ this.noise(.5, .45, 300); this.tone(120, 28, .5, 'sine', .45); },
    nuke(){ this.tone(880, 880, .09, 'square', .1); this.tone(880, 880, .09, 'square', .1, .18); this.tone(880, 440, .4, 'square', .1, .36); },
    win(){ [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, .16, 'square', .1, i * .13)); },
    lose(){ [392, 330, 262, 196].forEach((f, i) => this.tone(f, f, .2, 'triangle', .11, i * .16)); }
  };

  const TRACKS = [
    { name:'LA MARCHE DES LEMMINGS', bpm:128, len:32, leadW:'square', bassW:'triangle',
      lead:[69,72,76,72, 69,0,64,0, 65,69,72,69, 65,0,60,0, 72,76,79,76, 72,0,67,0, 71,74,79,74, 71,0,67,0],
      bass:[45,0,0,0,52,0,0,0, 41,0,0,0,48,0,0,0, 48,0,0,0,55,0,0,0, 43,0,0,0,50,0,0,0],
      dk:'x...x...x...x...', ds:'....x.......x...', dh:'x.x.x.x.x.x.x.x.' },
    { name:'MARCHE TRIBALE', bpm:96, len:32, leadW:'triangle', bassW:'sine',
      lead:[69,0,0,72, 0,0,67,0, 0,64,0,0, 67,0,0,0, 69,0,0,72, 0,0,74,0, 0,72,0,0, 64,0,0,0],
      bass:[45,0,0,45, 0,0,45,0, 45,0,0,45, 0,0,45,0, 43,0,0,43, 0,0,43,0, 45,0,0,45, 0,0,40,0],
      dk:'x..x..x...x.x...', ds:'....x..x....x...', dh:'x.x.x.x.x.x.x.x.' },
    { name:'VALSE DES PROFONDEURS', bpm:92, len:24, leadW:'sine', bassW:'triangle',
      lead:[69,72,76, 0,72,0, 65,69,72, 0,72,0, 67,71,74, 0,71,0, 68,71,76, 0,71,0],
      bass:[45,0,0,52,0,0, 41,0,0,48,0,0, 43,0,0,50,0,0, 40,0,0,47,0,0],
      dk:'x.....', ds:'......', dh:'..x.x.' },
    { name:'SPRINT CHIPTUNE', bpm:165, len:32, leadW:'square', bassW:'triangle', vl:.04,
      lead:[60,64,67,72,67,64,60,64, 55,59,62,67,62,59,55,59, 57,60,64,69,64,60,57,60, 53,57,60,65,60,57,53,57],
      bass:[36,0,36,0,43,0,43,0, 45,0,45,0,41,0,41,0, 36,0,36,0,43,0,43,0, 45,0,45,0,41,0,41,0],
      dk:'x...x...x...x...', ds:'....x.......x...', dh:'xxxxxxxxxxxxxxxx' },
    { name:'RELAIS DES NEIGES', bpm:78, len:32, leadW:'square', bassW:'triangle', vl:.04, sw:.25,
      lead:[0,0,69,72,0,0,76,0, 0,0,67,71,0,0,74,0, 0,0,65,69,0,0,72,0, 0,0,67,71,0,0,74,0],
      bass:[45,0,0,0,52,0,45,0, 43,0,0,0,50,0,43,0, 41,0,0,0,48,0,41,0, 43,0,0,0,50,0,43,0],
      dk:'x.......x.......', ds:'........x.......', dh:'x...x...x...x...' },
    { name:'GIVRE FUNK', bpm:104, len:32, leadW:'square', bassW:'triangle', vl:.035, sw:.2,
      lead:[64,0,67,0,71,0,67,0, 64,0,0,62,0,64,0,0, 64,0,67,0,71,0,74,0, 72,0,71,0,67,0,64,0],
      bass:[40,0,52,0,43,0,40,43, 0,45,0,45,48,0,45,0, 40,0,52,0,43,0,40,43, 0,45,0,45,48,0,50,0],
      dk:'x.....x...x.....', ds:'....x.......x..x', dh:'x.x.x.x.x.x.x.x.' },
    { name:'MIRAGE', bpm:88, len:32, leadW:'sawtooth', bassW:'sine', vl:.035,
      lead:[62,0,63,0,65,0,0,0, 67,0,65,0,63,0,0,0, 62,0,63,0,65,0,0,0, 69,0,67,0,65,0,63,0],
      bass:[38,0,0,0,0,0,38,0, 34,0,0,0,0,0,34,0, 36,0,0,0,0,0,36,0, 33,0,0,0,0,0,33,0],
      dk:'x...............', ds:'................', dh:'....x...x...x...' },
    { name:'CRISTAUX', bpm:144, len:64, leadW:'triangle', bassW:'triangle', vl:.045,
      lead:[57,60,64,69,72,69,64,60,57,60,64,69,72,69,64,60,
            53,57,60,65,69,65,60,57,53,57,60,65,69,65,60,57,
            55,59,62,67,71,67,62,59,55,59,62,67,71,67,62,59,
            52,55,59,64,67,64,59,55,52,55,59,64,67,64,59,55],
      bass:[45,0,0,0,45,0,0,0,45,0,0,0,45,0,0,0,
            41,0,0,0,41,0,0,0,41,0,0,0,41,0,0,0,
            43,0,0,0,43,0,0,0,43,0,0,0,43,0,0,0,
            40,0,0,0,40,0,0,0,40,0,0,0,40,0,0,0],
      dk:'x.......x.......', ds:'....x.......x...', dh:'..x...x...x...x.' },
    { name:'ERUPTION', bpm:152, len:32, leadW:'sawtooth', bassW:'sawtooth', vl:.04, vb:.06,
      lead:[64,0,67,64, 71,0,67,64, 62,0,64,62, 67,0,64,62, 64,0,67,64, 72,0,71,67, 71,67,64,62, 64,0,0,0],
      bass:[40,0,40,52, 40,0,40,52, 43,0,43,55, 43,0,43,55, 45,0,45,57, 45,0,45,57, 48,0,48,60, 47,0,47,59],
      dk:'x...x...x..xx...', ds:'....x.......x...', dh:'x.x.x.x.x.x.x.x.' },
    { name:'TANGO DES FALAISES', bpm:118, len:32, leadW:'square', vl:.045, durL:1.2,
      lead:[69,0,0,72,71,0,0,69, 74,0,0,77,74,0,0,72, 71,0,0,68,64,0,0,71, 69,0,71,72,71,0,69,0],
      bass:[45,0,52,0,45,0,52,0, 50,0,57,0,50,0,57,0, 40,0,47,0,40,0,47,0, 45,0,52,0,45,0,52,0],
      dk:'x..x..x...x..x..', ds:'....x..x....x...', dh:'................' },
    { name:'NOCTURNE', bpm:72, len:32, leadW:'sine', bassW:'triangle', vl:.05, vb:.06,
      lead:[69,0,71,72, 0,76,0,74, 71,0,68,0, 64,0,0,0, 65,0,69,72, 0,77,0,76, 72,0,71,72, 69,0,0,0],
      bass:[45,0,0,0,0,0,0,0, 40,0,0,0,0,0,0,0, 41,0,0,0,0,0,0,0, 36,0,0,0,0,0,0,0],
      dk:'x...............', ds:'................', dh:'....x.......x...' },
    { name:'FORGE', bpm:122, len:32, leadW:'square', bassW:'sawtooth', vl:.03, vb:.06,
      lead:[0,64,0,64, 0,67,0,64, 0,64,0,64, 0,62,0,64, 0,60,0,60, 0,64,0,60, 0,62,0,62, 0,65,0,62],
      bass:[40,40,0,40, 40,40,0,40, 40,40,0,40, 40,40,0,40, 36,36,0,36, 36,36,0,36, 38,38,0,38, 38,38,0,38],
      dk:'x...x...x...x...', ds:'....x.......x...', dh:'x.x.x.x.x.x.x.x.' },
    { name:"L'ASSAUT FINAL", bpm:138, len:64, leadW:'square', bassW:'triangle',
      lead:[69,72,76,72,81,0,79,0, 77,76,74,76,72,0,0,0,
            65,69,72,69,77,0,76,0, 74,72,71,74,72,0,0,0,
            67,71,74,71,79,0,78,0, 74,78,81,78,83,0,0,0,
            69,72,76,72,81,0,84,0, 81,79,76,72,69,0,0,0],
      bass:[45,0,57,0,45,57,0,0, 41,0,53,0,41,53,0,0, 43,0,55,0,43,55,0,0, 45,0,57,0,45,57,45,57,
            45,0,57,0,45,57,0,0, 41,0,53,0,41,53,0,0, 43,0,55,0,43,55,0,0, 45,0,57,0,45,57,45,57],
      dk:'x...x...x...x...', ds:'....x.......x...', dh:'x.x.x.x.x.x.x.x.' },
    { name:'BERCEUSE DES CIEUX', bpm:82, len:32, leadW:'triangle', bassW:'triangle', vl:.05,
      lead:[76,0,74,0,72,0,0,0, 69,0,72,0,76,0,0,0, 77,0,76,0,72,0,0,0, 74,0,71,0,67,0,0,0],
      bass:[48,0,0,0,55,0,0,0, 45,0,0,0,52,0,0,0, 41,0,0,0,48,0,0,0, 43,0,0,0,50,0,0,0],
      dk:'x...............', ds:'................', dh:'........x.......' },
    { name:'FÊTE DE LA TRIBU', bpm:126, len:32, leadW:'square', bassW:'triangle',
      lead:[72,76,79,76, 72,0,67,0, 69,72,77,72, 69,0,65,0, 67,71,74,71, 67,0,62,0, 72,76,79,76, 84,0,0,0],
      bass:[48,0,52,0,48,0,55,0, 41,0,45,0,41,0,48,0, 43,0,47,0,43,0,50,0, 48,0,52,0,55,0,60,0],
      dk:'x..x..x.x..x..x.', ds:'....x.......x...', dh:'x.x.x.x.x.x.x.x.' }
  ];

  const MUSIC = {
    playing: false, step: 0, nextT: 0, timer: 0, vol: .5, master: null,
    track: TRACKS[0], spb: 60 / TRACKS[0].bpm / 4,
    ensure(){
      SFX.ensure();
      if (SFX.ac && !this.master){
        this.master = SFX.ac.createGain();
        this.master.gain.value = this.vol;
        this.master.connect(SFX.ac.destination);
      }
    },
    setVol(v){ this.vol = v; if (this.master) this.master.gain.value = v; },
    setTrack(i){
      const t = TRACKS[((i % TRACKS.length) + TRACKS.length) % TRACKS.length];
      this.track = t;
      this.spb = 60 / t.bpm / 4;
      this.step = 0;
    },
    start(){
      this.ensure();
      if (!SFX.ac || this.playing) return;
      this.playing = true; this.step = 0;
      this.nextT = SFX.ac.currentTime + .1;
      this.tick();
    },
    stop(){ this.playing = false; clearTimeout(this.timer); },
    tick(){
      if (!this.playing) return;
      const ac = SFX.ac;
      if (this.nextT < ac.currentTime - .2) this.nextT = ac.currentTime + .05;
      while (this.nextT < ac.currentTime + .3){
        this.playStep(this.step, this.nextT);
        this.step = (this.step + 1) % this.track.len;
        this.nextT += this.spb;
      }
      this.timer = setTimeout(() => this.tick(), 120);
    },
    playStep(s, t){
      const tr = this.track, ac = SFX.ac, m = this.master;
      if (tr.sw && (s & 1)) t += tr.sw * this.spb;
      const midi = n => 440 * Math.pow(2, (n - 69) / 12);
      const note = (n, mul, type, v) => {
        if (!n) return;
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type; o.frequency.value = midi(n);
        const d = this.spb * mul;
        g.gain.setValueAtTime(v, t);
        g.gain.exponentialRampToValueAtTime(.001, t + d);
        o.connect(g); g.connect(m);
        o.start(t); o.stop(t + d + .02);
      };
      note(tr.lead[s], tr.durL || 1.8, tr.leadW, tr.vl || .05);
      note(tr.bass[s], tr.durB || 3.5, tr.bassW, tr.vb || .07);
      const p = s % tr.dk.length;
      if (tr.dk[p] === 'x') this.kick(t);
      if (tr.ds[p] === 'x') this.snare(t);
      if (tr.dh[p] === 'x') this.hat(t);
    },
    kick(t){
      const ac = SFX.ac, o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(40, t + .09);
      g.gain.setValueAtTime(.16, t);
      g.gain.exponentialRampToValueAtTime(.001, t + .1);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + .12);
    },
    snare(t){
      const ac = SFX.ac;
      const n0 = Math.floor(ac.sampleRate * .08);
      const buf = ac.createBuffer(1, n0, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n0; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n0);
      const src = ac.createBufferSource(); src.buffer = buf;
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
      const g = ac.createGain(); g.gain.value = .07;
      src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
      const o = ac.createOscillator(), g2 = ac.createGain();
      o.type = 'triangle'; o.frequency.value = 185;
      g2.gain.setValueAtTime(.05, t);
      g2.gain.exponentialRampToValueAtTime(.001, t + .05);
      o.connect(g2); g2.connect(this.master);
      o.start(t); o.stop(t + .06);
    },
    hat(t){
      const ac = SFX.ac;
      const n0 = Math.floor(ac.sampleRate * .03);
      const buf = ac.createBuffer(1, n0, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n0; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n0);
      const src = ac.createBufferSource(); src.buffer = buf;
      const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500;
      const g = ac.createGain(); g.gain.value = .022;
      src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
    }
  };

  window.AudioGame = { SFX, MUSIC: MUSIC, TRACKS };
})();
