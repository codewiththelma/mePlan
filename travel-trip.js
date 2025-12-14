import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* 🔁 SAME CONFIG AS YOUR OTHER FILES */
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

/* -------------------------
   URL PARAM
-------------------------- */
const params = new URLSearchParams(window.location.search);
const tripId = params.get("id");

/* -------------------------
   DOM
-------------------------- */
const tripTitle = document.getElementById("tripTitle");
const tripDates = document.getElementById("tripDates");
const tripStatus = document.getElementById("tripStatus");
const tripImage = document.getElementById("tripImage");

/* Lists */
const placesList = document.getElementById("placesList");
const foodList = document.getElementById("foodList");

/* Notes */
const notesDisplay = document.getElementById("notesDisplay");
const notesTextarea = document.getElementById("notesTextarea");

/* Buttons */
const addPlaceBtn = document.getElementById("addPlaceBtn");
const addFoodBtn = document.getElementById("addFoodBtn");
const editNotesBtn = document.getElementById("editNotesBtn");

/* Modals */
const placeModal = document.getElementById("placeModal");
const foodModal = document.getElementById("foodModal");
const notesModal = document.getElementById("notesModal");

/* Inputs */
const placeInput = document.getElementById("placeInput");
const foodInput = document.getElementById("foodInput");

/* Popups */
const deletePopup = document.getElementById("deletePopup");
const successPopup = document.getElementById("successPopup");

const successMessage = document.getElementById("successMessage");
const errorPopup = document.getElementById("errorPopup");
const errorMessage = document.getElementById("errorMessage");

const themeToggleBtn = document.getElementById("themeToggle");
const optionsBtn = document.getElementById("optionsBtn");
const optionsSheet = document.getElementById("optionsSheet");
const optionsBackdrop = document.getElementById("optionsBackdrop");
const optionsCloseBtn = document.getElementById("optionsCloseBtn");

/* Popup buttons */
const confirmDeleteBtn = deletePopup.querySelector(".delete-btn");
const cancelDeleteBtn = deletePopup.querySelector(".cancel-btn");

let currentUser = null;
let deleteTarget = null;
let currentImageUrl = null;


/* -------------------------
   HELPERS
-------------------------- */
const dayMs = 1000 * 60 * 60 * 24;

function totalDays(start, end) {
  return Math.round((end - start) / dayMs) + 1;
}

function statusText(start, end) {
  const today = new Date();
  if (today < start) return `In ${Math.ceil((start - today) / dayMs)} days`;
  if (today > end) return "Past";
  return "Current";
}

function showModal(modal) {
  modal.classList.remove("hidden");
}

function hideModal(modal) {
  modal.classList.add("hidden");
}

function showSuccess(message = 'Saved') {
  successMessage.textContent = message;
  successPopup.classList.remove("hidden");
  setTimeout(() => successPopup.classList.add("hidden"), 1500);
}

function showError(message) {
  errorMessage.textContent = message;
  errorPopup.classList.remove("hidden");
  setTimeout(() => errorPopup.classList.add("hidden"), 1800);
}
/* -------------------------
   LOAD TRIP
-------------------------- */
async function loadTrip() {
  const snap = await getDocs(
    collection(db, "users", currentUser.uid, "trips")
  );

  const tripDoc = snap.docs.find(d => d.id === tripId);
  if (!tripDoc) return;

  const trip = tripDoc.data();

  const start = new Date(trip.start);
  const end = new Date(trip.end);

  tripTitle.textContent = trip.title;
  tripFrom.textContent = prettyDate(trip.start);
  tripTo.textContent = prettyDate(trip.end);

tripStatus.innerHTML =
  `<i class="fa-solid fa-clock"></i> ${statusText(start, end)}`;
  tripImage.src = trip.image || "travel.jpeg";

  notesDisplay.textContent = trip.notes || "";
}

function prettyDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
/* -------------------------
   LOAD LIST (PLACES / FOOD)
-------------------------- */
async function loadChecklist(type, listEl) {
  listEl.innerHTML = "";

  const q = query(
    collection(db, "users", currentUser.uid, type),
    where("tripId", "==", tripId)
  );

  const snap = await getDocs(q);

  snap.docs.forEach(d => {
    const item = d.data();
    const li = document.createElement("li");

    li.innerHTML = `
      <button class="check-btn">
        <i class="${item.completed ? "fa-solid fa-circle-check" : "fa-regular fa-circle"}"></i>
      </button>
      <span class="${item.completed ? "completed" : ""}">${item.text}</span>
      <button class="icon-button-sm trash-btn">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;

    /* Toggle */
    li.querySelector(".check-btn").onclick = async () => {
      await updateDoc(
        doc(db, "users", currentUser.uid, type, d.id),
        { completed: !item.completed }
      );
      loadChecklist(type, listEl);
    };

    /* Delete */
    li.querySelector(".trash-btn").onclick = () => {
      deleteTarget = { type, id: d.id };
      deletePopup.classList.remove("hidden");
    };

    listEl.appendChild(li);
  });
}

/* -------------------------
   ADD ITEMS
-------------------------- */
async function addItem(type, text) {
  if (!text.trim()) return;

  await addDoc(
    collection(db, "users", currentUser.uid, type),
    {
      tripId,
      text,
      completed: false,
      createdAt: serverTimestamp()
    }
  );

  showSuccess("Added");
}

/* -------------------------
   NOTES
-------------------------- */
async function saveNotes() {
  const text = notesTextarea.value;

  await updateDoc(
    doc(db, "users", currentUser.uid, "trips", tripId),
    { notes: text }
  );

  notesDisplay.textContent = text;
  hideModal(notesModal);
  showSuccess("Notes saved");
}

/* -------------------------
   DELETE CONFIRM
-------------------------- */
confirmDeleteBtn.onclick = async () => {
  if (!deleteTarget) return;

  await deleteDoc(
    doc(db, "users", currentUser.uid, deleteTarget.type, deleteTarget.id)
  );

  deletePopup.classList.add("hidden");
  deleteTarget = null;

  loadChecklist("tripPlaces", placesList);
  loadChecklist("tripFood", foodList);

  showSuccess("Deleted");
};

cancelDeleteBtn.onclick = () => {
  deleteTarget = null;
  deletePopup.classList.add("hidden");
};

/* -------------------------
   EVENTS
-------------------------- */
addPlaceBtn.onclick = () => {
  placeInput.value = "";
  showModal(placeModal);
};

addFoodBtn.onclick = () => {
  foodInput.value = "";
  showModal(foodModal);
};

editNotesBtn.onclick = () => {
  notesTextarea.value = notesDisplay.textContent;
  showModal(notesModal);
};

/* Modal close buttons */
document.querySelectorAll(".modal-close").forEach(btn => {
  btn.onclick = () => hideModal(btn.closest(".modal-overlay"));
});

/* Save buttons */
placeModal.querySelector(".btn-primary").onclick = async () => {
  await addItem("tripPlaces", placeInput.value);
  hideModal(placeModal);
  loadChecklist("tripPlaces", placesList);
};

foodModal.querySelector(".btn-primary").onclick = async () => {
  await addItem("tripFood", foodInput.value);
  hideModal(foodModal);
  loadChecklist("tripFood", foodList);
};

notesModal.querySelector(".btn-primary").onclick = saveNotes;

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

document.querySelectorAll(".trip-section.collapsible").forEach(section => {
  const btn = section.querySelector(".collapse-btn");
  if (!btn) return;

  btn.onclick = e => {
    e.stopPropagation();
    section.classList.toggle("collapsed");
  };
});


/* -------------------------
   AUTH
-------------------------- */
onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  currentUser = user;
  initTheme();
  initOptionsSheet();
  loadTrip();
  document.body.classList.remove("spa-preload");
  document.getElementById("preloader").style.display = "none";
  loadChecklist("tripPlaces", placesList);
  loadChecklist("tripFood", foodList);
});
