const API = 'https://briefly-4m9b.onrender.com'; // change to your deployed backend in production
let token = localStorage.getItem('briefly_token') || null;
const el = id => document.getElementById(id);

async function api(path, opts = {}) {
  opts.headers = opts.headers || {};
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API + path, opts);
  return res.json();
}

function showApp(me) {
  el('authCard').classList.add('hidden');
  el('appCard').classList.remove('hidden');
  el('userDisplay').textContent = me.email;
  el('subDisplay').textContent = 'Subscription: ' + (me.subscriptionActive ? 'Active' : 'None');
  el('freeUsed').textContent = (me.summaries || []).length;
  el('creditsCount').textContent = me.credits || 0;
  const past = el('pastSummaries');
  past.innerHTML = '';
  (me.summaries || []).forEach(s => {
    const d = document.createElement('div');
    d.className = 'summary';
    d.textContent = typeof s === 'string' ? s : (s.data?.summary?.substring ? s.data.summary : JSON.stringify(s));
    past.prepend(d);
  });
}

async function restore() {
  if (!token) return;
  const me = await api('/me');
  if (me.error) { token = null; localStorage.removeItem('briefly_token'); return; }
  showApp(me);
}

el('signupBtn').onclick = async () => {
  el('authError').textContent = 'Signing up...';
  const res = await fetch(API + '/signup', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ email: el('email').value, password: el('password').value })
  });
  const j = await res.json();
  if (j.error) { el('authError').textContent = j.error; return; }
  token = j.token; localStorage.setItem('briefly_token', token);
  el('authError').textContent = '';
  await restore();
};

el('loginBtn').onclick = async () => {
  el('authError').textContent = 'Logging in...';
  const res = await fetch(API + '/login', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ email: el('email').value, password: el('password').value })
  });
  const j = await res.json();
  if (j.error) { el('authError').textContent = j.error; return; }
  token = j.token; localStorage.setItem('briefly_token', token);
  el('authError').textContent = '';
  await restore();
};

el('logoutBtn').onclick = () => {
  token = null;
  localStorage.removeItem('briefly_token');
  el('authCard').classList.remove('hidden');
  el('appCard').classList.add('hidden');
};

el('summarizeBtn').onclick = async () => {
  if (!token) return alert('Please login');
  el('status').textContent = 'Processing... (may take a minute)';
  const fd = new FormData();
  const link = el('youtubeLink').value;
  const file = el('fileInput').files[0];
  if (link) fd.append('youtubeLink', link);
  if (file) fd.append('video', file);
  fd.append('mode', el('modeSelect').value || 'concise');
  const res = await fetch(API + '/summarize', {
    method:'POST',
    headers: { 'Authorization':'Bearer ' + token },
    body: fd
  });
  const j = await res.json();
  if (j.error) { el('status').textContent = 'Error: ' + j.error; return; }
  el('status').textContent = 'Done';
  el('latestSummary').textContent = JSON.stringify(j.summary, null, 2);
  await restore();
};

async function createSession(path, body) {
  if (!token) return alert('Login first');
  const res = await fetch(API + path, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + token },
    body: JSON.stringify(body)
  });
  const j = await res.json();
  if (j.url) window.location.href = j.url;
  else alert('Checkout creation failed');
}

el('subBasic').onclick = () => createSession('/create-checkout-session-sub', { price:'basic' });
el('subPro').onclick = () => createSession('/create-checkout-session-sub', { price:'pro' });
el('buy5').onclick = () => createSession('/create-checkout-session-credits', { pack:'5' });
el('buy20').onclick = () => createSession('/create-checkout-session-credits', { pack:'20' });
el('buy50').onclick = () => createSession('/create-checkout-session-credits', { pack:'50' });

restore();

