import { F, db, $, esc, money, toast, stars, isAdmin, requireLogin, prepareImage, CATS } from "./script.js";
import { loadProducts } from "./products.js";
import { orderHtml } from "./checkout.js";

export async function adminPage() {
  if (!requireLogin()) return;
  const app = $("#app");
  if (!isAdmin()) return (app.innerHTML = `<p class="err">Bạn không có quyền truy cập trang này.</p>`);
  const tab = new URLSearchParams(location.search).get("t") || "sp";
  const tabs = `<h1>Quản trị</h1><div class="tabs">${[["sp", "Sản phẩm"], ["dh", "Đơn hàng"], ["ph", "Phản hồi"]].map(([k, n]) => `<a class="btn ${k === tab ? "" : "ghost"}" href="admin.html?t=${k}">${n}</a>`).join("")}</div>`;

  if (tab === "dh") {
    const s = await F.getDocs(F.collection(db, "orders"));
    const l = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    app.innerHTML = tabs + (l.length ? l.map((o) => orderHtml(o, true)).join("") : "<p>Chưa có đơn hàng.</p>");
    app.onchange = async (e) => {
      const t = e.target, id = t.dataset.status || t.dataset.pay; if (!id) return;
      try { await F.updateDoc(F.doc(db, "orders", id), t.dataset.status ? { status: t.value } : { paymentStatus: t.value }); toast("Đã cập nhật"); }
      catch (err) { toast("Lỗi: " + err.message); }
    };
    return;
  }


  if (tab === "ph") {
    const s = await F.getDocs(F.query(F.collection(db, "feedbacks"), F.orderBy("createdAt", "desc")));
    app.innerHTML = tabs + (s.empty ? "<p>Chưa có phản hồi.</p>" : s.docs.map((d) => ({ id: d.id, ...d.data() })).map((f) =>
      `<div class="box" style="margin:.5rem 0"><b>${esc(f.name)}</b> (${esc(f.email)}) <span class="stars">${stars(f.rating)}</span><br>${esc(f.content)}<br>
      <button class="danger sm" data-delfb="${f.id}">Xóa</button></div>`).join(""));
    app.onclick = async (e) => {
      const b = e.target.closest("[data-delfb]");
      if (b && confirm("Xóa phản hồi này?")) { await F.deleteDoc(F.doc(db, "feedbacks", b.dataset.delfb)); adminPage(); }
    };
    return;
  }

  const ps = await loadProducts();
  app.innerHTML = tabs + `<form id="pf" class="box"><h3 id="pt">Thêm sản phẩm</h3><input type="hidden" name="id">
    <div class="filters"><div><label>Tên</label><input name="name" required></div><div><label>Giá (đ)</label><input name="price" type="number" min="0" required></div>
    <div><label>Giá cũ (nếu giảm giá)</label><input name="oldPrice" type="number" min="0"></div><div><label>Số lượng kho</label><input name="stock" type="number" min="0" required></div>
    <div><label>Danh mục</label><select name="category">${CATS.map((c) => `<option>${c}</option>`).join("")}</select></div><div><label>Đơn vị tính</label><input name="unit" value="kg" required></div>
    <div><label>Xuất xứ</label><input name="origin" required></div><div><label>Emoji khi chưa có ảnh</label><input name="icon" value="🍎"></div></div>
    <label>Ảnh: link Google Drive hoặc đường dẫn trong thư mục dự án (ví dụ images/xoai.jpg)</label>
    <input name="image" placeholder="https://drive.google.com/file/d/.../view  hoặc  images/xoai.jpg">
    <label>Mô tả</label><textarea name="desc" rows="2" required></textarea>
    <p><label class="chk"><input type="checkbox" name="featured"> Nổi bật</label><label class="chk"><input type="checkbox" name="bestseller"> Bán chạy</label><label class="chk"><input type="checkbox" name="sale"> Khuyến mãi</label></p>
    <button>Lưu sản phẩm</button> <button type="reset" class="ghost" id="rs">Nhập lại</button> <button type="button" class="ghost" id="seed">Thêm 6 sản phẩm mẫu</button><p id="pmsg" class="err" role="alert"></p></form>
    <h2>Danh sách (${ps.length})</h2><table><tr><th>Tên</th><th>Giá</th><th>Kho</th><th></th></tr>${ps.map((p) => `<tr><td>${esc(p.icon)} ${esc(p.name)}</td><td>${money(p.price)}</td><td>${p.stock}</td>
    <td><button class="ghost sm" data-edit="${p.id}">Sửa</button> <button class="danger sm" data-delp="${p.id}">Xóa</button></td></tr>`).join("")}</table>`;
  const f = $("#pf");

  f.onsubmit = async (e) => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(f)), id = d.id; delete d.id; $("#pmsg").textContent = "";
    ["price", "oldPrice", "stock"].forEach((k) => (d[k] = +d[k] || 0)); ["featured", "bestseller", "sale"].forEach((k) => (d[k] = f.elements[k].checked));
    try {
      d.image = await prepareImage(d.image); // kiểm tra ảnh hiển thị được, báo lỗi nếu không
      if (id) await F.setDoc(F.doc(db, "products", id), d, { merge: true }); else await F.addDoc(F.collection(db, "products"), d);
      toast("Đã lưu sản phẩm"); adminPage();
    } catch (err) { $("#pmsg").textContent = err.message; }
  };
  $("#seed").onclick = async () => { 
    const S = [["Xoài cát Hòa Lộc", 65000, 80000, "🥭", "Trái cây Việt Nam", "Tiền Giang"], ["Bưởi da xanh", 45000, 0, "🍈", "Trái cây Việt Nam", "Bến Tre"],
      ["Nho Mỹ không hạt", 129000, 150000, "🍇", "Trái cây nhập khẩu", "Mỹ"], ["Táo Envy", 99000, 0, "🍎", "Trái cây nhập khẩu", "New Zealand"],
      ["Sầu riêng Ri6", 110000, 0, "🍈", "Trái cây theo mùa", "Cần Thơ"], ["Dưa hấu không hạt", 25000, 30000, "🍉", "Trái cây theo mùa", "Long An"]];
    for (const [name, price, oldPrice, icon, category, origin] of S)
      await F.addDoc(F.collection(db, "products"), { name, price, oldPrice, icon, category, origin, sale: oldPrice > price, featured: true, bestseller: price > 60000, unit: "kg", stock: 50, image: "", desc: name + " tươi ngon, tuyển chọn mỗi ngày." });
    toast("Đã thêm sản phẩm mẫu"); adminPage();
  };
  app.onclick = async (e) => {
    const ed = e.target.closest("[data-edit]"), del = e.target.closest("[data-delp]");
    if (ed) {
      const p = ps.find((x) => x.id === ed.dataset.edit);
      ["name", "price", "oldPrice", "stock", "category", "unit", "origin", "icon", "image", "desc"].forEach((k) => (f.elements[k].value = p[k] ?? ""));
      ["featured", "bestseller", "sale"].forEach((k) => (f.elements[k].checked = !!p[k]));
      f.elements.id.value = p.id; $("#pt").textContent = "Sửa sản phẩm"; f.scrollIntoView({ behavior: "smooth" });
    }
    if (del && confirm("Xóa sản phẩm này?")) { await F.deleteDoc(F.doc(db, "products", del.dataset.delp)); adminPage(); }
    if (e.target.closest("#rs")) $("#pt").textContent = "Thêm sản phẩm";
  };
}
