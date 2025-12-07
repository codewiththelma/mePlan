import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
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
const auth = getAuth(app);
const db = getFirestore(app);

// Set persistence SAFELY
setPersistence(auth, browserLocalPersistence);

const form = document.getElementById("loginForm");
const err = document.getElementById("authError");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const input = loginEmail.value.trim().toLowerCase();
  const password = loginPassword.value.trim();

  let emailToUse = input;

  try {
    // If user typed username instead of email → fetch email
    if (!input.includes("@")) {
      const q = query(
        collection(db, "users"),
        where("username", "==", input)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        throw new Error("No such username");
      }

      emailToUse = snap.docs[0].data().email;
    }

    await signInWithEmailAndPassword(auth, emailToUse, password);
    window.location.href = "index.html";

  } catch (error) {
    console.log(error);
    err.textContent = "Incorrect email/username or password.";
    err.classList.remove("hidden");
  }
});

onAuthStateChanged(auth, user => {
  if (user) window.location.href = "index.html";
});