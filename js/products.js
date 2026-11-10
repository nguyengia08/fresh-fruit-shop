// ============ SẢN PHẨM: trang chủ, danh sách, chi tiết ============
import { F, db, $, esc, money, CATS, img } from "./script.js";
import "./cart.js"; // nạp để các nút "Thêm vào giỏ" / "Mua ngay" hoạt động

export async function loadProducts() {
  const s = await F.getDocs(F.collection(db, "products"));
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Thẻ sản phẩm dùng chung
export function card(p) {
  const off = p.stock > 0 ? "" : "disabled";
  return `<article class="card"><a class="pic" href="product-detail.html?id=${p.id}">${img(p)}</a><div class="body">
    <span class="tag">${esc(p.category)}</span><h3>${esc(p.name)}</h3>
    <div><span class="price">${money(p.price)}</span>${p.oldPrice > p.price ? `<span class="old">${money(p.oldPrice)}</span>` : ""} <small>/${esc(p.unit)}</small></div>
    <small>${p.stock > 0 ? "Còn " + p.stock : '<b class="err">Hết hàng</b>'}</small>
    <div class="row"><a class="btn ghost" href="product-detail.html?id=${p.id}">Xem</a>
    <button class="ghost" data-add="${p.id}" ${off}>🛒 Thêm vào giỏ</button><button data-buy="${p.id}" ${off}>Mua ngay</button></div></div></article>`;
}
const section = (t, l) => (l.length ? `<h2>${t}</h2><div class="grid">${l.slice(0, 8).map(card).join("")}</div>` : "");

// ---- Trang chủ ----
export async function homePage() {
  const ps = await loadProducts();
  $("#app").innerHTML = `<section class="hero"><div><h1>Fresh Fruit Shop</h1>
    <p><b>Fresh Fruit Shop – Tươi ngon mỗi ngày, khỏe mạnh mỗi nhà!</b></p><p>Trái cây tuyển chọn mỗi sáng, giao tận nhà.</p>
    <a class="btn" href="products.html">Mua trái cây ngay</a></div><div class="fruits">🍉🍊🍇</div></section>
    <h2 id="danh-muc">Danh mục trái cây</h2><div class="cats">${CATS.map((c) => `<a class="cat" href="products.html?cat=${encodeURIComponent(c)}">${c}</a>`).join("")}</div>
    ${ps.length ? "" : '<p class="warn">Chưa có sản phẩm. Đăng nhập admin, vào Quản trị để thêm sản phẩm.</p>'}
    ${section("Sản phẩm nổi bật", ps.filter((p) => p.featured))}${section("Sản phẩm bán chạy", ps.filter((p) => p.bestseller))}${section("Đang khuyến mãi", ps.filter((p) => p.sale))}`;
  if (location.hash) $(location.hash)?.scrollIntoView();
}

// ---- Danh sách: tìm kiếm, lọc theo danh mục và giá, sắp xếp ----
export async function productsPage() {
  const ps = await loadProducts(), q = new URLSearchParams(location.search), sale = q.get("sale");
  $("#app").innerHTML = `<h1>${sale ? "Ưu đãi" : "Sản phẩm"}</h1><div class="filters">
    <input id="fq" placeholder="Tìm theo tên..." value="${esc(q.get("q") || "")}">
    <select id="fc"><option value="">Tất cả danh mục</option>${CATS.map((c) => `<option ${q.get("cat") === c ? "selected" : ""}>${c}</option>`).join("")}</select>
    <select id="fp"><option value="">Mọi mức giá</option><option value="0-50000">Dưới 50.000đ</option><option value="50000-100000">50.000đ – 100.000đ</option><option value="100000-99999999">Trên 100.000đ</option></select>
    <select id="fs"><option value="">Sắp xếp</option><option value="asc">Giá thấp → cao</option><option value="desc">Giá cao → thấp</option></select></div><div id="list" class="grid"></div>`;
  const draw = () => {
    const kw = $("#fq").value.toLowerCase(), cat = $("#fc").value, [lo, hi] = ($("#fp").value || "0-99999999").split("-").map(Number), s = $("#fs").value;
    const l = ps.filter((p) => (!sale || p.sale) && p.name.toLowerCase().includes(kw) && (!cat || p.category === cat) && p.price >= lo && p.price <= hi);
    if (s) l.sort((a, b) => (s === "asc" ? a.price - b.price : b.price - a.price));
    $("#list").innerHTML = l.length ? l.map(card).join("") : "<p>Không tìm thấy sản phẩm phù hợp.</p>";
  };
  document.querySelectorAll(".filters input,.filters select").forEach((e) => e.addEventListener("input", draw));
  draw();
}

// ---- Chi tiết sản phẩm (product-detail.html?id=...) ----
export async function detailPage() {
  const id = new URLSearchParams(location.search).get("id"), s = id && (await F.getDoc(F.doc(db, "products", id)));
  if (!s || !s.exists()) return ($("#app").innerHTML = `<p>Không tìm thấy sản phẩm. <a href="products.html">Quay lại danh sách</a></p>`);
  const p = { id: s.id, ...s.data() }, off = p.stock > 0 ? "" : "disabled";
  $("#app").innerHTML = `<div class="detail"><div class="pic">${img(p)}</div><div><span class="tag">${esc(p.category)}</span><h1>${esc(p.name)}</h1>
    <p class="price" style="font-size:1.6rem">${money(p.price)} <small>/${esc(p.unit)}</small>${p.oldPrice > p.price ? `<span class="old">${money(p.oldPrice)}</span>` : ""}</p>
    <p>${esc(p.desc)}</p><p><b>Xuất xứ:</b> ${esc(p.origin)}<br><b>Đơn vị tính:</b> ${esc(p.unit)}<br>
    <b>Tình trạng:</b> ${p.stock > 0 ? "Còn hàng (" + p.stock + ")" : '<span class="err">Hết hàng</span>'}</p>
    <label for="qty">Số lượng</label><input id="qty" type="number" min="1" max="${p.stock}" value="1" style="width:100px">
    <p><button class="ghost" data-add="${p.id}" ${off}>🛒 Thêm vào giỏ hàng</button> <button data-buy="${p.id}" ${off}>Mua ngay</button></p></div></div>`;
}
