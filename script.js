// 1. KONFIGURASI SUPABASE
const SUPABASE_URL = "https://ciiqedrfocqzhhhsbtbb.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaXFlZHJmb2NxemhoaHNidGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MTA4MzYsImV4cCI6MjA5MzA4NjgzNn0.jaPVyYSA7XXEISY41ieIKXQkRwZBcWndBJiqfZnzKqU";
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. STATE APLIKASI
let cart = [];
let activeUser = localStorage.getItem("kantinHubUser") || null;
let isAdmin = false;
let activeKantinId = null;

let dataKantin = [];
let dataMenu = [];

// 3. INISIALISASI
document.addEventListener("DOMContentLoaded", () => {
  if (activeUser) {
    document.getElementById("loginBtn").classList.add("d-none");
    document.getElementById("userProfile").classList.remove("d-none");
    document.getElementById("userDisplayName").innerText = activeUser;
  }
  
  fetchKantin();
  fetchReviews();
  setupLoginForm();
});

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
      <div class="card h-100 border-0 shadow-sm rounded-4 text-center p-3 m-card" onclick="openKantin(${k.id}, '${k.nama}')" style="cursor: pointer;">
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
    localStorage.setItem("kantinHubUser", activeUser);

    document.getElementById("loginBtn").classList.add("d-none");
    document.getElementById("userProfile").classList.remove("d-none");
    document.getElementById("userDisplayName").innerText = activeUser;

    const modalEl = document.getElementById("loginModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modalInstance.hide();
  };
}

function doLogout() {
  activeUser = null;
  localStorage.removeItem("kantinHubUser");
  
  document.getElementById("loginBtn").classList.remove("d-none");
  document.getElementById("userProfile").classList.add("d-none");
  
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
        <span class="badge bg-success">Berhasil</span>
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
