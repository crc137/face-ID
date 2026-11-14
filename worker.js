const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>face-id: загрузка фото</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: #0f1115; color: #e8eaf0; padding: 24px;
  }
  .card {
    width: 100%; max-width: 560px; background: #171a21; border: 1px solid #2a2f3a;
    border-radius: 16px; padding: 28px; box-shadow: 0 10px 40px rgba(0,0,0,.4);
  }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #8b93a5; font-size: 13px; margin-bottom: 20px; }
  .drop {
    border: 2px dashed #3a4150; border-radius: 12px; padding: 32px 16px;
    text-align: center; cursor: pointer; transition: .15s; color: #8b93a5;
  }
  .drop:hover, .drop.over { border-color: #5b8cff; color: #c7d2ea; }
  .drop input { display: none; }
  .preview { margin-top: 16px; display: none; }
  .preview img {
    width: 100%; max-height: 320px; object-fit: contain;
    border-radius: 10px; background: #000; display: block;
  }
  .row { margin-top: 16px; display: flex; gap: 10px; align-items: center; }
  button {
    background: #5b8cff; color: #0b0d12; border: 0; border-radius: 10px;
    padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer;
  }
  button:disabled { opacity: .45; cursor: not-allowed; }
  .hint { font-size: 12px; color: #6b7280; }
  .status { margin-top: 14px; font-size: 14px; min-height: 20px; }
  .status.err { color: #ff7b72; }
  .status.ok  { color: #7ee787; }
  pre {
    margin-top: 14px; background: #0d0f14; border: 1px solid #2a2f3a; border-radius: 10px;
    padding: 14px; font-size: 12.5px; overflow: auto; max-height: 260px; white-space: pre-wrap;
    word-break: break-word;
  }
  .badge {display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 13px; font-weight: 700;}
  .badge.creator { background: #1f3a2a; color: #7ee787; }
  .badge.gana { background: #3a2a1f; color: #ffb86b; }
  .badge.both { background: #1f2a3a; color: #79c0ff; }
  .badge.unknown { background: #2a2a2a; color: #9aa4b2; }
</style>
</head>
<body>
<div class="card">
  <h1>face-id — распознавание</h1>
  <div class="sub">Загрузите фотографию, чтобы определить, кто на ней: creator, gana или оба.</div>

  <label class="drop" id="drop">
    <input type="file" id="file" accept="image/*">
    <div>Нажмите или перетащите сюда фото<br><small>JPG / PNG / WebP, до 8&nbsp;МБ</small></div>
  </label>

  <div class="preview" id="previewWrap"><img id="preview" alt="preview"></div>

  <div class="row">
    <button id="go" disabled>Распознать</button>
    <span class="hint" id="fname"></span>
  </div>

  <div class="status" id="status"></div>
  <div id="verdict"></div>
  <pre id="out" style="display:none"></pre>
</div>

<script>
const drop = document.getElementById('drop');
const fileInput = document.getElementById('file');
const previewWrap = document.getElementById('previewWrap');
const preview = document.getElementById('preview');
const goBtn = document.getElementById('go');
const fname = document.getElementById('fname');
const statusEl = document.getElementById('status');
const verdictEl = document.getElementById('verdict');
const outEl = document.getElementById('out');

let selected = null;

function pick(f) {
  if (!f) return;
  if (!f.type.startsWith('image/')) { setStatus('Нужен файл изображения', true); return; }
  if (f.size > 8 * 1024 * 1024) { setStatus('Файл больше 8 МБ', true); return; }
  selected = f;
  preview.src = URL.createObjectURL(f);
  previewWrap.style.display = 'block';
  fname.textContent = f.name + ' (' + (f.size / 1024).toFixed(0) + ' КБ)';
  goBtn.disabled = false;
  verdictEl.innerHTML = '';
  outEl.style.display = 'none';
  setStatus('');
}

function setStatus(msg, isErr) {
  statusEl.textContent = msg || '';
  statusEl.className = 'status' + (msg ? (isErr ? ' err' : ' ok') : '');
}

fileInput.addEventListener('change', e => pick(e.target.files[0]));
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', e => {
  e.preventDefault(); drop.classList.remove('over');
  pick(e.dataTransfer.files[0]);
});

goBtn.addEventListener('click', async () => {
  if (!selected) return;
  goBtn.disabled = true;
  setStatus('Отправка...');
  verdictEl.innerHTML = '';
  outEl.style.display = 'none';
  try {
    const res = await fetch('/infer', {method: 'POST',headers: { 'Content-Type': selected.type || 'image/jpeg' },body: selected});
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {setStatus('Ошибка: ' + (data.error || ('HTTP ' + res.status)), true);} else {
      setStatus('Готово');
      const labels = { creator: 'creator', gana: 'gana', both: 'оба', unknown: 'никто не распознан' };
      verdictEl.innerHTML = '<span class="badge ' + data.who + '">' + (labels[data.who] || data.who) + '</span>';
      outEl.textContent = JSON.stringify(data, null, 2);
      outEl.style.display = 'block';
    }
  } catch (err) {setStatus('Сетевая ошибка: ' + err.message, true);} finally {goBtn.disabled = false;}
});
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const upstream = (env.UPSTREAM_URL || 'https://api.coonlink.com/v1/gana/face-id').replace(/\/$/, '');
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {return new Response(HTML, {headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }});}

    if (request.method === 'GET' && url.pathname === '/health') {
      const r = await fetch(upstream + '/health', { cf: { cacheTtl: 0 } });
      return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'application/json' } });
    }

    if (request.method === 'POST' && (url.pathname === '/infer' || url.pathname === '/')) {
      const len = parseInt(request.headers.get('Content-Length') || '0', 10);
      if (len > 8 * 1024 * 1024) {return json({ ok: false, error: 'body required (max 8MB)' }, 400);}
      const qs = url.search;
      const r = await fetch(upstream + '/' + qs, {method: 'POST',headers: { 'Content-Type': request.headers.get('Content-Type') || 'application/octet-stream' },body: request.body});
      const body = await r.text();
      return new Response(body, { status: r.status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    return json({ ok: false, error: 'not found' }, 404);
  },
};

function json(obj, status = 200) {return new Response(JSON.stringify(obj), {status,headers: { 'Content-Type': 'application/json; charset=utf-8' }});}
