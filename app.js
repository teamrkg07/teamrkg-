
import { auth, db } from "./firebase.js";

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loginButton = document.getElementById("login-open");
const profileForm = document.getElementById("profile-form");
const complaintForm = document.getElementById("complaint-form");
const suggestionForm = document.getElementById("suggestion-form");

let confirmationResult = null;
let recaptchaVerifier = null;
let currentUser = null;

// OTP Login Window
const loginBox = document.createElement("div");

loginBox.id = "otp-login-box";
loginBox.style.cssText = `
  display:none;
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.65);
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
    <h2>मोबाइल OTP लॉगिन</h2>

    <label>मोबाइल नंबर</label>
    <input id="otp-phone" type="tel"
      placeholder="10 अंकों का मोबाइल नंबर"
      maxlength="10">

    <div id="recaptcha-container"
      style="margin:15px 0"></div>

    <button id="send-otp" class="btn btn-primary">
      OTP भेजें
    </button>

    <div id="otp-verification"
      style="display:none;margin-top:15px">

      <label>OTP दर्ज करें</label>
      <input id="otp-code" type="text"
        placeholder="6 अंकों का OTP"
        maxlength="6">

      <button id="verify-otp" class="btn btn-primary">
        OTP सत्यापित करें
      </button>
    </div>

    <p id="otp-message"
      style="margin-top:12px;font-size:14px"></p>

    <button id="close-otp"
      class="btn btn-light"
      style="margin-top:15px">
      बंद करें
    </button>
  </div>
`;

document.body.appendChild(loginBox);

const message = document.getElementById("otp-message");
const phoneInput = document.getElementById("otp-phone");

// प्रोफाइल फॉर्म में पुरानी जानकारी भरना
function fillProfileForm(student) {
  Object.keys(student).forEach((key) => {
    const field = profileForm.elements.namedItem(key);

    if (field && student[key] !== undefined && student[key] !== null) {
      field.value = student[key];
    }
  });
}

// Firebase से प्रोफाइल लोड करना
async function loadProfile(user) {
  try {
    const profileRef = doc(db, "profiles", user.uid);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      fillProfileForm(profileSnap.data());
      console.log("पुरानी प्रोफाइल लोड हो गई।");
    }

    const phoneField = profileForm.elements.namedItem("phone");
    if (phoneField) {
      phoneField.value = user.phoneNumber || "";
    }
  } catch (error) {
    console.error("प्रोफाइल लोड त्रुटि:", error);
  }
}

// लॉगिन की स्थिति अपने आप जाँचना
onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (user) {
    loginButton.textContent = "लॉगिन सफल";
    await loadProfile(user);
  } else {
    loginButton.textContent = "लॉगिन करें";
  }
});

// OTP Login Window खोलना
loginButton.addEventListener("click", () => {
  loginBox.style.display = "flex";
  message.textContent = "";

  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      { size: "normal" }
    );

    recaptchaVerifier.render().catch((error) => {
      message.textContent = error.message;
    });
  }
});

document.getElementById("close-otp").addEventListener("click", () => {
  loginBox.style.display = "none";
});

// OTP भेजना
document.getElementById("send-otp").addEventListener("click", async () => {
  const phone = phoneInput.value.trim();

  if (!/^[6-9]\d{9}$/.test(phone)) {
    message.textContent = "सही 10 अंकों का भारतीय मोबाइल नंबर लिखें।";
    return;
  }

  try {
    message.textContent = "OTP भेजा जा रहा है...";

    confirmationResult = await signInWithPhoneNumber(
      auth,
      "+91" + phone,
      recaptchaVerifier
    );

    document.getElementById("otp-verification").style.display = "block";
    message.textContent = "OTP भेज दिया गया है।";
  } catch (error) {
    message.textContent = "OTP नहीं भेजा जा सका: " + error.message;

    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      recaptchaVerifier = null;
    }
  }
});

// OTP सत्यापित करना
document.getElementById("verify-otp").addEventListener("click", async () => {
  const otp = document.getElementById("otp-code").value.trim();

  if (!/^\d{6}$/.test(otp)) {
    message.textContent = "6 अंकों का सही OTP लिखें।";
    return;
  }

  if (!confirmationResult) {
    message.textContent = "पहले OTP भेजें।";
    return;
  }

  try {
    const result = await confirmationResult.confirm(otp);

    currentUser = result.user;

    const phoneField = profileForm.elements.namedItem("phone");
    if (phoneField) {
      phoneField.value = currentUser.phoneNumber || "";
    }

    await loadProfile(currentUser);

    loginButton.textContent = "लॉगिन सफल";
    loginBox.style.display = "none";

    alert("मोबाइल OTP सत्यापित हो गया है।");
  } catch (error) {
    message.textContent = "OTP गलत है या समाप्त हो गया है।";
  }
});

// विद्यार्थी की प्रोफाइल Firebase में सेव करना
profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    alert("पहले मोबाइल OTP से लॉगिन करें।");
    return;
  }

  const formData = new FormData(profileForm);

  const student = {
    uid: currentUser.uid,
    name: formData.get("name") || "",
    phone: currentUser.phoneNumber || "",
    village: formData.get("village") || "",
    tehsil: formData.get("tehsil") || "",
    course: formData.get("course") || "",
    semester: formData.get("semester") || "",
    ncc: formData.get("ncc") || "",
    nss: formData.get("nss") || "",
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(
      doc(db, "profiles", currentUser.uid),
      student,
      { merge: true }
    );

    alert("आपकी प्रोफाइल Firebase में सफलतापूर्वक सेव हो गई।");
  } catch (error) {
    console.error("प्रोफाइल सेव त्रुटि:", error);
    alert("प्रोफाइल सेव नहीं हुई: " + error.message);
  }
});

// फॉर्म की जानकारी को साधारण डेटा में बदलना
function getFormData(form) {
  const data = {};

  new FormData(form).forEach((value, key) => {
    if (typeof value === "string") {
      data[key] = value;
    }
  });

  return data;
}

// शिकायत Firebase में सेव करना
complaintForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    alert("शिकायत के लिए पहले OTP लॉगिन करें।");
    return;
  }

  try {
    const complaint = {
      ...getFormData(complaintForm),
      uid: currentUser.uid,
      phone: currentUser.phoneNumber || "",
      status: "Pending",
      createdAt: serverTimestamp()
    };

    const complaintRef = await addDoc(
      collection(db, "complaints"),
      complaint
    );

    alert("शिकायत सफलतापूर्वक दर्ज हुई।\nशिकायत ID: " + complaintRef.id);

    complaintForm.reset();
  } catch (error) {
    console.error("शिकायत सेव त्रुटि:", error);
    alert("शिकायत सेव नहीं हुई: " + error.message);
  }
});

// सुझाव Firebase में सेव करना
suggestionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    alert("सुझाव देने के लिए पहले OTP लॉगिन करें।");
    return;
  }

  try {
    const suggestion = {
      ...getFormData(suggestionForm),
      uid: currentUser.uid,
      phone: currentUser.phoneNumber || "",
      createdAt: serverTimestamp()
    };

    await addDoc(
      collection(db, "suggestions"),
      suggestion
    );

    alert("आपका सुझाव सफलतापूर्वक सेव हो गया। धन्यवाद!");

    suggestionForm.reset();
  } catch (error) {
    console.error("सुझाव सेव त्रुटि:", error);
    alert("सुझाव सेव नहीं हुआ: " + error.message);
  }
});
