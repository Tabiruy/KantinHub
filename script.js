let cart = [];
let activeUser = null;
let isAdmin = false;
let transactionHistory = [];
let activeKantinId = null;

// Konfigurasi Supabase (Tetap simpan jika Anda akan menggunakannya nanti)
const SUPABASE_URL = "https://ciiqedrfocqzhhhsbtbb.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaXFlZHJmb2NxemhoaHNidGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MTA4MzYsImV4cCI6MjA5MzA4NjgzNn0.jaPVyYSA7XXEISY41ieIKXQkRwZBcWndBJiqfZnzKqU";

// Data Kantin
const dataKantin = [
  { id: 1, nama: "USMAN 1", icon: "🍱" },
  { id: 2, nama: "USMAN 2", icon: "🍲" },
  { id: 3, nama: "USMAN 3", icon: "🍜" },
  { id: 4, nama: "USMAN 4", icon: "🍹" },
  { id: 5, nama: "USMAN 7", icon: "☕" },
  { id: 6, nama: "USMAN 8", icon: "🍙" },
];

// Data Menu Awal
let dataMenu = [
  { id: 101, kId: 1, nama: "Bakpao", harga: 2500, img: "Gambar/bakpao.jpg" },
  { id: 102, kId: 1, nama: "Pentol", harga: 5000, img: "Gambar/pentol.jpg" },
  {
    id: 103,
    kId: 1,
    nama: "Gorengan",
    harga: 1000,
    img: "Gambar/gorengan.jpg",
  },
  {
    id: 301,
    kId: 3,
    nama: "Tempura",
    harga: 1000,
    img: "https://via.placeholder.com/150",
  },
  {
    id: 401,
    kId: 4,
    nama: "Es Sachet",
    harga: 3000,
    img: "https://via.placeholder.com/150",
  },
];

// Inisialisasi saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  renderKantin();
  setupLoginForm();
});

// Render Daftar Kantin di Home
function renderKantin() {
  const container = document.getElementById("kantin-container");
  container.innerHTML = dataKantin
    .map(
      (k) => `
    <div class="col-6 col-md-4">
      <div class="card h-100 border-0 shadow-sm rounded-4 text-center p-3 m-card" onclick="openKantin(${k.id}, '${k.nama}')">
        <div class="fs-1 mb-2">${k.icon}</div>
        <h6 class="fw-bold mb-0">${k.nama}</h6>
      </div>
    </div>
  `,
    )
    .join("");
}

// Buka Kantin & Tampilkan Menu
function openKantin(id, nama) {
  activeKantinId = id;
  document.getElementById("kantin-name-title").innerText = nama;
  showSection("katalog");
  renderMenu(id);
}

function renderMenu(kantinId) {
  const container = document.getElementById("menu-container");
  const menus = dataMenu.filter((m) => m.kId === kantinId);

  if (menus.length === 0) {
    container.innerHTML =
      '<p class="text-center text-muted">Menu belum tersedia di kantin ini.</p>';
    return;
  }

  container.innerHTML = menus
    .map(
      (m) => `
    <div class="col-6 col-md-4">
      <div class="card border-0 shadow-sm rounded-4 overflow-hidden h-100">
        <img src="${m.img}" class="card-img-top" style="height: 120px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/150'">
        <div class="card-body p-3">
          <h6 class="fw-bold mb-1 small">${m.nama}</h6>
          <p class="text-warning fw-bold mb-2 small">Rp ${m.harga.toLocaleString()}</p>
          <button class="btn btn-warning btn-sm w-100 rounded-pill fw-bold" onclick="addToCart(${m.id})">
            + Tambah
          </button>
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}

// Logika Keranjang
function addToCart(menuId) {
  if (!activeUser) {
    new bootstrap.Modal(document.getElementById("loginModal")).show();
    return;
  }
  const item = dataMenu.find((m) => m.id === menuId);
  cart.push(item);
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById("floating-cart");
  if (cart.length > 0) {
    badge.classList.remove("d-none");
    document.getElementById("cart-badge-count").innerText = cart.length;
    const total = cart.reduce((sum, item) => sum + item.harga, 0);
    document.getElementById("cart-badge-total").innerText =
      `Rp ${total.toLocaleString()}`;
  } else {
    badge.classList.add("d-none");
  }
}

// Navigasi Seksi
function showSection(sectionId) {
  const sections = [
    "home-section",
    "katalog-section",
    "checkout-section",
    "history-section",
  ];
  sections.forEach((s) => document.getElementById(s).classList.add("d-none"));
  document.getElementById(`${sectionId}-section`).classList.remove("d-none");

  if (sectionId === "checkout") renderCheckout();
  if (sectionId === "history") renderHistory();
}

// Checkout & Pembayaran
function renderCheckout() {
  const list = document.getElementById("cart-summary-list");
  const totalDisplay = document.getElementById("final-price-display");
  let total = 0;

  list.innerHTML = cart
    .map((item) => {
      total += item.harga;
      return `<div class="d-flex justify-content-between mb-2">
              <span>${item.nama}</span>
              <span class="fw-bold">Rp ${item.harga.toLocaleString()}</span>
            </div>`;
    })
    .join("");

  totalDisplay.innerText = `Rp ${total.toLocaleString()}`;
}

function toggleQR() {
  const isQRIS = document.getElementById("methodQRIS").checked;
  document.getElementById("qr-area").classList.toggle("d-none", !isQRIS);
}

function confirmPayment() {
  if (cart.length === 0) return;

  const order = {
    user: activeUser,
    items: [...cart],
    total: cart.reduce((sum, i) => sum + i.harga, 0),
    date: new Date().toLocaleString(),
    note: document.getElementById("orderNote").value,
  };

  transactionHistory.push(order);
  cart = [];
  updateCartBadge();
  new bootstrap.Modal(document.getElementById("successModal")).show();
  showSection("home");
}

// Auth System
function setupLoginForm() {
  document.getElementById("loginForm").onsubmit = (e) => {
    e.preventDefault();
    const user = document.getElementById("loginUser").value;
    const pass = document.getElementById("loginPass").value;

    activeUser = user;

    // Simple Admin Logic
    if (user === "admin123" && pass === "admin123") {
      isAdmin = true;
      document.getElementById("navbar-logo").onclick = () =>
        new bootstrap.Modal(document.getElementById("adminModal")).show();
      alert("Mode Admin Aktif! Klik logo untuk panel.");
    }

    document.getElementById("loginBtn").classList.add("d-none");
    document.getElementById("userProfile").classList.remove("d-none");
    document.getElementById("userDisplayName").innerText = user;

    bootstrap.Modal.getInstance(document.getElementById("loginModal")).hide();
  };
}

function doLogout() {
  activeUser = null;
  isAdmin = false;
  cart = [];
  updateCartBadge();
  location.reload();
}

// Admin Function
function addNewMenu() {
  if (!isAdmin) return;
  const name = document.getElementById("newMenuName").value;
  const price = parseInt(document.getElementById("newMenuPrice").value);
  const img = document.getElementById("newMenuImg").value;

  if (name && price && activeKantinId) {
    const newId = Date.now();
    dataMenu.push({
      id: newId,
      kId: activeKantinId,
      nama: name,
      harga: price,
      img: img,
    });
    renderMenu(activeKantinId);
    alert("Menu berhasil ditambahkan!");
  }
}

// Review System
function addReview() {
  const name = document.getElementById("reviewerName").value;
  const text = document.getElementById("reviewText").value;
  if (!name || !text) return;

  const list = document.getElementById("reviews-list");
  const newReview = document.createElement("div");
  newReview.className = "review-item mb-2";
  newReview.innerHTML = `<div class="d-flex justify-content-between small"><span class="fw-bold">${name}</span></div><p class="small text-muted mb-0">${text}</p>`;
  list.prepend(newReview);

  document.getElementById("reviewerName").value = "";
  document.getElementById("reviewText").value = "";
}

function renderHistory() {
  const container = document.getElementById("history-list");
  if (transactionHistory.length === 0) {
    container.innerHTML =
      "<p class='text-muted'>Belum ada riwayat pesanan.</p>";
    return;
  }
  container.innerHTML = transactionHistory
    .map(
      (h) => `
    <div class="card border-0 shadow-sm rounded-4 p-3 mb-2">
      <div class="d-flex justify-content-between">
        <span class="small fw-bold">${h.date}</span>
        <span class="badge bg-success">Selesai</span>
      </div>
      <hr class="my-2">
      <div class="small">${h.items.map((i) => i.nama).join(", ")}</div>
      <div class="fw-bold text-warning">Total: Rp ${h.total.toLocaleString()}</div>
    </div>
  `,
    )
    .join("");
}
