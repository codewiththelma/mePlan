// ===========================
//   SCHEDULE LIST (DASHBOARD)
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
  serverTimestamp
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


// DOM
const themeToggle = document.getElementById("themeToggle");

const scheduleListEl = document.getElementById("scheduleList");
const scheduleListEmptyEl = document.getElementById("scheduleListEmpty");
const addScheduleFab = document.getElementById("addScheduleFab");

const scheduleModal = document.getElementById("scheduleModal");
const scheduleModalTitle = document.getElementById("scheduleModalTitle");
const closeScheduleModalBtn = document.getElementById("closeScheduleModal");
const scheduleForm = document.getElementById("scheduleForm");
const scheduleIdInput = document.getElementById("scheduleId");
const scheduleTitleInput = document.getElementById("scheduleTitleInput");
const scheduleDescInput = document.getElementById("scheduleDescInput");
const scheduleColorInput = document.getElementById("scheduleColorInput");
const scheduleDeleteBtn = document.getElementById("deleteScheduleBtn");
const colorDots = scheduleModal.querySelectorAll(".color-dot");

// Delete popup
const deletePopup = document.getElementById("deletePopup");
const cancelDelete = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");
let pendingDeleteId = null;

// Success popup
const successPopup = document.getElementById("successPopup");
const successMessageEl = document.getElementById("successMessage");

// State
let schedules = [];

// THEME
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

  themeToggle?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });
}

// SUCCESS POPUP
function showSuccess(msg = "Success!") {
  successMessageEl.textContent = msg;
  successPopup.classList.remove("hidden");
  setTimeout(() => successPopup.classList.add("hidden"), 1800);
}

// COLOR PICKER
function clearColorSelection() {
  colorDots.forEach(dot => dot.classList.remove("color-selected"));
}

function setScheduleColor(color) {
  clearColorSelection();
  colorDots.forEach(dot => {
    if (dot.dataset.color === color) {
      dot.classList.add("color-selected");
    }
  });
  scheduleColorInput.value = color;
}

function autoSelectFirstColor() {
  const first = colorDots[0];
  if (!first) return;
  setScheduleColor(first.dataset.color);
}

colorDots.forEach(dot => {
  dot.addEventListener("click", () => {
    setScheduleColor(dot.dataset.color);
  });
});

// LOAD
async function loadSchedules() {
  const snap = await getDocs(collection(db, "users", auth.currentUser.uid, "schedules"));
  schedules = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderScheduleList();
}

function renderScheduleList() {
  scheduleListEl.innerHTML = "";

  if (!schedules.length) {
    scheduleListEmptyEl.classList.remove("hidden");
    return;
  }
  scheduleListEmptyEl.classList.add("hidden");

  schedules
    .sort((a, b) => {
      if (a.createdAt?.seconds && b.createdAt?.seconds) {
        return a.createdAt.seconds - b.createdAt.seconds;
      }
      return (a.title || "").localeCompare(b.title || "");
    })
    .forEach(sch => {
      const card = document.createElement("button");
      card.className = "schedule-card";
      card.type = "button";

      const colorBar = document.createElement("div");
      colorBar.className = "schedule-card-color";
      colorBar.style.background = sch.color || "var(--accent)";

      const content = document.createElement("div");
      content.className = "schedule-card-content";

      const titleRow = document.createElement("div");
      titleRow.className = "schedule-card-title-row";

      const title = document.createElement("h2");
      title.className = "schedule-card-title";
      title.textContent = sch.title || "Untitled schedule";

      const chevron = document.createElement("i");
      chevron.className = "fa-solid fa-chevron-right schedule-card-chevron";

      titleRow.appendChild(title);
      titleRow.appendChild(chevron);

      const desc = document.createElement("p");
      desc.className = "schedule-card-desc";
      desc.textContent = sch.description || "Tap to open weekly view";

      const actionsRow = document.createElement("div");
      actionsRow.className = "schedule-card-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "icon-button-sm";
      editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "icon-button-sm";
      deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';

      actionsRow.appendChild(editBtn);
      actionsRow.appendChild(deleteBtn);

      content.appendChild(titleRow);
      content.appendChild(desc);
      content.appendChild(actionsRow);

      card.appendChild(colorBar);
      card.appendChild(content);

      // open on card click
      card.addEventListener("click", (e) => {
        // if click came from edit/delete, ignore
        if (e.target.closest(".icon-button-sm")) return;
        window.location.href = `schedule.html?id=${encodeURIComponent(sch.id)}`;
      });

      // edit
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditScheduleModal(sch);
      });

      // delete
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        pendingDeleteId = sch.id;
        deletePopup.classList.remove("hidden");
      });

      scheduleListEl.appendChild(card);
    });
}

// MODAL
function openCreateScheduleModal() {
  scheduleModalTitle.textContent = "Add Schedule";
  scheduleIdInput.value = "";
  scheduleTitleInput.value = "";
  scheduleDescInput.value = "";
  autoSelectFirstColor();
  scheduleDeleteBtn.classList.add("hidden");
  scheduleModal.classList.remove("hidden");
  scheduleTitleInput.focus();
}

function openEditScheduleModal(sch) {
  scheduleModalTitle.textContent = "Edit Schedule";
  scheduleIdInput.value = sch.id;
  scheduleTitleInput.value = sch.title || "";
  scheduleDescInput.value = sch.description || "";
  setScheduleColor(sch.color || colorDots[0]?.dataset.color || "#a855f7");
  scheduleDeleteBtn.classList.remove("hidden");
  scheduleModal.classList.remove("hidden");
  scheduleTitleInput.focus();
}
async function deleteAllScheduleEvents(scheduleId, db) {
  const evRef = collection(db, "users", auth.currentUser.uid, "scheduleEvents");
  const q = query(evRef, where("scheduleId", "==", scheduleId));
  const snap = await getDocs(q);

  const deletes = snap.docs.map(docSnap =>
    deleteDoc(doc(db, "users", auth.currentUser.uid, "scheduleEvents", docSnap.id))
  );

  await Promise.all(deletes);
}


function closeScheduleModal() {
  scheduleModal.classList.add("hidden");
}

closeScheduleModalBtn.addEventListener("click", closeScheduleModal);
scheduleModal.addEventListener("click", (e) => {
  if (e.target === scheduleModal) closeScheduleModal();
});

// SAVE
scheduleForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = scheduleIdInput.value;
  const title = scheduleTitleInput.value.trim();
  const description = scheduleDescInput.value.trim();
  const color = scheduleColorInput.value;

  if (!title || !color) return;

  if (id) {
    await updateDoc(doc(db, "users", auth.currentUser.uid, "schedules", id), { title, description, color });
    showSuccess("Schedule updated!");
  } else {
    await addDoc(collection(db, "users", auth.currentUser.uid, "schedules"), {
      title,
      description,
      color,
      createdAt: serverTimestamp()
    });
    showSuccess("Schedule added!");
  }

  await loadSchedules();
  closeScheduleModal();
});

// DELETE
scheduleDeleteBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const id = scheduleIdInput.value;
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

  try {

    // delete all events first
    await deleteAllScheduleEvents(pendingDeleteId, db);

    // delete the schedule itself
    await deleteDoc(doc(db, "users", auth.currentUser.uid, "schedules", pendingDeleteId));

    showSuccess("Schedule deleted!");

    pendingDeleteId = null;
    deletePopup.classList.add("hidden");

    await loadSchedules();

  } catch (err) {
    console.error(err);
    showError("Could not delete this schedule.");
  }
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

// FAB
addScheduleFab.addEventListener("click", () => {
  openCreateScheduleModal();
});

// INIT
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  initTheme();
  initOptionsSheet();
  await loadSchedules();
  document.body.classList.remove("spa-preload");
  document.getElementById("preloader").style.display = "none";
});
