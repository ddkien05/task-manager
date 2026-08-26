const API = '/api/tasks';

const state = { view: 'dashboard', priority: '', q: '', editingId: null };

const priorityMeta = {
  low:    { label: 'Low',    bg: '#22B07D' },
  medium: { label: 'Medium', bg: '#F5A524' },
  high:   { label: 'High',   bg: '#EF4B4B' }
};

// ---------- Sidebar navigation ----------
const pageTitles = { dashboard: 'Dashboard', tasks: 'Tasks', archive: 'Archive', settings: 'Settings' };

document.querySelectorAll('.navItem').forEach(btn => {
  btn.addEventListener('click', () => {
    state.view = btn.dataset.view;
    state.priority = '';
    applyView();
  });
});

function applyView() {
  document.querySelectorAll('.navItem').forEach(b => b.classList.toggle('active', b.dataset.view === state.view));
  document.getElementById('pageTitle').textContent = pageTitles[state.view];
  document.getElementById('statCards').parentElement.querySelector('#statCards').style.display =
    state.view === 'settings' ? 'none' : '';
  document.getElementById('prioFilters').classList.toggle('hidden', state.view !== 'tasks');
  document.getElementById('prioFilters').classList.toggle('flex', state.view === 'tasks');
  document.getElementById('openAdd').classList.toggle('hidden', state.view === 'settings' || state.view === 'archive');
  refreshPrioUI();
  loadTasks();
}

document.querySelectorAll('.prioBtn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.priority = btn.dataset.priority;
    refreshPrioUI();
    loadTasks();
  });
});
function refreshPrioUI() {
  document.querySelectorAll('.prioBtn').forEach(b => {
    const on = b.dataset.priority === state.priority;
    b.classList.toggle('bg-primary', on);
    b.classList.toggle('text-white', on);
    b.classList.toggle('border-primary', on);
  });
}

document.getElementById('searchInput').addEventListener('input', debounce(e => {
  state.q = e.target.value.trim();
  loadTasks();
}, 300));

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---------- Docker / DB health ----------
async function checkHealth() {
  const dot = document.getElementById('dockerDot');
  const label = document.getElementById('dockerStatus');
  const dotM = document.getElementById('dockerDotMobile');
  const labelM = document.getElementById('dockerStatusMobile');
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    const ok = data.db === 'connected';
    dot.className = 'w-2 h-2 rounded-full shrink-0 ' + (ok ? 'bg-low' : 'bg-high');
    label.textContent = ok ? 'Running' : 'Disconnected';
    label.className = 'text-xs font-semibold ' + (ok ? 'text-low' : 'text-high');
    dotM.className = 'w-2 h-2 rounded-full shrink-0 ' + (ok ? 'bg-low' : 'bg-high');
    labelM.textContent = ok ? 'Running' : 'Disconnected';
    labelM.className = 'text-xs font-semibold whitespace-nowrap ' + (ok ? 'text-low' : 'text-high');
  } catch {
    dot.className = 'w-2 h-2 rounded-full shrink-0 bg-high';
    label.textContent = 'Không kết nối';
    label.className = 'text-xs font-semibold text-high';
    dotM.className = 'w-2 h-2 rounded-full shrink-0 bg-high';
    labelM.textContent = 'Không kết nối';
    labelM.className = 'text-xs font-semibold whitespace-nowrap text-high';
  }
}

// ---------- Detail modal ----------
const detailBackdrop = document.getElementById('detailBackdrop');
let detailTask = null;

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}
function formatDate(iso) {
  if (!iso) return 'Không đặt';
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function openDetail(task) {
  detailTask = task;
  const meta = priorityMeta[task.priority] || priorityMeta.medium;

  document.getElementById('detailTitle').textContent = task.title;
  document.getElementById('detailDesc').textContent = task.description || 'Không có mô tả.';
  document.getElementById('detailPriority').textContent = meta.label;
  document.getElementById('detailPriority').style.background = meta.bg;
  document.getElementById('detailDue').textContent = formatDate(task.dueDate);
  document.getElementById('detailCreated').textContent = formatDateTime(task.createdAt);
  document.getElementById('detailUpdated').textContent = formatDateTime(task.updatedAt);
  document.getElementById('detailId').textContent = task._id;

  const statusEl = document.getElementById('detailStatus');
  if (task.completed) {
    statusEl.textContent = 'Hoàn thành';
    statusEl.style.background = '#D9F2E6';
    statusEl.style.color = '#22B07D';
  } else {
    statusEl.textContent = 'Đang làm';
    statusEl.style.background = '#FDEBD0';
    statusEl.style.color = '#F5A524';
  }

  detailBackdrop.classList.remove('hidden');
  detailBackdrop.classList.add('flex');
}
function closeDetail() {
  detailBackdrop.classList.add('hidden');
  detailBackdrop.classList.remove('flex');
  detailTask = null;
}
document.getElementById('closeDetail').addEventListener('click', closeDetail);
detailBackdrop.addEventListener('click', e => { if (e.target === detailBackdrop) closeDetail(); });
document.getElementById('detailEditBtn').addEventListener('click', () => {
  const task = detailTask;
  closeDetail();
  openModal(task);
});
document.getElementById('detailDeleteBtn').addEventListener('click', async () => {
  if (!detailTask) return;
  if (!confirm('Xóa công việc này?')) return;
  await fetch(`${API}/${detailTask._id}`, { method: 'DELETE' });
  closeDetail();
  loadTasks();
});

// ---------- Modal ----------
const backdrop = document.getElementById('modalBackdrop');
const form = document.getElementById('taskForm');

function openModal(task = null) {
  state.editingId = task ? task._id : null;
  document.getElementById('modalTitle').textContent = task ? 'Sửa công việc' : 'Thêm công việc';
  document.getElementById('fTitle').value = task ? task.title : '';
  document.getElementById('fDesc').value = task ? task.description : '';
  document.getElementById('fPriority').value = task ? task.priority : 'medium';
  document.getElementById('fDue').value = task && task.dueDate ? task.dueDate.substring(0, 10) : '';
  backdrop.classList.remove('hidden');
  backdrop.classList.add('flex');
  document.getElementById('fTitle').focus();
}
function closeModal() {
  backdrop.classList.add('hidden');
  backdrop.classList.remove('flex');
  form.reset();
  state.editingId = null;
}
document.getElementById('openAdd').addEventListener('click', () => openModal());
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelForm').addEventListener('click', closeModal);
backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });

form.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    title: document.getElementById('fTitle').value.trim(),
    description: document.getElementById('fDesc').value.trim(),
    priority: document.getElementById('fPriority').value,
    dueDate: document.getElementById('fDue').value || null
  };
  if (!payload.title) return;

  try {
    if (state.editingId) {
      await fetch(`${API}/${state.editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    closeModal();
    loadTasks();
  } catch (err) {
    alert('Có lỗi xảy ra: ' + err.message);
  }
});

// ---------- Data loading ----------
async function loadTasks() {
  const params = new URLSearchParams();
  if (state.view === 'tasks') params.set('status', 'todo');
  if (state.view === 'archive') params.set('status', 'done');
  if (state.priority) params.set('priority', state.priority);
  if (state.q) params.set('q', state.q);

  try {
    const res = await fetch(`${API}?${params.toString()}`);
    const tasks = await res.json();
    renderTasks(tasks);
  } catch (err) {
    console.error('Lỗi tải công việc:', err);
  }
  loadStats();
}

async function loadStats() {
  if (state.view === 'settings') return;
  try {
    const res = await fetch(`${API}/stats`);
    const s = await res.json();
    renderStatCards(s);
  } catch (err) {
    console.error('Lỗi tải thống kê:', err);
  }
}

function renderStatCards(s) {
  const total = s.total || 0;
  const doingPct = total ? Math.round((s.todo / total) * 100) : 0;
  const donePct = total ? Math.round((s.done / total) * 100) : 0;

  const cards = [
    { label: 'Total Tasks', value: total, pct: 100, color: '#2F6FED', track: '#DCE7FB',
      icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>' },
    { label: 'Doing', value: s.todo, pct: doingPct, color: '#F5A524', track: '#FDEBD0',
      icon: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>' },
    { label: 'Done', value: s.done, pct: donePct, color: '#22B07D', track: '#D9F2E6',
      icon: '<path d="M20 6L9 17l-5-5"/>' }
  ];

  document.getElementById('statCards').innerHTML = cards.map(c => `
    <div class="bg-white border border-line rounded-xl p-4">
      <div class="flex items-center gap-2.5 mb-2">
        <span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style="background:${c.color}1A">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${c.color}" stroke-width="2.2">${c.icon}</svg>
        </span>
        <span class="text-xs font-medium text-muted">${c.label}</span>
        <span class="ml-auto text-[11px] font-semibold" style="color:${c.color}">${c.pct}%</span>
      </div>
      <p class="text-2xl font-semibold mb-2">${c.value}</p>
      <div class="h-1.5 rounded-full" style="background:${c.track}">
        <div class="progress-bar h-1.5 rounded-full" style="width:${c.pct}%; background:${c.color}"></div>
      </div>
    </div>
  `).join('');
}

// ---------- Rendering task rows ----------
function renderTasks(tasks) {
  const list = document.getElementById('taskList');
  const empty = document.getElementById('emptyState');
  list.innerHTML = '';

  if (!tasks.length) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tasks.forEach(task => list.appendChild(renderRow(task)));
}

function renderRow(task) {
  const meta = priorityMeta[task.priority] || priorityMeta.medium;
  const row = document.createElement('div');
  row.className = 'flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 py-3 fade-in cursor-pointer hover:bg-canvas/60 rounded-lg px-1 -mx-1 transition-colors';

  row.innerHTML = `
    <button class="toggleBtn w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors"
      style="border-color:${task.completed ? '#22B07D' : '#C7D3E6'}; ${task.completed ? 'background:#22B07D' : ''}">
      ${task.completed ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
    </button>
    <div class="flex-1 min-w-[140px]">
      <p class="text-sm font-medium truncate ${task.completed ? 'line-through text-muted' : ''}">${escapeHtml(task.title)}</p>
      ${task.description ? `<p class="text-xs text-muted truncate">${escapeHtml(task.description)}</p>` : ''}
    </div>
    <div class="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
      <span class="text-[11px] font-semibold text-white px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap" style="background:${meta.bg}">${meta.label}</span>
      <button class="editBtn text-muted hover:text-primary p-1.5">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
      </button>
      <button class="deleteBtn text-muted hover:text-high p-1.5">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
      </button>
    </div>
  `;

  row.querySelector('.toggleBtn').addEventListener('click', e => { e.stopPropagation(); toggleTask(task._id); });
  row.querySelector('.editBtn').addEventListener('click', e => { e.stopPropagation(); openModal(task); });
  row.querySelector('.deleteBtn').addEventListener('click', e => { e.stopPropagation(); deleteTask(task._id); });
  row.addEventListener('click', () => openDetail(task));

  return row;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ---------- Actions ----------
async function toggleTask(id) {
  await fetch(`${API}/${id}/toggle`, { method: 'PATCH' });
  loadTasks();
}
async function deleteTask(id) {
  if (!confirm('Xóa công việc này?')) return;
  await fetch(`${API}/${id}`, { method: 'DELETE' });
  loadTasks();
}

// ---------- Init ----------
applyView();
checkHealth();
setInterval(checkHealth, 15000);
