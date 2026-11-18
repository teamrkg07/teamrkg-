

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyB40cH1N72k0P5fptLW68kVG3tlrdX27tw",
  authDomain: "team-rkg.firebaseapp.com",
  projectId: "team-rkg",
  storageBucket: "team-rkg.firebasestorage.app",
  messagingSenderId: "503442196575",
  appId: "1:503442196575:web:fb522764ba6efff44ef3ea",
  measurementId: "G-QG13ZE12PT"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
