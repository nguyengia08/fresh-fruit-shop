// ============ THANH TOÁN & ĐƠN HÀNG ============
import { F, db, ctx, $, esc, money, toast, fmtDate, saveCart, requireLogin, bankBox, BANK, STATUS, PAY, orderCode } from "./script.js";

// ---- Trang thanh toán ----
// checkout.html            -> thanh toán các sản phẩm trong GIỎ HÀNG
// checkout.html?buy=ID&qty -> MUA NGAY một sản phẩm (không đụng tới giỏ hàng)
export async function checkoutPage() {
  const q = new URLSearchParams(location.search), buy = q.get("buy"), app = $("#app");
  if (!requireLogin(location.pathname.split("/").pop() + location.search)) return;
  const src = buy ? [{ id: buy, qty: Math.max(1, parseInt(q.get("qty")) || 1) }] : ctx.cart;
  if (!src.length) return (app.innerHTML = `<h1>Thanh toán</h1><p>Chưa có sản phẩm để thanh toán.</p><a class="btn" href="products.html">Xem sản phẩm</a>`);

  // Lấy lại giá và tồn kho mới nhất từ Firestore để đơn hàng chính xác
  let items;
  try {
    items = await Promise.all(src.map(async (i) => {
      const s = await F.getDoc(F.doc(db, "products", i.id));
      if (!s.exists()) throw new Error("Có sản phẩm không còn được bán, hãy quay lại giỏ hàng để xóa.");
      const p = s.data();
      if (p.stock < i.qty) throw new Error(`"${p.name}" chỉ còn ${p.stock} sản phẩm.`);
      return { id: i.id, name: p.name, price: p.price, image: p.image || "", icon: p.icon || "🍎", unit: p.unit, qty: i.qty };
    }));
  } catch (e) { return (app.innerHTML = `<p class="err">${esc(e.message)}</p><a class="btn" href="cart.html">Về giỏ hàng</a>`); }

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const ref = F.doc(F.collection(db, "orders")), content = "FFS" + orderCode(ref.id); // mã đơn có trước khi lưu
  const pf = ctx.profile, u = ctx.user;
  app.innerHTML = `<h1>Thanh toán</h1>${buy ? '<p class="tag">Mua ngay – không dùng giỏ hàng</p>' : ""}<div class="two"><form id="co" class="box">
    <label>Họ tên người nhận</label><input name="name" required value="${esc(pf.name || u.displayName || "")}">
    <label>Số điện thoại</label><input name="phone" required pattern="[0-9 +]{9,13}" value="${esc(pf.phone || "")}">
    <label>Địa chỉ giao hàng</label><input name="address" required value="${esc(pf.address || "")}">
    <label>Ghi chú</label><textarea name="note" rows="2"></textarea>
    <label>Phương thức thanh toán</label>
    <label class="chk"><input type="radio" name="payment" value="COD" checked> Thanh toán khi nhận hàng (COD)</label>
    <label class="chk"><input type="radio" name="payment" value="Chuyển khoản"> Chuyển khoản ngân hàng</label>
    <div id="bankArea"></div><p><button id="ok">Xác nhận đặt hàng</button></p></form>
    <div class="box"><h3>Đơn hàng của bạn</h3>${items.map((i) => `<p>${esc(i.icon)} ${esc(i.name)} × ${i.qty}<br><b>${money(i.price * i.qty)}</b></p>`).join("")}
    <h2>Cần thanh toán: ${money(total)}</h2></div></div>`;

  const form = $("#co"), pay = () => form.payment.value;
  form.onchange = () => ($("#bankArea").innerHTML = pay() === "Chuyển khoản" ? bankBox(total, content) + "<p><small>Sau khi đặt hàng, vào mục Đơn hàng bấm \"Tôi đã chuyển khoản\".</small></p>" : "");
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (pay() === "Chuyển khoản" && !BANK.account) return toast("Cửa hàng chưa cấu hình ngân hàng, vui lòng chọn COD.");
    const d = Object.fromEntries(new FormData(form)); $("#ok").disabled = true;
    try {
      await F.setDoc(ref, { ...d, uid: u.uid, email: u.email, items, total, status: STATUS[0],
        paymentStatus: d.payment === "COD" ? PAY[0] : PAY[1], createdAt: F.serverTimestamp() });
      if (!buy) { ctx.cart = []; await saveCart(); } // chỉ xóa giỏ khi thanh toán từ giỏ hàng
      toast("🎉 Đặt hàng thành công!"); setTimeout(() => (location.href = "orders.html?new=" + ref.id), 900);
    } catch (err) { toast("Không đặt được hàng: " + err.message); $("#ok").disabled = false; }
  };
}

// ---- Khung hiển thị một đơn hàng (dùng cho khách và admin) ----
export function orderHtml(o, admin, extra = "", open = false) {
  const sel = (key, list, cur) => `<select data-${key}="${o.id}" style="width:auto">${list.map((s) => `<option ${s === cur ? "selected" : ""}>${s}</option>`).join("")}</select>`;
  return `<details class="box" ${open ? "open" : ""}><summary><b>#${orderCode(o.id)}</b> · ${fmtDate(o.createdAt)} · ${money(o.total)} ·
    ${admin ? sel("status", STATUS, o.status) + " " + sel("pay", PAY, o.paymentStatus) : `<span class="status">${esc(o.status)}</span> ${o.paymentStatus ? `<span class="status">${esc(o.paymentStatus)}</span>` : ""}`}</summary>
    <p>${esc(o.name)} – ${esc(o.phone)}<br>${esc(o.address)}<br>Thanh toán: ${esc(o.payment)}${o.note ? "<br>Ghi chú: " + esc(o.note) : ""}</p>
    <ul>${o.items.map((i) => `<li>${esc(i.name)} × ${i.qty} = ${money(i.price * i.qty)}</li>`).join("")}</ul>${extra}</details>`;
}

// ---- Trang đơn hàng của khách ----
export async function ordersPage() {
  if (!requireLogin()) return;
  const newId = new URLSearchParams(location.search).get("new");
  const s = await F.getDocs(F.query(F.collection(db, "orders"), F.where("uid", "==", ctx.user.uid)));
  const l = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  // Đơn chuyển khoản chưa thanh toán: hiện thông tin + nút xác nhận đã chuyển khoản
  const extra = (o) => (o.payment === "Chuyển khoản" && o.paymentStatus === PAY[1]
    ? bankBox(o.total, "FFS" + orderCode(o.id)) + `<button data-paid="${o.id}">✅ Tôi đã chuyển khoản</button>` : "");
  $("#app").innerHTML = `<h1>Đơn hàng của tôi</h1>${newId ? '<p class="ok">🎉 Đặt hàng thành công! Cảm ơn bạn đã mua hàng.</p>' : ""}
    ${l.length ? l.map((o) => orderHtml(o, false, extra(o), o.id === newId)).join("") : '<p>Bạn chưa có đơn hàng nào. <a href="products.html">Mua sắm ngay</a></p>'}`;
  $("#app").onclick = async (e) => {
    const b = e.target.closest("[data-paid]"); if (!b) return;
    try { await F.updateDoc(F.doc(db, "orders", b.dataset.paid), { paymentStatus: PAY[2] }); toast("Đã ghi nhận, chờ cửa hàng xác nhận thanh toán"); ordersPage(); }
    catch (err) { toast("Lỗi: " + err.message); }
  };
}
