import { F, auth, db, ctx, $, esc, toast, requireLogin, isAdmin } from "./script.js";

const MSG = {
  "auth/email-already-in-use": "Email này đã được đăng ký.", "auth/invalid-email": "Email không hợp lệ.",
  "auth/weak-password": "Mật khẩu quá yếu (tối thiểu 6 ký tự).", "auth/invalid-credential": "Email hoặc mật khẩu không đúng.",
  "auth/wrong-password": "Mật khẩu không đúng.", "auth/user-not-found": "Không tìm thấy tài khoản với email này.",
  "auth/too-many-requests": "Thử quá nhiều lần, vui lòng đợi một lúc rồi thử lại.", "auth/network-request-failed": "Lỗi mạng, hãy kiểm tra kết nối.",
  "auth/requires-recent-login": "Phiên đăng nhập đã cũ, hãy đăng xuất, đăng nhập lại rồi thử tiếp.",
};
const errText = (e) => MSG[e.code] || e.message;
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isPhone = (s) => /^(0|\+84)\d{9}$/.test(s.replace(/\s/g, ""));
const pw = (name, label, auto) => `<label>${label}</label><input type="password" name="${name}" data-pw required minlength="6" autocomplete="${auto}">`;
const SHOW = `<label class="chk"><input type="checkbox" data-showpw> Hiện mật khẩu</label>`;
const say = (id, text, ok) => { const m = $(id); m.textContent = text; m.className = ok ? "ok" : "err"; };
const formData = (f) => Object.fromEntries([...new FormData(f)].map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));


export function registerPage() {
  if (ctx.user) return (location.href = "index.html");
  $("#app").innerHTML = `<form id="f" class="box narrow" novalidate><h1>Đăng ký</h1>
    <label>Họ tên</label><input name="name" required autocomplete="name"><label>Email</label><input type="email" name="email" required autocomplete="email">
    <label>Số điện thoại</label><input type="tel" name="phone" required autocomplete="tel" placeholder="0901234567">
    ${pw("pw", "Mật khẩu (từ 6 ký tự)", "new-password")}${pw("pw2", "Nhập lại mật khẩu", "new-password")}${SHOW}
    <p><button>Tạo tài khoản</button></p><p id="msg" role="alert"></p><p>Đã có tài khoản? <a href="login.html">Đăng nhập</a></p></form>`;
  $("#f").onsubmit = async (e) => {
    e.preventDefault(); const d = formData(e.target);
    if (d.name.length < 2) return say("#msg", "Vui lòng nhập họ tên.");
    if (!isEmail(d.email)) return say("#msg", "Email không hợp lệ.");
    if (!isPhone(d.phone)) return say("#msg", "Số điện thoại không hợp lệ (ví dụ 0901234567).");
    if (d.pw.length < 6) return say("#msg", "Mật khẩu phải có ít nhất 6 ký tự.");
    if (d.pw !== d.pw2) return say("#msg", "Hai mật khẩu không trùng nhau.");
    const btn = e.target.querySelector("button"); btn.disabled = true;
    try {
      const c = await F.createUserWithEmailAndPassword(auth, d.email, d.pw);
      await F.updateProfile(c.user, { displayName: d.name });
      await F.setDoc(F.doc(db, "users", c.user.uid), { name: d.name, email: d.email, phone: d.phone, role: "customer" }); // mọi tài khoản mới là khách hàng
      toast("Đăng ký thành công!"); setTimeout(() => (location.href = "index.html"), 800);
    } catch (err) { say("#msg", errText(err)); btn.disabled = false; }
  };
}

export function loginPage() {
  if (ctx.user) return (location.href = "index.html");
  const next = new URLSearchParams(location.search).get("next") || "";
  const safe = /^[\w-]+\.html(\?[\w=&%.-]*)?$/.test(next) ? next : "index.html"; // chỉ cho phép quay lại trang trong website
  $("#app").innerHTML = `<form id="f" class="box narrow" novalidate><h1>Đăng nhập</h1>
    <label>Email</label><input type="email" name="email" required autocomplete="email">${pw("pw", "Mật khẩu", "current-password")}${SHOW}
    <p><button>Đăng nhập</button></p><p><a href="#" id="forgot">Quên mật khẩu?</a> · <a href="register.html">Tạo tài khoản</a></p><p id="msg" role="alert"></p></form>`;
  $("#f").onsubmit = async (e) => {
    e.preventDefault(); const d = formData(e.target);
    if (!isEmail(d.email) || !d.pw) return say("#msg", "Vui lòng nhập email hợp lệ và mật khẩu.");
    try { await F.signInWithEmailAndPassword(auth, d.email, d.pw); location.href = safe; } catch (err) { say("#msg", errText(err)); }
  };
  $("#forgot").onclick = async (e) => {
    e.preventDefault(); const em = $("#f").email.value.trim();
    if (!isEmail(em)) return say("#msg", "Nhập email của bạn vào ô Email rồi bấm lại.");
    try { await F.sendPasswordResetEmail(auth, em); say("#msg", "Đã gửi email đặt lại mật khẩu. Hãy kiểm tra hộp thư (cả mục Spam).", true); } catch (err) { say("#msg", errText(err)); }
  };
}

export function accountPage() {
  if (!requireLogin()) return;
  const p = ctx.profile, u = ctx.user;
  $("#app").innerHTML = `<h1>Tài khoản</h1><div class="two">
    <form id="pf" class="box"><h3>Thông tin cá nhân</h3><p>Email: <b>${esc(u.email)}</b> · Vai trò: ${isAdmin() ? "Quản trị" : "Khách hàng"}</p>
      <label>Họ tên</label><input name="name" required value="${esc(p.name || u.displayName || "")}"><label>Số điện thoại</label><input name="phone" value="${esc(p.phone || "")}">
      <label>Địa chỉ</label><input name="address" value="${esc(p.address || "")}"><p><button>Lưu thông tin</button></p><p id="pmsg" role="alert"></p></form>
    <form id="cp" class="box" novalidate><h3>Đổi mật khẩu</h3>${pw("cur", "Mật khẩu hiện tại", "current-password")}${pw("pw", "Mật khẩu mới (từ 6 ký tự)", "new-password")}
      ${pw("pw2", "Nhập lại mật khẩu mới", "new-password")}${SHOW}<p><button>Đổi mật khẩu</button></p><p id="cmsg" role="alert"></p></form></div>`;

  $("#pf").onsubmit = async (e) => {
    e.preventDefault(); const d = formData(e.target);
    if (d.phone && !isPhone(d.phone)) return say("#pmsg", "Số điện thoại không hợp lệ.");
    try {
      await F.setDoc(F.doc(db, "users", u.uid), { ...d, email: u.email, role: p.role || "customer" }, { merge: true });
      await F.updateProfile(u, { displayName: d.name }); ctx.profile = { ...p, ...d }; say("#pmsg", "Đã lưu thông tin.", true);
    } catch (err) { say("#pmsg", errText(err)); }
  };

  $("#cp").onsubmit = async (e) => {
    e.preventDefault(); const d = formData(e.target);
    if (!d.cur || !d.pw || !d.pw2) return say("#cmsg", "Vui lòng nhập đầy đủ cả 3 ô mật khẩu.");
    if (d.pw.length < 6) return say("#cmsg", "Mật khẩu mới phải có ít nhất 6 ký tự.");
    if (d.pw !== d.pw2) return say("#cmsg", "Hai mật khẩu mới không trùng nhau.");
    if (d.pw === d.cur) return say("#cmsg", "Mật khẩu mới phải khác mật khẩu hiện tại.");
    const btn = e.target.querySelector("button"); btn.disabled = true;
    try {
      await F.reauthenticateWithCredential(u, F.EmailAuthProvider.credential(u.email, d.cur));
      await F.updatePassword(u, d.pw);
      e.target.reset(); say("#cmsg", "Đổi mật khẩu thành công! Lần sau hãy đăng nhập bằng mật khẩu mới.", true); toast("Đổi mật khẩu thành công");
    } catch (err) {
      say("#cmsg", ["auth/invalid-credential", "auth/wrong-password"].includes(err.code) ? "Mật khẩu hiện tại không đúng." : errText(err));
    }
    btn.disabled = false;
  };
}
