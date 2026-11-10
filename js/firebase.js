// ============ KẾT NỐI FIREBASE ============
// QUAN TRỌNG: dán lại cấu hình Firebase THẬT của bạn (lấy từ file firebase.js cũ hoặc Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyBLHZhxZ5Q4ZhnmNTvS6FONUdx6EiE60FQ",
  authDomain: "fresh-fruit-shop-7adfa.firebaseapp.com",
  projectId: "fresh-fruit-shop-7adfa",
  storageBucket: "fresh-fruit-shop-7adfa.firebasestorage.app",
  messagingSenderId: "446949082161",
  appId: "1:446949082161:web:51e039ab6dcf9397bf0110",
  measurementId: "G-14HFX5BRJD"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Xuất lại các hàm Firebase để các file khác chỉ cần import từ script.js
export * from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
export * from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export let auth, db;
try {
  if (firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.error("Lỗi cấu hình Firebase:", e);
}
