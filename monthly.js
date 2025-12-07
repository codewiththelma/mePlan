// ===========================
//   MONTHLY PLANNER (FINAL)
// ===========================

// ---- Firebase ----
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

// ---- DOM ----
const themeToggle = document.getElementById("themeToggle");

const monthTitleEl = document.getElementById("monthTitle");
const calendarGridEl = document.getElementById("calendarGrid");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");

const addEventFab = document.getElementById("addEventFab");

const eventModal = document.getElementById("eventModal");
const closeModalBtn = document.getElementById("closeModal");

const eventForm = document.getElementById("eventForm");
const eventIdInput = document.getElementById("eventId");
const eventTitleInput = document.getElementById("eventTitleInput");
const eventDateInput = document.getElementById("eventDateInput");
const eventColorInput = document.getElementById("eventColorInput");
const colorDots = document.querySelectorAll(".color-dot");

const deleteEventBtn = document.getElementById("deleteEventBtn");

// ---- Delete Popup ----
const deletePopup = document.getElementById("deletePopup");
const cancelDelete = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");
let pendingDeleteId = null;

// ---- Success Popup ----
const successPopup = document.getElementById("successPopup");
const successMessageEl = document.getElementById("successMessage");

// ---- State ----
let currentYear;
let currentMonthIndex;
let allEvents = [];


// ===========================
//   THEME SYSTEM
// ===========================
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("meplan-theme", theme);

  const icon = themeToggle.querySelector("i");
  icon.classList.remove("fa-sun", "fa-moon");
  icon.classList.add(theme === "dark" ? "fa-sun" : "fa-moon");
}

function initTheme() {
  const saved = localStorage.getItem("meplan-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");

  applyTheme(theme);

  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });
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
//   INITIAL MONTH
// ===========================
function initCurrentMonth() {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonthIndex = now.getMonth();
}


// ===========================
//   LOAD EVENTS
// ===========================
async function loadAllEvents() {
  const snapshot = await getDocs(collection(db, "users", auth.currentUser.uid, "monthlyEvents"));
  allEvents = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

function eventsForDate(dateStr) {
  return allEvents.filter(e => e.date === dateStr);
}


// ===========================
//   RENDER MONTH
// ===========================
function renderCalendar() {
  calendarGridEl.innerHTML = "";

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  monthTitleEl.textContent = `${monthNames[currentMonthIndex]} ${currentYear}`;

  const firstOfMonth = new Date(currentYear, currentMonthIndex, 1);
  const firstDayIndex = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const totalCells = firstDayIndex + daysInMonth;
  const rows = totalCells <= 35 ? 35 : 42;

  const y = currentYear.toString();
  const m = String(currentMonthIndex + 1).padStart(2, "0");

  for (let cell = 0; cell < rows; cell++) {
    const dayCell = document.createElement("div");
    dayCell.className = "day-cell";

    const dayIndex = cell - firstDayIndex + 1;

    if (dayIndex < 1 || dayIndex > daysInMonth) {
      dayCell.classList.add("day-cell-empty");
      calendarGridEl.appendChild(dayCell);
      continue;
    }

    const dayStr = String(dayIndex).padStart(2, "0");
    const fullDate = `${y}-${m}-${dayStr}`;

    // Date number
    const num = document.createElement("span");
    num.className = "day-number";
    num.textContent = dayIndex;
    dayCell.appendChild(num);

    // Events
    const eventsContainer = document.createElement("div");
    eventsContainer.className = "day-events";

    eventsForDate(fullDate).forEach(evt => {
      const pill = createEventPill(evt);
      eventsContainer.appendChild(pill);
    });

    dayCell.appendChild(eventsContainer);

    // Clicking day = add event
    dayCell.addEventListener("click", () => {
      openCreateEventModal(fullDate);
    });

    calendarGridEl.appendChild(dayCell);
  }
}


// ===========================
//   EVENT PILL
// ===========================
function createEventPill(evt) {
  const pill = document.createElement("button");
  pill.className = "event-pill";

  console.log("EVENT OBJECT:", evt);

  const c = document.createElement("span");
  c.className = "pill-color";
  c.style.background = evt.color;

  const t = document.createElement("span");
  t.className = "pill-text";
  t.textContent = evt.title;

  pill.appendChild(c);
  pill.appendChild(t);

  // Always open modal for editing
  pill.addEventListener("click", (e) => {
    e.stopPropagation();
    openEditEventModal(evt);
  });

  return pill;
}


// ===========================
//   MODAL
// ===========================
function openCreateEventModal(dateStr) {
  modalTitle.textContent = "Add Event";
  eventIdInput.value = "";
  eventTitleInput.value = "";
  eventDateInput.value = dateStr;

  autoSelectFirstColor();
  deleteEventBtn.classList.add("hidden");

  eventModal.classList.remove("hidden");
}

function openEditEventModal(evt) {
  modalTitle.textContent = "Edit Event";
  eventIdInput.value = evt.id;
  eventTitleInput.value = evt.title;
  eventDateInput.value = evt.date;

  clearColorSelection();
  selectColor(evt.color);

  deleteEventBtn.classList.remove("hidden");
  eventModal.classList.remove("hidden");
}

closeModalBtn.addEventListener("click", () => {
  eventModal.classList.add("hidden");
});

eventModal.addEventListener("click", (e) => {
  if (e.target === eventModal) {
    eventModal.classList.add("hidden");
  }
});


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

  eventColorInput.value = color;
}

function autoSelectFirstColor() {
  const first = colorDots[0];
  selectColor(first.dataset.color);
}

colorDots.forEach(dot => {
  dot.addEventListener("click", () => {
    selectColor(dot.dataset.color);
  });
});


// ===========================
//   SAVE EVENT
// ===========================
eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = eventIdInput.value;
  const title = eventTitleInput.value.trim();
  const date = eventDateInput.value;
  const color = eventColorInput.value;

  if (!title || !date || !color) return;

  if (id) {
    await updateDoc(doc(db, "users", auth.currentUser.uid, "monthlyEvents", id), { title, date, color });
    showSuccess("Event updated!");
  } else {
    await addDoc(collection(db, "users", auth.currentUser.uid, "monthlyEvents"), {
      title,
      date,
      color,
      createdAt: serverTimestamp()
    });
    showSuccess("Event added!");
  }

  await loadAllEvents();
  renderCalendar();
  eventModal.classList.add("hidden");
});


// ===========================
//   DELETE EVENT (Custom Popup)
// ===========================
deleteEventBtn.addEventListener("click", (e) => {
  e.preventDefault();
  pendingDeleteId = eventIdInput.value;

  deletePopup.classList.remove("hidden");
});

cancelDelete.addEventListener("click", () => {
  deletePopup.classList.add("hidden");
  pendingDeleteId = null;
});

confirmDelete.addEventListener("click", async () => {
  if (!pendingDeleteId) return;

  await deleteDoc(doc(db, "users", auth.currentUser.uid, "monthlyEvents", pendingDeleteId));

  pendingDeleteId = null;

  await loadAllEvents();
  renderCalendar();

  deletePopup.classList.add("hidden");
  eventModal.classList.add("hidden");

  showSuccess("Event deleted!");
});


// ===========================
//   ADD EVENT FAB
// ===========================
addEventFab.addEventListener("click", () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  openCreateEventModal(`${y}-${m}-${d}`);
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
//   INITIALIZE
// ===========================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  initTheme();
  initCurrentMonth();
  await loadAllEvents();
  renderCalendar();
  initOptionsSheet();

  prevMonthBtn.addEventListener("click", () => {
    currentMonthIndex--;
    if (currentMonthIndex < 0) {
      currentMonthIndex = 11;
      currentYear--;
    }
    renderCalendar();
  });

  nextMonthBtn.addEventListener("click", () => {
    currentMonthIndex++;
    if (currentMonthIndex > 11) {
      currentMonthIndex = 0;
      currentYear++;
    }
    renderCalendar();
  });
});
