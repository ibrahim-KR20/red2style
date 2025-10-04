// ✅ بيانات 20 منتج (يمكنك تعديلها لاحقاً بسهولة)
const products = [
  { name: "طقم رياضي كلاسيكي", price: "299 TL", image: "assets/images/p1.jpg" },
  { name: "جاكيت شتوي فاخر", price: "349 TL", image: "assets/images/p2.jpg" },
  { name: "قميص صيفي مريح", price: "149 TL", image: "assets/images/p3.jpg" },
  { name: "سروال رياضي أسود", price: "199 TL", image: "assets/images/p4.jpg" },
  { name: "هودي عصري", price: "249 TL", image: "assets/images/p5.jpg" },
  { name: "تيشيرت قطني", price: "129 TL", image: "assets/images/p6.jpg" },
  { name: "طقم صيفي كامل", price: "319 TL", image: "assets/images/p7.jpg" },
  { name: "سروال جينز أنيق", price: "279 TL", image: "assets/images/p8.jpg" },
  { name: "جاكيت ضد المطر", price: "359 TL", image: "assets/images/p9.jpg" },
  { name: "قميص كاجوال", price: "179 TL", image: "assets/images/p10.jpg" },
  { name: "سترة خفيفة", price: "229 TL", image: "assets/images/p11.jpg" },
  { name: "هودي بقبعة", price: "259 TL", image: "assets/images/p12.jpg" },
  { name: "سروال سبور", price: "209 TL", image: "assets/images/p13.jpg" },
  { name: "تيشيرت بأكمام طويلة", price: "139 TL", image: "assets/images/p14.jpg" },
  { name: "جاكيت مبطن", price: "379 TL", image: "assets/images/p15.jpg" },
  { name: "قميص رسمي", price: "199 TL", image: "assets/images/p16.jpg" },
  { name: "طقم تدريب", price: "289 TL", image: "assets/images/p17.jpg" },
  { name: "بنطال جينز كلاسيكي", price: "249 TL", image: "assets/images/p18.jpg" },
  { name: "جاكيت خفيف صيفي", price: "199 TL", image: "assets/images/p19.jpg" },
  { name: "طقم خروج أنيق", price: "399 TL", image: "assets/images/p20.jpg" },
];

// ✅ عرض المنتجات في الصفحة
const grid = document.getElementById("productGrid");

if (grid) {
  products.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}">
      <h3>${p.name}</h3>
      <p>${p.price}</p>
      <button onclick="orderWhatsApp('${p.name}', '${p.price}')">أضف إلى السلة</button>
    `;
    grid.appendChild(card);
  });
}

// ✅ إرسال الطلب عبر واتساب مباشرة
function orderWhatsApp(name, price) {
  const message = `مرحباً، أرغب بطلب المنتج التالي:\n📦 ${name}\n💸 السعر: ${price}\n\nالرجاء التواصل معي لإتمام الطلب.`;
  const phone = "905525802041";
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}
