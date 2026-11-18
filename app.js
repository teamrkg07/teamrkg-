
import { auth } from "./firebase.js";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

loginButton.addEventListener("click", () => {
  loginBox.style.display = "flex";
  message.textContent = "";

  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      { size: "normal" }
    );

    recaptchaVerifier.render().catch(error => {
      message.textContent = error.message;
    });
  }
});

document.getElementById("close-otp").addEventListener("click", () => {
  loginBox.style.display = "none";
});

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

document.getElementById("verify-otp").addEventListener("click", async () => {
  const otp = document.getElementById("otp-code").value.trim();

  if (!/^\d{6}$/.test(otp)) {
    message.textContent = "6 अंकों का सही OTP लिखें।";
    return;
  }

  try {
    const result = await confirmationResult.confirm(otp);

    currentUser = result.user;

    profileForm.elements.phone.value =
      currentUser.phoneNumber || "";

    loginButton.textContent = "लॉगिन सफल";
    loginBox.style.display = "none";

    alert("मोबाइल OTP सत्यापित हो गया है।");
  } catch (error) {
    message.textContent = "OTP गलत है या समाप्त हो गया है।";
  }
});

// Profile form
profileForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!currentUser) {
    alert("पहले मोबाइल OTP से लॉगिन करें।");
    return;
  }

  const formData = new FormData(profileForm);

  const student = {
    name: formData.get("name"),
    phone: currentUser.phoneNumber,
    village: formData.get("village"),
    tehsil: formData.get("tehsil"),
    course: formData.get("course"),
    semester: formData.get("semester"),
    ncc: formData.get("ncc"),
    nss: formData.get("nss")
  };

  console.log("Student Profile:", student);

  alert("प्रोफाइल की जानकारी प्राप्त हुई। डेटाबेस सेव सुविधा अगला चरण है।");
});

// Complaint form
complaintForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!currentUser) {
    alert("शिकायत के लिए पहले OTP लॉगिन करें।");
    return;
  }

  alert("शिकायत फॉर्म तैयार है। डेटाबेस कनेक्शन अगला चरण है।");
});

// Suggestion form
suggestionForm.addEventListener("submit", (event) => {
  event.preventDefault();

  alert("सुझाव फॉर्म प्राप्त हुआ। धन्यवाद!");
  suggestionForm.reset();
});
