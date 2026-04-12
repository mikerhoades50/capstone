import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://woplbevwhogyiqpsnnct.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_N6tb1BKQ7XDuJJSg-tIs4g_r13llovy';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLE_NAME = 'inv';
let allColumns = [];
let editingKey = null;
let currentData = [];
let currentSort = { column: null, direction: 0 }; // 0=none, 1=asc, 2=desc

const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const addNewBtn = document.getElementById('addNewBtn');
const statusEl = document.getElementById('status');
const tbody = document.getElementById('invTbody');
const thead = document.getElementById('invThead');

async function fetchData(searchTerm = '') {
  try {
    statusEl.textContent = 'Loading data...';
    const { data, error } = await supabase.from(TABLE_NAME).select('*');

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
    statusEl.innerHTML = `Error: ${err.message}`;
  }
}

function renderTable() {
  if (currentData.length === 0) {
    statusEl.textContent = 'No records found';
    tbody.innerHTML = '';
    thead.innerHTML = '';
    return;
  }

  allColumns = Object.keys(currentData[0]).filter(col => col.toLowerCase() !== 'key');

  // Calculate QTY total
  let qtyTotal = 0;
  const qtyCol = allColumns.find(col => col.toLowerCase() === 'qty');
  if (qtyCol) {
    qtyTotal = currentData.reduce((sum, row) => sum + (parseFloat(row[qtyCol]) || 0), 0);
  }

  // Build header with sort + QTY total
  let headHTML = '<tr>';
  allColumns.forEach(col => {
    const isSorted = currentSort.column === col;
    let sortClass = '';
    let displayText = col.replace(/_/g, ' ').toUpperCase();

    if (col.toLowerCase() === 'qty') {
      displayText = `QTY (${Math.round(qtyTotal)})`;
    }

    if (isSorted) {
      sortClass = currentSort.direction === 1 ? 'sorted-asc' : 'sorted-desc';
    }

    headHTML += `<th class="${sortClass}" data-col="${col}">${displayText}</th>`;
  });
  headHTML += '<th style="width:80px;">Actions</th></tr>';
  thead.innerHTML = headHTML;

  // Sort data if active
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

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return currentSort.direction === 1 ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }

  // Build rows
  let rowsHTML = '';
  sortedData.forEach(row => {
    const key = row.Key || row.key;
    rowsHTML += `<tr data-key="${key}">`;
    
    allColumns.forEach(col => {
      let val = row[col];
      if (typeof val === 'number') val = Math.round(val);
      if (val === null || val === undefined) val = '';
      rowsHTML += `<td>${val}</td>`;
    });

    rowsHTML += `
      <td style="text-align:center;">
        <button class="edit-btn" data-key="${key}" style="background:none;border:none;color:var(--primary);font-size:1.3rem;cursor:pointer;">✏️</button>
        <button class="delete-btn" data-key="${key}" style="background:none;border:none;color:var(--danger);font-size:1.4rem;cursor:pointer;margin-left:8px;">✕</button>
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
      editRecord(key);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      const key = parseInt(btn.dataset.key);
      if (confirm('Delete this record?')) deleteRecord(key);
    });
  });

  document.querySelectorAll('#invTbody tr').forEach(row => {
    row.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        const key = parseInt(row.dataset.key);
        editRecord(key);
      }
    });
  });
}

// Keep your existing editRecord, deleteRecord, buildModalForm, saveRecord functions
async function editRecord(key) {
  editingKey = key;
  document.getElementById('modalTitle').textContent = 'Edit Record';

  try {
    const { data } = await supabase.from(TABLE_NAME).select('*').eq('Key', key).single();
    if (!data) return;
    buildModalForm(data);
    document.getElementById('recordModal').style.display = 'flex';
  } catch (err) {
    alert('Failed to load record');
  }
}

async function deleteRecord(key) {
  try {
    const { error } = await supabase.from(TABLE_NAME).delete().eq('Key', key);
    if (error) throw error;
    fetchData(searchInput.value.trim());
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
}

function buildModalForm(existingData = {}) {
  let formHTML = '';
  allColumns.forEach(col => {
    const value = existingData[col] !== undefined ? existingData[col] : '';
    const isNumber = typeof value === 'number' || col.toLowerCase().includes('qty');
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
      record[col] = val === '' ? null : (!isNaN(val) ? Number(val) : val);
    }
  });

  try {
    let error;
    if (editingKey !== null) {
      ({ error } = await supabase.from(TABLE_NAME).update(record).eq('Key', editingKey));
    } else {
      delete record.Key;
      ({ error } = await supabase.from(TABLE_NAME).insert([record]));
    }
    if (error) throw error;

    document.getElementById('recordModal').style.display = 'none';
    editingKey = null;
    fetchData(searchInput.value.trim());
  } catch (err) {
    alert('Failed to save: ' + err.message);
  }
}

// Event Listeners
refreshBtn.addEventListener('click', () => fetchData(searchInput.value.trim()));
searchInput.addEventListener('input', (e) => fetchData(e.target.value.trim()));

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

document.getElementById('recordModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('recordModal')) {
    document.getElementById('recordModal').style.display = 'none';
    editingKey = null;
  }
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
  fetchData();
});