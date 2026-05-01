// 1. KONFIGURASI SUPABASE
const SUPABASE_URL = "https://ciiqedrfocqzhhhsbtbb.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaXFlZHJmb2NxemhoaHNidGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MTA4MzYsImV4cCI6MjA5MzA4NjgzNn0.jaPVyYSA7XXEISY41ieIKXQkRwZBcWndBJiqfZnzKqU";
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. STATE APLIKASI
let cart = [];
let activeUser = localStorage.getItem("kantinHubUser") || null;
let isAdmin = localStorage.getItem("kantinHubAdmin") === "true";
let activeKantinId = null;

let dataKantin = [];
let dataMenu = [];

// 3. INISIALISASI
document.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();
  
  fetchKantin();
  fetchReviews();
  setupLoginForm();
});

function updateAuthUI() {
  if (activeUser) {
    document.getElementById("loginBtn").classList.add("d-none");
    document.getElementById("userProfile").classList.remove("d-none");
    document.getElementById("userDisplayName").innerText = activeUser;
    
    document.getElementById("review-form-area").classList.remove("d-none");
    document.getElementById("review-login-msg").classList.add("d-none");
    
    if (isAdmin) {
      document.getElementById("adminPanelBtn").classList.remove("d-none");
      document.getElementById("adminDivider").classList.remove("d-none");
    } else {
      document.getElementById("adminPanelBtn").classList.add("d-none");
      document.getElementById("adminDivider").classList.add("d-none");
    }
  } else {
    document.getElementById("loginBtn").classList.remove("d-none");
    document.getElementById("userProfile").classList.add("d-none");
    
    document.getElementById("review-form-area").classList.add("d-none");
    document.getElementById("review-login-msg").classList.remove("d-none");
  }
}

// 4. FUNGSI DATA DARI SUPABASE
async function fetchKantin() {
  const container = document.getElementById("kantin-container");
  container.innerHTML = '<div class="text-center w-100 my-4"><div class="spinner-border text-warning" role="status"></div><p class="mt-2 text-muted">Memuat kantin...</p></div>';
  
  const { data, error } = await _supabase.from("kantin").select("*").order("id", { ascending: true });
  
  if (error) {
    container.innerHTML = `<p class="text-danger text-center w-100">Gagal memuat daftar kantin: ${error.message}</p>`;
    return;
  }
  
  dataKantin = data;
  renderKantin();
}

async function fetchMenu(kantinId) {
  const container = document.getElementById("menu-container");
  container.innerHTML = '<div class="text-center w-100 my-4"><div class="spinner-border text-warning" role="status"></div><p class="mt-2 text-muted">Memuat menu...</p></div>';
  
  const { data, error } = await _supabase.from("menu").select("*").eq("kantin_id", kantinId);
  
  if (error) {
    container.innerHTML = `<p class="text-danger text-center w-100">Gagal memuat menu: ${error.message}</p>`;
    return;
  }
  
  dataMenu = data;
  renderMenu();
}

async function fetchReviews() {
  const container = document.getElementById("reviews-list");
  
  const { data, error } = await _supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(5);
  
  if (error || !data) return;
  
  if (data.length > 0) {
    container.innerHTML = data.map(r => `
      <div class="review-item mb-3 p-2 border-bottom">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="fw-bold small">${r.username}</span>
          <span class="text-muted" style="font-size: 0.70rem;">${new Date(r.created_at).toLocaleDateString()}</span>
        </div>
        <p class="small text-muted mb-0">${r.review_text}</p>
      </div>
    `).join("");
  }
}

async function addReview() {
  const nameInput = document.getElementById("reviewerName").value || activeUser || "Anonim";
  const textInput = document.getElementById("reviewText").value;
  
  if (!textInput.trim()) {
    alert("Ulasan tidak boleh kosong!");
    return;
  }
  
  const btn = document.querySelector(".review-container button");
  const originalText = btn.innerText;
  btn.disabled = true;
  btn.innerText = "Mengirim...";
  
  const { data, error } = await _supabase.from("reviews").insert([
    { username: nameInput, review_text: textInput }
  ]);
  
  if (!error) {
    document.getElementById("reviewText").value = "";
    fetchReviews();
  } else {
    alert("Gagal mengirim ulasan: " + error.message);
  }
  
  btn.disabled = false;
  btn.innerText = originalText;
}

// 5. FUNGSI RENDER UI
function renderKantin() {
  const container = document.getElementById("kantin-container");
  if (dataKantin.length === 0) {
    container.innerHTML = '<p class="text-center w-100 text-muted">Belum ada kantin terdaftar.</p>';
    return;
  }
  
  container.innerHTML = dataKantin
    .map(
      (k) => `
    <div class="col-6 col-md-4">
      <div class="card h-100 border-0 shadow-sm rounded-4 text-center p-3 m-card d-flex flex-column justify-content-center align-items-center" onclick="openKantin(${k.id}, '${k.nama}')" style="cursor: pointer; aspect-ratio: 1 / 1;">
        <div class="fs-1 mb-2">${k.icon}</div>
        <h6 class="fw-bold mb-0">${k.nama}</h6>
      </div>
    </div>
  `,
    )
    .join("");
}

function openKantin(id, nama) {
  activeKantinId = id;
  document.getElementById("kantin-name-title").innerText = nama;
  showSection("katalog");
  fetchMenu(id);
}

function renderMenu() {
  const container = document.getElementById("menu-container");

  container.innerHTML = dataMenu.length
    ? dataMenu
        .map(
          (m) => `
    <div class="col-6 col-md-4">
      <div class="card border-0 shadow-sm rounded-4 overflow-hidden h-100">
        <img src="${m.img}" class="card-img-top" style="height: 120px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/150'">
        <div class="card-body p-3 d-flex flex-column">
          <h6 class="fw-bold mb-1 small">${m.nama}</h6>
          <p class="text-warning fw-bold mb-2 small">Rp ${m.harga.toLocaleString()}</p>
          <button class="btn btn-warning btn-sm w-100 rounded-pill fw-bold mt-auto" onclick="addToCart(${m.id})">+ Tambah</button>
        </div>
      </div>
    </div>
  `,
        )
        .join("")
    : '<p class="text-center w-100 text-muted mt-4">Menu belum tersedia di kantin ini.</p>';
}

// 6. LOGIKA KERANJANG & CHECKOUT
function addToCart(menuId) {
  if (!activeUser) {
    new bootstrap.Modal(document.getElementById("loginModal")).show();
    return;
  }
  const item = dataMenu.find((m) => m.id === menuId);
  if(item) {
    if (cart.length > 0 && cart[0].kantin_id !== item.kantin_id) {
      if (confirm("Keranjang Anda berisi makanan dari kantin lain. Ingin menghapus keranjang dan memesan dari kantin ini?")) {
        cart = [];
      } else {
        return;
      }
    }
    cart.push(item);
    updateCartUI();
  }
}

function updateCartUI() {
  const badge = document.getElementById("floating-cart");
  if (cart.length > 0) {
    badge.classList.remove("d-none");
    document.getElementById("cart-badge-count").innerText = cart.length;
    const total = cart.reduce((sum, i) => sum + i.harga, 0);
    document.getElementById("cart-badge-total").innerText =
      `Rp ${total.toLocaleString()}`;
  } else {
    badge.classList.add("d-none");
  }
}

function toggleQR() {
  const isQRIS = document.getElementById("methodQRIS").checked;
  const qrArea = document.getElementById("qr-area");
  if (isQRIS) {
    qrArea.classList.remove("d-none");
  } else {
    qrArea.classList.add("d-none");
  }
}

// 7. INTEGRASI SUPABASE (PENGIRIMAN DATA)
async function confirmPayment() {
  if (cart.length === 0) return;

  const btn = document.querySelector("#checkout-section button.btn-warning");
  const originalText = btn.innerText;

  // Loading state
  btn.innerText = "Memproses...";
  btn.disabled = true;

  const totalHarga = cart.reduce((sum, i) => sum + i.harga, 0);
  
  // Kelompokkan item di keranjang
  const itemCounts = {};
  cart.forEach(item => {
    itemCounts[item.nama] = (itemCounts[item.nama] || 0) + 1;
  });
  
  const itemsString = Object.entries(itemCounts)
    .map(([nama, qty]) => `${nama} (x${qty})`)
    .join(", ");

  const payload = {
    kantin_id: cart[0].kantin_id,
    username: activeUser,
    items: itemsString,
    total_price: totalHarga,
    note: document.getElementById("orderNote").value,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await _supabase.from("orders").insert([payload]);

    if (error) throw error;

    // Sukses
    cart = [];
    document.getElementById("orderNote").value = "";
    updateCartUI();
    
    // Sembunyikan modal login jika nyangkut, tampilkan sukses
    new bootstrap.Modal(document.getElementById("successModal")).show();
    showSection("home");
  } catch (err) {
    console.error("Supabase Error:", err.message);
    alert(
      "Gagal mengirim pesanan: " +
        err.message +
        "\n\nPastikan tabel 'orders' sudah ada di Supabase dan RLS dimatikan."
    );
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

// 8. SISTEM AUTH & NAVIGASI
function setupLoginForm() {
  document.getElementById("loginForm").onsubmit = (e) => {
    e.preventDefault();
    activeUser = document.getElementById("loginUser").value;
    const pass = document.getElementById("loginPass").value;
    
    if (activeUser === "admin" && pass === "@dm1NC1huyy67") {
      isAdmin = true;
      localStorage.setItem("kantinHubAdmin", "true");
    } else {
      isAdmin = false;
      localStorage.removeItem("kantinHubAdmin");
    }

    localStorage.setItem("kantinHubUser", activeUser);

    updateAuthUI();

    const modalEl = document.getElementById("loginModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modalInstance.hide();
  };
}

function doLogout() {
  activeUser = null;
  isAdmin = false;
  localStorage.removeItem("kantinHubUser");
  localStorage.removeItem("kantinHubAdmin");
  
  updateAuthUI();
  
  showSection("home");
}

function showSection(sectionId) {
  const sections = [
    "home-section",
    "katalog-section",
    "checkout-section",
    "history-section",
  ];
  sections.forEach((s) => {
    const el = document.getElementById(s);
    if(el) el.classList.add("d-none");
  });
  
  const target = document.getElementById(`${sectionId}-section`);
  if(target) target.classList.remove("d-none");

  if (sectionId === "checkout") renderCheckout();
  if (sectionId === "history") fetchHistory();
}

function renderCheckout() {
  const list = document.getElementById("cart-summary-list");
  let total = 0;
  
  const groupedCart = {};
  cart.forEach(item => {
    if (!groupedCart[item.id]) {
      groupedCart[item.id] = { ...item, qty: 0 };
    }
    groupedCart[item.id].qty += 1;
    total += item.harga;
  });

  list.innerHTML = Object.values(groupedCart)
    .map((item) => {
      return `<div class="d-flex justify-content-between mb-2">
        <span>${item.qty}x ${item.nama}</span>
        <b>Rp ${(item.harga * item.qty).toLocaleString()}</b>
      </div>`;
    })
    .join("");
    
  document.getElementById("final-price-display").innerText =
    `Rp ${total.toLocaleString()}`;
}

// Ambil Riwayat dari Supabase
async function fetchHistory() {
  const container = document.getElementById("history-list");
  if (!activeUser) {
    container.innerHTML = "<p class='text-center text-muted mt-4'>Silakan login terlebih dahulu untuk melihat riwayat.</p>";
    return;
  }
  
  container.innerHTML = '<div class="text-center w-100 my-4"><div class="spinner-border text-warning" role="status"></div><p class="mt-2 text-muted">Memuat riwayat...</p></div>';

  const { data, error } = await _supabase
    .from("orders")
    .select("*")
    .eq("username", activeUser)
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<p class="text-danger text-center mt-4">Gagal memuat riwayat: ${error.message}</p>`;
    return;
  }

  container.innerHTML = data.length
    ? data
        .map(
          (h) => `
    <div class="card border-0 shadow-sm p-3 mb-3 rounded-4">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div class="small fw-bold text-muted">${new Date(h.created_at).toLocaleString()}</div>
        <span class="badge ${h.is_completed ? 'bg-success' : 'bg-warning text-dark'}">${h.is_completed ? 'Selesai' : 'Diproses'}</span>
      </div>
      <div class="mb-2 text-dark">${h.items}</div>
      ${h.note ? `<div class="small text-muted mb-2"><i class="bi bi-chat-text me-1"></i>Catatan: ${h.note}</div>` : ''}
      <div class="fw-bold text-warning border-top pt-2 mt-1">Total: Rp ${h.total_price.toLocaleString()}</div>
    </div>
  `,
        )
        .join("")
    : "<p class='text-center w-100 text-muted mt-4'>Belum ada pesanan.</p>";
}

// 9. FUNGSI PANEL ADMIN
async function fetchAdminOrders() {
  const container = document.getElementById("admin-orders-list");
  container.innerHTML = "Memuat...";
  
  const { data, error } = await _supabase.from("orders").select("*, kantin(nama)").order("created_at", { ascending: false });
  
  if (error) {
    container.innerHTML = "Gagal memuat pesanan.";
    return;
  }
  
  container.innerHTML = data.length ? data.map(o => `
    <div class="card bg-white shadow-sm mb-3 p-3 rounded-4 border ${o.is_completed ? 'border-success border-2' : 'border-danger border-2'}">
      <div class="d-flex justify-content-between">
        <b>${o.username} <span class="badge bg-warning text-dark ms-2">${o.kantin ? o.kantin.nama : 'Kantin ID ' + o.kantin_id}</span></b>
        <span class="small">${new Date(o.created_at).toLocaleString()}</span>
      </div>
      <div class="my-2">${o.items}</div>
      ${o.note ? `<div class="small text-muted mb-2">Catatan: ${o.note}</div>` : ''}
      <div class="d-flex justify-content-between align-items-center mt-2 border-top pt-2">
        <div class="text-warning fw-bold">Rp ${o.total_price.toLocaleString()}</div>
        ${!o.is_completed ? `<button class="btn btn-sm btn-success fw-bold" onclick="completeOrder(${o.id})"><i class="bi bi-check-circle me-1"></i>Selesai</button>` : `<span class="badge bg-success"><i class="bi bi-check-all me-1"></i>Telah Selesai</span>`}
      </div>
    </div>
  `).join("") : "Belum ada pesanan.";
}

async function completeOrder(id) {
  const btn = event.currentTarget;
  btn.innerText = "Tunggu...";
  btn.disabled = true;
  await _supabase.from("orders").update({ is_completed: true }).eq("id", id);
  fetchAdminOrders();
}

async function fetchAdminMenus() {
  const container = document.getElementById("admin-menu-list");
  container.innerHTML = "Memuat menu...";
  
  const { data: menuData, error: menuErr } = await _supabase.from("menu").select("*, kantin(nama)").order("kantin_id", { ascending: true });
  
  if (menuErr) {
    container.innerHTML = "Gagal memuat menu.";
    return;
  }
  
  let tableHTML = `
    <table class="table table-sm align-middle">
      <thead>
        <tr>
          <th>Menu</th>
          <th>Kantin</th>
          <th>Harga</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  menuData.forEach(m => {
    tableHTML += `
      <tr>
        <td>
          <img src="${m.img}" width="40" height="40" class="rounded object-fit-cover me-2">
          ${m.nama}
        </td>
        <td>${m.kantin ? m.kantin.nama : m.kantin_id}</td>
        <td>Rp ${m.harga.toLocaleString()}</td>
        <td>
          <button class="btn btn-sm btn-outline-secondary" onclick="updateMenuPhoto(${m.id})"><i class="bi bi-image"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteMenu(${m.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `;
  });
  
  tableHTML += `</tbody></table>`;
  container.innerHTML = tableHTML;
  
  const selectKantin = document.getElementById("newMenuKantin");
  if (selectKantin && selectKantin.options.length <= 1) {
    const { data: kData } = await _supabase.from("kantin").select("*");
    if (kData) {
      kData.forEach(k => {
        const opt = document.createElement("option");
        opt.value = k.id;
        opt.innerText = k.nama;
        selectKantin.appendChild(opt);
      });
    }
  }
}

async function updateMenuPhoto(id) {
  const newUrl = prompt("Masukkan URL foto baru (disarankan dari Unsplash/Pexels):");
  if (newUrl) {
    await _supabase.from("menu").update({ img: newUrl }).eq("id", id);
    fetchAdminMenus();
    if(activeKantinId) fetchMenu(activeKantinId);
  }
}

async function deleteMenu(id) {
  if (confirm("Yakin ingin menghapus menu ini?")) {
    await _supabase.from("menu").delete().eq("id", id);
    fetchAdminMenus();
    if(activeKantinId) fetchMenu(activeKantinId);
  }
}

async function addNewMenu() {
  const kantinId = document.getElementById("newMenuKantin").value;
  const nama = document.getElementById("newMenuName").value;
  const harga = document.getElementById("newMenuPrice").value;
  const img = document.getElementById("newMenuImg").value;
  
  if (!kantinId || !nama || !harga || !img) {
    alert("Semua field harus diisi!");
    return;
  }
  
  const { error } = await _supabase.from("menu").insert([{
    kantin_id: kantinId,
    nama: nama,
    harga: parseInt(harga),
    img: img
  }]);
  
  if (error) {
    alert("Gagal menambah menu: " + error.message);
  } else {
    document.getElementById("newMenuName").value = "";
    document.getElementById("newMenuPrice").value = "";
    document.getElementById("newMenuImg").value = "";
    fetchAdminMenus();
    if(activeKantinId == kantinId) fetchMenu(kantinId);
  }
}
