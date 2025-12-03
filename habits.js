// ===============================
//  FIREBASE
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc,
  getDocs, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

// Track current selected date (default = today)
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

  // 🔥 FORCE RE-RENDER AFTER THEME CHANGE
  generateDateStrip();
  renderHabits();
});

}

// ===============================
//  DATE HELPERS
// ===============================
function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayKey() {
  return formatDateKey(new Date());
}

function getWeekdayShort(date) {
  return date.toLocaleDateString("en-GB", { weekday: "short" });
}

// ===============================
//  DATE STRIP (INFINITE SCROLL STYLE)
// ===============================
function generateDateStrip() {
  dateStrip.innerHTML = "";

  // Show -15 days → +15 days
  for (let offset = -15; offset <= 15; offset++) {
    const d = new Date();
    d.setDate(d.getDate() + offset);

    const dayBtn = document.createElement("button");
    dayBtn.className = "habit-date-btn";

    const weekday = document.createElement("div");
    weekday.className = "habit-date-weekday";
    weekday.textContent = getWeekdayShort(d);

    const dayNum = document.createElement("div");
    dayNum.className = "habit-date-number";
    dayNum.textContent = d.getDate();

    dayBtn.appendChild(weekday);
    dayBtn.appendChild(dayNum);

    const key = formatDateKey(d);

    if (key === selectedDateKey) {
      dayBtn.classList.add("habit-date-active");
    }

    dayBtn.addEventListener("click", () => {
      selectedDateKey = key;
      generateDateStrip();
      renderHabits();
    });

    dateStrip.appendChild(dayBtn);
  }
  // After appending all buttons:
  const todayKey = getTodayKey();
  const buttons = dateStrip.querySelectorAll(".habit-date-btn");
  buttons.forEach(btn => {
    if (btn.classList.contains("habit-date-active")) {
      btn.scrollIntoView({ inline: "center", behavior: "instant" });
    }
  });

}

// ===============================
//  FIRESTORE LOAD
// ===============================
async function loadHabits() {
  const snap = await getDocs(collection(db, "habits"));
  habits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderHabits();
}

// ===============================
//  STREAK LOGIC + MARK TODAY
// ===============================
async function markHabitToday(habit) {
  const todayKey = getTodayKey();

  if (selectedDateKey !== todayKey) {
    showError("You can only complete today's habits!");
    return;
  }

  // --- TOGGLE LOGIC ---
  const isAlreadyDone = habit.lastCompletedDate === todayKey;

  if (isAlreadyDone) {
    // UNDO today
    let newStreak = habit.streak || 0;

    // If streak was > 1, reduce by 1
    if (newStreak > 1) {
      newStreak = newStreak - 1;
    } else {
      newStreak = 0;
    }

    await updateDoc(doc(db, "habits", habit.id), {
      lastCompletedDate: "",
      streak: newStreak
    });

    showSuccess("Marked as not done");
    await loadHabits();
    return;
  }

  // --- MARK AS DONE ---
  const yesterdayKey = formatDateKey(new Date(Date.now() - 86400000));
  let newStreak = 1;

  if (habit.lastCompletedDate === yesterdayKey) {
    newStreak = (habit.streak || 0) + 1;
  }

  await updateDoc(doc(db, "habits", habit.id), {
    lastCompletedDate: todayKey,
    streak: newStreak
  });

  showSuccess("Habit completed!");
  await loadHabits();
}


// ===============================
//  RENDER HABITS
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


function renderHabits() {
  habitListEl.innerHTML = "";

  if (!habits.length) {
    habitEmptyStateEl.classList.remove("hidden");
    return;
  }
  habitEmptyStateEl.classList.add("hidden");

  habits.forEach(habit => {
    const li = document.createElement("li");
    li.className = "habit-item";

    const isCompletedToday =
      habit.lastCompletedDate === getTodayKey() &&
      selectedDateKey === getTodayKey();

    if (isCompletedToday) {
      li.style.background = pastelize(habit.color);
    }

    // LEFT PART
    const left = document.createElement("div");
    left.className = "habit-left";

    const textWrap = document.createElement("div");
    textWrap.className = "habit-text-wrap";

    const title = document.createElement("span");
    title.className = "habit-title";
    title.textContent = habit.title;

    const meta = document.createElement("span");
    meta.className = "habit-meta";
    meta.textContent = `🔥 ${habit.streak || 0} Days`;


    textWrap.appendChild(title);
    textWrap.appendChild(meta);
    left.appendChild(textWrap);

    // MARK BUTTON
    const markBtn = document.createElement("button");
    markBtn.className = "habit-mark-btn";

    if (isCompletedToday) {
      markBtn.classList.add("habit-mark-btn-done");
      markBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else {
      markBtn.innerHTML = '<i class="fa-regular fa-circle"></i>';
    }

    // Only allow marking today
    markBtn.addEventListener("click", async () => {
      await markHabitToday(habit);
    });

    // ACTIONS
    const actions = document.createElement("div");
    actions.className = "habit-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-button-sm";
    editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-button-sm";
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';

    editBtn.addEventListener("click", () => {
      openEditHabitModal(habit);
    });

    deleteBtn.addEventListener("click", () => {
      pendingDeleteId = habit.id;
      deletePopup.classList.remove("hidden");
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(left);

    const rightCol = document.createElement("div");
    rightCol.style.display = "flex";
    rightCol.style.flexDirection = "column";
    rightCol.style.alignItems = "flex-end";
    rightCol.style.justifyContent = "center";
    rightCol.style.gap = "4px";

    rightCol.appendChild(markBtn);
    rightCol.appendChild(actions);

    li.appendChild(rightCol);


    habitListEl.appendChild(li);
  });
}

// ===============================
//  MODALS
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
  setHabitColor(habit.color);
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
    await updateDoc(doc(db, "habits", id), { title, color });
    showSuccess("Habit updated!");
  } else {
    await addDoc(collection(db, "habits"), {
      title,
      color,
      streak: 0,
      lastCompletedDate: "",
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
function clearHabitColorSelection() {
  habitColorDots.forEach(dot => dot.classList.remove("color-selected"));
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

function setHabitColor(color) {
  clearHabitColorSelection();
  habitColorDots.forEach(dot => {
    if (dot.dataset.color === color) {
      dot.classList.add("color-selected");
    }
  });
  habitColorInput.value = color;
}

habitColorDots.forEach(dot => {
  dot.addEventListener("click", () =>
    setHabitColor(dot.dataset.color)
  );
});

// ===============================
//  DELETE HABIT
// ===============================
cancelDelete.addEventListener("click", () => {
  deletePopup.classList.add("hidden");
});

confirmDelete.addEventListener("click", async () => {
  await deleteDoc(doc(db, "habits", pendingDeleteId));
  deletePopup.classList.add("hidden");
  habitModal.classList.add("hidden");
  showSuccess("Habit deleted!");
  await loadHabits();
});

// ===============================
//  SUCCESS POPUP
// ===============================
function showSuccess(msg = "Success!") {
  successMessageEl.textContent = msg;
  successPopup.classList.remove("hidden");

  setTimeout(() => {
    successPopup.classList.add("hidden");
  }, 1600);
}
function showError(msg = "Something went wrong") {
  const popup = document.getElementById("errorPopup");
  const text = document.getElementById("errorMessage");

  text.textContent = msg;
  popup.classList.remove("hidden");

  setTimeout(() => popup.classList.add("hidden"), 1800);
}

// ===============================
//  INIT
// ===============================
initTheme();
initOptionsSheet();
generateDateStrip();
loadHabits();

addFab.addEventListener("click", openCreateHabitModal);
