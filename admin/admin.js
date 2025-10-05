// admin/admin.js
const SUPABASE_URL = "https://qbkkdsmhnmmrzsdewhde.supabase.co";
const SUPABASE_ANON_KEY = "<ضع_هنا_مفتاح_anon_الذي_أرسلته>";

const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- Login (index.html) ----------
if (location.pathname.endsWith('index.html')) {
  document.getElementById('btnLogin').addEventListener('click', async () => {
    const u = document.getElementById('inpUser').value.trim();
    const p = document.getElementById('inpPass').value.trim();
    const err = document.getElementById('loginError');

    if (!u || !p) { err.textContent = 'الرجاء إدخال اسم المستخدم وكلمة المرور'; return; }

    // تحقق من جدول admin في Supabase
    const { data, error } = await supabase
      .from('admin')
      .select('*')
      .eq('username', u)
      .limit(1);

    if (error) { err.textContent = 'خطأ في الاتصال بقاعدة البيانات'; console.error(error); return; }
    if (!data || data.length === 0) { err.textContent = 'مستخدم غير موجود'; return; }

    const admin = data[0];
    if (admin.password === p) {
      localStorage.setItem('adminUser', u);
      // انتقل إلى لوحة التحكم
      location.href = 'dashboard.html';
    } else {
      err.textContent = 'كلمة المرور خاطئة';
    }
  });
}

// ---------- Dashboard logic ----------
if (location.pathname.endsWith('dashboard.html')) {
  // DOM elements
  const btnLogout = document.getElementById('btnLogout');
  const btnSave = document.getElementById('btnSave');
  const btnClear = document.getElementById('btnClear');
  const productsList = document.getElementById('productsList');

  // Auth guard
  const adminUser = localStorage.getItem('adminUser');
  if (!adminUser) { location.href = 'index.html'; }

  // Load initial content
  loadProducts();
  loadAboutAndReviews();

  // Save product (create or update)
  btnSave.addEventListener('click', async () => {
    const id = document.getElementById('prodId').value || null;
    const name = document.getElementById('name').value.trim();
    const price = document.getElementById('price').value.trim();
    const colors = document.getElementById('colors').value.trim();
    const sizes = document.getElementById('sizes').value.trim();
    const description = document.getElementById('description').value.trim();
    const fileInput = document.getElementById('image');

    if (!name || !price) { alert('الرجاء إدخال اسم المنتج والسعر'); return; }

    try {
      let image_url = document.getElementById('existingImage') ? document.getElementById('existingImage').value : '';

      // إذا تم اختيار ملف جديد
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        // unique path
        const filename = `${Date.now()}_${file.name.replace(/\s/g,'_')}`;
        const { data: upData, error: upErr } = await supabase.storage
          .from('products-images')
          .upload(filename, file, { cacheControl: '3600', upsert: false });

        if (upErr) { console.error(upErr); alert('فشل رفع الصورة'); return; }

        // الحصول على URL عام
        const { data: publicData } = supabase.storage.from('products-images').getPublicUrl(upData.path);
        image_url = publicData.publicUrl;
      }

      if (!id) {
        // إنشاء
        const { data, error } = await supabase.from('products').insert([{
          name, price, colors, sizes, description, image_url
        }]).select().single();
        if (error) throw error;
        alert('تم إضافة المنتج');
      } else {
        // تحديث
        const { data, error } = await supabase.from('products').update({
          name, price, colors, sizes, description, image_url
        }).eq('id', id);
        if (error) throw error;
        alert('تم تحديث المنتج');
      }

      clearForm();
      await loadProducts();
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء الحفظ');
    }
  });

  // تفريغ النموذج
  btnClear.addEventListener('click', clearForm);

  // تحميل المنتجات وعرضها
  async function loadProducts() {
    productsList.innerHTML = 'جارٍ التحميل...';
    const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false });
    if (error) { productsList.innerHTML = '<div class="error">خطأ في جلب المنتجات</div>'; console.error(error); return; }
    if (!data || data.length === 0) { productsList.innerHTML = '<div class="hint">لا توجد منتجات حالياً</div>'; return; }

    productsList.innerHTML = '';
    data.forEach(p => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `
        <img src="${p.image_url || 'https://via.placeholder.com/300x300?text=No+Image'}" alt="${p.name}" />
        <div style="flex:1">
          <strong>${p.name}</strong><br/>
          <small>${p.price}</small><br/>
          <small>الألوان: ${p.colors || '-'}</small><br/>
          <small>المقاسات: ${p.sizes || '-'}</small><br/>
          <p style="margin-top:6px;color:#ccc">${p.description || ''}</p>
        </div>
        <div class="controls">
          <button class="edit" data-id="${p.id}">✏️ تعديل</button>
          <button class="delete" data-id="${p.id}">🗑️ حذف</button>
        </div>
      `;
      productsList.appendChild(div);
    });

    // أحداث أزرار التحرير والحذف
    document.querySelectorAll('.controls .edit').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.dataset.id;
        const { data } = await supabase.from('products').select('*').eq('id', id).single();
        if (!data) return alert('لم يتم إيجاد المنتج');
        // املأ النموذج بالقيم
        document.getElementById('prodId').value = data.id;
        document.getElementById('name').value = data.name;
        document.getElementById('price').value = data.price;
        document.getElementById('colors').value = data.colors;
        document.getElementById('sizes').value = data.sizes;
        document.getElementById('description').value = data.description;
        // ضع حقل مخفي يحمل رابط الصورة القائمة
        if (!document.getElementById('existingImage')) {
          const inp = document.createElement('input');
          inp.type = 'hidden'; inp.id = 'existingImage'; inp.value = data.image_url || '';
          document.querySelector('.card').appendChild(inp);
        } else document.getElementById('existingImage').value = data.image_url || '';
        window.scrollTo({top:0,behavior:'smooth'});
      });
    });

    document.querySelectorAll('.controls .delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('هل تريد حذف هذا المنتج؟')) return;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) { alert('خطأ عند الحذف'); console.error(error); return; }
        alert('تم الحذف');
        loadProducts();
      });
    });
  }

  // Clear form
  function clearForm() {
    document.getElementById('prodId').value = '';
    document.getElementById('name').value = '';
    document.getElementById('price').value = '';
    document.getElementById('colors').value = '';
    document.getElementById('sizes').value = '';
    document.getElementById('description').value = '';
    document.getElementById('image').value = '';
    const ex = document.getElementById('existingImage'); if (ex) ex.remove();
  }

  // about & reviews
  async function loadAboutAndReviews() {
    // سنخزن النصوص في جدول products_content أو بإمكاننا استخدام صفوف خاصة في table 'sitecontent'
    // هنا سنستخدم جدول بسيط 'sitecontent' مع key,value (إذا لم يكن موجودًا فسنستخدم localStorage كحل مؤقت)
    try {
      const { data } = await supabase.from('sitecontent').select('*').in('key', ['about','reviews']);
      if (data && data.length>0) {
        data.forEach(r => {
          if (r.key === 'about') document.getElementById('about').value = r.value;
          if (r.key === 'reviews') document.getElementById('reviews').value = r.value;
        });
      } else {
        // fallback to localStorage
        document.getElementById('about').value = localStorage.getItem('about') || '';
        document.getElementById('reviews').value = localStorage.getItem('reviews') || '';
      }
    } catch(err){ console.warn(err); }
  }

  // Save about
  document.getElementById('btnSaveAbout').addEventListener('click', async ()=>{
    const val = document.getElementById('about').value;
    // upsert into sitecontent
    const { data, error } = await supabase.from('sitecontent').upsert([{ key:'about', value: val }], { onConflict: ['key'] });
    if (error) { alert('خطأ عند الحفظ'); console.error(error); return; }
    alert('تم حفظ النص');
  });

  // Save reviews
  document.getElementById('btnSaveReviews').addEventListener('click', async ()=>{
    const val = document.getElementById('reviews').value;
    const { data, error } = await supabase.from('sitecontent').upsert([{ key:'reviews', value: val }], { onConflict: ['key'] });
    if (error) { alert('خطأ عند الحفظ'); console.error(error); return; }
    alert('تم حفظ الآراء');
  });

  // Change password
  document.getElementById('btnChangePass').addEventListener('click', async ()=>{
    const newPass = document.getElementById('newPass').value;
    if(!newPass) return alert('أدخل كلمة مرور جديدة');
    // تحديث جدول admin
    const { data, error } = await supabase.from('admin').update({ password: newPass }).eq('username', adminUser);
    if (error) { alert('خطأ عند تغيير كلمة المرور'); console.error(error); return; }
    alert('تم تغيير كلمة المرور بنجاح');
  });

  // Logout
  document.getElementById('btnLogout').addEventListener('click', ()=>{
    localStorage.removeItem('adminUser');
    location.href = 'index.html';
  });

}
