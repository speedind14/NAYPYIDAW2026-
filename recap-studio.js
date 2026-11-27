// Movie Recap Studio — replaces the AI Recap tab. Reuses script.js: Gemini transcribe, translate and TTS.
// Flow: Import -> Transcribe -> Translate -> Voice Over -> Render (canvas + MediaRecorder, real-time, in the browser).
(function () {
  const root = document.getElementById('recapView');
  if (!root || typeof synthesizeChunk !== 'function') return;
  const old = root.querySelector('main'); if (old) old.style.display = 'none';
  const el = document.createElement('main'); el.className = 'rs';
  const opt = (v, t) => `<option value="${v}">${t}</option>`;
  el.innerHTML = `
  <div class="rs-steps"><span data-s="1">1 Import</span><span data-s="2">2 Transcribe</span><span data-s="3">3 Translate</span><span data-s="4">4 Voice Over</span><span data-s="5">5 Render</span></div>
  <section class="rs-card holo-glass"><h3>1 · Video Import</h3>
    <input id="rsFile" class="rs-in" type="file" accept="video/*,audio/*"><video id="rsInV" controls playsinline hidden></video><div id="rsInfo" class="rs-note">ဗီဒီယို ရွေးပါ (MP4 / MOV / MKV)</div></section>
  <section class="rs-card holo-glass"><h3>2 · Transcription</h3>
    <button id="rsTr" class="rs-btn">စာထုတ်မည် (Gemini)</button></section>
  <section class="rs-card holo-glass"><h3>3 · Translation</h3>
    <label>Target language<select id="rsLang" class="rs-in">${opt('Myanmar (Burmese)', 'Myanmar')}${opt('Thai', 'Thai')}${opt('English', 'English')}</select></label>
    <button id="rsTl" class="rs-btn">ဘာသာပြန်မည်</button>
    <div id="rsSegs" class="rs-segs"></div></section>
  <section class="rs-card holo-glass"><h3>4 · Voice Over</h3>
    <label>Voice<select id="rsVoice" class="rs-in"></select></label>
    <div class="rs-row"><label>Speed <b id="rsSpeedV">1.10x</b><input id="rsSpeed" type="range" min="0.9" max="1.4" step="0.05" value="1.1"></label>
    <label>စာကြောင်းကြား နားချိန်<select id="rsPause" class="rs-in">${opt('1', 'ထည့်မည်')}${opt('0', 'မထည့်')}</select></label></div>
    <button id="rsVo" class="rs-btn">အသံထုတ်မည်</button>
    <audio id="rsAudio" controls hidden></audio><div id="rsVoLinks" class="rs-links"></div></section>
  <section class="rs-card holo-glass"><h3>5 · Render</h3>
    <h4 class="rs-h4">Preview</h4>
    <div class="rs-prev"><canvas id="rsPrev" width="640" height="360"></canvas>
      <div class="rs-pc"><button id="rsPP" class="rs-ic" aria-label="Play"><i class="fa-solid fa-play"></i></button><input id="rsSeek" type="range" min="0" max="1000" value="0"><span id="rsT">0:00</span><button id="rsFS" class="rs-ic" aria-label="Fullscreen"><i class="fa-solid fa-expand"></i></button></div></div>
    <div class="rs-row"><label>Output ratio<select id="rsRatio" class="rs-in">${opt('16:9', '16:9')}${opt('9:16', '9:16')}${opt('1:1', '1:1')}${opt('4:3', '4:3')}</select></label>
    <label>Fill<select id="rsFill" class="rs-in">${opt('blur', 'Blur')}${opt('black', 'Black')}${opt('crop', 'Crop')}</select></label></div>
    <div class="rs-row"><label>Zoom <b id="rsZoomV">100%</b><input id="rsZoom" type="range" min="100" max="140" step="2" value="100"></label>
    <label>Mirror<select id="rsMirror" class="rs-in">${opt('0', 'Off')}${opt('1', 'On')}</select></label></div>
    <div class="rs-row"><label>Subtitles<select id="rsSub" class="rs-in">${opt('1', 'မီးရှို့ထည့်မည်')}${opt('0', 'မထည့်')}</select></label>
    <label>မူရင်းအသံ <b id="rsOrigV">0%</b><input id="rsOrig" type="range" min="0" max="1" step="0.05" value="0"></label></div>
    <div class="rs-row"><label>Quality<select id="rsQ" class="rs-in">${opt('720', '720p (မြန်)')}${opt('1080', '1080p (ပိုကြည် / ကြာ)')}</select></label>
    <label>Overlay text<input id="rsText" class="rs-in" type="text" placeholder="e.g. Channel name"></label></div>
    <div class="rs-row"><label>Music<input id="rsMusic" class="rs-in" type="file" accept="audio/*"></label>
    <label>Music volume <b id="rsMusicV">15%</b><input id="rsMusicVol" type="range" min="0" max="0.6" step="0.05" value="0.15"></label></div>
    <button id="rsRender" class="rs-btn">Start render</button><button id="rsStopR" class="rs-btn" hidden>Stop</button>
    <div class="rs-note">ဗီဒီယိုကို အသံအလိုက် အမြန်/အနှေး ညှိပြီး ထုတ်မှာမို့ ထွက်တဲ့အရှည်က အသံအရှည်အတိုင်း ဖြစ်ပါမယ်။ Render ပြီးတဲ့အထိ ဒီစာမျက်နှာကို ဖွင့်ထားပါ။</div>
    <h4 class="rs-h4">Output</h4><div id="rsOut"><div class="rs-note">Render ပြီးရင် ရလဒ်ဗီဒီယို ဒီမှာ ပေါ်မယ်။</div></div></section>
  <div class="rs-bar"><i id="rsBar"></i></div>
  <div id="rsLog" class="rs-log">အဆင့် ၁ ကစပြီး လုပ်ပါ။ Gemini key ကို API KEYS မှာ ထည့်ထားရပါမယ်။</div>`;
  root.appendChild(el);
  const $ = s => el.querySelector(s);
  const st = { file: null, dur: 0, subs: [], mixed: null, cues: [], plan: [], stop: false, url: '' };
  const log = m => { const b = $('#rsLog'); b.textContent += '\n' + m; b.scrollTop = b.scrollHeight; };
  const bar = p => { $('#rsBar').style.width = Math.round(p * 100) + '%'; };
  const mark = n => { for (let i = 1; i <= n; i++) $('[data-s="' + i + '"]').classList.add('on'); };
  const need = () => { if (getKeys().length) return true; log('⚠ Gemini key မရှိပါ — အပေါ်က API KEYS မှာ ထည့်ပါ'); return false; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const run = (id, fn) => $(id).addEventListener('click', async e => {
    const b = e.currentTarget; b.disabled = true; st.stop = false;
    try { await fn(); } catch (err) { log('✗ ' + ((err && err.message) || err)); } finally { b.disabled = false; }
  });
  VOICES.forEach(v => $('#rsVoice').insertAdjacentHTML('beforeend', opt(v.id, v.name)));
  [['#rsSpeed', '#rsSpeedV', v => (+v).toFixed(2) + 'x'], ['#rsZoom', '#rsZoomV', v => v + '%'],
   ['#rsOrig', '#rsOrigV', v => Math.round(v * 100) + '%'], ['#rsMusicVol', '#rsMusicV', v => Math.round(v * 100) + '%']]
    .forEach(([i, o, f]) => $(i).addEventListener('input', () => { $(o).textContent = f($(i).value); }));

  function renderSegs() {
    const box = $('#rsSegs'); box.innerHTML = '';
    st.subs.forEach((s, i) => {
      const d = document.createElement('div'); d.className = 'rs-seg';
      const t = srtCueTimes(s);
      d.innerHTML = `<small>#${i + 1} · ${t ? formatSrtTimestamp(t.start) : ''}</small><div></div>`;
      d.lastChild.textContent = (s.textLines || []).join(' ');
      if (s.translatedText !== undefined) {
        const ta = document.createElement('textarea'); ta.className = 'rs-in'; ta.value = s.translatedText;
        ta.addEventListener('input', () => { s.translatedText = ta.value; }); d.appendChild(ta);
      }
      box.appendChild(d);
    });
  }

  // Live preview of the render settings: plays the source muted with ratio/zoom/mirror/fill/text/subtitles applied.
  const pv = document.createElement('video'); pv.playsInline = true; pv.muted = true; pv.preload = 'auto';
  const pc = $('#rsPrev'), pg = pc.getContext('2d'); let praf = 0, seeking = false;
  const fmtT = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  function drawPrev() {
    if (!pv.videoWidth) return;
    const [rw, rh] = $('#rsRatio').value.split(':').map(Number), L = 640;
    const W = (rw >= rh ? L : Math.round(L * rw / rh)) & ~1, H = (rw >= rh ? Math.round(L * rh / rw) : L) & ~1;
    if (pc.width !== W || pc.height !== H) { pc.width = W; pc.height = H; }
    const t = pv.currentTime, k = $('#rsSub').value === '1' ? st.plan.findIndex(x => t >= x.va && t < x.vb) : -1;
    paint(pg, W, H, pv, { fill: $('#rsFill').value, zoom: +$('#rsZoom').value / 100, mirror: $('#rsMirror').value === '1', label: $('#rsText').value.trim(), text: k >= 0 ? st.cues[k].text : '' });
    const d = pv.duration || 1; if (!seeking) $('#rsSeek').value = Math.round(t / d * 1000);
    $('#rsT').textContent = fmtT(t) + ' / ' + fmtT(d);
  }
  const ploop = () => { drawPrev(); praf = pv.paused ? 0 : requestAnimationFrame(ploop); };
  const ico = n => { $('#rsPP').innerHTML = '<i class="fa-solid fa-' + n + '"></i>'; };
  pv.addEventListener('loadeddata', () => { pv.currentTime = Math.min(1, (pv.duration || 1) / 10); });
  pv.addEventListener('seeked', () => { seeking = false; drawPrev(); });
  pv.addEventListener('play', () => { ico('pause'); if (!praf) ploop(); });
  pv.addEventListener('pause', () => ico('play'));
  $('#rsPP').addEventListener('click', () => { if (!pv.videoWidth) return log('⚠ ဗီဒီယို အရင်ရွေးပါ'); pv.paused ? pv.play() : pv.pause(); });
  $('#rsSeek').addEventListener('input', () => { seeking = true; pv.currentTime = $('#rsSeek').value / 1000 * (pv.duration || 0); });
  $('#rsFS').addEventListener('click', () => { if (pc.requestFullscreen) pc.requestFullscreen(); });
  ['#rsRatio', '#rsFill', '#rsZoom', '#rsMirror', '#rsSub', '#rsText'].forEach(i => { $(i).addEventListener('input', drawPrev); $(i).addEventListener('change', drawPrev); });

  $('#rsFile').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    st.file = f; st.subs = []; st.mixed = null; st.plan = []; st.cues = []; renderSegs();
    if (st.url) URL.revokeObjectURL(st.url); st.url = URL.createObjectURL(f);
    const iv = $('#rsInV'); iv.src = st.url; iv.hidden = false; pv.src = st.url; pv.load();
    const v = document.createElement('video'); v.preload = 'metadata'; v.src = URL.createObjectURL(f);
    v.onloadedmetadata = () => {
      st.dur = v.duration || 0;
      $('#rsInfo').textContent = `${f.name} · ${Math.floor(st.dur / 60)}:${String(Math.floor(st.dur % 60)).padStart(2, '0')} · ${v.videoWidth}×${v.videoHeight} · ${(f.size / 1048576).toFixed(1)} MB`;
      URL.revokeObjectURL(v.src); mark(1);
    };
  });

  run('#rsTr', async () => {
    if (!st.file) return log('⚠ ဗီဒီယို အရင်ရွေးပါ'); if (!need()) return;
    transcribeAborted = false; log('Audio decode လုပ်နေသည်...');
    const buf = await decodeMediaToAudioBuffer(st.file, log); st.dur = buf.duration;
    log('စာထုတ်နေသည်...');
    const srt = await geminiTranscribeWithWorkers(buf, 60, 3, null, 2, 120, log, true);
    st.subs = parseSrt(srt); if (!st.subs.length) throw new Error('စာ မထွက်ပါ');
    renderSegs(); mark(2); log('✓ Segments ' + st.subs.length + ' ခု');
  });

  run('#rsTl', async () => {
    if (!st.subs.length) return log('⚠ Transcription အရင်လုပ်ပါ'); if (!need()) return;
    translationAborted = false; log('ဘာသာပြန်နေသည်... (ကြာနိုင်သည်)');
    st.subs = await translateSrtWithWorkers(st.subs, 30, $('#rsLang').value, 3, 3, 60);
    renderSegs(); mark(3); log('✓ ဘာသာပြန်ပြီး — စာကို ပြင်လို့ရပါတယ်');
  });

  run('#rsVo', async () => {
    const subs = st.subs, total = subs.length;
    if (!total || subs.every(s => !(s.translatedText || '').trim())) return log('⚠ ဘာသာပြန်အရင်လုပ်ပါ'); if (!need()) return;
    ttsAborted = false;
    const voice = $('#rsVoice').value, speed = +$('#rsSpeed').value, pause = $('#rsPause').value === '1' ? 0.18 : 0.02;
    const clips = new Array(total).fill(null); let next = 0, done = 0;
    async function worker() {
      for (;;) {
        const i = next++; if (i >= total || st.stop) return;
        const t = (subs[i].translatedText || '').trim();
        for (let a = 0; t && a < 3 && !clips[i]; a++) {
          try {
            const { pcmBuffer, sampleRate } = await synthesizeChunk(t, voice);
            const i16 = new Int16Array(pcmBuffer, 0, pcmBuffer.byteLength >> 1), f = new Float32Array(i16.length);
            for (let k = 0; k < i16.length; k++) f[k] = i16[k] / 32768;
            clips[i] = { f, sr: sampleRate };
          } catch (e) { if (a === 2) log(`#${i + 1} အသံ မထွက်: ${e.message}`); }
        }
        done++; bar(done / total * 0.8);
      }
    }
    log('အသံထုတ်နေသည်...'); await Promise.all([worker(), worker(), worker()]);
    if (st.stop) return log('ရပ်လိုက်သည်');
    let cursor = 0; const place = []; st.cues = []; st.plan = [];
    subs.forEach((sub, k) => {
      const c = clips[k]; if (!c) return;
      const t = srtCueTimes(sub), len = c.f.length / c.sr / speed, start = cursor;
      const prev = st.plan.length ? st.plan[st.plan.length - 1].vb : 0, va = t ? t.start : prev, vb = t ? t.end : va + len;
      place.push({ c, start, rate: speed }); st.cues.push({ a: start, b: start + len, text: sub.translatedText.trim() });
      st.plan.push({ o: start, len, va, vb }); cursor = start + len + pause;
    });
    const SR = 24000, secs = cursor + 1;
    if (secs > 3600) log('⚠ ဗီဒီယို ၁ နာရီထက် ရှည်ရင် ဖုန်း memory မလောက်နိုင်ပါ');
    const oc = new OfflineAudioContext(1, Math.ceil(secs * SR), SR);
    place.forEach(({ c, start, rate }) => {
      const b = oc.createBuffer(1, c.f.length, c.sr); b.copyToChannel(c.f, 0);
      const s = oc.createBufferSource(); s.buffer = b; s.playbackRate.value = rate; s.connect(oc.destination); s.start(start);
    });
    st.mixed = await oc.startRendering(); bar(1);
    const ch = st.mixed.getChannelData(0), out = new Int16Array(ch.length);
    for (let k = 0; k < ch.length; k++) { const v = clamp(ch[k], -1, 1); out[k] = v < 0 ? v * 32768 : v * 32767; }
    const url = URL.createObjectURL(createWavBlob(out.buffer, SR));
    const au = $('#rsAudio'); au.src = url; au.hidden = false;
    const srtUrl = URL.createObjectURL(new Blob([rebuildSrt(subs, { preserveIndex: true })], { type: 'text/plain' }));
    $('#rsVoLinks').innerHTML = `<a class="rs-dl" download="voiceover.wav" href="${url}">WAV ဒေါင်းလုဒ်</a> <a class="rs-dl" download="translated.srt" href="${srtUrl}">SRT ဒေါင်းလုဒ်</a>`;
    mark(4); log(`✓ Voice over ပြီး (${place.length}/${total} segments) · ${Math.round(cursor)}s`);
  });

  function wrap(g, text, maxW) {
    const lines = []; let cur = ''; const mark = /[\u102B-\u103E]/;
    for (const ch of text) {
      const t = cur + ch;
      if (g.measureText(t).width > maxW && cur && !mark.test(ch)) {
        const sp = cur.lastIndexOf(' ');
        if (sp > 0) { lines.push(cur.slice(0, sp)); cur = cur.slice(sp + 1) + ch; } else { lines.push(cur); cur = ch; }
      } else cur = t;
    }
    if (cur) lines.push(cur); return lines;
  }

  function paint(g, W, H, v, o) {
    const vw = v.videoWidth, vh = v.videoHeight; if (!vw) return;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (o.fill === 'blur') { const s = Math.max(W / vw, H / vh); g.filter = `blur(${Math.round(W / 53)}px)`; g.drawImage(v, (W - vw * s) / 2, (H - vh * s) / 2, vw * s, vh * s); g.filter = 'none'; }
    const s2 = (o.fill === 'crop' ? Math.max(W / vw, H / vh) : Math.min(W / vw, H / vh)) * o.zoom, dw = vw * s2, dh = vh * s2;
    g.save(); if (o.mirror) { g.translate(W, 0); g.scale(-1, 1); } g.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh); g.restore();
    g.textAlign = 'center'; g.lineJoin = 'round';
    if (o.label) { const fs = Math.round(H * 0.03); g.font = `700 ${fs}px Padauk,'Myanmar Text',Inter,sans-serif`; g.lineWidth = fs / 5; g.strokeStyle = '#000'; g.fillStyle = '#ffd34d'; g.strokeText(o.label, W / 2, H * 0.07); g.fillText(o.label, W / 2, H * 0.07); }
    if (o.text) {
      const fs = Math.round(H * (H > W ? 0.03 : 0.042)), lh = fs * 1.35;
      g.font = `700 ${fs}px Padauk,'Myanmar Text',Inter,sans-serif`; g.lineWidth = fs / 5; g.strokeStyle = '#000'; g.fillStyle = '#fff';
      const lines = wrap(g, o.text, W * 0.9); let y = H * 0.92 - (lines.length - 1) * lh;
      lines.forEach(l => { g.strokeText(l, W / 2, y); g.fillText(l, W / 2, y); y += lh; });
    }
  }

  run('#rsRender', async () => {
    if (!st.file) return log('⚠ ဗီဒီယို မရှိပါ'); if (!st.mixed) return log('⚠ Voice Over အရင်လုပ်ပါ');
    pv.pause();
    if (typeof MediaRecorder === 'undefined') throw new Error('ဒီ browser မှာ MediaRecorder မရှိပါ (Chrome သုံးပါ)');
    const [rw, rh] = $('#rsRatio').value.split(':').map(Number);
    let W, H; const L = $('#rsQ').value === '1080' ? 1920 : 1280, BR = L === 1920 ? 8e6 : 4e6;
    if (rw >= rh) { W = L; H = Math.round(L * rh / rw); } else { H = L; W = Math.round(L * rw / rh); }
    W &= ~1; H &= ~1;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const v = document.createElement('video'); v.playsInline = true; v.preload = 'auto'; v.src = URL.createObjectURL(st.file);
    await new Promise((ok, no) => { v.onloadeddata = ok; v.onerror = () => no(new Error('ဗီဒီယို ဖွင့်မရပါ')); });
    const ac = new (window.AudioContext || window.webkitAudioContext)(); await ac.resume();
    const dest = ac.createMediaStreamDestination();
    const vs = ac.createBufferSource(); vs.buffer = st.mixed; vs.connect(dest);
    const ov = +$('#rsOrig').value;
    if (ov > 0) { const gn = ac.createGain(); gn.gain.value = ov; ac.createMediaElementSource(v).connect(gn); gn.connect(dest); } else v.muted = true;
    let ms = null; const mf = $('#rsMusic').files[0];
    if (mf) { ms = ac.createBufferSource(); ms.buffer = await ac.decodeAudioData(await mf.arrayBuffer()); ms.loop = true;
      const gn = ac.createGain(); gn.gain.value = +$('#rsMusicVol').value; ms.connect(gn); gn.connect(dest); }
    const stream = cv.captureStream(30); dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    const mime = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find(m => MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: BR } : { videoBitsPerSecond: BR });
    const parts = []; rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    const fill = $('#rsFill').value, zoom = +$('#rsZoom').value / 100, mirror = $('#rsMirror').value === '1', burn = $('#rsSub').value === '1';
    const label = $('#rsText').value.trim(), cues = st.cues, plan = st.plan, last = plan[plan.length - 1];
    const total = last ? last.o + last.len : 1; let pi = -1, t0 = 0;
    let wake = null; try { wake = await navigator.wakeLock.request('screen'); } catch (e) { /* optional */ }
    const btn = $('#rsStopR'); btn.hidden = false; let ended = false;
    const finish = () => { if (ended) return; ended = true; v.pause(); try { vs.stop(); ms && ms.stop(); } catch (e) { /* already stopped */ } rec.stop(); };
    btn.onclick = finish; v.onended = finish;
    const done = new Promise(ok => { rec.onstop = ok; });
    function frame() {
      if (ended) return;
      const ot = ac.currentTime - t0;
      while (pi + 1 < plan.length && ot >= plan[pi + 1].o) {
        const p = plan[++pi]; v.playbackRate = clamp((p.vb - p.va) / p.len, 0.5, 3);
        if (Math.abs(v.currentTime - p.va) > 0.6) v.currentTime = p.va;
      }
      if (ot > total + 0.3) return finish();
      const cu = burn ? cues.find(x => ot >= x.a && ot < x.b) : null;
      paint(g, W, H, v, { fill, zoom, mirror, label, text: cu ? cu.text : '' });
      bar(clamp(ot / total, 0, 1)); requestAnimationFrame(frame);
    }
    log('Render စတင်ပြီ — စာမျက်နှာကို မပိတ်ပါနဲ့'); rec.start(1000);
    t0 = ac.currentTime + 0.15; vs.start(t0); ms && ms.start(t0); await v.play(); frame();
    await done; if (wake) wake.release(); ac.close(); btn.hidden = true;
    const type = rec.mimeType || mime || 'video/webm', ext = type.includes('mp4') ? 'mp4' : 'webm';
    const url = URL.createObjectURL(new Blob(parts, { type }));
    $('#rsOut').innerHTML = `<video controls playsinline src="${url}"></video><a class="rs-dl" download="recap.${ext}" href="${url}">ဗီဒီယို ဒေါင်းလုဒ် (.${ext})</a>`;
    mark(5); log('✓ Render ပြီး');
  });
})();
