// ===========================
//   SINGLE DAY SCHEDULE VIEW
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
  getDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
// ---------------------------
// FIREBASE
// ---------------------------
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


// ---------------------------
// DOM ELEMENTS
// ---------------------------
const themeToggle = document.getElementById("themeToggle");

const scheduleTitleEl = document.getElementById("scheduleTitle");
const scheduleSubtitleEl = document.getElementById("scheduleSubtitle");
const prevDayBtn = document.getElementById("prevDayBtn");
const nextDayBtn = document.getElementById("nextDayBtn");
const currentDayLabelEl = document.getElementById("currentDayLabel");
const dayTabs = document.querySelectorAll(".day-tab");

const dayEventsColumn = document.getElementById("dayEventsColumn");

const addEventFab = document.getElementById("addEventFab");

// Modal
const eventModal = document.getElementById("eventModal");
const eventModalTitle = document.getElementById("eventModalTitle");
const closeEventModalBtn = document.getElementById("closeEventModal");
const eventForm = document.getElementById("eventForm");
const eventIdInput = document.getElementById("eventId");
const eventTitleInput = document.getElementById("eventTitleInput");
const eventDayInput = document.getElementById("eventDayInput");
const eventColorInput = document.getElementById("eventColorInput");
const eventLocationInput = document.getElementById("eventLocationInput");
const eventDescInput = document.getElementById("eventDescInput");
const deleteEventBtn = document.getElementById("deleteEventBtn");
const eventColorDots = eventModal.querySelectorAll(".color-dot");

// Popups
const deletePopup = document.getElementById("deletePopup");
const cancelDelete = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");
const successPopup = document.getElementById("successPopup");
const successMessageEl = document.getElementById("successMessage");

let pendingDeleteId = null;

// ---------------------------
// CONSTANTS
// ---------------------------
const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" }
];

let scheduleId = null;
let scheduleMeta = null;
let events = [];
let currentDayKey = "mon";

const MIN_MINUTES = 6 * 60;  // 06:00
const MAX_MINUTES = 22 * 60; // 22:00
const VALID_MINUTES = [0, 15, 30, 45];

// ---------------------------
// THEME
// ---------------------------
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

// ---------------------------
// POPUPS
// ---------------------------
function showSuccess(msg = "Saved!") {
  successMessageEl.textContent = msg;
  successPopup.classList.remove("hidden");

  setTimeout(() => {
    successPopup.classList.add("hidden");
  }, 1600);
}

function showError(msg = "Error") {
  const popup = document.getElementById("errorPopup");
  const text = document.getElementById("errorMessage");

  text.textContent = msg;
  popup.classList.remove("hidden");

  setTimeout(() => popup.classList.add("hidden"), 1800);
}

// ---------------------------
// TIME HELPERS
// ---------------------------
function parseTimeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}


function validateTimeRangeAndStep(start, end) {
  const startM = parseTimeToMinutes(start);
  const endM = parseTimeToMinutes(end);

  const startMin = startM % 60;
  const endMin = endM % 60;

  if (startM >= endM) return showError("End time must be after start time.");
  if (startM < MIN_MINUTES || startM > MAX_MINUTES)
    return showError("Start time must be between 06:00 and 22:00.");
  if (endM < MIN_MINUTES || endM > MAX_MINUTES)
    return showError("End time must be between 06:00 and 22:00.");
  if (!VALID_MINUTES.includes(startMin) || !VALID_MINUTES.includes(endMin))
    return showError("Times must be in 15-minute steps.");

  return { startM, endM };
}

// ---------------------------
// FIRESTORE
// ---------------------------
async function loadScheduleMeta() {
  const ref = doc(db, "users", auth.currentUser.uid, "schedules", scheduleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  scheduleMeta = { id: snap.id, ...snap.data() };
  scheduleTitleEl.textContent = scheduleMeta.title;
  scheduleSubtitleEl.textContent =
    scheduleMeta.description || "Day view · 06:00 – 22:00";
}

async function loadEvents() {
  const q = query(
    collection(db, "users", auth.currentUser.uid, "scheduleEvents"),
    where("scheduleId", "==", scheduleId)
  );

  const snap = await getDocs(q);
  events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderDay(currentDayKey);
}

// ---------------------------
// RENDER DAY
// ---------------------------
function renderDay(dayKey) {
  dayEventsColumn.innerHTML = "";

  const dayEvents = events
    .filter(e => e.day === dayKey)
    .sort((a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start));

  dayEvents.forEach(evt => {
    const card = document.createElement("button");
    card.className = "day-event";
    card.style.setProperty("--event-bar", evt.color);

    const content = document.createElement("div");
    content.className = "day-event-content";

    const title = document.createElement("div");
    title.className = "day-event-title";
    title.textContent = evt.title;

    const time = document.createElement("div");
    time.className = "day-event-time";
    time.textContent = `${evt.start} – ${evt.end}`;

    content.appendChild(title);
    content.appendChild(time);

    if (evt.location) {
      const loc = document.createElement("div");
      loc.className = "day-event-location";
      loc.textContent = evt.location;
      content.appendChild(loc);
    }

    if (evt.description) {
      const desc = document.createElement("div");
      desc.className = "day-event-desc";
      desc.textContent = evt.description;
      content.appendChild(desc);
    }

    card.appendChild(content);

    card.addEventListener("click", () => openEditEventModal(evt));
    dayEventsColumn.appendChild(card);
  });
}

// ---------------------------
// MODELS & COLOR PICKER
// ---------------------------
function clearEventColorSelection() {
  eventColorDots.forEach(dot => dot.classList.remove("color-selected"));
}

function setEventColor(color) {
  clearEventColorSelection();
  eventColorDots.forEach(dot => {
    if (dot.dataset.color === color) dot.classList.add("color-selected");
  });
  eventColorInput.value = color;
}

function autoSelectFirstEventColor() {
  const first = eventColorDots[0];
  if (first) setEventColor(first.dataset.color);
}

eventColorDots.forEach(dot =>
  dot.addEventListener("click", () => setEventColor(dot.dataset.color))
);

function openCreateEventModal(day = currentDayKey) {
  eventModalTitle.textContent = "Add Slot";
  eventIdInput.value = "";
  eventTitleInput.value = "";
  eventDayInput.value = day;




  eventLocationInput.value = "";
  eventDescInput.value = "";

  autoSelectFirstEventColor();
  deleteEventBtn.classList.add("hidden");

  eventModal.classList.remove("hidden");
  eventTitleInput.focus();
}

function openEditEventModal(evt) {
  eventModalTitle.textContent = "Edit Slot";
  eventIdInput.value = evt.id;
  eventTitleInput.value = evt.title;
  eventDayInput.value = evt.day;

  const [sh, sm] = evt.start.split(":");
document.getElementById("startHourLabel").textContent = sh;
document.getElementById("startMinLabel").textContent = sm;

const [eh, em] = evt.end.split(":");
document.getElementById("endHourLabel").textContent = eh;
document.getElementById("endMinLabel").textContent = em;



  eventLocationInput.value = evt.location || "";
  eventDescInput.value = evt.description || "";

  setEventColor(evt.color);

  deleteEventBtn.classList.remove("hidden");
  eventModal.classList.remove("hidden");
  eventTitleInput.focus();
}

closeEventModalBtn.addEventListener("click", () =>
  eventModal.classList.add("hidden")
);

eventModal.addEventListener("click", e => {
  if (e.target === eventModal) eventModal.classList.add("hidden");
});

// ---------------------------
// VALIDATION & SAVE
// ---------------------------
function overlaps(startM, endM, day, ignoreId = null) {
  return events.some(evt => {
    if (evt.day !== day) return false;
    if (evt.id === ignoreId) return false;

    const a = parseTimeToMinutes(evt.start);
    const b = parseTimeToMinutes(evt.end);

    if (endM === a) return false;
    if (startM === b) return false;

    return startM < b && endM > a;
  });
}

eventForm.addEventListener("submit", async e => {
  e.preventDefault();

  const id = eventIdInput.value;
  const title = eventTitleInput.value.trim();
  const day = eventDayInput.value;
  const start = `${document.getElementById("startHourLabel").textContent}:${document.getElementById("startMinLabel").textContent}`;
const end = `${document.getElementById("endHourLabel").textContent}:${document.getElementById("endMinLabel").textContent}`;


  const color = eventColorInput.value;
  const location = eventLocationInput.value.trim();
  const description = eventDescInput.value.trim();

  if (!title || !day || !start || !end || !color)
    return showError("Please fill in all required fields.");

  const timeCheck = validateTimeRangeAndStep(start, end);
  if (!timeCheck) return;
  const { startM, endM } = timeCheck;

  if (overlaps(startM, endM, day, id))
    return showError("This time overlaps with another slot.");

  const data = {
    scheduleId,
    title,
    day,
    start,
    end,
    color,
    location,
    description,
    createdAt: serverTimestamp()
  };

  try {
    if (id) {
      await updateDoc(doc(db, "users", auth.currentUser.uid, "scheduleEvents", id), data);
      showSuccess("Slot updated!");
    } else {
      await addDoc(collection(db, "users", auth.currentUser.uid, "scheduleEvents"), data);
      showSuccess("Slot added!");
    }
    await loadEvents();
    eventModal.classList.add("hidden");
  } catch (err) {
    console.error(err);
    showError("Could not save slot.");
  }
});

// ---------------------------
// DELETE FLOW
// ---------------------------
deleteEventBtn.addEventListener("click", () => {
  pendingDeleteId = eventIdInput.value;
  deletePopup.classList.remove("hidden");
});

cancelDelete.addEventListener("click", () => {
  deletePopup.classList.add("hidden");
  pendingDeleteId = null;
});

confirmDelete.addEventListener("click", async () => {
  if (!pendingDeleteId) return;

  try {
    await deleteDoc(doc(db, "users", auth.currentUser.uid, "scheduleEvents", pendingDeleteId));
    showSuccess("Slot deleted!");
    pendingDeleteId = null;
    deletePopup.classList.add("hidden");
    eventModal.classList.add("hidden");
    await loadEvents();
  } catch (err) {
    console.error(err);
    showError("Could not delete slot.");
  }
});

// ---------------------------
// DAY NAVIGATION
// ---------------------------
function setCurrentDay(k) {
  currentDayKey = k;

  const obj = DAYS.find(d => d.key === k);
  currentDayLabelEl.textContent = obj.label;

  dayTabs.forEach(btn => {
    btn.classList.toggle("day-tab-active", btn.dataset.dayTab === k);
  });

  renderDay(k);
}

function initDayNav() {
  const js = new Date().getDay();
  const map = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  setCurrentDay(map[js] || "mon");

  dayTabs.forEach(btn =>
    btn.addEventListener("click", () => setCurrentDay(btn.dataset.dayTab))
  );

  prevDayBtn.addEventListener("click", () => {
    const idx = DAYS.findIndex(d => d.key === currentDayKey);
    setCurrentDay(DAYS[(idx + 6) % 7].key);
  });

  nextDayBtn.addEventListener("click", () => {
    const idx = DAYS.findIndex(d => d.key === currentDayKey);
    setCurrentDay(DAYS[(idx + 1) % 7].key);
  });
}
function createTimeDropdown(menuEl, labelEl, values) {
  menuEl.innerHTML = "";

  values.forEach(val => {
    const item = document.createElement("div");
    item.textContent = val;
    item.addEventListener("click", () => {
      labelEl.textContent = val;
      menuEl.style.display = "none";
    });
    menuEl.appendChild(item);
  });
}
function initTimePickers() {
  const hours = [];
  for (let h = 6; h <= 22; h++) hours.push(String(h).padStart(2, "0"));

  const mins = ["00", "15", "30", "45"];

  // START
  createTimeDropdown(
    document.getElementById("startHourMenu"),
    document.getElementById("startHourLabel"),
    hours
  );

  createTimeDropdown(
    document.getElementById("startMinMenu"),
    document.getElementById("startMinLabel"),
    mins
  );

  // END
  createTimeDropdown(
    document.getElementById("endHourMenu"),
    document.getElementById("endHourLabel"),
    hours
  );

  createTimeDropdown(
    document.getElementById("endMinMenu"),
    document.getElementById("endMinLabel"),
    mins
  );

  // Toggle menus on click
  document.querySelectorAll(".custom-dropdown").forEach(drop => {
    drop.addEventListener("click", () => {
      const menu = drop.querySelector(".dropdown-menu");
      const isOpen = menu.style.display === "block";
      document.querySelectorAll(".dropdown-menu").forEach(m => (m.style.display = "none"));
      menu.style.display = isOpen ? "none" : "block";
    });
  });

  // Close menus when clicking outside
  document.addEventListener("click", e => {
    if (!e.target.closest(".custom-dropdown")) {
      document.querySelectorAll(".dropdown-menu").forEach(m => (m.style.display = "none"));
    }
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
// ---------------------------
// INIT
// ---------------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  initTheme();
  initTimePickers();
  initOptionsSheet();

  scheduleId = new URLSearchParams(window.location.search).get("id");
  if (!scheduleId) {
    scheduleTitleEl.textContent = "No schedule selected";
    return;
  }

  initDayNav();
  await loadScheduleMeta();
  await loadEvents();

  addEventFab.addEventListener("click", () => openCreateEventModal());
});
