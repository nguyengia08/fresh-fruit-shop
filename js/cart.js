// ============ GIỎ HÀNG: "Thêm vào giỏ" và "Mua ngay" hoạt động ĐỘC LẬP ============
import { F, db, ctx, $, esc, money, toast, saveCart, requireLogin } from "./script.js";

async function getProduct(id) {
  const s = await F.getDoc(F.doc(db, "products", id));
  if (!s.exists()) throw new Error("Sản phẩm không còn tồn tại");
  return { id: s.id, ...s.data() };
}

// THÊM VÀO GIỎ: chỉ ghi vào giỏ hàng, KHÔNG chuyển trang
export async function addToCart(id, qty = 1) {
  if (!requireLogin()) return;
  const p = await getProduct(id), it = ctx.cart.find((i) => i.id === id), next = (it?.qty || 0) + qty;
  if (next > p.stock) return toast(`"${p.name}" chỉ còn ${p.stock} trong kho`);
  if (it) { it.qty = next; it.price = p.price; }
  else ctx.cart.push({ id, name: p.name, price: p.price, image: p.image || "", icon: p.icon || "🍎", unit: p.unit, qty: next });
  await saveCart();
  toast(`Đã thêm "${p.name}" vào giỏ hàng`);
}

// MUA NGAY: chuyển thẳng sang thanh toán với đúng sản phẩm này, KHÔNG đụng tới giỏ hàng
export function buyNow(id, qty = 1) {
  const url = `checkout.html?buy=${encodeURIComponent(id)}&qty=${qty}`;
  if (requireLogin(url)) location.href = url;
}

// Các nút data-add / data-buy trên thẻ sản phẩm và trang chi tiết
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-add]"), b = e.target.closest("[data-buy]");
  const qty = Math.max(1, parseInt($("#qty")?.value) || 1); // ô số lượng chỉ có ở trang chi tiết
  if (a) addToCart(a.dataset.add, qty).catch((er) => toast(er.message));
  if (b) buyNow(b.dataset.buy, qty);
});

// ---- Trang giỏ hàng ----
export function cartPage() {
  if (!requireLogin()) return;
  const app = $("#app");
  const total = () => ctx.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const draw = () => {
    if (!ctx.cart.length) return (app.innerHTML = `<h1>Giỏ hàng</h1><p>Giỏ hàng đang trống.</p><a class="btn" href="products.html">Tiếp tục mua hàng</a>`);
    app.innerHTML = `<h1>Giỏ hàng</h1><table><tr><th>Sản phẩm</th><th>Giá</th><th>Số lượng</th><th>Thành tiền</th><th></th></tr>
      ${ctx.cart.map((i) => `<tr><td>${esc(i.icon)} ${esc(i.name)}</td><td>${money(i.price)}</td>
        <td><span class="qty"><button class="ghost sm" data-dec="${i.id}" aria-label="Giảm">−</button><b>${i.qty}</b><button class="ghost sm" data-inc="${i.id}" aria-label="Tăng">+</button></span></td>
        <td>${money(i.price * i.qty)}</td><td><button class="danger sm" data-del="${i.id}">Xóa</button></td></tr>`).join("")}</table>
      <h2>Tổng tiền: <span class="price">${money(total())}</span></h2>
      <a class="btn ghost" href="products.html">Tiếp tục mua hàng</a> <a class="btn" href="checkout.html">Tiến hành thanh toán</a>`;
  };
  app.onclick = async (e) => {
    const t = e.target.closest("[data-inc],[data-dec],[data-del]"); if (!t) return;
    const id = t.dataset.inc || t.dataset.dec || t.dataset.del, it = ctx.cart.find((i) => i.id === id);
    try {
      if (t.dataset.del) ctx.cart = ctx.cart.filter((i) => i.id !== id);
      else if (t.dataset.dec) it.qty = Math.max(1, it.qty - 1);
      else { const p = await getProduct(id); if (it.qty + 1 > p.stock) return toast(`Chỉ còn ${p.stock} trong kho`); it.qty++; }
      await saveCart(); draw();
    } catch (er) { toast(er.message); }
  };
  draw();
}
