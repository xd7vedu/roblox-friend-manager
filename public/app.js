let currentUser = null;
let robloxConnected = false;

// Check auth on load
async function checkAuth() {
  const response = await fetch('/auth/status');
  const data = await response.json();
  
  if (data.authenticated) {
    currentUser = data;
    showMainApp();
    loadAnnouncement();
    loadActivityLog();
  } else {
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('main-app').classList.add('hidden');
}

function showMainApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  document.getElementById('username-display').textContent = currentUser.username;
  
  if (!currentUser.isAdmin) {
    document.getElementById('admin-tab').classList.add('hidden');
  }
}

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (response.ok) {
    checkAuth();
  } else {
    alert('Login failed');
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/auth/logout', { method: 'POST' });
  checkAuth();
});

// Connect Roblox
document.getElementById('connect-btn').addEventListener('click', async () => {
  const cookie = document.getElementById('roblox-cookie').value;
  if (!cookie) return alert('Paste your cookie first');

  const response = await fetch('/api/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cookie })
  });

  if (response.ok) {
    robloxConnected = true;
    document.getElementById('scan-btn').disabled = false;
    alert('Connected!');
  } else {
    alert('Invalid cookie');
  }
});

// Scan requests
document.getElementById('scan-btn').addEventListener('click', async () => {
  const response = await fetch('/api/friend-requests');
  const requests = await response.json();

  const list = document.getElementById('requests-list');
  list.innerHTML = '';

  requests.forEach(req => {
    const card = document.createElement('div');
    card.className = 'request-card';
    card.innerHTML = `
      <div class="request-info">
        <h3>${req.name}</h3>
        <p>ID: ${req.id}</p>
        <p>Status: <span class="badge badge-${req.botScore.classification}">${req.botScore.classification.toUpperCase()}</span> (Score: ${req.botScore.score})</p>
      </div>
      <div class="request-actions">
        <button class="btn-accept" onclick="acceptRequest(${req.id})">Accept</button>
        <button class="btn-decline" onclick="declineRequest(${req.id})">Decline</button>
        <button class="btn-block" onclick="blockRequest(${req.id})">Block</button>
      </div>
    `;
    list.appendChild(card);
  });
});

async function acceptRequest(userId) {
  await fetch('/api/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  alert('Accepted!');
  document.getElementById('scan-btn').click();
}

async function declineRequest(userId) {
  await fetch('/api/decline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  alert('Declined!');
  document.getElementById('scan-btn').click();
}

async function blockRequest(userId) {
  await fetch('/api/block', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  alert('Blocked!');
  document.getElementById('scan-btn').click();
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// Theme toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
});

// Load theme from localStorage
if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light-mode');
}

// Load announcement
async function loadAnnouncement() {
  const response = await fetch('/admin/announcements');
  const data = await response.json();
  if (data.message) {
    const banner = document.getElementById('announcement');
    banner.textContent = data.message;
    banner.classList.remove('hidden');
  }
}

// Load activity log
async function loadActivityLog() {
  setInterval(async () => {
    const response = await fetch('/api/activity-log');
    const logs = await response.json();

    const logDiv = document.getElementById('activity-log');
    logDiv.innerHTML = '<table><tr><th>Action</th><th>Target</th><th>Time</th></tr>';
    logs.forEach(log => {
      logDiv.innerHTML += `<tr><td>${log.action}</td><td>${log.target_roblox_id || '-'}</td><td>${new Date(log.created_at).toLocaleString()}</td></tr>`;
    });
    logDiv.innerHTML += '</table>';
  }, 5000);
}

// Initialize
checkAuth();
