// 1. KONFIGURASI SUPABASE
const SUPABASE_URL = "https://ciiqedrfocqzhhhsbtbb.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaXFlZHJmb2NxemhoaHNidGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MTA4MzYsImV4cCI6MjA5MzA4NjgzNn0.jaPVyYSA7XXEISY41ieIKXQkRwZBcWndBJiqfZnzKqU"; // Pastikan Key Lengkap
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. STATE APLIKASI
let cart = [];
let activeUser = null;
let isAdmin = false;
let activeKantinId = null;

// Data Kantin Tetap (Statik)
const dataKantin = [
  { id: 1, nama: "USMAN 1", icon: "🍱" },
  { id: 2, nama: "USMAN 2", icon: "🍲" },
  { id: 3, nama: "USMAN 3", icon: "🍜" },
  { id: 4, nama: "USMAN 4", icon: "🍹" },
  { id: 5, nama: "USMAN 7", icon: "☕" },
  { id: 6, nama: "USMAN 8", icon: "🍙" },
];

// Data Menu (Bisa dikembangkan untuk ambil dari Supabase juga)
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
];

// 3. INISIALISASI
document.addEventListener("DOMContentLoaded", () => {
  renderKantin();
  setupLoginForm();
});

// 4. FUNGSI RENDER UI
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

function openKantin(id, nama) {
  activeKantinId = id;
  document.getElementById("kantin-name-title").innerText = nama;
  showSection("katalog");
  renderMenu(id);
}

function renderMenu(kantinId) {
  const container = document.getElementById("menu-container");
  const menus = dataMenu.filter((m) => m.kId === kantinId);

  container.innerHTML = menus.length
    ? menus
        .map(
          (m) => `
    <div class="col-6 col-md-4">
      <div class="card border-0 shadow-sm rounded-4 overflow-hidden h-100">
        <img src="${m.img}" class="card-img-top" style="height: 120px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/150'">
        <div class="card-body p-3">
          <h6 class="fw-bold mb-1 small">${m.nama}</h6>
          <p class="text-warning fw-bold mb-2 small">Rp ${m.harga.toLocaleString()}</p>
          <button class="btn btn-warning btn-sm w-100 rounded-pill fw-bold" onclick="addToCart(${m.id})">+ Tambah</button>
        </div>
      </div>
    </div>
  `,
        )
        .join("")
    : '<p class="text-center w-100">Menu belum tersedia.</p>';
}

// 5. LOGIKA KERANJANG & CHECKOUT
function addToCart(menuId) {
  if (!activeUser) {
    new bootstrap.Modal(document.getElementById("loginModal")).show();
    return;
  }
  const item = dataMenu.find((m) => m.id === menuId);
  cart.push(item);
  updateCartUI();
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

// 6. INTEGRASI SUPABASE (PENGIRIMAN DATA)
async function confirmPayment() {
  if (cart.length === 0) return;

  const btnText = document.querySelector("#confirmBtnText");
  const btnSpinner = document.querySelector("#confirmSpinner");

  // Loading state
  btnText.innerText = "Memproses...";
  btnSpinner.classList.remove("d-none");

  const totalHarga = cart.reduce((sum, i) => sum + i.harga, 0);
  const itemsString = cart.map((i) => i.nama).join(", ");

  const payload = {
    username: activeUser,
    items: itemsString,
    total_price: totalHarga,
    note: document.getElementById("orderNote").value,
    created_at: new Date().toISOString(),
  };

  try {
    // Pastikan nama tabel di Supabase adalah 'orders'
    const { data, error } = await _supabase.from("orders").insert([payload]);

    if (error) throw error;

    // Sukses
    cart = [];
    updateCartUI();
    new bootstrap.Modal(document.getElementById("successModal")).show();
    showSection("home");
  } catch (err) {
    console.error("Supabase Error:", err.message);
    alert(
      "Gagal mengirim pesanan: " +
        err.message +
        "\nPastikan RLS di Supabase sudah dimatikan/diatur.",
    );
  } finally {
    btnText.innerText = "Konfirmasi Pembayaran";
    btnSpinner.classList.add("d-none");
  }
}

// 7. SISTEM AUTH & NAVIGASI
function setupLoginForm() {
  document.getElementById("loginForm").onsubmit = (e) => {
    e.preventDefault();
    activeUser = document.getElementById("loginUser").value;

    document.getElementById("loginBtn").classList.add("d-none");
    document.getElementById("userProfile").classList.remove("d-none");
    document.getElementById("userDisplayName").innerText = activeUser;

    bootstrap.Modal.getInstance(document.getElementById("loginModal")).hide();
  };
}

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
  if (sectionId === "history") fetchHistory();
}

function renderCheckout() {
  const list = document.getElementById("cart-summary-list");
  let total = 0;
  list.innerHTML = cart
    .map((item) => {
      total += item.harga;
      return `<div class="d-flex justify-content-between"><span>${item.nama}</span><b>Rp ${item.harga.toLocaleString()}</b></div>`;
    })
    .join("");
  document.getElementById("final-price-display").innerText =
    `Rp ${total.toLocaleString()}`;
}

// Ambil Riwayat dari Supabase
async function fetchHistory() {
  const container = document.getElementById("history-list");
  container.innerHTML = "Memuat riwayat...";

  const { data, error } = await _supabase
    .from("orders")
    .select("*")
    .eq("username", activeUser)
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = "Gagal memuat data.";
    return;
  }

  container.innerHTML = data.length
    ? data
        .map(
          (h) => `
    <div class="card border-0 shadow-sm p-3 mb-2 rounded-4">
      <div class="small fw-bold">${new Date(h.created_at).toLocaleDateString()}</div>
      <div class="small text-muted">${h.items}</div>
      <div class="fw-bold text-warning">Rp ${h.total_price.toLocaleString()}</div>
    </div>
  `,
        )
        .join("")
    : "Belum ada pesanan.";
}

async function confirmPayment() {
  if (cart.length === 0) return;

  const totalHarga = cart.reduce((sum, i) => sum + i.harga, 0);
  const itemsString = cart.map((i) => i.nama).join(", ");

  const payload = {
    username: activeUser,
    items: itemsString,
    total_price: totalHarga,
    note: document.getElementById("orderNote").value,
  };

  console.log("Mencoba mengirim data:", payload); // Cek di console

  try {
    const { data, error } = await _supabase.from("orders").insert([payload]);

    if (error) {
      // Jika Supabase menolak, pesan ini akan muncul
      console.error("Detail Error Supabase:", error);
      alert("Gagal: " + error.message);
    } else {
      console.log("Berhasil Terkirim!", data);
      alert("Pesanan Berhasil!");
      cart = [];
      updateCartUI();
      showSection("home");
    }
  } catch (err) {
    console.error("Koneksi Terputus:", err);
  }
}
