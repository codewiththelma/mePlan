import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  fetchSignInMethodsForEmail
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";


// ------------------------------------------------
// Firebase Init
// ------------------------------------------------
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
const db = getFirestore(app);


// ------------------------------------------------
// Elements
// ------------------------------------------------
const form = document.getElementById("signupForm");

const usernameInput = document.getElementById("signupUsername");
const emailInput = document.getElementById("signupEmail");
const pw1Input = document.getElementById("signupPassword");
const pw2Input = document.getElementById("signupPassword2");


// ------------------------------------------------
// Helper: show error under input
// ------------------------------------------------
function showFieldError(input, message) {
  clearFieldError(input);

  input.classList.add("input-error");

  const msg = document.createElement("div");
  msg.className = "field-error-text";
  msg.textContent = message;
  input.insertAdjacentElement("afterend", msg);
}

function clearFieldError(input) {
  input.classList.remove("input-error");

  const next = input.nextElementSibling;
  if (next && next.classList.contains("field-error-text")) {
    next.remove();
  }
}


// ------------------------------------------------
// Live username validation
// ------------------------------------------------
usernameInput.addEventListener("input", () => {
  const value = usernameInput.value.trim().toLowerCase();
  usernameInput.value = value;

  clearFieldError(usernameInput);

  if (value.length < 3) {
    showFieldError(usernameInput, "Username must be at least 3 characters");
  } else if (!/^[a-z0-9]+$/.test(value)) {
    showFieldError(usernameInput, "Only letters and numbers, no spaces");
  }
});


// ------------------------------------------------
// Submit Handler
// ------------------------------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // clear all previous errors
  [usernameInput, emailInput, pw1Input, pw2Input].forEach(clearFieldError);

  const username = usernameInput.value.trim().toLowerCase();
  const email = emailInput.value.trim().toLowerCase();
  const pw1 = pw1Input.value;
  const pw2 = pw2Input.value;

  // username validation
  if (username.length < 3 || !/^[a-z0-9]+$/.test(username)) {
    showFieldError(usernameInput, "Invalid username");
    return;
  }

  // passwords match?
  if (pw1 !== pw2) {
    showFieldError(pw2Input, "Passwords do not match");
    return;
  }

  // ----------------------------
  //  UNIQUE USERNAME CHECK
  // ----------------------------
  try {
    const q = query(collection(db, "users"), where("username", "==", username));
    const snap = await getDocs(q);

    if (!snap.empty) {
      showFieldError(usernameInput, "Username already taken");
      return;
    }
  } catch (err) {
    showFieldError(usernameInput, "Could not validate username");
    return;
  }


  // ----------------------------
  //  UNIQUE EMAIL CHECK
  // ----------------------------
  try {
    const existing = await fetchSignInMethodsForEmail(auth, email);

    if (existing.length > 0) {
      showFieldError(emailInput, "Email already registered");
      return;
    }
  } catch (err) {
    // Firebase can throw errors here — fallback to field error
    showFieldError(emailInput, "Invalid or already used email");
    return;
  }


  // ----------------------------
  //  CREATE ACCOUNT
  // ----------------------------
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, pw1);

    await updateProfile(userCred.user, { displayName: username });

    await setDoc(doc(db, "users", userCred.user.uid), {
      uid: userCred.user.uid,
      username,
      email,
      createdOn: new Date().toISOString()
    });

    window.location.href = "index.html";

  } catch (error) {
    console.error(error);


    if (error.code === "auth/weak-password") {
      showFieldError(pw1Input, "Password is too weak");
    } else if(error.code === "auth/email-already-in-use"){
      showFieldError(emailInput, "Email is already registered");
    }else if (error.code === "auth/invalid-email") {
      showFieldError(emailInput, "Invalid email address");
    } else {
      showFieldError(emailInput, "Could not create account");
    }
    
  }
});
