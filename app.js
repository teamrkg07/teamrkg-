import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  getIdTokenResult
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ======================================
// BASIC VARIABLES
// ======================================

let currentUser = null;
let isAdmin = false;

const $ = (id) => document.getElementById(id);

const loginButton = $("login-open");
const adminLoginButton = $("admin-login-open");
const adminPanel = $("admin-panel");

const profileForm = $("profile-form");
const complaintForm = $("complaint-form");
const complaintStatusForm = $("complaint-status-form");
const suggestionForm = $("suggestion-form");
const adminNoticeForm = $("admin-notice-form");

const noticeList = $("notice-list");
const complaintTokenResult = $("complaint-token-result");
const complaintStatusResult = $("complaint-status-result");
const adminNoticeMessage = $("admin-notice-message");

function message(element, text, color = "#102544") {
  if (!element) return;
  element.textContent = text;
  element.style.color = color;
}

function element(tag, text, className = "") {
  const el = document.createElement(tag);
  el.textContent = text || "";
  if (className) el.className = className;
  return el;
}

function formatDate(value) {
  if (!value) return "उपलब्ध नहीं";
  const date = value.toDate ? value.toDate() : new Date(value);
  return date.toLocaleString("hi-IN");
}

function requireLogin() {
  if (!currentUser) {
    alert("पहले विद्यार्थी लॉगिन करें।");
    return false;
  }
  return true;
}

function requireAdmin() {
  if (!currentUser || !isAdmin) {
    alert("यह सुविधा केवल अधिकृत Admin के लिए है।");
    return false;
  }
  return true;
}

// ======================================
// STUDENT PROFILE ADMISSION TYPE DISPLAY
// ======================================

let admissionTypeDisplay = null;

if (profileForm) {
  const admissionBox = document.createElement("div");
  admissionBox.style.cssText = `
    margin:15px 0;
    padding:14px;
    background:#f1f5f9;
    border-radius:10px;
    border:1px solid #d5deea;
  `;

  const admissionLabel = element(
    "label",
    "प्रवेश प्रकार (Admission Type)"
  );

  admissionLabel.style.cssText = `
    display:block;
    font-weight:bold;
    margin-bottom:7px;
    color:#102544;
  `;

  admissionTypeDisplay = document.createElement("input");
  admissionTypeDisplay.type = "text";
  admissionTypeDisplay.id = "admission-type-display";
  admissionTypeDisplay.value = "Admin द्वारा निर्धारित नहीं";
  admissionTypeDisplay.readOnly = true;

  admissionTypeDisplay.style.cssText = `
    width:100%;
    padding:11px;
    box-sizing:border-box;
    border:1px solid #cbd5e1;
    border-radius:7px;
    background:#fff;
    color:#102544;
    font-weight:bold;
  `;

  const admissionNote = element(
    "small",
    "प्रवेश प्रकार में बदलाव केवल Admin द्वारा किया जाएगा।"
  );

  admissionNote.style.cssText = `
    display:block;
    margin-top:7px;
    color:#64748b;
  `;

  admissionBox.append(
    admissionLabel,
    admissionTypeDisplay,
    admissionNote
  );

  profileForm.append(admissionBox);
}

// ======================================
// STUDENT LOGIN WINDOW
// ======================================

const studentBox = document.createElement("div");

studentBox.style.cssText = `
  display:none;
  position:fixed;
  inset:0;
  z-index:9998;
  background:rgba(0,0,0,.75);
  justify-content:center;
  align-items:center;
  padding:20px;
`;

studentBox.innerHTML = `
  <div style="background:white;color:#102544;padding:24px;
  border-radius:14px;width:100%;max-width:380px;">

    <h2>विद्यार्थी लॉगिन</h2>

    <label>ईमेल आईडी</label>
    <input id="student-email" type="email"
    autocomplete="username" placeholder="ईमेल आईडी"
    style="width:100%;padding:12px;margin:8px 0;">

    <label>पासवर्ड</label>
    <input id="student-password" type="password"
    autocomplete="current-password" placeholder="पासवर्ड"
    style="width:100%;padding:12px;margin:8px 0;">

    <button id="student-login-submit" class="btn btn-primary"
    type="button" style="width:100%;margin-top:10px;">
    लॉगिन करें
    </button>

    <button id="student-register-submit" class="btn btn-light"
    type="button" style="width:100%;margin-top:8px;">
    नया अकाउंट बनाएँ
    </button>

    <p id="student-message"></p>

    <button id="student-close" class="btn btn-light"
    type="button">बंद करें</button>

  </div>
`;

document.body.appendChild(studentBox);

const studentEmail = $("student-email");
const studentPassword = $("student-password");
const studentMessage = $("student-message");

loginButton?.addEventListener("click", async () => {
  if (currentUser) {
    if (confirm("क्या आप लॉगआउट करना चाहते हैं?")) {
      await signOut(auth);
    }
    return;
  }

  studentBox.style.display = "flex";
  message(studentMessage, "");
});

$("student-close").addEventListener("click", () => {
  studentBox.style.display = "none";
});

$("student-login-submit").addEventListener("click", async () => {
  const email = studentEmail.value.trim();
  const password = studentPassword.value;

  if (!email || !password) {
    message(studentMessage, "ईमेल और पासवर्ड भरें।", "red");
    return;
  }

  try {
    message(studentMessage, "लॉगिन हो रहा है...");
    await signInWithEmailAndPassword(auth, email, password);
    studentBox.style.display = "none";
    studentPassword.value = "";
  } catch (error) {
    message(studentMessage, "लॉगिन असफल: " + error.message, "red");
  }
});

$("student-register-submit").addEventListener("click", async () => {
  const email = studentEmail.value.trim();
  const password = studentPassword.value;

  if (!email || !password) {
    message(studentMessage, "ईमेल और पासवर्ड भरें।", "red");
    return;
  }

  if (password.length < 6) {
    message(studentMessage, "पासवर्ड कम से कम 6 अक्षर का रखें।", "red");
    return;
  }

  try {
    message(studentMessage, "अकाउंट बनाया जा रहा है...");
    await createUserWithEmailAndPassword(auth, email, password);
    studentBox.style.display = "none";
    studentPassword.value = "";
    alert("विद्यार्थी अकाउंट बन गया।");
  } catch (error) {
    message(studentMessage, "अकाउंट नहीं बना: " + error.message, "red");
  }
});

// ======================================
// ADMIN LOGIN WINDOW
// ======================================

const adminBox = document.createElement("div");

adminBox.style.cssText = `
  display:none;
  position:fixed;
  inset:0;
  z-index:9999;
  background:rgba(0,0,0,.75);
  justify-content:center;
  align-items:center;
  padding:20px;
`;

adminBox.innerHTML = `
  <div style="background:white;color:#102544;padding:24px;
  border-radius:14px;width:100%;max-width:380px;">

    <h2>TEAM RKG Admin Login</h2>

    <label>Admin Email</label>
    <input id="admin-email" type="email"
    autocomplete="username" placeholder="Admin Email"
    style="width:100%;padding:12px;margin:8px 0;">

    <label>पासवर्ड</label>
    <input id="admin-password" type="password"
    autocomplete="current-password" placeholder="पासवर्ड"
    style="width:100%;padding:12px;margin:8px 0;">

    <button id="admin-login-submit" class="btn btn-primary"
    type="button" style="width:100%;margin-top:10px;">
    Admin Login
    </button>

    <p id="admin-message"></p>

    <button id="admin-close" class="btn btn-light"
    type="button">बंद करें</button>

  </div>
`;

document.body.appendChild(adminBox);

const adminEmail = $("admin-email");
const adminPassword = $("admin-password");
const adminMessage = $("admin-message");

adminLoginButton?.addEventListener("click", () => {
  if (currentUser) {
    if (isAdmin) {
      adminPanel?.scrollIntoView({ behavior: "smooth" });
    } else {
      alert("पहले विद्यार्थी अकाउंट से लॉगआउट करें।");
    }
    return;
  }

  adminBox.style.display = "flex";
  message(adminMessage, "");
});

$("admin-close").addEventListener("click", () => {
  adminBox.style.display = "none";
});

$("admin-login-submit").addEventListener("click", async () => {
  const email = adminEmail.value.trim();
  const password = adminPassword.value;

  if (!email || !password) {
    message(adminMessage, "ईमेल और पासवर्ड भरें।", "red");
    return;
  }

  try {
    message(adminMessage, "Admin अनुमति जाँची जा रही है...");

    const result = await signInWithEmailAndPassword(auth, email, password);
    const token = await getIdTokenResult(result.user, true);

    if (token.claims.admin !== true) {
      await signOut(auth);
      message(adminMessage, "यह अधिकृत Admin अकाउंट नहीं है।", "red");
      return;
    }

    adminBox.style.display = "none";
    adminPassword.value = "";
    alert("Admin Login सफल हुआ।");

  } catch (error) {
    message(adminMessage, "लॉगिन असफल: " + error.message, "red");
  }
});

// ======================================
// AUTH STATE
// ======================================

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  isAdmin = false;

  if (adminPanel) adminPanel.hidden = true;

  if (loginButton) {
    loginButton.textContent = user ? "लॉगआउट" : "विद्यार्थी लॉगिन";
  }

  if (!user) {
    if (adminLoginButton) adminLoginButton.textContent = "Admin Login";

    if (admissionTypeDisplay) {
      admissionTypeDisplay.value = "Admin द्वारा निर्धारित नहीं";
    }

    return;
  }

  try {
    const token = await getIdTokenResult(user, true);
    isAdmin = token.claims.admin === true;

    if (isAdmin) {
      if (adminPanel) adminPanel.hidden = false;
      if (adminLoginButton) adminLoginButton.textContent = "Admin Dashboard";
      await loadAdminDashboard();
    } else {
      if (adminLoginButton) adminLoginButton.textContent = "Admin Login";
    }

    await loadStudentProfile();

  } catch (error) {
    console.error("Auth error:", error);
  }
});

// ======================================
// STUDENT PROFILE
// ======================================

async function loadStudentProfile() {
  if (!currentUser || !profileForm) return;

  try {
    const ref = doc(db, "profiles", currentUser.uid);
    const snap = await getDoc(ref);

    profileForm.elements.email.value = currentUser.email || "";

    if (snap.exists()) {
      const data = snap.data();

      [
        "name", "phone", "village", "tehsil",
        "district", "course", "semester", "ncc", "nss"
      ].forEach((key) => {
        if (profileForm.elements[key] && data[key] !== undefined) {
          profileForm.elements[key].value = data[key];
        }
      });

      if (admissionTypeDisplay) {
        admissionTypeDisplay.value =
          data.admissionType === "Regular"
            ? "नियमित (Regular)"
            : data.admissionType === "Private"
              ? "निजी (Private)"
              : "Admin द्वारा निर्धारित नहीं";
      }

    } else {
      if (admissionTypeDisplay) {
        admissionTypeDisplay.value = "Admin द्वारा निर्धारित नहीं";
      }
    }

  } catch (error) {
    console.error("Profile error:", error);
  }
}

profileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!requireLogin()) return;

  try {
    const data = Object.fromEntries(new FormData(profileForm).entries());

    data.uid = currentUser.uid;
    data.email = currentUser.email || "";
    data.updatedAt = serverTimestamp();

    await setDoc(doc(db, "profiles", currentUser.uid), data, { merge: true });

    alert("प्रोफाइल सेव हो गई।");
  } catch (error) {
    alert("प्रोफाइल सेव नहीं हुई: " + error.message);
  }
});

// ======================================
// COMPLAINT SUBMISSION
// ======================================

complaintForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!requireLogin()) return;

  try {
    const data = Object.fromEntries(new FormData(complaintForm).entries());

    const complaintRef = doc(collection(db, "complaints"));

    const token = "RKG-" +
      new Date().getFullYear() + "-" +
      complaintRef.id.slice(0, 8).toUpperCase();

    await setDoc(complaintRef, {
      ...data,
      token,
      uid: currentUser.uid,
      email: currentUser.email || "",
      status: "Pending",
      reply: "",
      createdAt: serverTimestamp()
    });

    message(
      complaintTokenResult,
      "शिकायत दर्ज हो गई। आपका टोकन नंबर: " + token,
      "green"
    );

    complaintForm.reset();

  } catch (error) {
    message(complaintTokenResult, "शिकायत दर्ज नहीं हुई: " + error.message, "red");
  }
});

// ======================================
// COMPLAINT STATUS
// ======================================

complaintStatusForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const token = $("complaint-id").value.trim().toUpperCase();

  if (!token) {
    message(complaintStatusResult, "टोकन नंबर लिखें।", "red");
    return;
  }

  try {
    message(complaintStatusResult, "स्टेटस खोजा जा रहा है...");

    const q = query(
      collection(db, "complaints"),
      where("token", "==", token)
    );

    const snap = await getDocs(q);

    complaintStatusResult.replaceChildren();

    if (snap.empty) {
      message(complaintStatusResult, "शिकायत नहीं मिली।", "red");
      return;
    }

    const data = snap.docs[0].data();

    complaintStatusResult.append(
      element("p", "टोकन: " + data.token),
      element("p", "विषय: " + data.subject),
      element("p", "स्थिति: " + data.status),
      element("p", "Admin जवाब: " + (data.reply || "अभी जवाब नहीं आया")),
      element("p", "तारीख: " + formatDate(data.createdAt))
    );

  } catch (error) {
    message(complaintStatusResult, "स्टेटस नहीं मिला: " + error.message, "red");
  }
});
// ======================================
// STUDENT SUGGESTIONS
// ======================================

suggestionForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!requireLogin()) return;

  try {
    const data = new FormData(suggestionForm);

    await addDoc(collection(db, "suggestions"), {
      suggestion: data.get("suggestion"),
      uid: currentUser.uid,
      email: currentUser.email || "",
      createdAt: serverTimestamp()
    });

    alert("आपका सुझाव भेज दिया गया।");
    suggestionForm.reset();

  } catch (error) {
    alert("सुझाव नहीं भेजा गया: " + error.message);
  }
});

// ======================================
// PUBLIC NOTICE BOARD
// ======================================

function renderNotices(snap) {
  if (!noticeList) return;

  noticeList.replaceChildren();

  if (snap.empty) {
    noticeList.append(element("p", "अभी कोई नोटिस उपलब्ध नहीं है।"));
    return;
  }

  const notices = snap.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));

  notices.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });

  notices.forEach((notice) => {
    const card = element("article", "", "panel");

    card.append(
      element("h3", notice.title || "नोटिस"),
      element("p", notice.description || ""),
      element("small", "तारीख: " + formatDate(notice.createdAt))
    );

    if (notice.link) {
      const link = document.createElement("a");
      link.href = notice.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "नोटिस / PDF देखें";
      card.append(link);
    }

    noticeList.append(card);
  });
}

onSnapshot(
  collection(db, "notices"),
  renderNotices,
  (error) => {
    console.error("Notice error:", error);
    if (noticeList) noticeList.textContent = "नोटिस लोड नहीं हो पाए।";
  }
);

// ======================================
// ADMIN DASHBOARD
// ======================================

async function loadAdminDashboard() {
  if (!requireAdmin()) return;

  try {
    const [students, complaints, notices, suggestions] = await Promise.all([
      getDocs(collection(db, "profiles")),
      getDocs(collection(db, "complaints")),
      getDocs(collection(db, "notices")),
      getDocs(collection(db, "suggestions"))
    ]);

    const pending = complaints.docs.filter(
      (item) => (item.data().status || "Pending") === "Pending"
    ).length;

    $("admin-total-students").textContent = students.size;
    $("admin-total-complaints").textContent = complaints.size;
    $("admin-pending-complaints").textContent = pending;
    $("admin-total-notices").textContent = notices.size;
    $("admin-total-suggestions").textContent = suggestions.size;

    renderStudents(students);
    renderSuggestions(suggestions);

    await loadAdminPracticals();

  } catch (error) {
    console.error("Dashboard error:", error);
    alert("Dashboard लोड नहीं हुआ: " + error.message);
  }
}

// ======================================
// ADMIN STUDENT MANAGEMENT
// ======================================

function renderStudents(snap) {
  const container = $("admin-student-list");
  if (!container) return;

  container.replaceChildren();

  if (snap.empty) {
    container.append(element("p", "अभी विद्यार्थी नहीं हैं।"));
    return;
  }

  snap.forEach((item) => {
    const data = item.data();
    const card = element("div", "", "panel");

    card.append(
      element("h4", data.name || "नाम उपलब्ध नहीं"),
      element("p", "ईमेल: " + (data.email || "")),
      element("p", "मोबाइल: " + (data.phone || "")),
      element("p", "गाँव: " + (data.village || "")),
      element("p", "कोर्स: " + (data.course || "")),
      element("p", "सेमेस्टर: " + (data.semester || "")),
      element(
        "p",
        "वर्तमान प्रवेश प्रकार: " +
        (
          data.admissionType === "Regular"
            ? "नियमित (Regular)"
            : data.admissionType === "Private"
              ? "निजी (Private)"
              : "निर्धारित नहीं"
        )
      )
    );

    const admissionLabel = element(
      "label",
      "प्रवेश प्रकार निर्धारित करें:"
    );

    admissionLabel.style.cssText = `
      display:block;
      margin:12px 0 6px;
      font-weight:bold;
    `;

    const admissionSelect = document.createElement("select");
    admissionSelect.style.cssText = `
      width:100%;
      padding:11px;
      border-radius:7px;
      border:1px solid #cbd5e1;
      margin-bottom:10px;
    `;

    const options = [
      ["", "प्रवेश प्रकार चुनें"],
      ["Regular", "नियमित (Regular)"],
      ["Private", "निजी (Private)"]
    ];

    options.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      admissionSelect.append(option);
    });

    admissionSelect.value = data.admissionType || "";

    const admissionSave = element(
      "button",
      "प्रवेश प्रकार सेव करें",
      "btn btn-primary"
    );

    admissionSave.type = "button";

    admissionSave.addEventListener("click", async () => {
      if (!requireAdmin()) return;

      const selectedType = admissionSelect.value;

      if (!selectedType) {
        alert("पहले Regular या Private चुनें।");
        return;
      }

      try {
        admissionSave.disabled = true;
        admissionSave.textContent = "सेव हो रहा है...";

        await updateDoc(doc(db, "profiles", item.id), {
          admissionType: selectedType,
          updatedAt: serverTimestamp()
        });

        alert("विद्यार्थी का प्रवेश प्रकार सेव हो गया।");
        await loadAdminDashboard();

      } catch (error) {
        alert("प्रवेश प्रकार सेव नहीं हुआ: " + error.message);
        admissionSave.disabled = false;
        admissionSave.textContent = "प्रवेश प्रकार सेव करें";
      }
    });

    card.append(admissionLabel, admissionSelect, admissionSave);
    container.append(card);
  });
}

// ======================================
// ADMIN SUGGESTIONS
// ======================================

function renderSuggestions(snap) {
  const container = $("admin-suggestion-list");
  if (!container) return;

  container.replaceChildren();

  if (snap.empty) {
    container.append(element("p", "अभी कोई सुझाव नहीं है।"));
    return;
  }

  snap.forEach((item) => {
    const data = item.data();
    const card = element("div", "", "panel");

    card.append(
      element("p", data.suggestion || "सुझाव उपलब्ध नहीं"),
      element("small", "ईमेल: " + (data.email || "")),
      element("p", "तारीख: " + formatDate(data.createdAt))
    );

    container.append(card);
  });
}

// ======================================
// ADMIN COMPLAINT MANAGEMENT
// ======================================

async function loadAdminComplaints() {
  if (!requireAdmin()) return;

  const container = $("admin-complaint-list");
  if (!container) return;

  container.textContent = "शिकायतें लोड हो रही हैं...";

  try {
    const snap = await getDocs(collection(db, "complaints"));
    container.replaceChildren();

    if (snap.empty) {
      container.append(element("p", "अभी कोई शिकायत नहीं है।"));
      return;
    }

    snap.forEach((item) => {
      const data = item.data();
      const card = element("div", "", "panel");

      card.append(
        element("h4", data.subject || "शिकायत"),
        element("p", "टोकन: " + (data.token || "")),
        element("p", "ईमेल: " + (data.email || "")),
        element("p", "विवरण: " + (data.details || data.description || "")),
        element("p", "स्थिति: " + (data.status || "Pending"))
      );

      const status = document.createElement("select");

      [
        ["Pending", "लंबित"],
        ["In Progress", "कार्यवाही जारी"],
        ["Resolved", "समाधान हो गया"]
      ].forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        status.append(option);
      });

      status.value = data.status || "Pending";

      const reply = document.createElement("textarea");
      reply.placeholder = "Admin जवाब लिखें...";
      reply.value = data.reply || "";
      reply.style.cssText = "width:100%;padding:10px;margin:10px 0;";

      const save = element(
        "button",
        "स्थिति और जवाब सेव करें",
        "btn btn-primary"
      );

      save.type = "button";

      save.addEventListener("click", async () => {
        if (!requireAdmin()) return;

        try {
          save.disabled = true;
          save.textContent = "सेव हो रहा है...";

          await updateDoc(doc(db, "complaints", item.id), {
            status: status.value,
            reply: reply.value.trim(),
            updatedAt: serverTimestamp()
          });

          alert("शिकायत अपडेट हो गई।");
          await loadAdminDashboard();
          await loadAdminComplaints();

        } catch (error) {
          alert("अपडेट नहीं हुआ: " + error.message);
          save.disabled = false;
          save.textContent = "स्थिति और जवाब सेव करें";
        }
      });

      card.append(status, reply, save);
      container.append(card);
    });

  } catch (error) {
    container.textContent = "शिकायतें लोड नहीं हुईं: " + error.message;
  }
}

$("admin-load-complaints")?.addEventListener(
  "click",
  loadAdminComplaints
);

// ======================================
// ADMIN NOTICE ADD
// ======================================

adminNoticeForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!requireAdmin()) return;

  try {
    const data = new FormData(adminNoticeForm);

    const title = String(data.get("title") || "").trim();
    const description = String(data.get("description") || "").trim();
    const link = String(data.get("link") || "").trim();

    if (!title) {
      message(adminNoticeMessage, "नोटिस का शीर्षक लिखें।", "red");
      return;
    }

    await addDoc(collection(db, "notices"), {
      title,
      description,
      link,
      createdAt: serverTimestamp()
    });

    message(
      adminNoticeMessage,
      "नोटिस सफलतापूर्वक प्रकाशित हो गया।",
      "green"
    );

    adminNoticeForm.reset();
    await loadAdminDashboard();

  } catch (error) {
    message(
      adminNoticeMessage,
      "नोटिस प्रकाशित नहीं हुआ: " + error.message,
      "red"
    );
  }
});

// ======================================
// PRACTICAL SECTION - PUBLIC
// ======================================

const practicalList = $("practical-list");
const practicalSearch = $("practical-search");

let practicalRecords = [];

function renderPublicPracticals() {
  if (!practicalList) return;

  practicalList.replaceChildren();

  const searchText = (practicalSearch?.value || "")
    .trim()
    .toLowerCase();

  const filtered = practicalRecords.filter((item) => {
    const text = [
      item.course,
      item.year,
      item.semester,
      item.subject,
      item.title
    ].join(" ").toLowerCase();

    return text.includes(searchText);
  });

  if (!filtered.length) {
    practicalList.append(
      element("p", "अभी इस खोज के लिए कोई Practical PDF उपलब्ध नहीं है।")
    );
    return;
  }

  const groups = {};

  filtered.forEach((item) => {
    const key = [
      item.course || "",
      item.year || "",
      item.semester || "",
      item.subject || ""
    ].join("|||");

    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  Object.values(groups).forEach((items) => {
    const first = items[0];
    const card = element("article", "", "panel practical-card");

    card.append(
      element("h3", first.course || "कोर्स"),
      element(
        "p",
        "वर्ष: " + (first.year || "-") +
        " | सेमेस्टर: " + (first.semester || "-")
      ),
      element("h4", "विषय: " + (first.subject || "-"))
    );

    items.forEach((item) => {
      const link = document.createElement("a");
      link.href = item.driveUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "📄 " + (item.title || "Practical PDF देखें");
      link.className = "practical-pdf-link";
      link.style.cssText = `
        display:block;
        margin:10px 0;
        padding:12px;
        border-radius:8px;
        background:#f1f5f9;
        color:#102544;
        text-decoration:none;
        font-weight:bold;
      `;
      card.append(link);
    });

    practicalList.append(card);
  });
}

async function loadPublicPracticals() {
  if (!practicalList) return;

  practicalList.textContent = "प्रैक्टिकल PDF लोड हो रही हैं...";

  try {
    const snap = await getDocs(collection(db, "practicals"));

    practicalRecords = snap.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    practicalRecords.sort((a, b) =>
      String(a.course || "").localeCompare(String(b.course || ""))
    );

    renderPublicPracticals();

  } catch (error) {
    console.error("Practical load error:", error);
    practicalList.textContent =
      "प्रैक्टिकल PDF लोड नहीं हो पाईं। कृपया बाद में प्रयास करें।";
  }
}

practicalSearch?.addEventListener("input", renderPublicPracticals);

// ======================================
// PRACTICAL SECTION - ADMIN
// ======================================

const adminPracticalForm = $("admin-practical-form");
const adminPracticalList = $("admin-practical-list");
const adminPracticalMessage = $("admin-practical-message");
const practicalEditId = $("practical-edit-id");
const practicalSaveButton = $("practical-save-button");
const practicalCancelEdit = $("practical-cancel-edit");

function resetPracticalForm() {
  if (!adminPracticalForm) return;

  adminPracticalForm.reset();

  if (practicalEditId) practicalEditId.value = "";
  if (practicalSaveButton) practicalSaveButton.textContent = "PDF जोड़ें";
  if (practicalCancelEdit) practicalCancelEdit.hidden = true;
}

function renderAdminPracticals() {
  if (!adminPracticalList) return;

  adminPracticalList.replaceChildren();

  if (!practicalRecords.length) {
    adminPracticalList.append(
      element("p", "अभी कोई Practical PDF नहीं जोड़ी गई है।")
    );
    return;
  }

  practicalRecords.forEach((item) => {
    const card = element("div", "", "panel practical-admin-card");

    card.append(
      element("h4", item.title || "Practical PDF"),
      element("p", "कोर्स: " + (item.course || "-")),
      element("p", "वर्ष: " + (item.year || "-")),
      element("p", "सेमेस्टर: " + (item.semester || "-")),
      element("p", "विषय: " + (item.subject || "-"))
    );

    const pdfLink = document.createElement("a");
    pdfLink.href = item.driveUrl;
    pdfLink.target = "_blank";
    pdfLink.rel = "noopener noreferrer";
    pdfLink.textContent = "PDF खोलें";
    card.append(pdfLink);

    const actions = element("div", "", "practical-admin-actions");

    const editButton = element(
      "button",
      "बदलें",
      "btn btn-primary"
    );
    editButton.type = "button";

    editButton.addEventListener("click", () => {
      if (!requireAdmin()) return;

      adminPracticalForm.elements.course.value = item.course || "";
      adminPracticalForm.elements.year.value = item.year || "";
      adminPracticalForm.elements.semester.value = item.semester || "";
      adminPracticalForm.elements.subject.value = item.subject || "";
      adminPracticalForm.elements.title.value = item.title || "";
      adminPracticalForm.elements.driveUrl.value = item.driveUrl || "";

      practicalEditId.value = item.id;
      practicalSaveButton.textContent = "बदलाव सेव करें";
      practicalCancelEdit.hidden = false;

      adminPracticalForm.scrollIntoView({ behavior: "smooth" });
    });

    const deleteButton = element(
      "button",
      "डिलीट करें",
      "btn btn-light"
    );
    deleteButton.type = "button";

    deleteButton.addEventListener("click", async () => {
      if (!requireAdmin()) return;

      const confirmDelete = confirm(
        "क्या आप यह Practical PDF हटाना चाहते हैं?"
      );

      if (!confirmDelete) return;

      try {
        deleteButton.disabled = true;
        deleteButton.textContent = "हटाया जा रहा है...";

        await deleteDoc(doc(db, "practicals", item.id));

        message(
          adminPracticalMessage,
          "Practical PDF हटा दी गई।",
          "green"
        );

        await loadPublicPracticals();
        renderAdminPracticals();

      } catch (error) {
        alert("PDF डिलीट नहीं हुई: " + error.message);
        deleteButton.disabled = false;
        deleteButton.textContent = "डिलीट करें";
      }
    });

    actions.append(editButton, deleteButton);
    card.append(actions);
    adminPracticalList.append(card);
  });
}

async function loadAdminPracticals() {
  if (!requireAdmin()) return;

  try {
    const snap = await getDocs(collection(db, "practicals"));

    practicalRecords = snap.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    practicalRecords.sort((a, b) =>
      String(a.course || "").localeCompare(String(b.course || ""))
    );

    renderAdminPracticals();
    renderPublicPracticals();

  } catch (error) {
    console.error("Admin practical error:", error);

    if (adminPracticalList) {
      adminPracticalList.textContent =
        "Practical सूची लोड नहीं हुई: " + error.message;
    }
  }
}

adminPracticalForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!requireAdmin()) return;

  try {
    const formData = new FormData(adminPracticalForm);

    const course = String(formData.get("course") || "").trim();
    const year = String(formData.get("year") || "").trim();
    const semester = String(formData.get("semester") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const driveUrl = String(formData.get("driveUrl") || "").trim();
    const editId = practicalEditId.value.trim();

    if (!course || !year || !semester || !subject || !title || !driveUrl) {
      message(
        adminPracticalMessage,
        "कृपया सभी जानकारी भरें।",
        "red"
      );
      return;
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(driveUrl);
    } catch {
      message(adminPracticalMessage, "सही PDF लिंक डालें।", "red");
      return;
    }

    if (parsedUrl.protocol !== "https:") {
      message(
        adminPracticalMessage,
        "Google Drive का सुरक्षित HTTPS लिंक डालें।",
        "red"
      );
      return;
    }

    const record = {
      course,
      year,
      semester,
      subject,
      title,
      driveUrl,
      updatedAt: serverTimestamp()
    };

    practicalSaveButton.disabled = true;
    practicalSaveButton.textContent = "सेव हो रहा है...";

    if (editId) {
      await updateDoc(doc(db, "practicals", editId), record);
    } else {
      await addDoc(collection(db, "practicals"), {
        ...record,
        createdAt: serverTimestamp()
      });
    }

    message(
      adminPracticalMessage,
      editId
        ? "Practical PDF का बदलाव सेव हो गया।"
        : "नई Practical PDF जोड़ दी गई।",
      "green"
    );

    resetPracticalForm();

    await loadPublicPracticals();
    await loadAdminPracticals();

  } catch (error) {
    message(
      adminPracticalMessage,
      "जानकारी सेव नहीं हुई: " + error.message,
      "red"
    );
  } finally {
    if (practicalSaveButton) {
      practicalSaveButton.disabled = false;

      if (!practicalEditId.value) {
        practicalSaveButton.textContent = "PDF जोड़ें";
      }
    }
  }
});

practicalCancelEdit?.addEventListener("click", () => {
  resetPracticalForm();
  message(adminPracticalMessage, "बदलाव रद्द कर दिया गया।");
});

// ======================================
// LOAD PUBLIC PRACTICALS WITHOUT LOGIN
// ======================================

loadPublicPracticals();

// ===============================
// PAGE NAVIGATION
// ===============================

document.querySelectorAll(".nav a").forEach(link => {
  link.addEventListener("click", function (e) {
    const target = this.getAttribute("href");

    if (target && target.startsWith("#")) {
      e.preventDefault();

      document.querySelectorAll("section").forEach(section => {
        section.style.display = "none";
      });

      const page = document.querySelector(target);

      if (page) {
        page.style.display = "block";
        page.scrollIntoView({ behavior: "smooth" });
      }

      document.querySelectorAll(".nav a").forEach(a => {
        a.classList.remove("active");
      });

      this.classList.add("active");
    }
  });
});

//======================================
// TEAM RKG APP READY
// ======================================

console.log("TEAM RKG App Successfully Loaded");
