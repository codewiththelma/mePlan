// ===========================
//   SAVINGS TRACKER
// ===========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ---- Firebase config (same project) ----
const firebaseConfig = {
  apiKey: "AIzaSyAfuSGsTNTCeJETOHuum5p8f5MWpDib-Ok",
  authDomain: "myplanner-d7f1a.firebaseapp.com",
  projectId: "myplanner-d7f1a",
  storageBucket: "myplanner-d7f1a.firebasestorage.app",
  messagingSenderId: "70472912562",
  appId: "1:70472912562:web:f7ea2e04b997d22b4ac3ab",
  measurementId: "G-19TRC7MTP4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---- DOM ----
const themeToggle = document.getElementById("themeToggle");

// list view
const savingsListView = document.getElementById("savingsListView");
const savingsListEl = document.getElementById("savingsList");
const savingsListEmptyEl = document.getElementById("savingsListEmpty");
const totalSavedAmountEl = document.getElementById("totalSavedAmount");

// detail view
const savingsDetailView = document.getElementById("savingsDetailView");
const detailIconCircle = document.getElementById("detailIconCircle");
const detailIcon = document.getElementById("detailIcon");
const detailTitleEl = document.getElementById("detailTitle");
const detailSubtitleEl = document.getElementById("detailSubtitle");
const moneyIn = document.getElementById("detailMoneyIn");
const moneyOut = document.getElementById("detailMoneyOut");
const detailBalanceEl = document.getElementById("detailBalance");
const depositBtn = document.getElementById("depositBtn");
const deductBtn = document.getElementById("deductBtn");

const progressRing = document.getElementById("progressRing");
const progressIcon = document.getElementById("progressIcon");
const progressMainEl = document.getElementById("progressMain");
const progressSubEl = document.getElementById("progressSub");
const recentHistoryList = document.getElementById("recentHistoryList");
const viewAllHistoryBtn = document.getElementById("viewAllHistoryBtn");

// modals
const addSavingFab = document.getElementById("addSavingFab");
const editSavingFab = document.getElementById("editSavingFab");
const savingModal = document.getElementById("savingModal");
const savingModalTitle = document.getElementById("savingModalTitle");
const closeSavingModalBtn = document.getElementById("closeSavingModal");
const savingForm = document.getElementById("savingForm");
const savingIdInput = document.getElementById("savingIdInput");
const savingNameInput = document.getElementById("savingNameInput");
const savingGoalInput = document.getElementById("savingGoalInput");
const savingCurrencyInput = document.getElementById("savingCurrencyInput");
const savingIconInput = document.getElementById("savingIconInput");
const iconRow = document.getElementById("iconRow");
const deleteSavingBtn = document.getElementById("deleteSavingBtn");

const transactionModal = document.getElementById("transactionModal");
const transactionModalTitle = document.getElementById("transactionModalTitle");
const closeTransactionModalBtn = document.getElementById("closeTransactionModal");
const transactionForm = document.getElementById("transactionForm");
const transactionAmountInput = document.getElementById("transactionAmountInput");
const transactionDescInput = document.getElementById("transactionDescInput");

const historyModal = document.getElementById("historyModal");
const closeHistoryModalBtn = document.getElementById("closeHistoryModal");
const fullHistoryList = document.getElementById("fullHistoryList");

// success popup
const successPopup = document.getElementById("successPopup");
const successMessageEl = document.getElementById("successMessage");

// ---- state ----
let savingsGoals = [];
let currentSavingId = null;
let currentSaving = null;
let currentTransactions = [];
let transactionMode = "deposit"; // or 'deduct'

// =========================
//   THEME SYSTEM
// =========================
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("meplan-theme", theme);

  const icon = themeToggle?.querySelector("i");
  if (!icon) return;
  icon.classList.remove("fa-sun", "fa-moon");
  icon.classList.add(theme === "dark" ? "fa-sun" : "fa-moon");
}

function initTheme() {
  if (!themeToggle) return;
  const saved = localStorage.getItem("meplan-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");

  applyTheme(theme);

  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });
}

// =========================
//   UTILITIES
// =========================
function showSuccess(msg = "Saved!") {
  if (!successPopup || !successMessageEl) return;
  successMessageEl.textContent = msg;
  successPopup.classList.remove("hidden");
  setTimeout(() => successPopup.classList.add("hidden"), 1800);
}
function showError(msg = "Something went wrong") {
  const popup = document.getElementById("errorPopup");
  const text = document.getElementById("errorMessage");

  text.textContent = msg;
  popup.classList.remove("hidden");

  setTimeout(() => popup.classList.add("hidden"), 1800);
}


function formatCurrency(amount, currency) {
  if (amount == null || isNaN(amount)) amount = 0;
  const n = Number(amount);
  const fixed = n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return currency ? `${currency} ${fixed}` : fixed;
}

function getIconClass(iconKey) {
  switch (iconKey) {
    case "gift": return "fa-gift";
    case "car": return "fa-car-side";
    case "plane": return "fa-plane-departure";
    case "house": return "fa-house";
    case "piggy": return "fa-piggy-bank";
    default: return "fa-wallet";
  }
}

function getIconBgColor(iconKey) {
  switch (iconKey) {
    case "gift": return "#fee2e2";
    case "car": return "#dbeafe";
    case "plane": return "#e0f2fe";
    case "house": return "#dcfce7";
    case "piggy": return "#fce7f3";
    default: return "#e5e7eb";
  }
}

function getIconAccentColor(iconKey) {
  switch (iconKey) {
    case "gift": return "#ef4444";
    case "car": return "#2563eb";
    case "plane": return "#0284c7";
    case "house": return "#16a34a";
    case "piggy": return "#ec4899";
    default: return "#6b7280";
  }
}

function parseQueryParams() {
  const p = new URLSearchParams(window.location.search);
  return { id: p.get("id") || null };
}

function isDetailMode() {
  const { id } = parseQueryParams();
  return !!id;
}

// =========================
//   LOAD & RENDER LIST
// =========================
async function loadSavingsGoals() {
  const snap = await getDocs(collection(db, "savingsGoals"));
  savingsGoals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderSavingsList();
  updateTotalSaved();
}

function updateTotalSaved() {
  const total = savingsGoals.reduce((sum, g) => sum + (g.currentBalance || 0), 0);
  const currency = savingsGoals[0]?.currency || "€";
  if (totalSavedAmountEl) {
    totalSavedAmountEl.textContent = formatCurrency(total, currency);
  }
}

function renderSavingsList() {
  if (!savingsListEl || !savingsListEmptyEl) return;

  savingsListEl.innerHTML = "";

  if (!savingsGoals.length) {
    savingsListEmptyEl.classList.remove("hidden");
    return;
  }
  savingsListEmptyEl.classList.add("hidden");

  savingsGoals
    .slice()
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .forEach(goal => {
      const card = document.createElement("article");
      card.className = "card savings-goal-card";
      card.dataset.id = goal.id;

      const iconClass = getIconClass(goal.icon);
      const iconBg = getIconBgColor(goal.icon);
      const iconAccent = getIconAccentColor(goal.icon);
      const currency = goal.currency || "€";

      const current = goal.currentBalance || 0;
      const goalAmt = goal.goalAmount || 0;
      const deposited = goal.totalDeposited || 0;
      const deducted = goal.totalDeducted || 0;
      const percent = goalAmt > 0 ? Math.min(100, Math.round((current / goalAmt) * 100)) : 0;

      card.innerHTML = `
        <div class="saving-card-main">
          <div class="saving-card-left">
            <div class="saving-icon-circle" style="background:${iconBg}; color:${iconAccent};">
              <i class="fa-solid ${iconClass}"></i>
            </div>
            <div class="saving-card-text">
              <p class="saving-title">${goal.title || "Untitled"}</p>
              <p class="saving-subtitle">${formatCurrency(current, currency)} / ${formatCurrency(goalAmt, currency)}</p>
            </div>
          </div>
          <div class="saving-card-right">
            <div class="saving-progress-pill">
              <span>${percent}%</span>
            </div>
            <button class="saving-menu-btn" aria-label="More actions">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
          </div>
        </div>
        <div class="saving-card-footer">
          <div class="saving-mini-pill positive">Deposit <strong>${formatCurrency(deposited, currency)}</strong></div>
          <div class="saving-mini-pill negative">Deducted <strong>${formatCurrency(deducted, currency)}</strong></div>
          <div class="saving-inline-actions hidden">
            <button class="icon-button-only" data-action="edit"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-button-only danger" data-action="delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `;

      // open detail when clicking card (not menu)
      card.addEventListener("click", (e) => {
        const target = e.target;
        if (target.closest(".saving-menu-btn") || target.closest(".icon-button-only")) return;
        openDetail(goal.id);
      });

      const menuBtn = card.querySelector(".saving-menu-btn");
      const inlineActions = card.querySelector(".saving-inline-actions");

      menuBtn?.addEventListener("click", (e) => {
        e.stopPropagation();

        const isOpen = !inlineActions.classList.contains("hidden");

        if (isOpen) {
            inlineActions.classList.add("hidden");
            menuBtn.querySelector("i").className = "fa-solid fa-ellipsis-vertical";
        } else {
            inlineActions.classList.remove("hidden");
            menuBtn.querySelector("i").className = "fa-solid fa-xmark";
        }
        });


      inlineActions?.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === "edit") openEditSavingModal(goal);
        if (action === "delete") deleteSavingWithConfirm(goal.id);
      });

      savingsListEl.appendChild(card);
    });
}

// =========================
//   LIST / DETAIL SWITCH
// =========================
async function openDetail(id) {
  const goal = savingsGoals.find(g => g.id === id);
  if (!goal) return;
  currentSavingId = id;
  currentSaving = goal;
  const url = new URL(window.location.href);
  url.searchParams.set("id", id);
  window.history.pushState({ id }, "", url.toString());
  renderDetailHeader(goal);
  await loadTransactionsForCurrent();
  showDetailView();
}

function showDetailView() {
  addSavingFab.classList.add("hidden");
  editSavingFab.classList.remove("hidden");

  if (savingsListView) savingsListView.classList.add("hidden");
  if (savingsDetailView) savingsDetailView.classList.remove("hidden");
}

function showListView() {
  editSavingFab.classList.add("hidden");
  addSavingFab.classList.remove("hidden");

  if (savingsDetailView) savingsDetailView.classList.add("hidden");
  if (savingsListView) savingsListView.classList.remove("hidden");
}

window.addEventListener("popstate", () => {
  const { id } = parseQueryParams();
  if (id) {
    const goal = savingsGoals.find(g => g.id === id);
    if (goal) {
      currentSavingId = id;
      currentSaving = goal;
      renderDetailHeader(goal);
      loadTransactionsForCurrent();
      showDetailView();
    }
  } else {
    currentSavingId = null;
    currentSaving = null;
    showListView();
  }
});

// =========================
//   DETAIL RENDER
// =========================
function renderDetailHeader(goal) {
  if (!goal) return;

  const iconClass = getIconClass(goal.icon);
  const iconBg = getIconBgColor(goal.icon);
  const iconAccent = getIconAccentColor(goal.icon);
  const currency = goal.currency || "€";
  const current = goal.currentBalance || 0;
  const goalAmt = goal.goalAmount || 0;
  const percent = goalAmt > 0 ? Math.min(100, Math.round((current / goalAmt) * 100)) : 0;
  const away = Math.max(0, goalAmt - current);

  detailIconCircle.style.background = iconBg;
  detailIconCircle.style.color = iconAccent;
  detailIcon.className = `fa-solid ${iconClass}`;
  detailBalanceEl.textContent = formatCurrency(current, currency);


  detailTitleEl.textContent = goal.title || "Saving";
  detailSubtitleEl.innerHTML = `Goal: <span>${formatCurrency(goalAmt, currency)}</span>`;
  moneyIn.innerHTML = `Money in: <span>${formatCurrency(goal.totalDeposited || 0, currency)}</span>`;
  moneyOut.innerHTML =  `Money out: <span>${formatCurrency(goal.totalDeducted || 0, currency)}</span>`;

  progressIcon.className = `fa-solid ${iconClass}`;
  progressRing.style.setProperty("--progress", percent);
  progressMainEl.textContent = `${percent}% of goal`;
  progressSubEl.textContent = `${formatCurrency(away, currency)} away from goal`;
}

// =========================
//   TRANSACTIONS + TREND
// =========================
async function loadTransactionsForCurrent() {
  if (!currentSavingId) return;
  const txRef = collection(db, "savingsTransactions");
  const q = query(txRef, where("savingId", "==", currentSavingId));
  const snap = await getDocs(q);

// sort newest → oldest
currentTransactions = snap.docs
  .map(d => ({ id: d.id, ...d.data() }))
  .sort((a,b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return tb - ta;
  });
  renderRecentHistory();

}

function renderRecentHistory() {
  if (!recentHistoryList) return;
  recentHistoryList.innerHTML = "";

  if (!currentTransactions.length) {
    recentHistoryList.innerHTML = `<p class="text-muted">No transactions yet.</p>`;
    return;
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recent = currentTransactions.filter(tx => {
    const ts = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
    return ts >= cutoff;
  });

  if (!recent.length) {
    recentHistoryList.innerHTML = `<p class="text-muted">No transactions in the last 30 days.</p>`;
    return;
  }

  recent.forEach(tx => {
    const row = createHistoryRow(tx);
    recentHistoryList.appendChild(row);
  });
}

function createHistoryRow(tx) {
  const row = document.createElement("div");
  row.className = "history-row";

  const iconKey = currentSaving?.icon || "piggy";
  const iconClass = getIconClass(iconKey);
  const iconBg = getIconBgColor(iconKey);
  const iconAccent = getIconAccentColor(iconKey);
  const currency = currentSaving?.currency || "€";

  const ts = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
  const dateStr = ts.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  const label = tx.type === "deposit" ? "Deposit" : "Deduct";

  row.innerHTML = `
    <div class="history-left">
      <div class="history-icon" style="background:${iconBg}; color:${iconAccent};">
        <i class="fa-solid ${iconClass}"></i>
      </div>
      <div>
        <p class="history-date">${dateStr}</p>
        <p class="history-label">${label}</p>
        ${tx.description ? `<p class="history-desc">${tx.description}</p>` : ""}
      </div>
    </div>
    <div class="history-amount ${tx.type === "deposit" ? "positive" : "negative"}">
      ${tx.type === "deposit" ? "+" : "-"}${formatCurrency(tx.amount, currency)}
    </div>
  `;
  return row;
}

// =========================
//   MODALS – SAVING
// =========================
function resetSavingForm() {
  savingIdInput.value = "";
  savingNameInput.value = "";
  savingGoalInput.value = "";
  savingCurrencyInput.value = "€";
  savingIconInput.value = "";
  deleteSavingBtn.classList.add("hidden");
  iconRow.querySelectorAll(".icon-dot-modern").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.icon;

    savingIconInput.value = key;

    iconRow.querySelectorAll(".icon-dot-modern")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
  });
});

}
function initOptionsSheet() {
  if (!optionsBtn || !optionsSheet || !optionsBackdrop) return;

  function showOptions() {
    optionsSheet.classList.remove("hidden");
    requestAnimationFrame(() => {
      optionsSheet.classList.add("show");
    });
    optionsBackdrop.classList.remove("hidden");
  }

  function hideOptions() {
    optionsSheet.classList.remove("show");
    optionsBackdrop.classList.add("hidden");
    setTimeout(() => {
      optionsSheet.classList.add("hidden");
    }, 230);
  }

  optionsBtn.addEventListener("click", showOptions);
  optionsBackdrop.addEventListener("click", hideOptions);
  optionsCloseBtn.addEventListener("click", hideOptions);
}

function openCreateSavingModal() {
  resetSavingForm();
  savingModalTitle.textContent = "Add Saving";
  savingModal.classList.remove("hidden");
}

function openEditSavingModal(goal) {
  resetSavingForm();
  savingModalTitle.textContent = "Edit Saving";
  savingIdInput.value = goal.id;
  savingNameInput.value = goal.title || "";
  savingGoalInput.value = goal.goalAmount || "";
  savingCurrencyInput.value = goal.currency || "€";
  savingIconInput.value = goal.icon || "piggy";

  const activeIcon = iconRow?.querySelector(`[data-icon="${goal.icon}"]`);
  if (activeIcon) activeIcon.classList.add("active");

  deleteSavingBtn.classList.remove("hidden");
  savingModal.classList.remove("hidden");
}

function closeSavingModal() {
  savingModal.classList.add("hidden");
}

closeSavingModalBtn?.addEventListener("click", closeSavingModal);
savingModal?.addEventListener("click", (e) => {
  if (e.target === savingModal) closeSavingModal();
});

iconRow?.querySelectorAll(".icon-dot").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.icon;
    savingIconInput.value = key;
    iconRow.querySelectorAll(".icon-dot").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

savingForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = savingIdInput.value;
  const title = savingNameInput.value.trim();
  const goalAmt = Number(savingGoalInput.value);
  const currency = savingCurrencyInput.value || "€";
  const icon = savingIconInput.value || "piggy";

  if (!title || isNaN(goalAmt)) {
    showError("Please enter a name and a valid goal amount.");
    return;
  }

  try {
    if (id) {
      await updateDoc(doc(db, "savingsGoals", id), {
        title,
        goalAmount: goalAmt,
        currency,
        icon
      });
      showSuccess("Saving updated");
    } else {
      await addDoc(collection(db, "savingsGoals"), {
        title,
        goalAmount: goalAmt,
        currency,
        icon,
        currentBalance: 0,
        totalDeposited: 0,
        totalDeducted: 0,
        createdAt: serverTimestamp()
      });
      showSuccess("Saving added");
    }

    closeSavingModal();
    await loadSavingsGoals();
  } catch (err) {
    console.error(err);
    showError("There was a problem saving this goal.");
  }
});

let pendingDeleteId = null;

function deleteSavingWithConfirm(id) {
  pendingDeleteId = id;
  document.getElementById("deletePopup").classList.remove("hidden");
}

document.getElementById("cancelDelete")?.addEventListener("click", () => {
  pendingDeleteId = null;
  document.getElementById("deletePopup").classList.add("hidden");
});

document.getElementById("confirmDelete")?.addEventListener("click", async () => {
  if (!pendingDeleteId) return;

  const id = pendingDeleteId;
  const popup = document.getElementById("deletePopup");
  popup.classList.add("hidden");

  try {
    // Delete all related transactions
    const txRef = collection(db, "savingsTransactions");
    const q = query(txRef, where("savingId", "==", id));
    const snap = await getDocs(q);

    const deletes = snap.docs.map(d => 
      deleteDoc(doc(db, "savingsTransactions", d.id))
    );
    await Promise.all(deletes);

    // Delete the saving itself
    await deleteDoc(doc(db, "savingsGoals", id));

    // Remove from local list
    savingsGoals = savingsGoals.filter(g => g.id !== id);

    // Update total saved
    updateTotalSaved();

    showSuccess("Saving deleted");

    currentSavingId = null;
    currentSaving = null;

    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    window.history.replaceState({}, "", url.toString());

    showListView();
    await loadSavingsGoals();

  } catch (err) {
    console.error(err);
    showError("Could not delete saving.");
  }

  pendingDeleteId = null;
});

deleteSavingBtn?.addEventListener("click", async () => {
  const id = savingIdInput.value;
  if (!id) return;
  await deleteSavingWithConfirm(id);
});

addSavingFab?.addEventListener("click", () => {
  openCreateSavingModal();
});
editSavingFab?.addEventListener("click", () => {
  if (currentSaving) openEditSavingModal(currentSaving);
});


// =========================
//   MODALS – TRANSACTION
// =========================
function openTransactionModal(mode) {
  if (!currentSavingId || !currentSaving) return;
  transactionMode = mode;
  transactionModalTitle.textContent = mode === "deposit" ? "Deposit" : "Deduct";
  transactionAmountInput.value = "";
  transactionDescInput.value = "";
  transactionModal.classList.remove("hidden");
}

function closeTransactionModal() {
  transactionModal.classList.add("hidden");
}

closeTransactionModalBtn?.addEventListener("click", closeTransactionModal);
transactionModal?.addEventListener("click", (e) => {
  if (e.target === transactionModal) closeTransactionModal();
});

depositBtn?.addEventListener("click", () => openTransactionModal("deposit"));
deductBtn?.addEventListener("click", () => openTransactionModal("deduct"));

transactionForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentSavingId || !currentSaving) return;

  const amount = Number(transactionAmountInput.value);
  const description = transactionDescInput.value.trim();

  if (isNaN(amount) || amount <= 0) {
    showError("Please enter a valid amount.");
    return;
  }
  if (transactionMode === "deduct" && amount > (currentSaving.currentBalance || 0)) {
    showError("You cannot deduct more than your current balance.");
    return;
}


  const type = transactionMode;
  const delta = type === "deposit" ? amount : -amount;

  try {
    await addDoc(collection(db, "savingsTransactions"), {
      savingId: currentSavingId,
      type,
      amount,
      description,
      createdAt: serverTimestamp()
    });

    const goalRef = doc(db, "savingsGoals", currentSavingId);
    const newCurrent = (currentSaving.currentBalance || 0) + delta;
    const newDeposited = (currentSaving.totalDeposited || 0) + (type === "deposit" ? amount : 0);
    const newDeducted = (currentSaving.totalDeducted || 0) + (type === "deduct" ? amount : 0);

    await updateDoc(goalRef, {
      currentBalance: newCurrent,
      totalDeposited: newDeposited,
      totalDeducted: newDeducted
    });

    // update local copy
    currentSaving.currentBalance = newCurrent;
    currentSaving.totalDeposited = newDeposited;
    currentSaving.totalDeducted = newDeducted;

    const idx = savingsGoals.findIndex(g => g.id === currentSavingId);
    if (idx !== -1) savingsGoals[idx] = { ...currentSaving };

    showSuccess(type === "deposit" ? "Deposit added" : "Amount deducted");
    closeTransactionModal();
    renderDetailHeader(currentSaving);
    await loadTransactionsForCurrent();
    updateTotalSaved();
    renderSavingsList();
  } catch (err) {
    console.error(err);
    showError("There was a problem saving this transaction.");
  }
});

// =========================
//   MODALS – FULL HISTORY
// =========================
function openHistoryModal() {
  if (!currentTransactions.length) return;
  fullHistoryList.innerHTML = "";
  currentTransactions.forEach(tx => {
    const row = createHistoryRow(tx);
    fullHistoryList.appendChild(row);
  });
  historyModal.classList.remove("hidden");
}

function closeHistoryModal() {
  historyModal.classList.add("hidden");
}

closeHistoryModalBtn?.addEventListener("click", closeHistoryModal);
historyModal?.addEventListener("click", (e) => {
  if (e.target === historyModal) closeHistoryModal();
});
viewAllHistoryBtn?.addEventListener("click", openHistoryModal);

// =========================
//          INIT
// =========================
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  initOptionsSheet();
  await loadSavingsGoals();

  const { id } = parseQueryParams();
  if (id) {
    const goal = savingsGoals.find(g => g.id === id);
    if (goal) {
      currentSavingId = id;
      currentSaving = goal;
      renderDetailHeader(goal);
      await loadTransactionsForCurrent();
      showDetailView();
    }
  } else {
    showListView();
  }
});
