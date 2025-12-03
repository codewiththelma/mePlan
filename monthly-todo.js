// ===========================
//   MONTHLY TO-DO (BY MONTH)
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
  serverTimestamp,
  query,
  where
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

// ---- DOM ----
const themeToggle = document.getElementById("themeToggle");

const todoMonthTitleEl = document.getElementById("todoMonthTitle");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");

const todoListEl = document.getElementById("todoList");
const todoEmptyStateEl = document.getElementById("todoEmptyState");

const addTodoFab = document.getElementById("addTodoFab");

const todoModal = document.getElementById("todoModal");
const closeTodoModalBtn = document.getElementById("closeTodoModal");
const todoForm = document.getElementById("todoForm");
const todoIdInput = document.getElementById("todoId");
const todoTitleInput = document.getElementById("todoTitleInput");
const deleteTodoBtn = document.getElementById("deleteTodoBtn");

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
let currentMonthIndex; // 0-11
let currentMonthTodos = [];

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
//   MONTH HELPERS
// ===========================
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function initCurrentMonth() {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonthIndex = now.getMonth();
}

function getMonthKey(year, monthIndex) {
  const m = String(monthIndex + 1).padStart(2, "0");
  return `${year}-${m}`;
}

function updateMonthTitle() {
  todoMonthTitleEl.textContent = `${MONTH_NAMES[currentMonthIndex]} ${currentYear}`;
}

// ===========================
//   LOAD TODOS FOR MONTH
// ===========================
async function loadTodosForCurrentMonth() {
  const monthKey = getMonthKey(currentYear, currentMonthIndex);
  const q = query(collection(db, "monthlyTodos"), where("monthKey", "==", monthKey));
  const snap = await getDocs(q);

  currentMonthTodos = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  renderTodoList();
}

// ===========================
//   RENDER LIST
// ===========================
function renderTodoList() {
  todoListEl.innerHTML = "";

  if (!currentMonthTodos.length) {
    todoEmptyStateEl.classList.remove("hidden");
    return;
  }

  todoEmptyStateEl.classList.add("hidden");

  currentMonthTodos
    .sort((a, b) => {
      // Incomplete first, then by createdAt
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.createdAt?.seconds && b.createdAt?.seconds) {
        return a.createdAt.seconds - b.createdAt.seconds;
      }
      return 0;
    })
    .forEach(todo => {
      const li = document.createElement("li");
      li.className = "todo-item";

      // Left side: checkbox + text
      const left = document.createElement("div");
      left.className = "todo-left";

      const checkboxWrap = document.createElement("button");
      checkboxWrap.className = "todo-checkbox";
      checkboxWrap.type = "button";

      const checkboxIcon = document.createElement("i");
      checkboxIcon.className = todo.completed
        ? "fa-solid fa-circle-check"
        : "fa-regular fa-circle";
      checkboxWrap.appendChild(checkboxIcon);

      const titleSpan = document.createElement("span");
      titleSpan.className = "todo-title";
      if (todo.completed) {
        titleSpan.classList.add("todo-title-completed");
      }
      titleSpan.textContent = todo.title;

      left.appendChild(checkboxWrap);
      left.appendChild(titleSpan);

      // Right side: actions
      const actions = document.createElement("div");
      actions.className = "todo-actions";

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

      // --- Events ---

      // Toggle complete
      checkboxWrap.addEventListener("click", async () => {
        const newCompleted = !todo.completed;
        await updateDoc(doc(db, "monthlyTodos", todo.id), { completed: newCompleted });
        todo.completed = newCompleted;
        showSuccess("Task updated");
        await loadTodosForCurrentMonth();
      });

      // Edit
      editBtn.addEventListener("click", () => {
        openEditTodoModal(todo);
      });

      // Delete (popup)
      deleteBtn.addEventListener("click", () => {
        pendingDeleteId = todo.id;
        deletePopup.classList.remove("hidden");
      });

      todoListEl.appendChild(li);
    });
}

// ===========================
//   MODAL HELPERS
// ===========================
function openCreateTodoModal() {
  todoModalTitle.textContent = "Add Task";
  todoIdInput.value = "";
  todoTitleInput.value = "";
  deleteTodoBtn.classList.add("hidden");

  todoModal.classList.remove("hidden");
  todoTitleInput.focus();
}

function openEditTodoModal(todo) {
  todoModalTitle.textContent = "Edit Task";
  todoIdInput.value = todo.id;
  todoTitleInput.value = todo.title;
  deleteTodoBtn.classList.remove("hidden");

  todoModal.classList.remove("hidden");
  todoTitleInput.focus();
}

function closeTodoModal() {
  todoModal.classList.add("hidden");
}

// Get modal title element (after DOM is ready)
const todoModalTitle = document.getElementById("todoModalTitle");

// Close modal X or background click
closeTodoModalBtn.addEventListener("click", closeTodoModal);

todoModal.addEventListener("click", (e) => {
  if (e.target === todoModal) {
    closeTodoModal();
  }
});

// ===========================
//   SAVE (ADD / UPDATE)
// ===========================
todoForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = todoIdInput.value;
  const title = todoTitleInput.value.trim();

  if (!title) return;

  const monthKey = getMonthKey(currentYear, currentMonthIndex);

  if (id) {
    await updateDoc(doc(db, "monthlyTodos", id), { title });
    showSuccess("Task updated!");
  } else {
    await addDoc(collection(db, "monthlyTodos"), {
      title,
      monthKey,
      completed: false,
      createdAt: serverTimestamp()
    });
    showSuccess("Task added!");
  }

  await loadTodosForCurrentMonth();
  closeTodoModal();
});

// ===========================
//   DELETE (POPUP)
// ===========================
deleteTodoBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const id = todoIdInput.value;
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

  await deleteDoc(doc(db, "monthlyTodos", pendingDeleteId));
  pendingDeleteId = null;

  await loadTodosForCurrentMonth();

  deletePopup.classList.add("hidden");
  closeTodoModal();
  showSuccess("Task deleted!");
});

// ===========================
//   FAB
// ===========================
addTodoFab.addEventListener("click", () => {
  openCreateTodoModal();
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
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  initCurrentMonth();
  updateMonthTitle();
  initOptionsSheet();
  await loadTodosForCurrentMonth();

  prevMonthBtn.addEventListener("click", async () => {
    currentMonthIndex--;
    if (currentMonthIndex < 0) {
      currentMonthIndex = 11;
      currentYear--;
    }
    updateMonthTitle();
    await loadTodosForCurrentMonth();
  });

  nextMonthBtn.addEventListener("click", async () => {
    currentMonthIndex++;
    if (currentMonthIndex > 11) {
      currentMonthIndex = 0;
      currentYear++;
    }
    updateMonthTitle();
    await loadTodosForCurrentMonth();
  });
});
