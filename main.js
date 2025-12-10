// main.js

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAfuSGsTNTCeJETOHuum5p8f5MWpDib-Ok",
  authDomain: "myplanner-d7f1a.firebaseapp.com",
  projectId: "myplanner-d7f1a",
  storageBucket: "myplanner-d7f1a.firebasestorage.app",
  messagingSenderId: "70472912562",
  appId: "1:70472912562:web:f7ea2e04b997d22b4ac3ab",
  measurementId: "G-19TRC7MTP4"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

const auth = getAuth();

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  });
});

// DOM
const todayLabelEl = document.getElementById("todayLabel");
const todayEventsEl = document.getElementById("todayEvents");
const themeToggleBtn = document.getElementById("themeToggle");
const quoteTextEl = document.getElementById("quoteText");
const quoteRefEl = document.getElementById("quoteRef");
const optionsBtn = document.getElementById("optionsBtn");
const optionsSheet = document.getElementById("optionsSheet");
const optionsBackdrop = document.getElementById("optionsBackdrop");
const optionsCloseBtn = document.getElementById("optionsCloseBtn");


// ---------- THEME ----------

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("meplan-theme", theme);

  const iconEl = themeToggleBtn.querySelector("i");
  iconEl.classList.remove("fa-moon", "fa-sun");
  iconEl.classList.add(theme === "dark" ? "fa-sun" : "fa-moon");

}

function initTheme() {
  const saved = localStorage.getItem("meplan-theme");
  const prefersDark = window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  applyTheme(theme);

  themeToggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(current === "dark" ? "light" : "dark");
  });

}

// ---------- DATE + TODAY HEADER ----------

function renderTodayHeader() {
  const now = new Date();
  const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekday = weekdayNames[now.getDay()];
  const day = now.getDate();
  const month = monthNames[now.getMonth()];

  todayLabelEl.textContent = `Today • ${weekday}, ${day} ${month}`;
}

// ---------- FIRESTORE: TODAY EVENTS ----------

async function fetchTodayEvents() {
  const today = new Date();
  const isoDate = today.toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    const ref = collection(db, "users", auth.currentUser.uid, "monthlyEvents");
    const q = query(ref, where("date", "==", isoDate));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (err) {
    console.error("Error fetching events:", err);
    return [];
  }
}

function renderEvents(events) {
  todayEventsEl.innerHTML = "";

  if (!events || events.length === 0) {
    const empty = document.createElement("p");
    empty.className = "today-empty";
    empty.textContent = "No events today.";
    todayEventsEl.appendChild(empty);
    return;
  }

  events
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach(evt => {
      const row = document.createElement("div");
      row.className = "event-row";

      const colorBar = document.createElement("div");
      colorBar.className = "event-color";
      if (evt.color) colorBar.style.background = evt.color;

      const textWrap = document.createElement("div");
      textWrap.className = "event-text";

      const title = document.createElement("span");
      title.className = "event-title";
      title.textContent = evt.title || "Untitled event";

      textWrap.appendChild(title);

      row.appendChild(colorBar);
      row.appendChild(textWrap);
      todayEventsEl.appendChild(row);
    });
}

// ---------- VERSE OF THE DAY ----------
const bibleVerses = [
  { ref: "Philippians 4:13 (NIV)", text: "I can do all this through him who gives me strength." },
  { ref: "Matthew 6:34 (NIV)", text: "Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own." },
  { ref: "Deuteronomy 31:6 (NIV)", text:
    "Be strong and courageous. Do not be afraid or terrified... for the Lord your God goes with you; he will never leave you nor forsake you."
  },
  { ref: "Psalm 118:24 (NIV)", text: "The Lord has done it this very day; let us rejoice today and be glad." },
  { ref: "John 10:10 (NIV)", text: "I have come that they may have life, and have it to the full." },
  { ref: "Luke 1:37 (NIV)", text: "For no word from God will ever fail." },
  { ref: "Ephesians 3:18-19 (NIV)", text:
    "to grasp how wide and long and high and deep is the love of Christ, and to know this love that surpasses knowledge."
  },
  { ref: "John 14:27 (NIV)", text:
    "Peace I leave with you; my peace I give you. Do not let your hearts be troubled and do not be afraid."
  },
  { ref: "Romans 8:6 (NIV)", text:
    "The mind governed by the flesh is death, but the mind governed by the Spirit is life and peace."
  },
  { ref: "Philippians 4:6 (NIV)", text:
    "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God."
  },
  { ref: "Psalm 23:1 (NIV)", text: "The Lord is my shepherd, I lack nothing." },
  { ref: "Proverbs 3:5 (NIV)", text:
    "Trust in the Lord with all your heart and lean not on your own understanding."
  },
  { ref: "Ephesians 3:20 (NIV)", text:
    "Now to him who is able to do immeasurably more than all we ask or imagine..."
  },
  { ref: "Isaiah 41:10 (NIV)", text:
    "Do not fear, for I am with you... I will strengthen you and help you."
  },
  { ref: "Jeremiah 29:11 (NIV)", text:
    "For I know the plans I have for you... plans to prosper you and not to harm you."
  },
  { ref: "Joshua 1:9 (NIV)", text:
    "Be strong and courageous... for the Lord your God will be with you wherever you go."
  },
  { ref: "Psalm 46:10 (NIV)", text:
    "He says, 'Be still, and know that I am God.'"
  },
  { ref: "Isaiah 40:31 (NIV)", text:
    "Those who hope in the Lord will renew their strength. They will soar on wings like eagles."
  }
];


// Choose verse once per day
function getDailyVerse() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const saved = JSON.parse(localStorage.getItem("dailyVerse"));

  if (saved && saved.date === todayKey) {
     return saved;  // use existing
  }

  const verse = bibleVerses[Math.floor(Math.random() * bibleVerses.length)];

  const data = { date: todayKey, ...verse };
  localStorage.setItem("dailyVerse", JSON.stringify(data));

  return data;
}

function loadVerse() {
  const verse = getDailyVerse();
  quoteTextEl.textContent = verse.text;
  quoteRefEl.textContent = verse.ref;
}

async function fetchHabitsToday() {
  const habitsCol = collection(db, "users", auth.currentUser.uid, "habits");
  const snapshot = await getDocs(habitsCol);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    completedDates: doc.data().completedDates || [], // ensure array exists
    streak: doc.data().streak || 0
  }));
}

async function homeToggleHabit(habit) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = formatDateKey(new Date(Date.now() - 86400000));

  const habitRef = doc(db, "users", auth.currentUser.uid, "habits", habit.id);
  const dates = habit.completedDates || [];
  const alreadyDone = dates.includes(today);

  // UNMARK TODAY
  if (alreadyDone) {
    const newDates = dates.filter(d => d !== today);
    const newStreak = Math.max(0, (habit.streak || 0) - 1);

    await updateDoc(habitRef, {
      completedDates: newDates,
      streak: newStreak
    });

    await loadHomeHabits();
    return;
  }

  // MARK TODAY
  let newDates = [...dates, today];
  let newStreak = 1;

  // If yesterday was done, continue streak
  if (dates.includes(yesterday)) {
    newStreak = (habit.streak || 0) + 1;
  }

  await updateDoc(habitRef, {
    completedDates: newDates,
    streak: newStreak
  });

  await loadHomeHabits();
}


async function loadHomeHabits() {
  const listEl = document.getElementById("todayHabits");
  listEl.innerHTML = "";

  const habits = await fetchHabitsToday();
  const today = new Date().toISOString().slice(0, 10);

  if (!habits.length) {
    listEl.innerHTML = `<p class="today-empty">No habits created yet.</p>`;
    return;
  }

  const completed = habits.filter(h => h.completedDates.includes(today));
  const incomplete = habits.filter(h => !h.completedDates.includes(today));

  // All done
  if (completed.length === habits.length) {
    listEl.innerHTML = `<p class="today-empty">All habits completed 🎉</p>`;
    return;
  }

  // Show only incomplete
  incomplete.forEach(habit => {
    const isDone = habit.completedDates.includes(today);

    const item = document.createElement("div");
    item.className = "home-habit-item";

    const left = document.createElement("div");
    left.className = "home-habit-left";

    const name = document.createElement("span");
    name.className = "home-habit-title";
    name.textContent = habit.title;

    const streak = document.createElement("span");
    streak.className = "home-habit-streak";

    const s = habit.streak || 0;
    streak.textContent = s === 1 ? "🔥 1 day" : `🔥 ${s} days`;

    left.appendChild(name);
    left.appendChild(streak);

    const markBtn = document.createElement("button");
    markBtn.className = "home-habit-mark";

    markBtn.innerHTML = isDone
      ? `<i class="fa-solid fa-check"></i>`
      : `<i class="fa-regular fa-circle"></i>`;

    markBtn.addEventListener("click", () => homeToggleHabit(habit));

    item.appendChild(left);
    item.appendChild(markBtn);

    listEl.appendChild(item);
  });
}


function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}


// ---------- MINI CARD NAV (stub) ----------

function initMiniCardNavigation() {
  const cards = document.querySelectorAll(".mini-card");
  cards.forEach(card => {
    card.addEventListener("click", () => {
      const target = card.dataset.target;
      console.log("Open mini:", target);
      window.location.href = `${target}.html`;
    });
  });
}

// ---------- BOTTOM NAV (stub) ----------

function initBottomNav() {
  const items = document.querySelectorAll(".nav-item");
  items.forEach(item => {
    item.addEventListener("click", () => {
      
      if (item.dataset.nav === "calendar") {
        console.log("Go to calendar view");
        window.location.href = "calendar.html";
      }
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


// ---------- INIT ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

 initTheme();
  renderTodayHeader();
  initMiniCardNavigation();
  initBottomNav();
  initOptionsSheet();


  const events = await fetchTodayEvents();
  renderEvents(events);
  loadVerse(); // don’t await so UI shows faster
  await loadHomeHabits();
});