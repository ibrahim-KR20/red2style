if (localStorage.getItem('loggedIn') !== 'true') {
  window.location.href = 'index.html';
}

const tableBody = document.querySelector("#productsTable tbody");
let products = JSON.parse(localStorage.getItem("products") || "[]");

// 🧰 عرض المنتجات
function renderProducts() {
  tableBody.innerHTML = "";
  products.forEach((p, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><img src="${p.img}" /></td>
      <td>${p.name}</td>
      <td>${p.price}</td>
      <td>
        <button onclick="deleteProduct(${i})">🗑️ حذف</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}
renderProducts();

// ➕ إضافة منتج
document.getElementById("productForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = document.getElementById("name").value;
  const price = document.getElementById("price").value;
  const colors = document.getElementById("colors").value.split(",");
  const sizes = document.getElementById("sizes").value.split(",");
  const description = document.getElementById("description").value;
  const imageFile = document.getElementById("image").files[0];

  const reader = new FileReader();
  reader.onload = function(e) {
    products.push({
      name, price, colors, sizes, description,
      img: e.target.result
    });
    localStorage.setItem("products", JSON.stringify(products));
    renderProducts();
    document.getElementById("productForm").reset();
  };
  reader.readAsDataURL(imageFile);
});

// 🗑️ حذف منتج
function deleteProduct(index) {
  if (confirm("هل تريد حذف هذا المنتج؟")) {
    products.splice(index, 1);
    localStorage.setItem("products", JSON.stringify(products));
    renderProducts();
  }
}

// 💾 حفظ قسم "من نحن"
function saveAbout() {
  const text = document.getElementById("about").value;
  localStorage.setItem("about", text);
  alert("✅ تم حفظ قسم من نحن");
}

// 💾 حفظ قسم "الآراء"
function saveReviews() {
  const text = document.getElementById("reviews").value;
  localStorage.setItem("reviews", text);
  alert("✅ تم حفظ آراء العملاء");
}

// 🔐 تسجيل الخروج
function logout() {
  localStorage.removeItem("loggedIn");
  window.location.href = "index.html";
}
