import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* =========================
   FIREBASE
========================= */

const firebaseConfig = {
  apiKey: "AIzaSyAfuSGsTNTCeJETOHuum5p8f5MWpDib-Ok",
  authDomain: "myplanner-d7f1a.firebaseapp.com",
  projectId: "myplanner-d7f1a",
  storageBucket: "myplanner-d7f1a.firebasestorage.app",
  messagingSenderId: "70472912562",
  appId: "1:70472912562:web:f7ea2e04b997d22b4ac3ab"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

/* =========================
   DOM
========================= */

const tripList = document.getElementById("tripList");
const emptyState = document.getElementById("travelEmpty");
const fab = document.getElementById("addTripFab");

const modal = document.getElementById("tripModal");
const closeModal = document.getElementById("closeTripModal");
const form = document.getElementById("tripForm");

const tripIdInput = document.getElementById("tripId");
const titleInput = document.getElementById("tripTitle");
const startInput = document.getElementById("tripStart");
const endInput = document.getElementById("tripEnd");
const imageInput = document.getElementById("tripImage");

const deletePopup = document.getElementById("deletePopup");
const cancelDelete = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");

/* Global popups (already used elsewhere in your app) */
const successPopup = document.getElementById("successPopup");
const successMessage = document.getElementById("successMessage");
const errorPopup = document.getElementById("errorPopup");
const errorMessage = document.getElementById("errorMessage");

const themeToggleBtn = document.getElementById("themeToggle");
const optionsBtn = document.getElementById("optionsBtn");
const optionsSheet = document.getElementById("optionsSheet");
const optionsBackdrop = document.getElementById("optionsBackdrop");
const optionsCloseBtn = document.getElementById("optionsCloseBtn");
/* =========================
   STATE
========================= */

let trips = [];
let pendingDeleteId = null;

function showSuccess(message) {
  successMessage.textContent = message;
  successPopup.classList.remove("hidden");
  setTimeout(() => successPopup.classList.add("hidden"), 1500);
}

function showError(message) {
  errorMessage.textContent = message;
  errorPopup.classList.remove("hidden");
  setTimeout(() => errorPopup.classList.add("hidden"), 1800);
}

const dayMs = 1000 * 60 * 60 * 24;

function diffDays(a, b) {
  return Math.round((b - a) / dayMs) + 1;
}

function statusText(start, end) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (today < start) return `In ${Math.ceil((start - today) / dayMs)} days`;
  if (today > end) return "Past";
  return "Current";
}

function formatDate(date) {
  const d = new Date(date);
  const day = d.toLocaleDateString("en-GB", { weekday: "short" });
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  const num = d.getDate();

  const suffix =
    num % 10 === 1 && num !== 11 ? "st" :
    num % 10 === 2 && num !== 12 ? "nd" :
    num % 10 === 3 && num !== 13 ? "rd" : "th";

  return `${day} ${num}${suffix} ${month}`;
}

/* =========================
   RENDER
========================= */

function renderTrips() {
  tripList.innerHTML = "";

  if (!trips.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  trips.forEach(trip => {
    const start = new Date(trip.start);
    const end = new Date(trip.end);
    const totalDays = diffDays(start, end);

    const card = document.createElement("div");
    card.className = "card travel-goal-card";

    card.innerHTML = `
      <div class="travel-card-main">
        <div class="travel-icon-circle">
          <img src="${trip.image || "travel.jpeg"}" class="travel-icon-img">
        </div>

        <div class="travel-right">
          <div class="travel-card-text">
            <p class="saving-title">${trip.title}</p>
            <p class="saving-subtitle">
              ${formatDate(trip.start)} – ${formatDate(trip.end)} (${totalDays} days)
            </p>
            <span class="saving-clock">
              <i class="fa-solid fa-clock"></i>
              ${statusText(start, end)}
            </span>
          </div>

          <div class="saving-card-actions">
            <button class="saving-menu-btn">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>

            <div class="inline-actions hidden">
              <button class="travel-button-only edit-btn">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="travel-button-only danger delete-btn">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    card.querySelector(".travel-card-text").onclick = () => {
      location.href = `travel-trip.html?id=${trip.id}`;
    };

    const menuBtn = card.querySelector(".saving-menu-btn");
    const inlineActions = card.querySelector(".inline-actions");
    const editBtn = card.querySelector(".edit-btn");
    const deleteBtn = card.querySelector(".delete-btn");

    menuBtn.onclick = e => {
      e.stopPropagation();
      document.querySelectorAll(".inline-actions").forEach(a => {
        if (a !== inlineActions) a.classList.add("hidden");
      });
      inlineActions.classList.toggle("hidden");
    };

    editBtn.onclick = e => {
      e.stopPropagation();
      inlineActions.classList.add("hidden");
      openEditTrip(trip);
    };

    deleteBtn.onclick = e => {
      e.stopPropagation();
      inlineActions.classList.add("hidden");
      pendingDeleteId = trip.id;
      deletePopup.classList.remove("hidden");
    };

    tripList.appendChild(card);
  });
}

/* =========================
   LOAD
========================= */

async function loadTrips() {
  const snap = await getDocs(
    collection(db, "users", auth.currentUser.uid, "trips")
  );

  trips = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderTrips();
}

/* =========================
   MODALS
========================= */

fab.onclick = () => {
  document.getElementById("tripModalTitle").textContent = "Add Trip";
  tripIdInput.value = "";
  form.reset();
  modal.classList.remove("hidden");
};

closeModal.onclick = () => modal.classList.add("hidden");

function openEditTrip(trip) {
  document.getElementById("tripModalTitle").textContent = "Edit Trip";
  tripIdInput.value = trip.id;
  titleInput.value = trip.title;
  startInput.value = trip.start;
  endInput.value = trip.end;
  imageInput.value = trip.image || "";
  modal.classList.remove("hidden");
}

/* =========================
   DELETE POPUP
========================= */

cancelDelete.onclick = () => {
  pendingDeleteId = null;
  deletePopup.classList.add("hidden");
};

confirmDelete.onclick = async () => {
  if (!pendingDeleteId) return;

  await deleteDoc(
    doc(db, "users", auth.currentUser.uid, "trips", pendingDeleteId)
  );

  pendingDeleteId = null;
  deletePopup.classList.add("hidden");
  showSuccess("Trip deleted");
  loadTrips();
};

/* =========================
   SAVE TRIP
========================= */

form.onsubmit = async e => {
  e.preventDefault();

  const startDate = new Date(startInput.value);
  const endDate = new Date(endInput.value);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  if (endDate < startDate) {
    showError("End date cannot be before start date");
    return;
  }

  const imageUrl = imageInput.value.trim() || null;


  const data = {
    title: titleInput.value.trim(),
    start: startInput.value,
    end: endInput.value,
    image: imageUrl,
    createdAt: serverTimestamp()
  };

  if (tripIdInput.value) {
    await updateDoc(
      doc(db, "users", auth.currentUser.uid, "trips", tripIdInput.value),
      data
    );
    showSuccess("Trip updated");
  } else {
    await addDoc(
      collection(db, "users", auth.currentUser.uid, "trips"),
      data
    );
    showSuccess("Trip added");
  }

  modal.classList.add("hidden");
  loadTrips();
};
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("meplan-theme", theme);

  const iconEl = themeToggleBtn.querySelector("i");
  iconEl.classList.remove("fa-moon", "fa-sun");
  iconEl.classList.add(theme === "dark" ? "fa-sun" : "fa-moon");

}

function initTheme() {
  const saved = localStorage.getItem("meplan-theme");
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const theme = saved || (prefersDark ? "dark" : "light");
  applyTheme(theme);

  themeToggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(current === "dark" ? "light" : "dark");
  });
}
function initOptionsSheet() {
  if (!optionsBtn || !optionsSheet || !optionsBackdrop) return;

  function showOptions() {
    optionsSheet.classList.remove("hidden");
    requestAnimationFrame(() => optionsSheet.classList.add("show"));
    optionsBackdrop.classList.remove("hidden");
  }

  function hideOptions() {
    optionsSheet.classList.remove("show");
    optionsBackdrop.classList.add("hidden");
    setTimeout(() => optionsSheet.classList.add("hidden"), 230);
  }

  optionsBtn.addEventListener("click", showOptions);
  optionsBackdrop.addEventListener("click", hideOptions);
  optionsCloseBtn.addEventListener("click", hideOptions);
}

/* =========================
   AUTH
========================= */

onAuthStateChanged(auth, async(user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }
  initTheme();
  initOptionsSheet();
  await loadTrips();
  document.body.classList.remove("spa-preload");
  document.getElementById("preloader").style.display = "none";
});
