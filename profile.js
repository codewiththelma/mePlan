import {
  getAuth,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  signOut,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

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
const auth = getAuth(app);
const db = getFirestore();


// -------------------------------------
// ELEMENTS
// -------------------------------------
const nameInput = document.getElementById("profileName");
const emailInput = document.getElementById("profileEmail");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const logoutBtn = document.getElementById("logoutBtn");
const deleteAccountBtn = document.getElementById("deleteAccountBtn");

const themeToggleBtn = document.getElementById("themeToggle");
const optionsBtn = document.getElementById("optionsBtn");
const optionsSheet = document.getElementById("optionsSheet");
const optionsBackdrop = document.getElementById("optionsBackdrop");
const optionsCloseBtn = document.getElementById("optionsCloseBtn");


// -------------------------------------
// SUCCESS + ERROR POPUPS
// -------------------------------------
function showSuccess(message) {
  const popup = document.createElement("div");
  popup.className = "success-overlay";
  popup.innerHTML = `
    <div class="success-card">
      <div class="success-icon"><i class="fa-solid fa-check"></i></div>
      <div class="success-text">${message}</div>
    </div>
  `;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 2000);
}

function showError(msg = "Error") {
  const popup = document.getElementById("errorPopup");
  const text = document.getElementById("errorMessage");

  text.innerHTML = msg;
  popup.classList.remove("hidden");

  setTimeout(() => popup.classList.add("hidden"), 1800);
}


// -------------------------------------
// DELETE CONFIRM POPUP
// -------------------------------------
function showDeletePopup(message, onConfirm) {
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";

  overlay.innerHTML = `
    <div class="popup-card">
      <div class="popup-text">${message}</div>
      <div class="popup-buttons">
        <button class="popup-btn cancel-btn">Cancel</button>
        <button class="popup-btn delete-btn">Confirm</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector(".cancel-btn").onclick = () => overlay.remove();
  overlay.querySelector(".delete-btn").onclick = () => {
    overlay.remove();
    onConfirm();
  };
}


// -------------------------------------
// PASSWORD MODAL
// -------------------------------------
const passwordModal = document.getElementById("passwordModal");
const closePasswordModal = document.getElementById("closePasswordModal");
const cancelPasswordBtn = document.getElementById("cancelPasswordBtn");
const savePasswordBtn = document.getElementById("savePasswordBtn");

const currentPasswordInput = document.getElementById("currentPasswordInput");
const newPasswordInput = document.getElementById("newPasswordInput");

changePasswordBtn.addEventListener("click", () => {
  currentPasswordInput.value = "";
  newPasswordInput.value = "";
  passwordModal.classList.remove("hidden");
});

function closePassword() {
  passwordModal.classList.add("hidden");
}

closePasswordModal.onclick = closePassword;
cancelPasswordBtn.onclick = closePassword;


// -------------------------------------
// SAVE NEW PASSWORD (with re-auth)
// -------------------------------------
savePasswordBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const currentPass = currentPasswordInput.value.trim();
  const newPass = newPasswordInput.value.trim();

  if (newPass.length < 6) {
    showError("Password must be at least 6 characters");
    return;
  }

  try {
    // Reauthenticate BEFORE updating password
    const credential = EmailAuthProvider.credential(user.email, currentPass);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPass);

    closePassword();
    showSuccess("Password updated!");

  } catch (err) {
    console.error(err);

    if (err.code === "auth/wrong-password") {
      showError("Current password incorrect");
    } else {
      showError("Could not update password");
    }
  }
});


// -------------------------------------
// UPDATE USERNAME
// -------------------------------------
nameInput.addEventListener("change", async () => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await updateProfile(user, { displayName: nameInput.value });
    showSuccess("Username updated!");
  } catch (err) {
    console.error(err);
    showError("Could not update username.");
  }
});


// -------------------------------------
// LOGOUT
// -------------------------------------
logoutBtn.addEventListener("click", () => {
  showDeletePopup("Logout from your account?", async () => {
    await signOut(auth);
    showSuccess("Logged out");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 600);
  });
});


// -------------------------------------
// DELETE ACCOUNT
// -------------------------------------
deleteAccountBtn.addEventListener("click", () => {
  showDeletePopup("Delete your account permanently?", async () => {
    try {
      await deleteUser(auth.currentUser);
      showSuccess("Account deleted");
      setTimeout(() => {
        window.location.href = "signup.html";
      }, 600);
    } catch (err) {
      console.error(err);
      showError("Re-login required before deleting account");
    }
  });
});


// -------------------------------------
// THEME
// -------------------------------------
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("meplan-theme", theme);

  const iconEl = themeToggleBtn.querySelector("i");
  iconEl.classList.remove("fa-moon", "fa-sun");
  iconEl.classList.add(theme === "dark" ? "fa-sun" : "fa-moon");

  const logoEl = document.getElementById("brandLogo");
  if (logoEl) {
    logoEl.src = theme === "dark" ? "logo-dark.png" : "logo.png";
  }
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


// -------------------------------------
// OPTIONS SHEET
// -------------------------------------
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


// -------------------------------------
// LOAD USER DATA
// -------------------------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  initTheme();
  initOptionsSheet();

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const data = userDoc.data();

  nameInput.value = data?.username || user.displayName || "";
  emailInput.value = user.email;

  const createdField = document.getElementById("profileCreated");
  if (createdField && data?.createdOn) {
    createdField.value = new Date(data.createdOn).toLocaleDateString();
  }
});
