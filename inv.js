// inv.js - Updated for Group-based access
import { supabase, requireAuth, logout, getUserGroupId } from './auth.js';

const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const addNewBtn = document.getElementById('addNewBtn');
const downloadCsvBtn = document.getElementById('downloadCsvBtn');
const statusEl = document.getElementById('status');
const tbody = document.getElementById('invTbody');
const thead = document.getElementById('invThead');

const userAvatar = document.getElementById('userAvatar');
const userNameEl = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');

let allColumns = [];
let editingKey = null;
let currentData = [];
let currentSort = { column: null, direction: 0 };
let currentGroupId = null;

// ====================== AUTH ======================
async function initAuth() {
  console.log('🔄 initAuth() started');

  const user = await requireAuth();
  if (!user) {
    console.log('❌ No user returned from requireAuth');
    return;
  }

  // Get or create the user's group
  currentGroupId = await getUserGroupId();
  
  if (!currentGroupId) {
    alert("Failed to initialize group. Please contact support.");
    return;
  }

  console.log('✅ Logged in as:', user.email, 'Group ID:', currentGroupId);

  // Populate header
  if (userNameEl) userNameEl.textContent = user.email.split('@')[0];

  if (userAvatar) {
    userAvatar.src = user.user_metadata?.avatar_url || 
                     `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=3b82f6&color=fff&size=128`;
  }

  fetchData();   // Load inventory data
}

// ====================== FETCH & RENDER ======================
async function fetchData(searchTerm = '') {
  if (!currentGroupId) return;

  try {
    statusEl.textContent = 'Loading data...';

    const { data, error } = await supabase
      .from('inv')
      .select('*')
      .eq('group_id', currentGroupId);

    if (error) throw error;

    currentData = data || [];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      currentData = currentData.filter(row => 
        Object.values(row).some(val => String(val).toLowerCase().includes(term))
      );
    }

    renderTable();
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Error: ${err.message}`;
  }
}

// ====================== CSV DOWNLOAD ======================
function downloadCSV() {
  if (currentData.length === 0) {
    alert("No data to export");
    return;
  }

  const headers = allColumns.map(col => col.replace(/_/g, ' ').toUpperCase());
  let csvContent = headers.join(",") + "\n";

  let exportData = [...currentData];

  if (currentSort.column) {
    exportData.sort((a, b) => {
      let valA = a[currentSort.column];
      let valB = b[currentSort.column];
      if (valA === null) valA = '';
      if (valB === null) valB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return currentSort.direction === 1 ? valA - valB : valB - valA;
      }
      return String(valA).toLowerCase().localeCompare(String(valB).toLowerCase()) * 
             (currentSort.direction === 1 ? 1 : -1);
    });
  }

  exportData.forEach(row => {
    const rowValues = allColumns.map(col => {
      let val = row[col];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return val;
    });
    csvContent += rowValues.join(",") + "\n";
  });

  const now = new Date();
  const centralTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

  const [month, day, year] = centralTime.split('/');
  const fileDate = `${year}-${month}-${day}`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `inventory_export_${fileDate}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  statusEl.textContent = `✅ Exported ${exportData.length} records to CSV`;
  setTimeout(() => fetchData(searchInput.value.trim()), 1500);
}

// ====================== RENDER TABLE ======================
function renderTable() {
  if (currentData.length === 0) {
    statusEl.textContent = 'No records found';
    tbody.innerHTML = '';
    thead.innerHTML = '';
    return;
  }

allColumns = Object.keys(currentData[0]).filter(col => 
    !['key', 'Key', 'userid', 'userid_uuid', 'UserID', 'UserID_uuid', 'group_id', 'GroupID'].includes(col.toLowerCase())
  );

  let headHTML = '<tr>';
  allColumns.forEach(col => {
    const isSorted = currentSort.column === col;
    let sortSymbol = isSorted ? (currentSort.direction === 1 ? ' ↑' : ' ↓') : '';
    headHTML += `<th data-col="${col}" style="cursor:pointer; user-select:none;">
      ${col.replace(/_/g, ' ').toUpperCase()}${sortSymbol}
    </th>`;
  });
  headHTML += '<th style="width:100px;">Actions</th></tr>';
  thead.innerHTML = headHTML;

  let sortedData = [...currentData];
  if (currentSort.column) {
    sortedData.sort((a, b) => {
      let valA = a[currentSort.column];
      let valB = b[currentSort.column];
      if (valA === null) valA = '';
      if (valB === null) valB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return currentSort.direction === 1 ? valA - valB : valB - valA;
      }
      return String(valA).toLowerCase().localeCompare(String(valB).toLowerCase()) * 
             (currentSort.direction === 1 ? 1 : -1);
    });
  }

  let rowsHTML = '';
  sortedData.forEach(row => {
    const key = row.Key || row.key;
    rowsHTML += `<tr data-key="${key}">`;
    
    allColumns.forEach(col => {
      let val = row[col];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'number') val = Math.round(val);
      rowsHTML += `<td>${val}</td>`;
    });

    rowsHTML += `
      <td style="text-align:center;">
        <button class="edit-btn" data-key="${key}" style="background:none;border:none;color:var(--primary);font-size:1.4rem;cursor:pointer;margin-right:12px;">✏️</button>
        <button class="delete-btn" data-key="${key}" style="background:none;border:none;color:var(--danger);font-size:1.5rem;cursor:pointer;">✕</button>
      </td>
    </tr>`;
  });

  tbody.innerHTML = rowsHTML;
  statusEl.textContent = `Showing ${sortedData.length} records`;

  attachActionListeners();
  attachSortListeners();
}

function attachSortListeners() {
  document.querySelectorAll('th[data-col]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (currentSort.column === col) {
        currentSort.direction = (currentSort.direction + 1) % 3;
        if (currentSort.direction === 0) currentSort.column = null;
      } else {
        currentSort.column = col;
        currentSort.direction = 1;
      }
      renderTable();
    });
  });
}

function attachActionListeners() {
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      const key = parseInt(btn.dataset.key);
      if (key) editRecord(key);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      const key = parseInt(btn.dataset.key);
      if (key && confirm('Delete this record?')) deleteRecord(key);
    });
  });
}

// ====================== CRUD ======================
async function deleteRecord(key) {
  try {
    statusEl.textContent = 'Deleting record...';

    const { error } = await supabase
      .from('inv')
      .delete()
      .eq('Key', key)
      .eq('group_id', currentGroupId);

    if (error) throw error;

    statusEl.textContent = '✅ Record deleted successfully';
    setTimeout(() => fetchData(searchInput.value.trim()), 700);
  } catch (err) {
    console.error(err);
    statusEl.textContent = '❌ Delete failed';
    alert('Failed to delete: ' + (err.message || err));
  }
}

async function editRecord(key) {
  editingKey = key;
  document.getElementById('modalTitle').textContent = 'Edit Record';

  try {
    const { data, error } = await supabase
      .from('inv')
      .select('*')
      .eq('Key', key)
      .eq('group_id', currentGroupId)
      .single();

    if (error) throw error;
    buildModalForm(data || {});
    document.getElementById('recordModal').style.display = 'flex';
  } catch (err) {
    alert('Failed to load record: ' + err.message);
  }
}

function buildModalForm(existingData = {}) {
  let formHTML = '';
  allColumns.forEach(col => {
    const value = existingData[col] !== undefined && existingData[col] !== null ? existingData[col] : '';
    const isNumber = col.toLowerCase().includes('qty') || col.toLowerCase().includes('key');
    formHTML += `
      <div class="form-group">
        <label>${col.replace(/_/g, ' ').toUpperCase()}</label>
        <input type="${isNumber ? 'number' : 'text'}" 
               id="field_${col}" 
               value="${value}">
      </div>`;
  });
  document.getElementById('modalForm').innerHTML = formHTML;
}

async function saveRecord() {
  const record = {};
  allColumns.forEach(col => {
    const input = document.getElementById(`field_${col}`);
    if (input) {
      let val = input.value.trim();
      record[col] = val === '' ? null : (isNaN(val) ? val : Number(val));
    }
  });

  record.group_id = currentGroupId;     // ← Fixed

  try {
    let error;
    if (editingKey !== null) {
      ({ error } = await supabase.from('inv').update(record).eq('Key', editingKey).eq('group_id', currentGroupId));
    } else {
      delete record.Key;
      ({ error } = await supabase.from('inv').insert([record]));
    }
    if (error) throw error;

    document.getElementById('recordModal').style.display = 'none';
    editingKey = null;
    fetchData(searchInput.value.trim());
  } catch (err) {
    alert('Failed to save: ' + err.message);
  }
}

// ====================== EVENT LISTENERS ======================
refreshBtn.addEventListener('click', () => fetchData(searchInput.value.trim()));
searchInput.addEventListener('input', (e) => fetchData(e.target.value.trim()));
downloadCsvBtn.addEventListener('click', downloadCSV);

addNewBtn.addEventListener('click', () => {
  editingKey = null;
  document.getElementById('modalTitle').textContent = 'Add New Record';
  buildModalForm({});
  document.getElementById('recordModal').style.display = 'flex';
});

document.getElementById('saveModalBtn').addEventListener('click', saveRecord);
document.getElementById('cancelModalBtn').addEventListener('click', () => {
  document.getElementById('recordModal').style.display = 'none';
  editingKey = null;
});

logoutBtn.addEventListener('click', logout);

// Start
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});