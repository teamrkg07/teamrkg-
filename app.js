
import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loginButton = document.getElementById("login-open");
const profileForm = document.getElementById("profile-form");
const complaintForm = document.getElementById("complaint-form");
const suggestionForm = document.getElementById("suggestion-form");

const statusForm = document.getElementById("complaint-status-form");
const statusResult = document.getElementById("complaint-status-result");
const tokenResult = document.getElementById("complaint-token-result");

let currentUser = null;

// Login / Registration Window
const loginBox = document.createElement("div");

loginBox.id = "account-login-box";
loginBox.style.cssText = `
  display:none;
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.7);
  z-index:9999;
  justify-content:center;
  align-items:center;
  padding:20px;
`;

loginBox.innerHTML = `
  <div style="
    background:white;
    padding:25px;
    border-radius:12px;
    width:100%;
    max-width:380px;
    color:#102544;
  ">
    <h2>विद्यार्थी अकाउंट</h2>

    <label>ईमेल आईडी</label>
    <input id="account-email" type="email"
      placeholder="अपनी ईमेल आईडी लिखें"
      autocomplete="email">

    <label style="display:block;margin-top:12px">
      पासवर्ड
    </label>
    <input id="account-password" type="password"
      placeholder="कम से कम 6 अक्षर"
      autocomplete="current-password">

    <button id="account-register"
      class="btn btn-primary"
      style="margin-top:15px;width:100%">
      नया अकाउंट बनाएँ
    </button>

    <button id="account-login"
      class="btn btn-primary"
      style="margin-top:10px;width:100%">
      पहले से अकाउंट है? लॉगिन करें
    </button>

    <p id="account-message"
      style="margin-top:12px;font-size:14px"></p>

    <button id="account-close"
      class="btn btn-light"
      style="margin-top:10px">
      बंद करें
    </button>
  </div>
`;

document.body.appendChild(loginBox);

const accountEmail = document.getElementById("account-email");
const accountPassword = document.getElementById("account-password");
const accountMessage = document.getElementById("account-message");

// प्रोफाइल फॉर्म भरना
function fillProfileForm(student) {
  Object.keys(student).forEach((key) => {
    const field = profileForm.elements.namedItem(key);

    if (field && student[key] !== undefined && student[key] !== null) {
      field.value = student[key];
    }
  });
}

// प्रोफाइल लोड करना
async function loadProfile(user) {
  try {
    const profileRef = doc(db, "profiles", user.uid);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      fillProfileForm(profileSnap.data());
    }

    const emailField = profileForm.elements.namedItem("email");

    if (emailField) {
      emailField.value = user.email || "";
    }
  } catch (error) {
    console.error("प्रोफाइल लोड त्रुटि:", error);
    alert("प्रोफाइल लोड नहीं हो सकी।");
  }
}

// Login Window खोलना
loginButton.addEventListener("click", () => {
  if (currentUser) {
    if (confirm("क्या आप लॉगआउट करना चाहते हैं?")) {
      signOut(auth).catch((error) => {
        alert("लॉगआउट नहीं हुआ: " + error.message);
      });
    }
    return;
  }

  loginBox.style.display = "flex";
  accountMessage.textContent = "";
});

// Login Window बंद करना
document.getElementById("account-close").addEventListener("click", () => {
  loginBox.style.display = "none";
});

// Email और Password की जाँच
function getCredentials() {
  const email = accountEmail.value.trim();
  const password = accountPassword.value;

  if (!email || !password) {
    throw new Error("ईमेल और पासवर्ड दोनों भरें।");
  }

  if (password.length < 6) {
    throw new Error("पासवर्ड कम से कम 6 अक्षर का होना चाहिए।");
  }

  return { email, password };
}

// नया अकाउंट
document.getElementById("account-register").addEventListener("click", async () => {
  try {
    const { email, password } = getCredentials();
    accountMessage.textContent = "अकाउंट बनाया जा रहा है...";

    await createUserWithEmailAndPassword(auth, email, password);

    loginBox.style.display = "none";
    alert("अकाउंट बन गया है। अब अपनी प्रोफाइल भरें।");
  } catch (error) {
    accountMessage.textContent = "अकाउंट नहीं बना: " + error.message;
  }
});

// Login
document.getElementById("account-login").addEventListener("click", async () => {
  try {
    const { email, password } = getCredentials();
    accountMessage.textContent = "लॉगिन हो रहा है...";

    await signInWithEmailAndPassword(auth, email, password);

    loginBox.style.display = "none";
    alert("लॉगिन सफल हुआ।");
  } catch (error) {
    accountMessage.textContent = "लॉगिन नहीं हुआ: " + error.message;
  }
});

// Login की स्थिति
onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (user) {
    loginButton.textContent = "लॉगिन सफल / लॉगआउट";

    const emailField = profileForm.elements.namedItem("email");

    if (emailField) {
      emailField.value = user.email || "";
    }

    await loadProfile(user);
  } else {
    loginButton.textContent = "लॉगिन करें";
    profileForm.reset();
  }
});

// Form Data लेना
function getFormData(form) {
  const data = {};

  new FormData(form).forEach((value, key) => {
    if (typeof value === "string") {
      data[key] = value;
    }
  });

  return data;
}

// प्रोफाइल सेव करना
profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    alert("पहले लॉगिन करें।");
    return;
  }

  try {
    const student = {
      ...getFormData(profileForm),
      uid: currentUser.uid,
      email: currentUser.email || "",
      updatedAt: serverTimestamp()
    };

    await setDoc(
      doc(db, "profiles", currentUser.uid),
      student,
      { merge: true }
    );

    alert("आपकी प्रोफाइल सेव हो गई।");
  } catch (error) {
    alert("प्रोफाइल सेव नहीं हुई: " + error.message);
  }
});

// शिकायत दर्ज करना और यूनिक टोकन बनाना
complaintForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    alert("शिकायत के लिए पहले लॉगिन करें।");
    return;
  }

  try {
    const complaintRef = doc(collection(db, "complaints"));

    const token = "RKG-2026-" + complaintRef.id.toUpperCase();

    const complaint = {
      ...getFormData(complaintForm),
      uid: currentUser.uid,
      email: currentUser.email || "",
      token: token,
      status: "Pending",
      reply: "",
      createdAt: serverTimestamp()
    };

    await setDoc(complaintRef, complaint);

    if (tokenResult) {
      tokenResult.textContent = "आपका शिकायत टोकन: " + token;
    }

    alert(
      "शिकायत दर्ज हो गई।\nअपना टोकन सुरक्षित रखें:\n" + token
    );

    complaintForm.reset();

  } catch (error) {
    console.error("शिकायत त्रुटि:", error);
    alert("शिकायत दर्ज नहीं हुई: " + error.message);
  }
});

// शिकायत का स्टेटस देखना
if (statusForm) {
  statusForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      alert("स्टेटस देखने के लिए पहले लॉगिन करें।");
      return;
    }

    const tokenInput = document.getElementById("complaint-id");
    const token = tokenInput.value.trim().toUpperCase();

    statusResult.textContent = "शिकायत खोजी जा रही है...";

    try {
      const complaintsQuery = query(
        collection(db, "complaints"),
        where("uid", "==", currentUser.uid),
        where("token", "==", token)
      );

      const snapshot = await getDocs(complaintsQuery);

      if (snapshot.empty) {
        statusResult.textContent =
          "इस अकाउंट में यह टोकन नहीं मिला। टोकन जाँचें।";
        return;
      }

      const complaint = snapshot.docs[0].data();

      statusResult.textContent =
        "टोकन: " + complaint.token +
        " | स्थिति: " + complaint.status +
        " | एडमिन का जवाब: " + (complaint.reply || "अभी कोई जवाब नहीं आया।");

    } catch (error) {
      console.error("स्टेटस त्रुटि:", error);
      statusResult.textContent =
        "स्टेटस नहीं मिल पाया: " + error.message;
    }
  });
}

// सुझाव सेव करना
suggestionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    alert("सुझाव देने के लिए पहले लॉगिन करें।");
    return;
  }

  try {
    const suggestion = {
      ...getFormData(suggestionForm),
      uid: currentUser.uid,
      email: currentUser.email || "",
      createdAt: serverTimestamp()
    };

    await setDoc(
      doc(collection(db, "suggestions")),
      suggestion
    );

    alert("आपका सुझाव सेव हो गया। धन्यवाद!");
    suggestionForm.reset();

  } catch (error) {
    console.error("सुझाव त्रुटि:", error);
    alert("सुझाव सेव नहीं हुआ: " + error.message);
  }
});
