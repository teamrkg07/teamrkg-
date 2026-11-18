
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
  collection,
  serverTimestamp,
  getDocs,
  query,
  where,
  onSnapshot,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

let currentUser = null;
let isAdmin = false;

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

  if (className) element.className = className;

  return element;
}

function showMessage(element, message) {
  if (element) element.textContent = message;
}

// PROFILE
function fillProfileForm(student) {
  Object.keys(student).forEach((key) => {
    const field = profileForm.elements.namedItem(key);

    if (field && student[key] !== undefined && student[key] !== null) {
      field.value = student[key];
    }
  });
}

async function loadProfile(user) {
  try {
    const profileRef = doc(db, "profiles", user.uid);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      fillProfileForm(profileSnap.data());
    }

    const emailField = profileForm.elements.namedItem("email");

    if (emailField) emailField.value = user.email || "";

  } catch (error) {
    console.error("प्रोफाइल त्रुटि:", error);
    alert("प्रोफाइल लोड नहीं हो सकी।");
  }
}

// LOGIN WINDOW
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

document.getElementById("account-close").addEventListener("click", () => {
  loginBox.style.display = "none";
});

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

// AUTH STATE AND ADMIN CHECK
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  isAdmin = false;

  if (adminPanel) adminPanel.hidden = true;

  if (user) {
    loginButton.textContent = "लॉगिन सफल / लॉगआउट";

    try {
      const tokenResult = await getIdTokenResult(user, true);
      isAdmin = tokenResult.claims.admin === true;

      await loadProfile(user);

      if (isAdmin && adminPanel) {
        adminPanel.hidden = false;
      }

    } catch (error) {
      console.error("अकाउंट जाँच त्रुटि:", error);
    }

  } else {
    loginButton.textContent = "विद्यार्थी लॉगिन";
    profileForm.reset();

    if (adminComplaintList) {
      adminComplaintList.textContent = "एडमिन लॉगिन जरूरी है।";
    }
  }
});

// SAVE PROFILE
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

// COMPLAINT SUBMISSION
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

    alert("शिकायत दर्ज हो गई। अपना टोकन सुरक्षित रखें:\n" + token);

    complaintForm.reset();

  } catch (error) {
    console.error(error);
    alert("शिकायत दर्ज नहीं हुई: " + error.message);
  }
});

// COMPLAINT STATUS
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
      statusResult.textContent = "स्टेटस नहीं मिल पाया: " + error.message;
    }
  });
}

// SUGGESTIONS
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

    await setDoc(doc(collection(db, "suggestions")), suggestion);

    alert("आपका सुझाव सेव हो गया। धन्यवाद!");
    suggestionForm.reset();

  } catch (error) {
    alert("सुझाव सेव नहीं हुआ: " + error.message);
  }
});

// NOTICE BOARD - LIVE UPDATES
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

      if (notice.link) {
        try {
          const url = new URL(notice.link);

          if (url.protocol === "https:" || url.protocol === "http:") {
            const link = makeElement("a", "नोटिस / PDF देखें");
            link.href = url.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            card.append(link);
          }
        } catch (error) {
          console.warn("गलत नोटिस लिंक:", error);
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

// ADMIN - NOTICE PUBLISH
if (adminNoticeForm) {
  adminNoticeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser || !isAdmin) {
      alert("केवल अधिकृत एडमिन नोटिस प्रकाशित कर सकते हैं।");
      return;
    }

    try {
      const notice = {
        ...getFormData(adminNoticeForm),
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      };

      if (notice.link) {
        const url = new URL(notice.link);

        if (url.protocol !== "https:" && url.protocol !== "http:") {
          throw new Error("सही PDF या नोटिस लिंक डालें।");
        }
      }

      await setDoc(doc(collection(db, "notices")), notice);

      adminNoticeForm.reset();
      showMessage(adminNoticeMessage, "नोटिस प्रकाशित हो गया।");

    } catch (error) {
      console.error(error);
      showMessage(adminNoticeMessage, "नोटिस प्रकाशित नहीं हुआ: " + error.message);
    }
  });
}

// ADMIN - LOAD COMPLAINTS
if (adminLoadComplaints) {
  adminLoadComplaints.addEventListener("click", async () => {
    if (!currentUser || !isAdmin) {
      alert("केवल अधिकृत एडमिन शिकायतें देख सकते हैं।");
      return;
    }

    adminComplaintList.textContent = "शिकायतें लोड हो रही हैं...";

    try {
      const snapshot = await getDocs(collection(db, "complaints"));

      adminComplaintList.replaceChildren();

      if (snapshot.empty) {
        adminComplaintList.textContent = "अभी कोई शिकायत नहीं है।";
        return;
      }

      snapshot.docs.forEach((item) => {
        const complaint = item.data();

        const card = document.createElement("div");
        card.className = "panel";

        card.append(
          makeElement("h3", complaint.subject || "शिकायत"),
          makeElement("p", "टोकन: " + (complaint.token || "")),
          makeElement("p", "श्रेणी: " + (complaint.category || "")),
          makeElement("p", "विवरण: " + (complaint.details || "")),
          makeElement("p", "ईमेल: " + (complaint.email || "")),
          makeElement("p", "वर्तमान स्थिति: " + (complaint.status || "Pending"))
        );

        const statusLabel = makeElement("label", "नई स्थिति");
        const statusSelect = document.createElement("select");

        ["Pending", "In Progress", "Resolved"].forEach((value) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = value;
          statusSelect.append(option);
        });

        statusSelect.value = complaint.status || "Pending";
        statusLabel.append(statusSelect);

        const replyLabel = makeElement("label", "एडमिन का जवाब");
        const replyInput = document.createElement("textarea");
        replyInput.value = complaint.reply || "";
        replyLabel.append(replyInput);

        const saveButton = makeElement("button", "अपडेट सेव करें", "btn btn-primary");
        saveButton.type = "button";

        saveButton.addEventListener("click", async () => {
          if (!currentUser || !isAdmin) {
            alert("एडमिन अनुमति नहीं है।");
            return;
          }

          try {
            await updateDoc(doc(db, "complaints", item.id), {
              status: statusSelect.value,
              reply: replyInput.value.trim(),
              updatedAt: serverTimestamp()
            });

            alert("शिकायत अपडेट हो गई।");

          } catch (error) {
            alert("अपडेट नहीं हुआ: " + error.message);
          }
        });

        card.append(statusLabel, replyLabel, saveButton);
        adminComplaintList.append(card);
      });

    } catch (error) {
      console.error(error);
      adminComplaintList.textContent =
        "शिकायतें लोड नहीं हुईं: " + error.message;
    }
  });
}
