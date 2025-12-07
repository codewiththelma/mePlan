// ===============================
//  FIREBASE INIT
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc,
  getDocs, doc, serverTimestamp, deleteField
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
// FIREBASE CONFIG
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

// ===============================
//  DOM ELEMENTS
// ===============================
const themeToggle = document.getElementById("themeToggle");
const habitListEl = document.getElementById("habitList");
const habitEmptyStateEl = document.getElementById("habitEmptyState");
const addFab = document.getElementById("addFab");

const habitModal = document.getElementById("habitModal");
const habitModalTitle = document.getElementById("habitModalTitle");
const closeHabitModalBtn = document.getElementById("closeHabitModal");
const habitForm = document.getElementById("habitForm");
const habitIdInput = document.getElementById("habitId");
const habitTitleInput = document.getElementById("habitTitleInput");
const habitColorInput = document.getElementById("habitColorInput");
const habitColorDots = habitModal.querySelectorAll(".color-dot");
const deleteHabitBtn = document.getElementById("deleteHabitBtn");

const deletePopup = document.getElementById("deletePopup");
const cancelDelete = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");

const successPopup = document.getElementById("successPopup");
const successMessageEl = document.getElementById("successMessage");

const dateStrip = document.getElementById("habitDateStrip");

// ===============================
//  STATE
// ===============================
let habits = [];
let pendingDeleteId = null;
let selectedDateKey = formatDateKey(new Date());

// ===============================
//  THEME
// ===============================
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

    generateDateStrip();
    renderHabits();
  });
}

// ===============================
//  DATE HELPERS
// ===============================
function formatDateKey(date) {
  let yyyy = date.getFullYear();
  let mm = String(date.getMonth() + 1).padStart(2, "0");
  let dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getTodayKey() {
  return formatDateKey(new Date());
}

function getYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateKey(d);
}

function getWeekdayShort(date) {
  return date.toLocaleDateString("en-GB", { weekday: "short" });
}

// ===============================
//  DATE STRIP
// ===============================
function generateDateStrip() {
  dateStrip.innerHTML = "";

  for (let offset = -15; offset <= 15; offset++) {
    const d = new Date();
    d.setDate(d.getDate() + offset);

    const key = formatDateKey(d);

    const btn = document.createElement("button");
    btn.className = "habit-date-btn";

    const weekday = document.createElement("div");
    weekday.className = "habit-date-weekday";
    weekday.textContent = getWeekdayShort(d);

    const number = document.createElement("div");
    number.className = "habit-date-number";
    number.textContent = d.getDate();

    btn.appendChild(weekday);
    btn.appendChild(number);

    if (key === selectedDateKey) {
      btn.classList.add("habit-date-active");
    }
    if (key === getTodayKey()) {
  btn.classList.add("today-date");
}


    btn.addEventListener("click", () => {
      selectedDateKey = key;
      generateDateStrip();
      renderHabits();
    });

    dateStrip.appendChild(btn);
  }

  const active = dateStrip.querySelector(".habit-date-active");
  if (active) active.scrollIntoView({ inline: "center", behavior: "instant" });
}

// ===============================
//  AUTO-MIGRATION
// ===============================
async function migrateHabit(habit) {
  if (habit.completedDates) return habit; // already migrated

  let completedDates = [];

  if (habit.lastCompletedDate) {
    completedDates = [habit.lastCompletedDate];
  }

  await updateDoc(doc(db, "users", auth.currentUser.uid, "habits", habit.id), {
    completedDates,
    lastCompletedDate: deleteField()
  });

  habit.completedDates = completedDates;
  return habit;
}

// ===============================
//  AUTO RESET STREAK
// ===============================
function autoResetStreak(habit) {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  const dates = habit.completedDates || [];
  const last = dates[dates.length - 1];

  if (!last) return 0;

  if (last === today) return habit.streak || 0;
  if (last === yesterday) return habit.streak || 0;

  return 0;
}

// ===============================
//  LOAD HABITS
// ===============================
async function loadHabits() {
  const snap = await getDocs(collection(db, "users", auth.currentUser.uid, "habits"));

  habits = [];

  for (let d of snap.docs) {
    let h = { id: d.id, ...d.data() };

    // Migrate old → new
    h = await migrateHabit(h);

    // Reset streak if needed
    const newStreak = autoResetStreak(h);
    if (newStreak !== h.streak) {
      await updateDoc(doc(db, "users", auth.currentUser.uid, "habits", h.id), { streak: newStreak });
      h.streak = newStreak;
    }

    habits.push(h);
  }

  renderHabits();
}

// ===============================
//  MARK TODAY COMPLETE
// ===============================
async function markHabitToday(habit) {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  if (selectedDateKey !== today) {
    showError("You can only complete today's habits!");
    return;
  }

  const dates = habit.completedDates || [];

  const alreadyDone = dates.includes(today);

  // UNMARK TODAY
  if (alreadyDone) {
    const newDates = dates.filter(d => d !== today);
    const newStreak = Math.max(0, (habit.streak || 0) - 1);

    await updateDoc(doc(db, "users", auth.currentUser.uid, "habits", habit.id), {
      completedDates: newDates,
      streak: newStreak
    });

    showSuccess("Marked as not done");
    await loadHabits();
    return;
  }

  // MARK TODAY
  let newDates = [...dates, today];
  let newStreak = 1;

  if (dates.includes(yesterday)) {
    newStreak = (habit.streak || 0) + 1;
  }

  await updateDoc(doc(db, "users", auth.currentUser.uid, "habits", habit.id), {
    completedDates: newDates,
    streak: newStreak
  });

  showSuccess("Habit completed!");
  await loadHabits();
}

// ===============================
//  ORIGINAL PASTELIZE() — RESTORED
// ===============================
function pastelize(hex) {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  console.log(isDark)
  // ORIGINAL PASTEL FOR LIGHT MODE (unchanged)
  function lightPastel(hex) {
    let c = hex.replace("#", "");
    let r = parseInt(c.substring(0, 2), 16);
    let g = parseInt(c.substring(2, 4), 16);
    let b = parseInt(c.substring(4, 6), 16);

    r = Math.floor((r + 255 * 3) / 4);
    g = Math.floor((g + 255 * 3) / 4);
    b = Math.floor((b + 255 * 3) / 4);

    return `rgb(${r}, ${g}, ${b})`;
  }

  // **NEW DARK MODE PASTEL** (rich, tinted, NOT bright)
  function darkPastel(hex) {
    let c = hex.replace("#", "");
    let r = parseInt(c.substring(0, 2), 16);
    let g = parseInt(c.substring(2, 4), 16);
    let b = parseInt(c.substring(4, 6), 16);

    // Darken toward neutral darkness
    r = Math.floor(r +255 * 0.85)/2;
    g = Math.floor(g +255 *0.85)/2;
    b = Math.floor(b +255 *0.85)/2;

    return `rgb(${r}, ${g}, ${b})`;
  }

  return isDark ? darkPastel(hex) : lightPastel(hex);
}


// ===============================
//  RENDER HABITS
// ===============================
function renderHabits() {
  habitListEl.innerHTML = "";

  if (!habits.length) {
    habitEmptyStateEl.classList.remove("hidden");
    return;
  }
  habitEmptyStateEl.classList.add("hidden");

  const today = getTodayKey();

  habits.forEach(habit => {
    const li = document.createElement("li");
    li.className = "habit-item";

    const completed = habit.completedDates?.includes(selectedDateKey);

    if (completed) {
      li.style.background = pastelize(habit.color);
    }

    // LEFT
    const left = document.createElement("div");
    left.className = "habit-left";

    const textWrap = document.createElement("div");
    textWrap.className = "habit-text-wrap";

    const title = document.createElement("span");
    title.className = "habit-title";
    title.textContent = habit.title;

    const s = habit.streak || 0;
    const meta = document.createElement("span");
    meta.className = "habit-meta";
    meta.textContent = s === 1 ? "🔥 1 day" : `🔥 ${s} days`;

    textWrap.appendChild(title);
    textWrap.appendChild(meta);
    left.appendChild(textWrap);

    // BUTTON
    const markBtn = document.createElement("button");
    markBtn.className = "habit-mark-btn";

    if (completed) {
      markBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
      markBtn.classList.add("habit-mark-btn-done");
    } else {
      markBtn.innerHTML = '<i class="fa-regular fa-circle"></i>';
    }

    if (selectedDateKey !== today) {
      markBtn.classList.add("disabled-check");
    }

    markBtn.addEventListener("click", () => {
      if (selectedDateKey === today) {
        markHabitToday(habit);
      }
    });

    // ACTIONS
    const actions = document.createElement("div");
    actions.className = "habit-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-button-sm";
    editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
    editBtn.addEventListener("click", () => openEditHabitModal(habit));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-button-sm";
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    deleteBtn.addEventListener("click", () => {
      pendingDeleteId = habit.id;
      deletePopup.classList.remove("hidden");
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.flexDirection = "column";
    right.style.alignItems = "flex-end";
    right.style.gap = "4px";

    right.appendChild(markBtn);
    right.appendChild(actions);

    li.appendChild(left);
    li.appendChild(right);

    habitListEl.appendChild(li);
  });
}

// ===============================
//  MODAL HANDLERS
// ===============================
function openCreateHabitModal() {
  habitModalTitle.textContent = "Add Habit";
  habitIdInput.value = "";
  habitTitleInput.value = "";
  habitColorInput.value = "#a855f7";
  deleteHabitBtn.classList.add("hidden");
  habitModal.classList.remove("hidden");
}

function openEditHabitModal(habit) {
  habitModalTitle.textContent = "Edit Habit";
  habitIdInput.value = habit.id;
  habitTitleInput.value = habit.title;
  habitColorInput.value = habit.color;

  habitColorDots.forEach(dot =>
    dot.classList.toggle("color-selected", dot.dataset.color === habit.color)
  );

  deleteHabitBtn.classList.remove("hidden");
  habitModal.classList.remove("hidden");
}

closeHabitModalBtn.addEventListener("click", () =>
  habitModal.classList.add("hidden")
);

habitForm.addEventListener("submit", async e => {
  e.preventDefault();

  const id = habitIdInput.value;
  const title = habitTitleInput.value.trim();
  const color = habitColorInput.value;

  if (!title || !color) return;

  if (id) {
    await updateDoc(doc(db, "users", auth.currentUser.uid, "habits", id), { title, color });
    showSuccess("Habit updated!");
  } else {
    await addDoc(collection(db, "users", auth.currentUser.uid, "habits"), {
      title,
      color,
      streak: 0,
      completedDates: [],
      createdAt: serverTimestamp(),
    });
    showSuccess("Habit added!");
  }

  habitModal.classList.add("hidden");
  await loadHabits();
});

// ===============================
//  COLOR PICKER
// ===============================
habitColorDots.forEach(dot => {
  dot.addEventListener("click", () => {
    habitColorDots.forEach(d => d.classList.remove("color-selected"));
    dot.classList.add("color-selected");
    habitColorInput.value = dot.dataset.color;
  });
});

// ===============================
//  DELETE
// ===============================
cancelDelete.addEventListener("click", () => {
  deletePopup.classList.add("hidden");
});

confirmDelete.addEventListener("click", async () => {
  await deleteDoc(doc(db, "users", auth.currentUser.uid, "habits", pendingDeleteId));
  deletePopup.classList.add("hidden");
  habitModal.classList.add("hidden");
  showSuccess("Habit deleted!");
  await loadHabits();
});

// ===============================
//  POPUPS
// ===============================
function showSuccess(msg) {
  successMessageEl.textContent = msg;
  successPopup.classList.remove("hidden");
  setTimeout(() => successPopup.classList.add("hidden"), 1600);
}

function showError(msg) {
  const popup = document.getElementById("errorPopup");
  const text = document.getElementById("errorMessage");

  text.textContent = msg;
  popup.classList.remove("hidden");

  setTimeout(() => popup.classList.add("hidden"), 1800);
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

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

initTheme();
initOptionsSheet();
generateDateStrip();
loadHabits();
});

addFab.addEventListener("click", openCreateHabitModal);
