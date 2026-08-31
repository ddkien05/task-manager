const API = '/api/tasks';

const state = { view: 'dashboard', priority: '', q: '', editingId: null, calMonth: startOfMonth(new Date()) };

function startOfMonth(d) {
  const m = new Date(d.getFullYear(), d.getMonth(), 1);
  m.setHours(0, 0, 0, 0);
  return m;
}

const priorityMeta = {
  low:    { label: 'Low',    bg: '#22B07D' },
  medium: { label: 'Medium', bg: '#F5A524' },
  high:   { label: 'High',   bg: '#EF4B4B' }
};
const priorityRank = { low: 1, medium: 2, high: 3 };

// ---------- Theme (dark/light) ----------
function applyTheme(mode) {
  document.documentElement.classList.toggle('dark', mode === 'dark');
  document.querySelectorAll('.icon-sun').forEach(el => el.classList.toggle('hidden', mode === 'dark'));
  document.querySelectorAll('.icon-moon').forEach(el => el.classList.toggle('hidden', mode !== 'dark'));
  localStorage.setItem('theme', mode);
}
const savedTheme = localStorage.getItem('theme') ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);
document.querySelectorAll('.themeToggleBtn').forEach(btn => {
  btn.addEventListener('click', () => {
    applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
  });
});

// ---------- Toast notifications ----------
const toastContainer = document.getElementById('toastContainer');
function showToast(message, type = 'success') {
  const styles = {
    success: { bg: '#22B07D', icon: '<path d="M20 6L9 17l-5-5"/>' },
    error:   { bg: '#EF4B4B', icon: '<path d="M18 6L6 18M6 6l12 12"/>' },
    info:    { bg: '#2F6FED', icon: '<path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="9"/>' }
  };
  const s = styles[type] || styles.success;
  const el = document.createElement('div');
  el.className = 'toast-in flex items-center gap-2.5 bg-white border border-line shadow-lg rounded-lg pl-3 pr-4 py-2.5 text-sm font-medium text-ink';
  el.innerHTML = `
    <span class="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style="background:${s.bg}">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">${s.icon}</svg>
    </span>
    <span>${escapeHtml(message)}</span>
  `;
  toastContainer.appendChild(el);
  setTimeout(() => {
    el.classList.remove('toast-in');
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 200);
  }, 2800);
}

// ---------- Overdue helper ----------
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function isOverdue(task) {
  if (task.completed || !task.dueDate) return false;
  return new Date(task.dueDate) < startOfToday();
}

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
  document.getElementById('statCards').style.display = state.view === 'settings' ? 'none' : '';
  document.getElementById('calendarPanel').style.display = state.view === 'settings' ? 'none' : '';
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
document.getElementById('detailDeleteBtn').addEventListener('click', () => {
  if (!detailTask) return;
  const id = detailTask._id;
  closeDetail();
  deleteTask(id);
});

// ---------- Day detail modal (bấm vào 1 ngày trong lịch) ----------
const dayBackdrop = document.getElementById('dayBackdrop');
let dayModalDate = null;

function openDayModal(dateObj, tasksOnDay) {
  dayModalDate = dateObj;
  const label = dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  document.getElementById('dayModalTitle').textContent = label.charAt(0).toUpperCase() + label.slice(1);

  const sorted = [...tasksOnDay].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
  });

  const list = document.getElementById('dayTaskList');
  const empty = document.getElementById('dayEmptyState');
  if (!sorted.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    list.innerHTML = sorted.map(t => {
      const meta = priorityMeta[t.priority] || priorityMeta.medium;
      const overdue = isOverdue(t);
      return `
        <button data-id="${t._id}" class="dayTaskItem w-full flex items-center gap-2.5 text-left hover:bg-canvas rounded-lg px-2 py-2 -mx-2 transition-colors">
          <span class="w-2 h-2 rounded-full shrink-0" style="background:${t.completed ? '#22B07D' : (overdue ? '#EF4B4B' : meta.bg)}"></span>
          <span class="flex-1 min-w-0 text-sm truncate ${t.completed ? 'line-through text-muted' : ''}">${escapeHtml(t.title)}</span>
          ${overdue && !t.completed ? '<span class="text-[10px] font-semibold text-white bg-high px-2 py-0.5 rounded-full shrink-0">Quá hạn</span>' : ''}
          <span class="text-[11px] font-semibold text-white px-2 py-0.5 rounded-full shrink-0" style="background:${meta.bg}">${meta.label}</span>
        </button>
      `;
    }).join('');
    list.querySelectorAll('.dayTaskItem').forEach(btn => {
      btn.addEventListener('click', () => {
        const task = sorted.find(t => t._id === btn.dataset.id);
        if (task) { closeDayModal(); openDetail(task); }
      });
    });
  }

  dayBackdrop.classList.remove('hidden');
  dayBackdrop.classList.add('flex');
}
function closeDayModal() {
  dayBackdrop.classList.add('hidden');
  dayBackdrop.classList.remove('flex');
  dayModalDate = null;
}
document.getElementById('closeDayModal').addEventListener('click', closeDayModal);
dayBackdrop.addEventListener('click', e => { if (e.target === dayBackdrop) closeDayModal(); });
document.getElementById('dayAddBtn').addEventListener('click', () => {
  if (!dayModalDate) return;
  const y = dayModalDate.getFullYear();
  const m = String(dayModalDate.getMonth() + 1).padStart(2, '0');
  const d = String(dayModalDate.getDate()).padStart(2, '0');
  closeDayModal();
  openModal(null, `${y}-${m}-${d}`);
});

// ---------- Modal ----------
const backdrop = document.getElementById('modalBackdrop');
const form = document.getElementById('taskForm');

function openModal(task = null, prefillDate = null) {
  state.editingId = task ? task._id : null;
  document.getElementById('modalTitle').textContent = task ? 'Sửa công việc' : 'Thêm công việc';
  document.getElementById('fTitle').value = task ? task.title : '';
  document.getElementById('fDesc').value = task ? task.description : '';
  document.getElementById('fPriority').value = task ? task.priority : 'medium';
  document.getElementById('fDue').value = task && task.dueDate ? task.dueDate.substring(0, 10) : (prefillDate || '');
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

  const isEdit = !!state.editingId;
  try {
    if (isEdit) {
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
    showToast(isEdit ? 'Đã cập nhật công việc' : 'Đã thêm công việc', 'success');
    loadTasks();
  } catch (err) {
    showToast('Có lỗi xảy ra: ' + err.message, 'error');
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
  loadCalendar();
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

// ---------- Calendar ----------
document.getElementById('calPrev').addEventListener('click', () => {
  state.calMonth = new Date(state.calMonth.getFullYear(), state.calMonth.getMonth() - 1, 1);
  loadCalendar();
});
document.getElementById('calNext').addEventListener('click', () => {
  state.calMonth = new Date(state.calMonth.getFullYear(), state.calMonth.getMonth() + 1, 1);
  loadCalendar();
});

async function loadCalendar() {
  try {
    const res = await fetch(API); // toàn bộ task, không lọc theo view hiện tại
    const tasks = await res.json();
    renderCalendarGrid(tasks);
    renderAgenda(tasks);
  } catch (err) {
    console.error('Lỗi tải lịch:', err);
  }
}

function renderCalendarGrid(tasks) {
  const monthStart = state.calMonth;
  const label = monthStart.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  document.getElementById('calMonthLabel').textContent = label.charAt(0).toUpperCase() + label.slice(1);

  // Map ngày -> danh sách task đến hạn ngày đó + trạng thái bận rộn nhất
  const dayTasksMap = {};
  tasks.forEach(t => {
    if (!t.dueDate) return;
    const d = new Date(t.dueDate);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!dayTasksMap[key]) dayTasksMap[key] = [];
    dayTasksMap[key].push(t);
  });
  const kindOf = t => t.completed ? 'done' : (isOverdue(t) ? 'overdue' : 'doing');
  const dotColor = { overdue: '#EF4B4B', doing: '#F5A524', done: '#22B07D' };
  const rank = { done: 1, doing: 2, overdue: 3 };

  const today = startOfToday();
  const firstDow = (monthStart.getDay() + 6) % 7; // Thứ 2 = 0 ... Chủ nhật = 6
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push('<div></div>');
  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
    const key = `${cellDate.getFullYear()}-${cellDate.getMonth()}-${cellDate.getDate()}`;
    const dayTasks = dayTasksMap[key] || [];
    let topKind = null;
    dayTasks.forEach(t => {
      const k = kindOf(t);
      if (!topKind || rank[k] > rank[topKind]) topKind = k;
    });
    const isToday = cellDate.getTime() === today.getTime();
    cells.push(`
      <button type="button" data-key="${key}" class="calDay relative flex items-center justify-center h-7 rounded-md transition-colors ${isToday ? 'bg-primary text-white font-semibold' : 'text-ink hover:bg-canvas'}">
        ${day}
        ${topKind ? `<span class="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style="background:${isToday ? '#fff' : dotColor[topKind]}"></span>` : ''}
      </button>
    `);
  }
  document.getElementById('calGrid').innerHTML = cells.join('');

  document.querySelectorAll('.calDay').forEach(btn => {
    btn.addEventListener('click', () => {
      const [y, m, d] = btn.dataset.key.split('-').map(Number);
      const cellDate = new Date(y, m, d);
      openDayModal(cellDate, dayTasksMap[btn.dataset.key] || []);
    });
  });
}

function renderAgenda(tasks) {
  const today = startOfToday();
  const pending = tasks.filter(t => !t.completed);

  const overdue = pending.filter(t => isOverdue(t))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const upcoming = pending.filter(t => !isOverdue(t) && t.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 6);

  const agendaItem = t => `
    <button data-id="${t._id}" class="agendaItem w-full flex items-center gap-2 text-left hover:bg-canvas rounded-md px-1.5 py-1 -mx-1.5 transition-colors">
      <span class="flex-1 truncate text-xs ${isOverdue(t) ? 'text-high font-medium' : 'text-ink'}">${escapeHtml(t.title)}</span>
      <span class="shrink-0 text-[11px] text-muted">${formatDate(t.dueDate)}</span>
    </button>
  `;

  const overdueList = document.getElementById('overdueList');
  const upcomingList = document.getElementById('upcomingList');
  overdueList.innerHTML = overdue.length
    ? overdue.map(agendaItem).join('')
    : '<p class="text-xs text-muted">Không có việc quá hạn 🎉</p>';
  upcomingList.innerHTML = upcoming.length
    ? upcoming.map(agendaItem).join('')
    : '<p class="text-xs text-muted">Không có hạn chót sắp tới</p>';

  [overdueList, upcomingList].forEach(container => {
    container.querySelectorAll('.agendaItem').forEach(btn => {
      btn.addEventListener('click', () => {
        const task = tasks.find(t => t._id === btn.dataset.id);
        if (task) openDetail(task);
      });
    });
  });
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
  const overdue = isOverdue(task);
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
      ${overdue ? `<span class="text-[11px] font-semibold text-white px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap bg-high flex items-center gap-1">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M12 8v4M12 16h.01"/><circle cx="12" cy="12" r="9"/></svg>
        Quá hạn
      </span>` : ''}
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
  try {
    const res = await fetch(`${API}/${id}/toggle`, { method: 'PATCH' });
    const task = await res.json();
    showToast(task.completed ? 'Đã hoàn thành công việc' : 'Đã chuyển về đang làm', task.completed ? 'success' : 'info');
    loadTasks();
  } catch (err) {
    showToast('Có lỗi khi cập nhật', 'error');
  }
}
async function deleteTask(id) {
  if (!confirm('Xóa công việc này?')) return;
  try {
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    showToast('Đã xóa công việc', 'info');
    loadTasks();
  } catch (err) {
    showToast('Có lỗi khi xóa', 'error');
  }
}

// ---------- Init ----------
applyView();
checkHealth();
setInterval(checkHealth, 15000);
