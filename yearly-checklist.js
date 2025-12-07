// ===============================
//   YEARLY CHECKLIST (GROUPED)
// ===============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
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

const auth = getAuth();

// ---- DOM ----
const themeToggle = document.getElementById("themeToggle");

const yearTitleEl = document.getElementById("yearChecklistTitle");
const prevYearBtn = document.getElementById("prevYear");
const nextYearBtn = document.getElementById("nextYear");

const checklistContainer = document.getElementById("checklistContainer");
const yearlyEmptyState = document.getElementById("yearlyEmptyState");

const addYearlyFab = document.getElementById("addYearlyFab");

// Modal
const yearlyModal = document.getElementById("yearlyModal");
const closeYearlyModalBtn = document.getElementById("closeYearlyModal");
const yearlyForm = document.getElementById("yearlyForm");
const yearlyIdInput = document.getElementById("yearlyId");
const yearlyTitleInput = document.getElementById("yearlyTitleInput");
const yearlyCategoryInput = document.getElementById("yearlyCategoryInput");
const yearlyColorInput = document.getElementById("yearlyColorInput");
const yearlyModalTitle = document.getElementById("yearlyModalTitle");
const colorDots = document.querySelectorAll(".color-dot");

// Delete popup
const deletePopup = document.getElementById("deletePopup");
const cancelDelete = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");
let pendingDeleteId = null;

// Success popup
const successPopup = document.getElementById("successPopup");
const successMessageEl = document.getElementById("successMessage");

// ---- State ----
let currentYear;
let yearlyItems = [];

// ===========================
//   THEME SYSTEM
// ===========================
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("meplan-theme", theme);

  if (!themeToggle) return;
  const icon = themeToggle.querySelector("i");
  icon.classList.remove("fa-sun", "fa-moon");
  icon.classList.add(theme === "dark" ? "fa-sun" : "fa-moon");
}

function initTheme() {
  const saved = localStorage.getItem("meplan-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");

  applyTheme(theme);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }
}

// ===========================
//   SUCCESS POPUP
// ===========================
function showSuccess(msg = "Success!") {
  successMessageEl.textContent = msg;
  successPopup.classList.remove("hidden");

  setTimeout(() => {
    successPopup.classList.add("hidden");
  }, 1800);
}

// ===========================
//   YEAR SETUP
// ===========================
function initCurrentYear() {
  const now = new Date();
  currentYear = now.getFullYear();
}

function updateYearTitle() {
  yearTitleEl.textContent = `${currentYear}`;
}

// ===========================
//   LOAD ITEMS FOR YEAR
// ===========================
async function loadYearlyItems() {
  const q = query(collection(db, "users", auth.currentUser.uid, "yearlyChecklist"), where("year", "==", currentYear));
  const snap = await getDocs(q);

  yearlyItems = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  renderYearlyChecklist();
}

// ===========================
//   RENDER (GROUPED BY CATEGORY)
// ===========================
function renderYearlyChecklist() {
  checklistContainer.innerHTML = "";

  if (!yearlyItems.length) {
    yearlyEmptyState.classList.remove("hidden");
    return;
  }

  yearlyEmptyState.classList.add("hidden");

  // group by category
  const groups = {};
  yearlyItems.forEach(item => {
    const cat = (item.category || "General").trim() || "General";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });

  const sortedCategories = Object.keys(groups).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  sortedCategories.forEach(category => {
    const items = groups[category].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.createdAt?.seconds && b.createdAt?.seconds) {
        return a.createdAt.seconds - b.createdAt.seconds;
      }
      return 0;
    });

    // Category header
    const section = document.createElement("section");
    section.className = "yearly-section";

    const header = document.createElement("div");
    header.className = "yearly-section-header";

    const catLabelWrap = document.createElement("div");
    catLabelWrap.className = "yearly-section-label-wrap";

    const catText = document.createElement("span");
    catText.className = "yearly-section-title";
    catText.textContent = category;

    catLabelWrap.appendChild(catText);


    const count = document.createElement("span");
    count.className = "yearly-section-count";
    count.textContent = `${items.length} item${items.length !== 1 ? "s" : ""}`;

    header.appendChild(catLabelWrap);
    header.appendChild(count);
    section.appendChild(header);

    // List
    const ul = document.createElement("ul");
    ul.className = "yearly-list";

    items.forEach(item => {
      const li = document.createElement("li");
      li.className = "yearly-item";

      // Left: checkbox + dot + text
      const left = document.createElement("div");
      left.className = "yearly-left";

      const checkboxBtn = document.createElement("button");
      checkboxBtn.className = "yearly-checkbox";
      checkboxBtn.type = "button";

      const checkboxIcon = document.createElement("i");
      checkboxIcon.className = item.completed
        ? "fa-solid fa-circle-check"
        : "fa-regular fa-circle";

      checkboxBtn.appendChild(checkboxIcon);

      const colorDot = document.createElement("span");
      colorDot.className = "yearly-item-dot";
      colorDot.style.background = item.color || "var(--accent)";

      const titleSpan = document.createElement("span");
      titleSpan.className = "yearly-title";
      if (item.completed) {
        titleSpan.classList.add("yearly-title-completed");
      }
      titleSpan.textContent = item.title;

      left.appendChild(checkboxBtn);
      left.appendChild(colorDot);
      left.appendChild(titleSpan);

      // Right: actions
      const actions = document.createElement("div");
      actions.className = "yearly-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "icon-button-sm";
      editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "icon-button-sm";
      deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(left);
      li.appendChild(actions);
      ul.appendChild(li);

      // --- EVENTS ---

      // Toggle completed
      checkboxBtn.addEventListener("click", async () => {
        const newCompleted = !item.completed;
        await updateDoc(doc(db, "users", auth.currentUser.uid, "yearlyChecklist", item.id), { completed: newCompleted });
        item.completed = newCompleted;
        showSuccess("Item updated");
        await loadYearlyItems();
      });

      // Edit
      editBtn.addEventListener("click", () => {
        openEditYearlyModal(item);
      });

      // Delete
      deleteBtn.addEventListener("click", () => {
        pendingDeleteId = item.id;
        deletePopup.classList.remove("hidden");
      });
    });

    section.appendChild(ul);
    checklistContainer.appendChild(section);
  });
}

// ===========================
//   COLOR PICKER
// ===========================
function clearColorSelection() {
  colorDots.forEach(dot => dot.classList.remove("color-selected"));
}

function selectColor(color) {
  colorDots.forEach(dot => {
    if (dot.dataset.color === color) {
      dot.classList.add("color-selected");
    }
  });
  yearlyColorInput.value = color;
}

function autoSelectFirstColor() {
  if (!colorDots.length) return;
  const first = colorDots[0];
  selectColor(first.dataset.color);
}

colorDots.forEach(dot => {
  dot.addEventListener("click", () => {
    // Remove selection from all
    colorDots.forEach(d => d.classList.remove("color-selected"));

    // Select this one
    dot.classList.add("color-selected");

    // Store value
    yearlyColorInput.value = dot.dataset.color;
  });
});


// ===========================
//   MODAL
// ===========================
function openCreateYearlyModal() {
  yearlyModalTitle.textContent = "Add Yearly Item";
  yearlyIdInput.value = "";
  yearlyTitleInput.value = "";
  yearlyCategoryInput.value = "General";

  clearColorSelection();
  autoSelectFirstColor();
  deleteYearlyBtn.classList.add("hidden");

  yearlyModal.classList.remove("hidden");
  yearlyTitleInput.focus();
}

function openEditYearlyModal(item) {
  yearlyModalTitle.textContent = "Edit Yearly Item";
  yearlyIdInput.value = item.id;
  yearlyTitleInput.value = item.title;
  yearlyCategoryInput.value = item.category || "General";

  clearColorSelection();
  if (item.color) selectColor(item.color); else autoSelectFirstColor();
  deleteYearlyBtn.classList.remove("hidden");

  yearlyModal.classList.remove("hidden");
  yearlyTitleInput.focus();
}

function closeYearlyModal() {
  yearlyModal.classList.add("hidden");
}

const deleteYearlyBtn = document.getElementById("deleteYearlyBtn");

closeYearlyModalBtn.addEventListener("click", closeYearlyModal);

yearlyModal.addEventListener("click", (e) => {
  if (e.target === yearlyModal) {
    closeYearlyModal();
  }
});

// ===========================
//   SAVE (ADD / UPDATE)
// ===========================
yearlyForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = yearlyIdInput.value;
  const title = yearlyTitleInput.value.trim();
  const category = yearlyCategoryInput.value || "General";
  const color = yearlyColorInput.value;

  if (!title || !color) return;

  if (id) {
    await updateDoc(doc(db, "users", auth.currentUser.uid, "yearlyChecklist", id), { title, category, color });
    showSuccess("Item updated!");
  } else {
    await addDoc(collection(db, "users", auth.currentUser.uid, "yearlyChecklist"), {
      title,
      category,
      color,
      year: currentYear,
      completed: false,
      createdAt: serverTimestamp()
    });
    showSuccess("Item added!");
  }

  await loadYearlyItems();
  closeYearlyModal();
});

// ===========================
//   DELETE
// ===========================
deleteYearlyBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const id = yearlyIdInput.value;
  if (!id) return;
  pendingDeleteId = id;
  deletePopup.classList.remove("hidden");
});

cancelDelete.addEventListener("click", () => {
  deletePopup.classList.add("hidden");
  pendingDeleteId = null;
});

confirmDelete.addEventListener("click", async () => {
  if (!pendingDeleteId) return;

  await deleteDoc(doc(db, "users", auth.currentUser.uid, "yearlyChecklist", pendingDeleteId));
  pendingDeleteId = null;

  await loadYearlyItems();
  deletePopup.classList.add("hidden");
  closeYearlyModal();
  showSuccess("Item deleted!");
});

// ===========================
//   FAB
// ===========================
addYearlyFab.addEventListener("click", () => {
  openCreateYearlyModal();
});

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
// ===========================
//   INIT
// ===========================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  initTheme();
  initCurrentYear();
  updateYearTitle();
  initOptionsSheet();
  await loadYearlyItems();

  prevYearBtn.addEventListener("click", async () => {
    currentYear--;
    updateYearTitle();
    await loadYearlyItems();
  });

  nextYearBtn.addEventListener("click", async () => {
    currentYear++;
    updateYearTitle();
    await loadYearlyItems();
  });
});
