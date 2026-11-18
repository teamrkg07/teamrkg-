
import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  getIdTokenResult
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  where,
  onSnapshot,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ELEMENTS
const loginButton = document.getElementById("login-open");
const profileForm = document.getElementById("profile-form");
const complaintForm = document.getElementById("complaint-form");
const suggestionForm = document.getElementById("suggestion-form");

const statusForm = document.getElementById("complaint-status-form");
const statusResult = document.getElementById("complaint-status-result");
const tokenResult = document.getElementById("complaint-token-result");

const noticeList = document.getElementById("notice-list");

const adminPanel = document.getElementById("admin-panel");
const adminNoticeForm = document.getElementById("admin-notice-form");
const adminNoticeMessage = document.getElementById("admin-notice-message");
const adminLoadComplaints = document.getElementById("admin-load-complaints");
const adminComplaintList = document.getElementById("admin-complaint-list");

const adminStudentList = document.getElementById("admin-student-list");
const adminSuggestionList = document.getElementById("admin-suggestion-list");

let currentUser = null;
let isAdmin = false;

// COMMON HELPERS
function getFormData(form) {
  const data = {};

  new FormData(form).forEach((value, key) => {
    if (typeof value === "string") {
      data[key] = value.trim();
    }
  });

  return data;
}

function makeElement(tag, text, className = "") {
  const element = document.createElement(tag);
  element.textContent = text;

  if (className) {
    element.className = className;
  }

  return element;
}

function showMessage(element, message) {
  if (element) {
    element.textContent = message;
  }
}

function createAdminButton(text, className, callback) {
  const button = makeElement("button", text, className);
  button.type = "button";
  button.addEventListener("click", callback);
  return button;
}

function requireAdmin() {
  if (!currentUser || !isAdmin) {
    alert("केवल अधिकृत एडमिन यह काम कर सकते हैं।");
    return false;
  }

  return true;
}

// LOGIN WINDOW
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
      placeholder="अपनी ईमेल आईडी"
      autocomplete="email">

    <label style="display:block;margin-top:12px">
      पासवर्ड
    </label>
    <input id="account-password" type="password"
      placeholder="पासवर्ड"
      autocomplete="current-password">

    <button id="account-register"
      class="btn btn-primary"
      style="margin-top:15px;width:100%">
      नया अकाउंट बनाएँ
    </button>

    <button id="account-login"
      class="btn btn-primary"
      style="margin-top:10px;width:100%">
      लॉगिन करें
    </button>

    <p id="account-message"></p>

    <button id="account-close"
      class="btn btn-light">
      बंद करें
    </button>
  </div>
`;

document.body.appendChild(loginBox);

const accountEmail = document.getElementById("account-email");
const accountPassword = document.getElementById("account-password");
const accountMessage = document.getElementById("account-message");

// PROFILE
function fillProfileForm(student) {
  if (!profileForm) return;

  Object.keys(student).forEach((key) => {
    const field = profileForm.elements.namedItem(key);

    if (
      field &&
      student[key] !== undefined &&
      student[key] !== null
    ) {
      field.value = student[key];
    }
  });
}

async function loadProfile(user) {
  if (!profileForm) return;

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
    console.error("प्रोफाइल त्रुटि:", error);
    alert("प्रोफाइल लोड नहीं हो सकी।");
  }
}

// LOGIN BUTTON
if (loginButton) {
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
}

document.getElementById("account-close").addEventListener("click", () => {
  loginBox.style.display = "none";
});

// CREDENTIALS
function getCredentials() {
  const email = accountEmail.value.trim();
  const password = accountPassword.value;

  if (!email || !password) {
    throw new Error("ईमेल और पासवर्ड भरें।");
  }

  if (password.length < 6) {
    throw new Error("पासवर्ड कम से कम 6 अक्षर का होना चाहिए।");
  }

  return { email, password };
}

// REGISTER
document.getElementById("account-register").addEventListener("click", async () => {
  try {
    const { email, password } = getCredentials();

    accountMessage.textContent = "अकाउंट बनाया जा रहा है...";

    await createUserWithEmailAndPassword(auth, email, password);

    loginBox.style.display = "none";
    alert("अकाउंट बन गया है। अब प्रोफाइल भरें।");
  } catch (error) {
    accountMessage.textContent = "अकाउंट नहीं बना: " + error.message;
  }
});

// LOGIN
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

// ADMIN NOTICE LIST ELEMENT
let adminNoticeList = document.getElementById("admin-notice-list");

if (!adminNoticeList && adminNoticeForm) {
  adminNoticeList = document.createElement("div");
  adminNoticeList.id = "admin-notice-list";
  adminNoticeList.className = "admin-list";
  adminNoticeForm.insertAdjacentElement("afterend", adminNoticeList);
}

// ADMIN DASHBOARD METRICS
function setMetric(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = String(value);
  }
}

async function loadAdminDashboard() {
  if (!requireAdmin()) return;

  try {
    const [
      studentsSnap,
      complaintsSnap,
      noticesSnap,
      suggestionsSnap
    ] = await Promise.all([
      getDocs(collection(db, "profiles")),
      getDocs(collection(db, "complaints")),
      getDocs(collection(db, "notices")),
      getDocs(collection(db, "suggestions"))
    ]);

    const pendingCount = complaintsSnap.docs.filter((item) => {
      return (item.data().status || "Pending") === "Pending";
    }).length;

    setMetric("admin-total-students", studentsSnap.size);
    setMetric("admin-total-complaints", complaintsSnap.size);
    setMetric("admin-pending-complaints", pendingCount);
    setMetric("admin-total-notices", noticesSnap.size);
    setMetric("admin-total-suggestions", suggestionsSnap.size);

  } catch (error) {
    console.error("डैशबोर्ड त्रुटि:", error);
    alert("डैशबोर्ड का डेटा लोड नहीं हुआ: " + error.message);
  }
}

// ADMIN STUDENTS
async function loadAdminStudents() {
  if (!requireAdmin() || !adminStudentList) return;

  adminStudentList.textContent = "विद्यार्थियों की सूची लोड हो रही है...";

  try {
    const snapshot = await getDocs(collection(db, "profiles"));

    adminStudentList.replaceChildren();

    if (snapshot.empty) {
      adminStudentList.textContent = "अभी कोई विद्यार्थी पंजीकृत नहीं है।";
      return;
    }

    snapshot.docs.forEach((item) => {
      const student = item.data();

      const card = document.createElement("article");
      card.className = "panel";

      card.append(
        makeElement("h3", student.name || "विद्यार्थी"),
        makeElement("p", "ईमेल: " + (student.email || "")),
        makeElement("p", "मोबाइल: " + (student.phone || "")),
        makeElement("p", "गाँव: " + (student.village || "")),
        makeElement("p", "तहसील: " + (student.tehsil || "")),
        makeElement("p", "कोर्स: " + (student.course || "")),
        makeElement("p", "सेमेस्टर: " + (student.semester || ""))
      );

      adminStudentList.append(card);
    });

  } catch (error) {
    console.error(error);
    adminStudentList.textContent =
      "विद्यार्थियों की सूची नहीं खुली: " + error.message;
  }
}

// ADMIN SUGGESTIONS
async function loadAdminSuggestions() {
  if (!requireAdmin() || !adminSuggestionList) return;

  adminSuggestionList.textContent = "सुझाव लोड हो रहे हैं...";

  try {
    const snapshot = await getDocs(collection(db, "suggestions"));

    adminSuggestionList.replaceChildren();

    if (snapshot.empty) {
      adminSuggestionList.textContent = "अभी कोई सुझाव नहीं आया है।";
      return;
    }

    snapshot.docs.forEach((item) => {
      const suggestion = item.data();

      const card = document.createElement("article");
      card.className = "panel";

      card.append(
        makeElement("h3", suggestion.subject || "विद्यार्थी सुझाव"),
        makeElement("p", suggestion.message || suggestion.suggestion || ""),
        makeElement("p", "ईमेल: " + (suggestion.email || ""))
      );

      adminSuggestionList.append(card);
    });

  } catch (error) {
    console.error(error);
    adminSuggestionList.textContent =
      "सुझाव लोड नहीं हुए: " + error.message;
  }
}

// ADMIN NOTICE MANAGEMENT
async function loadAdminNotices() {
  if (!requireAdmin() || !adminNoticeList) return;

  adminNoticeList.textContent = "नोटिस लोड हो रहे हैं...";

  try {
    const snapshot = await getDocs(collection(db, "notices"));

    adminNoticeList.replaceChildren();

    if (snapshot.empty) {
      adminNoticeList.textContent = "अभी कोई नोटिस प्रकाशित नहीं हुआ है।";
      return;
    }

    snapshot.docs.forEach((item) => {
      const notice = item.data();

      const card = document.createElement("article");
      card.className = "panel";

      card.append(
        makeElement("h3", notice.title || "नोटिस"),
        makeElement("p", notice.description || ""),
        makeElement("p", notice.link || "")
      );

      const editButton = createAdminButton(
        "संपादित करें",
        "btn btn-primary",
        async () => {
          if (!requireAdmin()) return;

          const newTitle = prompt("नोटिस का नया शीर्षक:", notice.title || "");
          if (newTitle === null) return;

          const newDescription = prompt(
            "नोटिस का नया विवरण:",
            notice.description || ""
          );
          if (newDescription === null) return;

          const newLink = prompt(
            "PDF या वेबसाइट लिंक:",
            notice.link || ""
          );
          if (newLink === null) return;

          try {
            let safeLink = newLink.trim();

            if (safeLink) {
              const url = new URL(safeLink);

              if (
                url.protocol !== "https:" &&
                url.protocol !== "http:"
              ) {
                throw new Error("सही वेबसाइट या PDF लिंक डालें।");
              }

              safeLink = url.href;
            }

            await updateDoc(doc(db, "notices", item.id), {
              title: newTitle.trim(),
              description: newDescription.trim(),
              link: safeLink,
              updatedAt: serverTimestamp()
            });

            alert("नोटिस अपडेट हो गया।");
            await loadAdminNotices();
            await loadAdminDashboard();

          } catch (error) {
            alert("नोटिस अपडेट नहीं हुआ: " + error.message);
          }
        }
      );

      const deleteButton = createAdminButton(
        "नोटिस हटाएँ",
        "btn btn-light",
        async () => {
          if (!requireAdmin()) return;

          if (!confirm("क्या आप यह नोटिस हटाना चाहते हैं?")) return;

          try {
            await deleteDoc(doc(db, "notices", item.id));

            alert("नोटिस हटा दिया गया।");
            await loadAdminNotices();
            await loadAdminDashboard();

          } catch (error) {
            alert("नोटिस नहीं हटा: " + error.message);
          }
        }
      );

      card.append(editButton, deleteButton);
      adminNoticeList.append(card);
    });

  } catch (error) {
    console.error(error);
    adminNoticeList.textContent =
      "नोटिस लोड नहीं हुए: " + error.message;
  }
}

// AUTH STATE AND ADMIN CHECK
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  isAdmin = false;

  if (adminPanel) {
    adminPanel.hidden = true;
  }

  if (user) {
    if (loginButton) {
      loginButton.textContent = "लॉगिन सफल / लॉगआउट";
    }

    try {
      const tokenResult = await getIdTokenResult(user, true);

      isAdmin = tokenResult.claims.admin === true;

      await loadProfile(user);

      if (isAdmin && adminPanel) {
        adminPanel.hidden = false;

        await loadAdminDashboard();
        await loadAdminStudents();
        await loadAdminSuggestions();
        await loadAdminNotices();
      }

    } catch (error) {
      console.error("अकाउंट जाँच त्रुटि:", error);
    }

  } else {
    if (loginButton) {
      loginButton.textContent = "विद्यार्थी लॉगिन";
    }

    if (profileForm) {
      profileForm.reset();
    }

    if (adminComplaintList) {
      adminComplaintList.textContent = "एडमिन लॉगिन जरूरी है।";
    }

    if (adminStudentList) {
      adminStudentList.textContent = "एडमिन लॉगिन जरूरी है।";
    }

    if (adminSuggestionList) {
      adminSuggestionList.textContent = "एडमिन लॉगिन जरूरी है।";
    }
  }
});

// SAVE PROFILE
if (profileForm) {
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
}

// COMPLAINT SUBMISSION
if (complaintForm) {
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
        token,
        status: "Pending",
        reply: "",
        createdAt: serverTimestamp()
      };

      await setDoc(complaintRef, complaint);

      showMessage(tokenResult, "आपका शिकायत टोकन: " + token);

      alert(
        "शिकायत दर्ज हो गई। अपना टोकन सुरक्षित रखें:\n" + token
      );

      complaintForm.reset();

    } catch (error) {
      console.error(error);
      alert("शिकायत दर्ज नहीं हुई: " + error.message);
    }
  });
}

// COMPLAINT STATUS
if (statusForm) {
  statusForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      alert("स्टेटस देखने के लिए पहले लॉगिन करें।");
      return;
    }

    const tokenInput = document.getElementById("complaint-id");

    if (!tokenInput || !statusResult) return;

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
        statusResult.textContent = "इस अकाउंट में यह टोकन नहीं मिला।";
        return;
      }

      const complaint = snapshot.docs[0].data();

      statusResult.textContent =
        "टोकन: " + complaint.token +
        " | स्थिति: " + complaint.status +
        " | एडमिन का जवाब: " +
        (complaint.reply || "अभी कोई जवाब नहीं आया।");

    } catch (error) {
      console.error(error);
      statusResult.textContent =
        "स्टेटस नहीं मिल पाया: " + error.message;
    }
  });
}

// SUGGESTIONS
if (suggestionForm) {
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

      await addDoc(collection(db, "suggestions"), suggestion);

      alert("आपका सुझाव सेव हो गया। धन्यवाद!");
      suggestionForm.reset();

    } catch (error) {
      alert("सुझाव सेव नहीं हुआ: " + error.message);
    }
  });
}

// NOTICE BOARD - LIVE UPDATES
if (noticeList) {
  onSnapshot(
    collection(db, "notices"),
    (snapshot) => {
      noticeList.replaceChildren();

      if (snapshot.empty) {
        noticeList.append(
          makeElement("p", "अभी कोई नया नोटिस उपलब्ध नहीं है।")
        );
        return;
      }

      const notices = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      notices.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      notices.forEach((notice) => {
        const card = document.createElement("article");
        card.className = "panel";

        card.append(
          makeElement("h3", notice.title || "नोटिस"),
          makeElement("p", notice.description || "")
        );

        const rawLink = notice.link;

        if (typeof rawLink === "string" && rawLink.trim()) {
          try {
            const url = new URL(rawLink.trim());

            if (
              url.protocol === "https:" ||
              url.protocol === "http:"
            ) {
              const link = makeElement("a", "नोटिस / PDF देखें");

              link.href = url.href;
              link.target = "_blank";
              link.rel = "noopener noreferrer";
              link.style.display = "inline-block";
              link.style.marginTop = "12px";
              link.style.color = "#0b57d0";
              link.style.fontWeight = "bold";

              card.append(link);
            }
          } catch (error) {
            console.warn("गलत नोटिस लिंक:", rawLink, error);

            card.append(
              makeElement("p", "नोटिस लिंक सही नहीं है।")
            );
          }
        }

        noticeList.append(card);
      });
    },
    (error) => {
      console.error("नोटिस लोड त्रुटि:", error);
      noticeList.textContent = "नोटिस लोड नहीं हो सके।";
    }
  );
}

// ADMIN - NOTICE PUBLISH
if (adminNoticeForm) {
  adminNoticeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!requireAdmin()) return;

    try {
      const notice = {
        ...g