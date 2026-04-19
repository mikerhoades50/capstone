// calc.js - Updated for Group-based access
import { supabase, requireAuth, logout, getUserGroupId } from './auth.js';

const machineSizeSelect = document.getElementById('machineSize');
const foodNameInput = document.getElementById('foodName');
const tableBody = document.getElementById('tableBody');
const bagsInput = document.getElementById('bagsInput');
const oilCard = document.getElementById('oilCard');
const batchesUntilOilEl = document.getElementById('batchesUntilOil');
const logoutBtn = document.getElementById('logoutBtn');

const userAvatar = document.getElementById('userAvatar');
const userNameEl = document.getElementById('userName');

const sizeConfig = {
  small: { rows: 4, bags: 10 },
  medium: { rows: 5, bags: 15 },
  large: { rows: 6, bags: 25 },
  xl: { rows: 7, bags: 35 }
};

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

  loadLastBatch();
}

// ====================== CORE CALCULATOR ======================
function getCurrentValues() {
  return {
    colA: Array.from(document.querySelectorAll('.col-a')).map(el => el.value),
    colB: Array.from(document.querySelectorAll('.col-b')).map(el => el.value),
    colC: Array.from(document.querySelectorAll('.col-c')).map(el => el.value)
  };
}

function createRows(count, prevA = [], prevB = [], prevC = []) {
  tableBody.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="number" class="col-a" step="any" placeholder="0" value="${prevA[i] ?? ''}"></td>
      <td><input type="number" class="col-b" step="any" placeholder="0" value="${prevB[i] ?? ''}"></td>
      <td><input type="number" class="col-c" step="any" placeholder="0" value="${prevC[i] ?? ''}"></td>
    `;
    tableBody.appendChild(tr);
  }
  attachInputListeners();
  updateTotals();
}

function attachInputListeners() {
  const table = document.getElementById('dataTable');
  table.addEventListener('input', updateTotals);

  const colA = Array.from(table.querySelectorAll('.col-a'));
  const colB = Array.from(table.querySelectorAll('.col-b'));
  const colC = Array.from(table.querySelectorAll('.col-c'));
  const columns = [colA, colB, colC];

  const allInputs = table.querySelectorAll('input[type="number"]');

  allInputs.forEach(input => {
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();

        const currentList = input.classList.contains('col-a') ? colA :
                           input.classList.contains('col-b') ? colB : colC;

        const idx = currentList.indexOf(input);
        let nextInput;

        if (idx < currentList.length - 1) {
          nextInput = currentList[idx + 1];
        } else {
          const currentColIndex = columns.indexOf(currentList);
          const nextColIndex = (currentColIndex + 1) % 3;
          nextInput = columns[nextColIndex][0];
        }

        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    });
  });
}

function updateTotals() {
  let sumA = 0, sumB = 0, sumC = 0;

  document.querySelectorAll('.col-a').forEach(el => sumA += (parseFloat(el.value) || 0));
  document.querySelectorAll('.col-b').forEach(el => sumB += (parseFloat(el.value) || 0));
  document.querySelectorAll('.col-c').forEach(el => sumC += (parseFloat(el.value) || 0));

  document.getElementById('totalA').textContent = Math.round(sumA);
  document.getElementById('totalB').textContent = Math.round(sumB);
  document.getElementById('totalC').textContent = Math.round(sumC);

  const waterDiff = sumA - sumB;
  document.getElementById('waterWeight').textContent = Math.round(waterDiff);
  document.getElementById('foodWeight').textContent = Math.round(sumC);

  const ratio = sumC > 0 ? (waterDiff / sumC).toFixed(2) : "0.00";
  document.getElementById('waterFoodRatio').textContent = ratio;

  const bags = parseFloat(bagsInput.value) || 0;
  const foodPerBag = bags > 0 ? sumC / bags : 0;
  const waterPerBag = bags > 0 ? waterDiff / bags : 0;

  document.getElementById('foodPerBag').textContent = `Food per Bag: ${foodPerBag.toFixed(2)} g`;
  document.getElementById('waterPerBag').textContent = `Water per Bag: ${waterPerBag.toFixed(2)} g`;
  document.getElementById('waterOz').textContent = `Water in oz: ${(waterPerBag * 0.03527396).toFixed(2)} oz`;
}

// ====================== DATABASE ======================
async function loadLastBatch() {
  if (!currentGroupId) return;

  try {
    const { data: batchData } = await supabase
      .from('batches')
      .select('*')
      .eq('group_id', currentGroupId)
      .eq('machine_id', machineSizeSelect.value)
      .order('id', { ascending: false })
      .limit(1);

    if (batchData && batchData.length > 0) {
      const b = batchData[0];
      const firstRow = tableBody.querySelector('tr');
      if (firstRow) {
        const inputs = firstRow.querySelectorAll('input');
        if (inputs.length >= 3) {
          inputs[0].value = Math.round(b.wet_weight || 0);
          inputs[1].value = Math.round(b.dry_weight || 0);
          inputs[2].value = Math.round(b.food_weight || 0);
        }
      }
      if (b.num_bags) bagsInput.value = b.num_bags;
      if (b.food_name) foodNameInput.value = b.food_name;
    }

    const { data: oilData } = await supabase
      .from('batches')
      .select('oil_change')
      .eq('group_id', currentGroupId)
      .eq('machine_id', machineSizeSelect.value)
      .order('id', { ascending: false })
      .limit(1);

    const oilChange = oilData && oilData.length > 0 ? (oilData[0].oil_change || 0) : 0;
    const batchesLeft = 10 - oilChange;

    batchesUntilOilEl.textContent = batchesLeft;
    oilCard.classList.remove('oil-normal', 'oil-warning', 'oil-critical');
    if (batchesLeft <= 0) oilCard.classList.add('oil-critical');
    else if (batchesLeft <= 3) oilCard.classList.add('oil-warning');
    else oilCard.classList.add('oil-normal');

    updateTotals();
  } catch (err) {
    console.error('Load failed:', err);
  }
}

async function saveBatchToDatabase() {
  if (!currentGroupId) return;

  const foodName = foodNameInput.value.trim();
  if (!foodName) {
    alert("Please enter a Food Name before saving.");
    return;
  }

  const wetWeight = parseFloat(document.getElementById('totalA').textContent) || 0;
  const dryWeight = parseFloat(document.getElementById('totalB').textContent) || 0;
  const foodWeight = parseFloat(document.getElementById('totalC').textContent) || 0;
  const numBags = parseFloat(bagsInput.value) || 0;
  const foodPerBag = parseFloat(document.getElementById('foodPerBag').textContent.split(':')[1] || '0');
  const waterAmount = parseFloat(document.getElementById('waterPerBag').textContent.split(':')[1] || '0');

  const batchData = {
    group_id: currentGroupId,           // Fixed
    user_id: 0,
    machine_id: machineSizeSelect.value,
    food_name: foodName,
    wet_weight: Math.round(wetWeight),
    dry_weight: Math.round(dryWeight),
    food_weight: Math.round(foodWeight),
    num_bags: Math.round(numBags),
    water_amount: waterAmount,
    complete: false,
    food_per_bag: foodPerBag
  };

  try {
    const { data: latest } = await supabase
      .from('batches')
      .select('id, oil_change')
      .eq('group_id', currentGroupId)
      .eq('machine_id', machineSizeSelect.value)
      .order('id', { ascending: false })
      .limit(1);

    let error;
    if (latest && latest.length > 0) {
      batchData.oil_change = latest[0].oil_change || 0;
      ({ error } = await supabase.from('batches').update(batchData).eq('id', latest[0].id));
    } else {
      batchData.oil_change = 0;
      ({ error } = await supabase.from('batches').insert([batchData]));
    }

    if (error) throw error;

    alert('✅ Batch saved successfully!');
    startNewBatch();
    loadLastBatch();
  } catch (err) {
    alert('❌ Failed to save batch:\n' + err.message);
  }
}

function startNewBatch() {
  document.querySelectorAll('.col-a, .col-b, .col-c').forEach(input => input.value = '');
  foodNameInput.value = '';

  const size = machineSizeSelect.value;
  bagsInput.value = sizeConfig[size].bags;

  updateTotals();
}

// ====================== INVENTORY MODAL ======================
async function showAddToInventoryModal() {
  if (!currentGroupId) return;

  const foodName = foodNameInput.value.trim() || "Unknown Food";
  const totalFoodQty = parseFloat(document.getElementById('totalC').textContent) || 0;

  let lastBin = "";
  try {
    const { data } = await supabase
      .from('inv')
      .select('"Bin"')
      .eq('group_id', currentGroupId)           // Fixed
      .order('"Key"', { ascending: false })
      .limit(1);
    if (data && data.length > 0) lastBin = data[0].Bin || "";
  } catch (e) { console.error(e); }

  const currentDate = new Date().toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' }).replace('/', '/');

  const formHTML = `
    <div class="form-group"><label>Description</label><input type="text" id="invDescription" value="${foodName}"></div>
    <div class="form-group"><label>Qty</label><input type="number" id="invQty" value="${Math.round(totalFoodQty)}"></div>
    <div class="form-group"><label>Date (MM/YY)</label><input type="text" id="invDate" value="${currentDate}"></div>
    <div class="form-group"><label>Category</label><input type="text" id="invCategory" placeholder="e.g. Meat"></div>
    <div class="form-group"><label>Size</label><input type="text" id="invSize" placeholder="e.g. 5lb"></div>
    <div class="form-group"><label>Location</label><input type="text" id="invLocation" placeholder="e.g. Freezer A"></div>
    <div class="form-group"><label>Bin</label><input type="text" id="invBin" value="${lastBin}"></div>
  `;

  document.getElementById('inventoryForm').innerHTML = formHTML;
  document.getElementById('inventoryModal').style.display = 'flex';
}

async function saveToInventory() {
  if (!currentGroupId) {
    alert("You must be logged in.");
    return;
  }

  const record = {
    group_id: currentGroupId,                    // Fixed
    "Description": document.getElementById('invDescription').value.trim(),
    "Qty": parseInt(document.getElementById('invQty').value) || 0,
    "Date": document.getElementById('invDate').value.trim(),
    "Category": document.getElementById('invCategory').value.trim(),
    "Size": document.getElementById('invSize').value.trim(),
    "Location": document.getElementById('invLocation').value.trim(),
    "Bin": document.getElementById('invBin').value.trim()
  };

  try {
    // Insert into inventory
    const { error: insertError } = await supabase.from('inv').insert([record]);
    if (insertError) throw insertError;

    // Increment oil_change
    const { data: currentBatch, error: fetchError } = await supabase
      .from('batches')
      .select('oil_change')
      .eq('group_id', currentGroupId)
      .eq('machine_id', machineSizeSelect.value)
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.warn('Could not fetch current oil value:', fetchError);
    }

    const currentOil = currentBatch?.oil_change || 0;
    const newOil = currentOil + 1;

    const { error: updateError } = await supabase
      .from('batches')
      .update({ oil_change: newOil })
      .eq('group_id', currentGroupId)
      .eq('machine_id', machineSizeSelect.value);

    if (updateError) throw updateError;

    document.getElementById('inventoryModal').style.display = 'none';
    loadLastBatch();
    alert('✅ Successfully added to inventory and oil counter updated!');
  } catch (err) {
    console.error('Inventory save error:', err);
    alert('❌ Failed to add to inventory:\n' + (err.message || err));
  }
}

async function resetOilChange() {
  if (!currentGroupId) return;
  try {
    await supabase
      .from('batches')
      .update({ oil_change: 0 })
      .eq('group_id', currentGroupId)
      .eq('machine_id', machineSizeSelect.value);
    loadLastBatch();
  } catch (err) {
    console.error(err);
  }
}

// ====================== EVENT LISTENERS ======================
document.getElementById('saveToDbBtn').addEventListener('click', saveBatchToDatabase);
document.getElementById('startNewBtn').addEventListener('click', startNewBatch);
document.getElementById('addToInventoryBtn').addEventListener('click', showAddToInventoryModal);
document.getElementById('saveInventoryBtn').addEventListener('click', saveToInventory);
document.getElementById('cancelInventoryBtn').addEventListener('click', () => {
  document.getElementById('inventoryModal').style.display = 'none';
});
document.getElementById('resetOilBtn').addEventListener('click', resetOilChange);

logoutBtn.addEventListener('click', logout);

machineSizeSelect.addEventListener('change', () => {
  const size = machineSizeSelect.value;
  const { rows: newRowCount, bags: defaultBags } = sizeConfig[size];

  const prev = getCurrentValues();
  const keepCount = Math.min(newRowCount, prev.colA.length);

  createRows(newRowCount, prev.colA.slice(0, keepCount), prev.colB.slice(0, keepCount), prev.colC.slice(0, keepCount));

  if (bagsInput.value === "" || Object.values(sizeConfig).some(c => String(c.bags) === bagsInput.value)) {
    bagsInput.value = defaultBags;
  }
  if (currentGroupId) loadLastBatch();     // Fixed
});

document.addEventListener('DOMContentLoaded', () => {
  createRows(6);
  updateTotals();
  initAuth();
});