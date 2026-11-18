
const loginButton = document.getElementById("login-open");

const profileForm = document.getElementById("profile-form");
const complaintForm = document.getElementById("complaint-form");
const suggestionForm = document.getElementById("suggestion-form");

// Login button
loginButton.addEventListener("click", () => {
  alert("मोबाइल OTP लॉगिन सुविधा जल्द जोड़ी जाएगी।");
});

// Profile form
profileForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(profileForm);

  const student = {
    name: formData.get("name"),
    phone: formData.get("phone"),
    village: formData.get("village"),
    tehsil: formData.get("tehsil"),
    course: formData.get("course"),
    semester: formData.get("semester"),
    ncc: formData.get("ncc"),
    nss: formData.get("nss")
  };

  console.log("Student Profile:", student);

  alert("प्रोफाइल फॉर्म प्राप्त हुआ। डेटाबेस सुविधा अगले चरण में जोड़ी जाएगी।");
});

// Complaint form
complaintForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(complaintForm);

  const complaint = {
    subject: formData.get("subject"),
    category: formData.get("category"),
    details: formData.get("details")
  };

  console.log("Complaint:", complaint);

  alert("शिकायत फॉर्म प्राप्त हुआ। ऑनलाइन जमा करने की सुविधा अगले चरण में जोड़ी जाएगी।");

  complaintForm.reset();
});

// Suggestion form
suggestionForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(suggestionForm);

  const suggestion = formData.get("suggestion");

  console.log("Student Suggestion:", suggestion);

  alert("आपका सुझाव प्राप्त हुआ। धन्यवाद!");

  suggestionForm.reset();
});
