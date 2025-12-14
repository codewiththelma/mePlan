// calendar.js — Year view with dots + day popover
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
// --- Firebase ---
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
// --- DOM ---
const themeToggle = document.getElementById("themeToggle");

const yearTitleEl = document.getElementById("yearTitle");
const prevYearBtn = document.getElementById("prevYear");
const nextYearBtn = document.getElementById("nextYear");
const yearMonthsEl = document.getElementById("yearMonths");

const dayPopover = document.getElementById("dayPopover");
const popoverDateLabel = document.getElementById("popoverDateLabel");
const popoverEventsList = document.getElementById("popoverEvents");

// --- State ---
let currentYear;
let eventsByDate = {}; // { "YYYY-MM-DD": [events...] }


// ============================
// THEME (same as other pages)
// ============================
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

// ============================
// DATA LOADING
// ============================
async function loadEvents() {
  const snapshot = await getDocs(collection(db, "users", auth.currentUser.uid, "monthlyEvents"));
  const allEvents = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  const map = {};
  allEvents.forEach(evt => {
    if (!evt.date) return;
    if (!map[evt.date]) map[evt.date] = [];
    map[evt.date].push(evt);
  });
  eventsByDate = map;
}

// ============================
// RENDER YEAR
// ============================
function initCurrentYear() {
  const now = new Date();
  currentYear = now.getFullYear();
}

function renderYear() {
  yearMonthsEl.innerHTML = "";
  yearTitleEl.textContent = currentYear;

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthCard = document.createElement("section");
    monthCard.className = "year-month-card";
    monthCard.id = `month-${monthIndex}`;
    // header
    const header = document.createElement("div");
    header.className = "year-month-header";
    header.textContent = monthNames[monthIndex];
    monthCard.appendChild(header);

    // weekday row
    const weekdayRow = document.createElement("div");
    weekdayRow.className = "year-weekdays";
    const weekdayShort = ["M","T","W","T","F","S","S"];
    weekdayShort.forEach(label => {
      const span = document.createElement("span");
      span.textContent = label;
      weekdayRow.appendChild(span);
    });
    monthCard.appendChild(weekdayRow);

    // grid
    const grid = document.createElement("div");
    grid.className = "year-days-grid";

    const firstOfMonth = new Date(currentYear, monthIndex, 1);
    const firstDayIndex = (firstOfMonth.getDay() + 6) % 7; // 0=Mon
    const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();

    const yearStr = currentYear.toString();
    const monthStr = String(monthIndex + 1).padStart(2, "0");

    // empty cells
    for (let i = 0; i < firstDayIndex; i++) {
      const empty = document.createElement("div");
      empty.className = "year-day-cell year-day-empty";
      grid.appendChild(empty);
    }

    // real days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, "0");
      const dateKey = `${yearStr}-${monthStr}-${dayStr}`;
      const dayCell = document.createElement("button");
      dayCell.type = "button";
      dayCell.className = "year-day-cell";
      dayCell.dataset.date = dateKey;

      const num = document.createElement("span");
      num.className = "year-day-number";
      num.textContent = day;
      dayCell.appendChild(num);

      const dotWrapper = document.createElement("span");
      dotWrapper.className = "year-day-dot-wrap";

      const events = eventsByDate[dateKey] || [];
      if (events.length > 0) {
        const dot = document.createElement("span");
        dot.className = "year-day-dot";
        // use first event color
        dot.style.background = events[0].color || "var(--accent)";
        dotWrapper.appendChild(dot);
        dayCell.classList.add("year-day-has-events");
      }

      dayCell.appendChild(dotWrapper);

      dayCell.addEventListener("click", (e) => {
        e.stopPropagation();
        showDayPopover(dateKey, events, dayCell);
      });

      grid.appendChild(dayCell);
    }

    monthCard.appendChild(grid);
    yearMonthsEl.appendChild(monthCard);
  }
  const today = new Date();
    const actualCurrentYear = today.getFullYear();
    const actualCurrentMonth = today.getMonth();

    if (currentYear === actualCurrentYear) {
    setTimeout(() => {
        const el = document.getElementById(`month-${actualCurrentMonth-1}`);
        if (el) {
        el.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
        }
    }, 80);
    }


}

// ============================
// DAY POPOVER
// ============================
function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekdays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const w = weekdays[date.getDay()];
  const monthShort = months[date.getMonth()];

  return `${w} ${d} ${monthShort} ${y}`;
}

function showDayPopover(dateStr, events, anchorEl) {
  popoverDateLabel.textContent = formatDateLabel(dateStr);
  popoverEventsList.innerHTML = "";

  // Fill event list
  if (!events || events.length === 0) {
    const li = document.createElement("li");
    li.className = "day-popover-empty";
    li.textContent = "No events";
    popoverEventsList.appendChild(li);
  } else {
    events.forEach(evt => {
      const li = document.createElement("li");
      li.className = "day-popover-item";

      const dot = document.createElement("span");
      dot.className = "day-popover-item-dot";
      dot.style.background = evt.color;

      const text = document.createElement("span");
      text.className = "day-popover-item-text";
      text.textContent = evt.title;

      li.appendChild(dot);
      li.appendChild(text);
      popoverEventsList.appendChild(li);
    });
  }

  // ---- POSITIONING FIX ----
  const rect = anchorEl.getBoundingClientRect();
  const pageX = rect.left + rect.width / 2 + window.scrollX;
  const pageY = rect.top + window.scrollY;

  // determine day of week
  const dayIndex = anchorEl.cellIndex ?? anchorEl.dataset.dayIndex;

  let offsetX = 0;

  // Monday/Tues → push right
  if (rect.left < 80) offsetX = 60;

  // Sat/Sun → push left
  if (window.innerWidth - rect.right < 80) offsetX = -60;

  dayPopover.style.left = `${pageX + offsetX}px`;
  dayPopover.style.top = `${pageY - 10}px`;

  dayPopover.classList.remove("hidden");
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
// hide when clicking elsewhere
document.addEventListener("click", (e) => {
  if (!dayPopover.classList.contains("hidden")) {
    if (!dayPopover.contains(e.target)) {
      dayPopover.classList.add("hidden");
    }
  }
});

window.addEventListener("scroll", () => {
  if (!dayPopover.classList.contains("hidden")) {
    dayPopover.classList.add("hidden");
  }
});


onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // --- Everything below is EXACTLY the same as your original ---
  
  initTheme();
  initCurrentYear();

  await loadEvents();
  renderYear();
  initOptionsSheet();
  document.body.classList.remove("spa-preload");
  document.getElementById("preloader").style.display = "none";

  prevYearBtn.addEventListener("click", async () => {
    currentYear--;
    renderYear();
  });

  nextYearBtn.addEventListener("click", async () => {
    currentYear++;
    renderYear();
  });
});
