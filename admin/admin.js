// 🔐 حماية لوحة التحكم - التحقق من تسجيل الدخول
if (localStorage.getItem("loggedIn") !== "true") {
  window.location.href = "index.html";
}

// 📤 إعداد اتصال Supabase
const SUPABASE_URL = "https://qbkkdsmhnmmrzsdewhde.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFia2tkc21obm1tcnpzZGV3aGRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MjQzMTIsImV4cCI6MjA3NTEwMDMxMn0.opDK0TlCbfCNlLpvMWFxM79myJkgUCIbufw1pbw8bP0";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 🏷️ عناصر الصفحة
const productForm = document.getElementById("productForm");
const productsTable = document.getElementById("productsTable").querySelector("tbody");
const logoutBtn = document.getElementById("logoutBtn");

// 📤 تسجيل الخروج
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("loggedIn");
  window.location.href = "index.html";
});

// 📦 تحميل المنتجات عند فتح الصفحة
window.addEventListener("DOMContentLoaded", loadProducts);

// 🧾 تحميل المنتجات من Supabase
async function loadProducts() {
  const { data, error } = await supabase.from("products").select("*").order("id", { ascending: true });

  if (error) {
    console.error("❌ خطأ في جلب المنتجات:", error);
    return;
  }

  productsTable.innerHTML = "";

  data.forEach(product => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${product.image || ''}" width="70"></td>
      <td>${product.title}</td>
      <td>${product.price} ₺</td>
      <td>${product.colors || '-'}</td>
      <td>${product.sizes || '-'}</td>
      <td>${product.is_featured ? "⭐" : "❌"}</td>
      <td>
        <button onclick="editProduct(${product.id})">✏️ تعديل</button>
        <button onclick="deleteProduct(${product.id})">🗑️ حذف</button>
      </td>
    `;
    productsTable.appendChild(tr);
  });
}

// ➕ إضافة / تعديل منتج
productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("productId").value;
  const title = document.getElementById("title").value;
  const price = document.getElementById("price").value;
  const description = document.getElementById("description").value;
  const colors = document.getElementById("colors").value;
  const sizes = document.getElementById("sizes").value;
  const is_featured = document.getElementById("isFeatured").value === "true";
  const imageFile = document.getElementById("imageFile").files[0];

  let imageUrl = "";

  // 📤 رفع الصورة إن وُجدت
  if (imageFile) {
    const fileName = `${Date.now()}_${imageFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("products-images")
      .upload(fileName, imageFile);

    if (uploadError) {
      alert("❌ خطأ في رفع الصورة: " + uploadError.message);
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from("products-images")
      .getPublicUrl(fileName);

    imageUrl = publicUrl.publicUrl;
  }

  // 🧩 بيانات المنتج
  const productData = {
    title,
    price,
    description,
    colors,
    sizes,
    is_featured,
  };

  if (imageUrl) {
    productData.image = imageUrl;
  }

  let result;
  if (id) {
    // ✏️ تعديل منتج
    result = await supabase.from("products").update(productData).eq("id", id);
  } else {
    // ➕ إضافة منتج جديد
    result = await supabase.from("products").insert([productData]);
  }

  if (result.error) {
    alert("❌ حدث خطأ: " + result.error.message);
  } else {
    alert("✅ تم حفظ المنتج بنجاح");
    productForm.reset();
    document.getElementById("productId").value = "";
    loadProducts();
  }
});

// ✏️ تعديل منتج
async function editProduct(id) {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error) {
    alert("❌ لم يتم العثور على المنتج");
    return;
  }

  document.getElementById("productId").value = data.id;
  document.getElementById("title").value = data.title;
  document.getElementById("price").value = data.price;
  document.getElementById("description").value = data.description;
  document.getElementById("colors").value = data.colors;
  document.getElementById("sizes").value = data.sizes;
  document.getElementById("isFeatured").value = data.is_featured ? "true" : "false";
}

// 🗑️ حذف منتج
async function deleteProduct(id) {
  if (!confirm("⚠️ هل أنت متأكد من حذف هذا المنتج؟")) return;

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    alert("❌ فشل الحذف: " + error.message);
  } else {
    alert("🗑️ تم حذف المنتج بنجاح");
    loadProducts();
  }
}
