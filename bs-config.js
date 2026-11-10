// bs-config.js — shared Firebase config for all student pages
// Both configs are PUBLIC (Firebase API keys are safe to expose in frontend code)

export const STUDENT_CONFIG = {
  apiKey: "AIzaSyATW9btDBBsJg32Qcj84yEU34l1OzX5G_Q",
  authDomain: "brushstrokes-student.firebaseapp.com",
  projectId: "brushstrokes-student",
  storageBucket: "brushstrokes-student.firebasestorage.app",
  messagingSenderId: "140790604149",
  appId: "1:140790604149:web:18dc0eaf59d9672ce8333c"
};

// Admin Firestore is read-only from student pages (events, announcements, info)
// Security is enforced by admin Firestore rules (allow write: if isAdmin() only)
export const ADMIN_CONFIG = {
  apiKey: "AIzaSyDXdAA-gK43ZC6BlspWYrB9_Yk3nO0tLnY",
  authDomain: "brushstrokes-cc86c.firebaseapp.com",
  projectId: "brushstrokes-cc86c",
  storageBucket: "brushstrokes-cc86c.firebasestorage.app",
  messagingSenderId: "684392264786",
  appId: "1:684392264786:web:155f9a259161c036995b8b"
};

export const STUDENT_ADMIN_UID = "25Tcm6EsmDSwrznOhNwZaLMV0zg1";
