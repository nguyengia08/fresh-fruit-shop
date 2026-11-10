// ============ DÙNG CHUNG CHO MỌI TRANG ============
import * as F from "./firebase.js";
export { F };
export const { auth, db } = F;

// ---- Thông tin cửa hàng (sửa tại đây là đổi toàn bộ website) ----
export const SHOP = {
  name: "Fresh Fruit Shop", 
  phone: "0901059690", 
  address: "Cần Thơ, Việt Nam", 
  emails: [
    "ntgiaa26078@cusc.ctu.vn",
    "ltloca26101@cusc.ctu.edu.vn",
    "bthhaa26096@cusc.ctu.edu.vn",
    "phkhuya26084@cusc.ctu.edu.vn"
  ]
};

// ---- THÔNG TIN NGÂN HÀNG: bạn tự điền thông tin THẬT vào đây ----
// bankId: mã ngân hàng theo VietQR (ví dụ: "MB", "VCB", "ACB", "TCB", "BIDV", "VPB"). Để trống thì không hiện mã QR.
// Để trống "account" thì khách chưa chọn được chuyển khoản.
export const BANK = { bankId: "TCB", bankName: "Ngân hàng Techcombank", account: "485222222222", owner: "NGUYEN THANH GIA" };

export const CATS = ["Trái cây Việt Nam", "Trái cây nhập khẩu", "Trái cây theo mùa"];
export const STATUS = ["Chờ xác nhận", "Đang giao", "Hoàn thành", "Đã hủy"];
export const PAY = ["Thanh toán khi nhận hàng", "Chưa thanh toán", "Chờ xác nhận thanh toán", "Đã thanh toán"];

// ---- Trạng thái dùng chung: người dùng, hồ sơ, giỏ hàng ----
export const ctx = { user: null, profile: {}, cart: [] };

// ---- Hàm tiện ích ----
export const $ = (s) => document.querySelector(s);
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const money = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";
export const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);
export const fmtDate = (t) => (t?.toDate ? t.toDate().toLocaleString("vi-VN") : "");
export const isAdmin = () => ctx.profile.role === "admin";
export const orderCode = (id) => id.slice(0, 8).toUpperCase();

export function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove("show"), 2800);
}

// ============ ẢNH SẢN PHẨM (Google Drive hoặc thư mục images/) ============
const lh3 = (id) => `https://lh3.googleusercontent.com/d/${id}=w1000`;
const thumb = (id) => `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
// Lấy ID file từ mọi kiểu link Google Drive
export const driveId = (u) => (String(u || "").match(/(?:drive\.google\.com\/(?:file\/(?:u\/\d+\/)?d\/|open\?id=|uc\?(?:[^\s"]*&)?id=|thumbnail\?(?:[^\s"]*&)?id=)|googleusercontent\.com\/d\/)([\w-]{10,})/) || [])[1];

const loadImg = (s) => new Promise((ok, no) => { const i = new Image(); i.onload = ok; i.onerror = no; i.src = s; });
// Kiểm tra và chuẩn hóa link ảnh trước khi lưu. Ném lỗi (tiếng Việt) nếu ảnh không dùng được.
export async function prepareImage(u) {
  u = (u || "").trim(); if (!u) return "";
  if (/drive\.google\.com\/drive\/folders/.test(u)) throw new Error("Đây là link THƯ MỤC. Hãy mở từng ảnh > Chia sẻ > Sao chép liên kết của ảnh.");
  const id = driveId(u);
  if (/drive\.google\.com/.test(u) && !id) throw new Error("Link Google Drive không hợp lệ. Cần dạng https://drive.google.com/file/d/…/view");
  for (const s of id ? [lh3(id), thumb(id)] : [u]) { try { await loadImg(s); return id ? lh3(id) : u; } catch {} }
  throw new Error(id ? 'Ảnh Drive không hiển thị được. Hãy chia sẻ ảnh ở chế độ "Bất kỳ ai có đường liên kết" (Người xem), hoặc chép ảnh vào thư mục images/ rồi nhập images/ten-anh.jpg'
                     : "Không tải được ảnh. Kiểm tra lại đường dẫn hoặc tên file trong thư mục images/.");
}
// Thẻ ảnh sản phẩm (không có ảnh thì hiện emoji)
export function img(p) {
  if (!p.image) return esc(p.icon || "🍎");
  const id = driveId(p.image);
  return `<img src="${esc(id ? lh3(id) : p.image)}" ${id ? `data-drive="${id}"` : ""} alt="${esc(p.name)}" loading="lazy">`;
}
// Ảnh lỗi: thử link dự phòng của Drive, nếu vẫn lỗi thì báo lỗi thay vì để ô trống
document.addEventListener("error", (e) => {
  const i = e.target; if (i.tagName !== "IMG" || !i.closest("main")) return;
  if (i.dataset.drive && !i.dataset.tried) { i.dataset.tried = 1; i.src = thumb(i.dataset.drive); return; }
  i.replaceWith(Object.assign(document.createElement("span"), { className: "imgerr", textContent: "⚠️ Ảnh không hiển thị được" }));
}, true);

// ================= THÔNG TIN CHUYỂN KHOẢN & MÃ QR =================
export function bankBox(amount, content) {
  if (!BANK || !BANK.account) {
    return `<div class="warn">Cửa hàng chưa cấu hình thông tin ngân hàng. Vui lòng chọn COD hoặc gọi hotline.</div>`;
  }
  
  const bankNameDisplay = BANK.bankName || BANK.bankId || "Ngân hàng";
  const qr = BANK.bankId 
    ? `https://img.vietqr.io/image/${BANK.bankId}-${BANK.account}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(BANK.owner || "")}` 
    : "";

  const row = (k, v, show = v) => `<p>${k}: <b>${esc(show)}</b> <button type="button" class="ghost sm" data-copy="${esc(v)}">Sao chép</button></p>`;

  return `<div class="box bank">
    ${qr ? `<img class="qr" src="${qr}" alt="Mã QR chuyển khoản">` : ""}
    ${row("Ngân hàng", bankNameDisplay)}
    ${row("Số tài khoản", BANK.account)}
    ${row("Chủ tài khoản", BANK.owner)}
    ${row("Số tiền", amount, money(amount))}
    ${row("Nội dung", content)}
  </div>`;
}
// ============ GIỎ HÀNG (lưu theo tài khoản trong Firestore) ============
export async function saveCart() {
  if (ctx.user) await F.setDoc(F.doc(db, "carts", ctx.user.uid), { items: ctx.cart });
  renderHeader();
}
// Chưa đăng nhập thì chuyển sang trang đăng nhập, đăng nhập xong quay lại trang cũ
export function requireLogin(next = location.pathname.split("/").pop() + location.search) {
  if (ctx.user) return true;
  location.href = "login.html?next=" + encodeURIComponent(next); return false;
}

// ============ MENU & CHÂN TRANG ============
function renderHeader() {
  const cur = location.pathname.split("/").pop() || "index.html", u = ctx.user, n = ctx.cart.reduce((s, i) => s + i.qty, 0);
  const link = ([h, t]) => `<a href="${h}" class="${h === cur ? "on" : ""}">${t}</a>`;
  const menu = [["index.html", "Trang chủ"], ["products.html", "Sản phẩm"], ["index.html#danh-muc", "Danh mục"], ["products.html?sale=1", "Ưu đãi"],
    ["about.html", "Giới thiệu"], ["contact.html", "Liên hệ"], ["cart.html", `🛒 Giỏ hàng (${n})`], ["orders.html", "Đơn hàng"]].map(link).join("");
  $("#header").innerHTML = `<a class="logo" href="index.html"><img src="images/logo.jpg" alt="Logo Fresh Fruit Shop"><span>Fresh Fruit Shop</span></a>
    <form class="search" action="products.html"><input name="q" placeholder="Tìm trái cây..." aria-label="Tìm sản phẩm"><button>Tìm</button></form>
    <button class="burger" aria-label="Mở menu" data-burger>☰</button>
    <nav id="nav">${menu}${u ? link(["account.html", "👤 " + esc(u.displayName || u.email)]) + (isAdmin() ? link(["admin.html", "Quản trị"]) : "") + `<a href="#" data-logout>Đăng xuất</a>`
      : link(["login.html", "Đăng nhập"]) + link(["register.html", "Đăng ký"])}</nav>`;
}
function renderFooter() {
  const f = $("#footer") || $("footer");
  if (!f) return;

  const group1 = (SHOP.emails || []).slice(0, 2).map(
    em => `<p>✉️ <a href="mailto:${esc(em)}">${esc(em)}</a></p>`
  ).join("");

  const group2 = (SHOP.emails || []).slice(2, 4).map(
    em => `<p>✉️ <a href="mailto:${esc(em)}">${esc(em)}</a></p>`
  ).join("");

  f.innerHTML = `
    <div class="container" style="display: flex; justify-content: space-between; gap: 20px; padding: 20px 0; border-top: 1px solid #eee;">
      <!-- Cột 1: Thông tin shop & SĐT -->
      <div class="footer-col">
        <h3>${esc(SHOP.name)}</h3>
        <p>📍 ${esc(SHOP.address)}</p>
        <p>📞 Điện thoại: <a href="tel:${esc(SHOP.phone)}">${esc(SHOP.phone)}</a></p>
      </div>

      <!-- Cột 2: Mail 1 & Mail 2 -->
      <div class="footer-col">
        <h4>Email hỗ trợ</h4>
        ${group1}
      </div>

      <!-- Cột 3: Mail 3 & Mail 4 -->
      <div class="footer-col">
        <h4>Email hỗ trợ</h4>
        ${group2}
      </div>
    </div>
  `;
}
// ============ SỰ KIỆN CHUNG (dùng cho mọi trang) ============
document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-burger]")) $("#nav").classList.toggle("open");
  const c = e.target.closest("[data-copy]");
  if (c) { try { await navigator.clipboard.writeText(c.dataset.copy); toast("Đã sao chép: " + c.dataset.copy); } catch { toast("Không sao chép được, hãy chép thủ công"); } }
  if (e.target.closest("[data-logout]")) { e.preventDefault(); await F.signOut(auth); location.href = "index.html"; }
});
// Hiện/ẩn mật khẩu: tick ô data-showpw sẽ đổi mọi ô data-pw trong cùng form
document.addEventListener("change", (e) => {
  if (e.target.matches("[data-showpw]")) e.target.closest("form").querySelectorAll("[data-pw]").forEach((i) => (i.type = e.target.checked ? "text" : "password"));
});

// ============ KHỞI ĐỘNG TRANG ============
// Mỗi trang gọi boot(hàmVẽTrang): nạp người dùng + giỏ hàng, vẽ menu/chân trang rồi chạy hàm của trang
export function boot(page) {
  if (!auth) {
    renderHeader(); renderFooter();
    $("#app").innerHTML = `<div class="warn"><h2>Chưa cấu hình Firebase</h2><p>Mở <b>firebase.js</b>, điền cấu hình Firebase thật rồi tải lại trang.</p></div>`;
    return;
  }
  let started = false;
  F.onAuthStateChanged(auth, async (u) => {
    if (started) return; started = true;
    ctx.user = u;
    try {
      if (u) {
        const p = await F.getDoc(F.doc(db, "users", u.uid)); ctx.profile = p.exists() ? p.data() : {};
        const c = await F.getDoc(F.doc(db, "carts", u.uid)); ctx.cart = c.exists() ? c.data().items || [] : [];
      }
    } catch (e) { console.error(e); toast("Lỗi tải dữ liệu: " + e.message); }
    renderHeader(); renderFooter();
    try { await page?.(); } catch (e) { console.error(e); $("#app").innerHTML = `<p class="err">Có lỗi: ${esc(e.message)}</p>`; }
  });
}
