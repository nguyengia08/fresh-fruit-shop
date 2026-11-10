// ============ LIÊN HỆ & PHẢN HỒI KHÁCH HÀNG ============
import { F, db, ctx, $, esc, toast, stars, SHOP } from "./script.js";

export async function contactPage() {
  const u = ctx.user;
  $("#app").innerHTML = `
    <h1>Liên hệ</h1>
    <div class="cats">
      <a class="cat" href="tel:${SHOP.phone}">📞<br>Gọi điện<br><small>${SHOP.phone}</small></a>
      
      <div class="cat" style="text-align:center;">
        ✉️<br>Gửi email<br>
        <small style="display:block; font-size:0.8em; line-height:1.4;">
          ${(SHOP.emails || []).map(em => `<a href="mailto:${em}" style="display:block; color:inherit;">${em}</a>`).join("")}
        </small>
      </div>

      <div class="cat">📍<br>Địa chỉ<br><small>${SHOP.address}</small></div>
    </div>

    <h2>Gửi phản hồi</h2>
    <form id="f" class="box narrow" style="margin:0">
      <label>Tên</label>
      <input name="name" required value="${esc(u?.displayName || "")}">
      
      <label>Email</label>
      <input type="email" name="email" required value="${esc(u?.email || "")}">
      
      <label>Đánh giá</label>
      <select name="rating">
        ${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${stars(n)}</option>`).join("")}
      </select>

      <label>Nội dung</label>
      <textarea name="content" rows="3" maxlength="900" required></textarea>
      
      <p><button type="submit">Gửi phản hồi</button></p>
    </form>

    <h2>Đánh giá của khách hàng</h2>
    <div id="fb">Đang tải...</div>
  `;

  const draw = async () => {
    const s = await F.getDocs(F.query(F.collection(db, "feedbacks"), F.orderBy("createdAt", "desc"), F.limit(20)));
    $("#fb").innerHTML = s.empty ? "<p>Chưa có đánh giá nào.</p>" : s.docs.map(d => {
      const f = d.data();
      return `<div class="box" style="margin:.5rem 0"><b>${esc(f.name)}</b> <span class="stars">${stars(f.rating)}</span><br>${esc(f.content)}</div>`;
    }).join("");
  };

  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    d.rating = +d.rating;
    try {
      await F.addDoc(F.collection(db, "feedbacks"), { ...d, createdAt: F.serverTimestamp() });
      e.target.content.value = "";
      toast("Cảm ơn bạn đã gửi phản hồi!");
      draw();
    } catch (err) {
      toast("Không gửi được: " + err.message);
    }
  };

  draw().catch(e => { $("#fb").innerHTML = `<p class="err">${esc(e.message)}</p>`; });
}