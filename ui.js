// Moves every API-key box into ONE sheet so keys are entered once. Same element ids -> script.js keeps working.
(function () {
  const modal = document.getElementById('keyModal');
  if (!modal) return;
  [['keyPanelBody', 'keyModalGemini'], ['transcribeKeyPanelBody', 'keyModalTranscribe']].forEach(([from, to]) => {
    const body = document.getElementById(from), host = document.getElementById(to);
    if (!body || !host) return;
    const card = body.closest('.holo-glass');
    body.classList.remove('hidden');
    host.appendChild(body);
    if (card) card.classList.add('hidden');
  });
  ['transKeyPanelBody', 'recapKeyPanelBody'].forEach(id => {
    const p = document.querySelector('#' + id + ' > p');
    if (p) p.innerHTML = 'Gemini key ကို အပေါ်က <b>API KEYS</b> ခလုတ်မှာ တစ်ခါပဲ ထည့်ရပါတယ်။';
  });
  const open = () => { modal.classList.add('open'); document.getElementById('closeKeysBtn').focus(); };
  const close = () => modal.classList.remove('open');
  document.getElementById('openKeysBtn').addEventListener('click', open);
  document.getElementById('closeKeysBtn').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  document.querySelectorAll('nav .tab-btn').forEach(b => b.setAttribute('aria-label', b.textContent.trim()));
})();
