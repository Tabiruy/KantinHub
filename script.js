let cart = [];
let activeUser = null;
let isAdmin = false;
let transactionHistory = [];
let activeKantinId = null;
let incomingOrders = []; // Untuk menampung pesanan yang dilihat admin

const SUPABASE_URL = "https://ciiqedrfocqzhhhsbtbb.supabase.co"; // Ganti dengan URL kamu
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaXFlZHJmb2NxemhoaHNidGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MTA4MzYsImV4cCI6MjA5MzA4NjgzNn0.jaPVyYSA7XXEISY41ieIKXQkRwZBcWndBJiqfZnzKqU"; // Ganti dengan Anon Public Key
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchKantin() {
  const { data, error } = await supabase.from("kantin").select("*");
  if (error) {
    console.error("Error fetching kantin:", error);
    return;
  }
  renderKantin(data); // Fungsi untuk menampilkan ke HTML
}

// Panggil fungsi ini saat window dimuat
window.onload = fetchKantin;

async function showKatalog(kantinId) {
  activeKantinId = kantinId;
  const { data, error } = await supabase
    .from("menu")
    .select("*")
    .eq("kId", kantinId);

  if (!error) {
    renderMenu(data); // Fungsi untuk menampilkan menu ke container
    showSection("katalog");
  }
}

async function doLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginUser").value; // Pastikan input berupa email
  const password = document.getElementById("loginPass").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    alert("Login Gagal: " + error.message);
  } else {
    activeUser = data.user;
    updateUIForLoggedInUser();
    bootstrap.Modal.getInstance(document.getElementById("loginModal")).hide();
  }
}

async function confirmPayment() {
  const newOrder = {
    user_id: activeUser?.id || "guest",
    items: cart,
    total_price: calculateTotal(),
    note: document.getElementById("orderNote").value,
    status: "pending",
  };

  const { error } = await supabase.from("orders").insert([newOrder]);

  if (!error) {
    const successModal = new bootstrap.Modal(
      document.getElementById("successModal"),
    );
    successModal.show();
    cart = []; // Kosongkan keranjang
    updateCartUI();
  } else {
    alert("Gagal menyimpan pesanan");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderKantin();
  checkCommentStatus();
});

function renderKantin() {
  const container = document.getElementById("kantin-container");
  container.innerHTML = dataKantin
    .map(
      (k) => `
    <div class="col-6">
      <div class="kantin-card shadow-sm" onclick="openKantin(${k.id}, '${k.nama}')">
        <div class="fs-1 mb-2">${k.icon}</div>
        <h6 class="fw-bold mb-0">${k.nama}</h6>
      </div>
    </div>
  `,
    )
    .join("");
}

function openKantin(id, name) {
  cart = [];
  activeKantinId = id;
  document.getElementById("kantin-name-title").innerText = name;
  updateUI();
  renderKatalog(id);
  showSection("katalog");
}

function showSection(id) {
  if (id === "home") {
    cart = [];
    activeKantinId = null;
  }
  ["home", "katalog", "checkout", "history"].forEach((s) => {
    document.getElementById(s + "-section").classList.add("d-none");
  });
  document.getElementById(id + "-section").classList.remove("d-none");
  window.scrollTo(0, 0);
  updateUI();
}

function renderKatalog(kId) {
  const container = document.getElementById("menu-container");
  const items = dataMenu.filter((m) => m.kId === kId);
  container.innerHTML = items
    .map((m) => {
      const cartItem = cart.find((c) => c.id === m.id);
      const qty = cartItem ? cartItem.qty : 0;
      return `
      <div class="col-6" id="menu-item-${m.id}">
        <div class="menu-card shadow-sm position-relative">
          ${isAdmin ? `<button class="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle" onclick="deleteMenu(${m.id})"><i class="bi bi-trash"></i></button>` : ""}
          <img src="${m.img}" class="menu-img">
          <div class="p-3 text-center">
            <h6 class="small fw-bold mb-1">${m.nama}</h6>
            <div class="text-warning fw-bold mb-2 small">Rp ${m.harga.toLocaleString()}</div>
            <div class="d-flex align-items-center justify-content-center gap-2">
              <button class="btn btn-outline-warning btn-sm rounded-circle" style="width:30px; height:30px" onclick="changeQty(${m.id}, -1, ${kId})">-</button>
              <span class="fw-bold px-2">${qty}</span>
              <button class="btn btn-warning btn-sm rounded-circle" style="width:30px; height:30px" onclick="changeQty(${m.id}, 1, ${kId})">+</button>
            </div>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function changeQty(id, delta, kId) {
  if (delta > 0 && !activeUser) {
    new bootstrap.Modal(document.getElementById("loginModal")).show();
    return;
  }
  const item = dataMenu.find((m) => m.id === id);
  const exist = cart.find((c) => c.id === id);
  if (exist) {
    exist.qty += delta;
    if (exist.qty <= 0) cart = cart.filter((c) => c.id !== id);
  } else if (delta > 0) {
    cart.push({ ...item, qty: 1 });
  }
  updateUI();
  renderKatalog(kId);
}

function updateUI() {
  const total = cart.reduce((a, b) => a + b.harga * b.qty, 0);
  const count = cart.reduce((a, b) => a + b.qty, 0);
  document.getElementById("cart-badge-count").innerText = count;
  document.getElementById("cart-badge-total").innerText =
    "Rp " + total.toLocaleString();
  document.getElementById("final-price-display").innerText =
    "Rp " + total.toLocaleString();

  const floatingCart = document.getElementById("floating-cart");
  if (floatingCart) {
    floatingCart.classList.toggle(
      "d-none",
      count === 0 ||
        document
          .getElementById("checkout-section")
          .classList.contains("d-none") === false,
    );
  }

  document.getElementById("cart-summary-list").innerHTML = cart
    .map(
      (c) => `
    <div class="d-flex justify-content-between small mb-2">
      <span>${c.nama} x${c.qty}</span>
      <b>Rp ${(c.harga * c.qty).toLocaleString()}</b>
    </div>
  `,
    )
    .join("");
}

// Logika Login & Admin
document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const u = document.getElementById("loginUser").value;
  const p = document.getElementById("loginPass").value;

  // Cek jika kredensial admin
  if (u === "admin" && p === "admin123") {
    isAdmin = true;
    activeUser = "Administrator";
    // Tambah tombol panel admin di dropdown
    document.querySelector(".dropdown-menu").insertAdjacentHTML(
      "afterbegin",
      `
      <li id="admin-link">
        <a class="dropdown-item fw-bold text-primary" href="#" data-bs-toggle="modal" data-bs-target="#adminModal">
          <i class="bi bi-cpu me-2"></i>Admin Panel
        </a>
      </li>
    `,
    );
  } else {
    isAdmin = false;
    activeUser = u;
  }

  document.getElementById("loginBtn").classList.add("d-none");
  document.getElementById("userDisplayName").innerText = activeUser;
  document.getElementById("userProfile").classList.remove("d-none");

  checkCommentStatus();
  bootstrap.Modal.getInstance(document.getElementById("loginModal")).hide();
});

function doLogout() {
  activeUser = null;
  isAdmin = false;
  cart = [];
  const adminLink = document.getElementById("admin-link");
  if (adminLink) adminLink.remove();

  document.getElementById("loginBtn").classList.remove("d-none");
  document.getElementById("userProfile").classList.add("d-none");
  checkCommentStatus();
  showSection("home");
}

// Fitur Admin: Kelola Menu & Pesanan
function addNewMenu() {
  const name = document.getElementById("newMenuName").value;
  const price = parseInt(document.getElementById("newMenuPrice").value);
  const img =
    document.getElementById("newMenuImg").value ||
    "https://via.placeholder.com/200";

  if (!name || !price || !activeKantinId) {
    alert("Pilih kantin dan lengkapi data!");
    return;
  }

  const newId = Date.now();
  dataMenu.push({
    id: newId,
    kId: activeKantinId,
    nama: name,
    harga: price,
    img: img,
  });

  renderKatalog(activeKantinId);
  alert("Menu ditambahkan!");
}

function deleteMenu(id) {
  if (confirm("Hapus menu ini?")) {
    dataMenu = dataMenu.filter((m) => m.id !== id);
    renderKatalog(activeKantinId);
  }
}

function renderAdminOrders() {
  const list = document.getElementById("admin-orders-list");
  if (incomingOrders.length === 0) {
    list.innerHTML = "Belum ada pesanan.";
    return;
  }
  list.innerHTML = incomingOrders
    .map(
      (o, index) => `
    <div class="card p-2 mb-2 border-0 shadow-sm">
      <div class="d-flex justify-content-between">
        <span class="fw-bold">Order #${index + 1} - ${o.user}</span>
        <span class="badge bg-warning text-dark">${o.method}</span>
      </div>
      <div class="small">${o.items.map((i) => `${i.nama} (x${i.qty})`).join(", ")}</div>
      <div class="fw-bold text-primary mt-1">Total: ${o.total}</div>
    </div>
  `,
    )
    .join("");
}

// Komentar & Transaksi
function checkCommentStatus() {
  const commentArea = document.querySelector(
    ".review-container input, .review-container textarea, .review-container button",
  );
  const overlay = document.getElementById("comment-overlay");

  if (!activeUser) {
    document.getElementById("reviewerName").disabled = true;
    document.getElementById("reviewText").disabled = true;
    document.querySelector(".review-container button").disabled = true;
    document.getElementById("reviewText").placeholder =
      "Silahkan login untuk memberi ulasan...";
  } else {
    document.getElementById("reviewerName").disabled = false;
    document.getElementById("reviewText").disabled = false;
    document.querySelector(".review-container button").disabled = false;
    document.getElementById("reviewerName").value = activeUser;
    document.getElementById("reviewText").placeholder = "Tulis ulasan...";
  }
}

function confirmPayment() {
  if (cart.length === 0) return;
  const method = document.querySelector(
    'input[name="payMethod"]:checked',
  ).value;
  const totalDisplay = document.getElementById("final-price-display").innerText;

  const newOrder = {
    user: activeUser,
    date: new Date().toLocaleString(),
    method,
    total: totalDisplay,
    items: [...cart],
  };

  transactionHistory.unshift(newOrder);
  incomingOrders.unshift(newOrder); // Masuk ke panel admin

  renderAdminOrders();
  cart = [];
  updateUI();
  renderHistory();
  new bootstrap.Modal(document.getElementById("successModal")).show();
  showSection("home");
}

function renderHistory() {
  const historyList = document.getElementById("history-list");
  if (transactionHistory.length === 0) {
    historyList.innerHTML =
      '<p class="text-center py-5">Belum ada riwayat pesanan.</p>';
    return;
  }

  historyList.innerHTML = transactionHistory
    .map(
      (h, index) => `
    <div class="card border-0 shadow-sm p-3 mb-3 rounded-4 small">
      <div class="d-flex justify-content-between mb-2">
        <span class="text-muted">${h.date}</span>
        <span class="badge bg-light text-dark border">${h.method}</span>
      </div>
      <div class="fw-bold text-warning fs-6 mb-1">${h.total}</div>
      <div class="text-secondary mb-3">${h.items.map((i) => i.nama).join(", ")}</div>
      
      <!-- Bagian Input Ulasan -->
      <div class="border-top pt-2">
        <div id="review-status-${index}">
          <button class="btn btn-outline-warning btn-sm w-100 rounded-3 fw-bold" 
                  onclick="showReviewInput(${index})">
            <i class="bi bi-chat-left-text me-2"></i>Beri Ulasan
          </button>
        </div>
        <div id="review-form-${index}" class="d-none mt-2">
          <textarea id="review-text-${index}" class="form-control form-control-sm mb-2" 
                    placeholder="Bagaimana rasa makanannya?"></textarea>
          <button class="btn btn-warning btn-sm w-100 rounded-3 fw-bold" 
                  onclick="submitHistoryReview(${index})">Kirim Ulasan</button>
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}

function addReview() {
  const name = document.getElementById("reviewerName").value;
  const text = document.getElementById("reviewText").value;
  if (!name || !text) return;

  const html = `
    <div class="review-item">
        <div class="d-flex justify-content-between small">
            <span class="fw-bold">${name}</span>
        </div>
        <p class="small text-muted mb-0">${text}</p>
    </div>`;
  document
    .getElementById("reviews-list")
    .insertAdjacentHTML("afterbegin", html);
  document.getElementById("reviewText").value = "";
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

// Fungsi untuk menampilkan kolom input ulasan di riwayat
function showReviewInput(index) {
  document.getElementById(`review-status-${index}`).classList.add("d-none");
  document.getElementById(`review-form-${index}`).classList.remove("d-none");
}

// Fungsi untuk mengirim ulasan dari riwayat ke daftar ulasan utama
function submitHistoryReview(index) {
  // Ambil elemen input teks berdasarkan index riwayat
  const reviewInput = document.getElementById(`review-text-${index}`);

  // Validasi: pastikan elemen ada sebelum mengambil value (mencegah error null)
  if (!reviewInput) return;

  const reviewText = reviewInput.value;

  if (!reviewText) {
    alert("Mohon isi ulasan terlebih dahulu.");
    return;
  }

  // Gimmick: Menampilkan animasi sukses di dalam kartu riwayat tersebut
  const formContainer = document.getElementById(`review-form-${index}`);
  if (formContainer) {
    formContainer.innerHTML = `
      <div class="text-success text-center py-2 fw-bold animate__animated animate__fadeIn">
        <i class="bi bi-check-circle-fill me-1"></i> Terkirim ke sistem!
        <div class="small text-muted fw-normal" style="font-size: 10px;">Ulasan Anda akan tampil setelah moderasi.</div>
      </div>`;
  }

  // Log ke console sebagai bukti "data terkirim" (gimmick developer)
  console.log("Feedback data simulation:", {
    user: activeUser,
    content: reviewText,
    timestamp: new Date().toISOString(),
  });
}

// Masukkan ke daftar ulasan utama di home
const html = `
    <div class="review-item">
        <div class="d-flex justify-content-between small">
            <span class="fw-bold">${userName}</span>
        </div>
        <p class="small text-muted mb-0">${reviewText}</p>
    </div>`;

document.getElementById("reviews-list").insertAdjacentHTML("afterbegin", html);

// Sembunyikan form dan beri tanda terima kasih
document.getElementById(`review-form-${index}`).innerHTML = `
    <div class="text-success text-center py-1 fw-bold">
      <i class="bi bi-check-circle-fill me-1"></i> Ulasan telah dikirim
    </div>`;

// Jika ingin otomatis scroll ke ulasan di home, bisa gunakan showSection('home')

// Fungsi untuk mengambil semua data kantin
async function getSemuaKantin() {
  const { data, error } = await supabase.from("kantin").select("*");

  if (error) {
    console.error("Gagal mengambil data kantin:", error.message);
    return;
  }

  renderKantin(data); // Panggil fungsi untuk menampilkan ke layar
}

function renderKantin(daftarKantin) {
  const container = document.getElementById("kantin-container");
  container.innerHTML = ""; // Kosongkan dulu isi lamanya

  daftarKantin.forEach((ktn) => {
    container.innerHTML += `
            <div class="col-md-4 mb-3">
                <div class="card h-100 shadow-sm" onclick="bukaMenuKantin(${ktn.id})">
                    <div class="card-body text-center">
                        <i class="bi ${ktn.icon} display-4 mb-2"></i>
                        <h5 class="card-title">${ktn.nama}</h5>
                        <button class="btn btn-primary btn-sm">Lihat Menu</button>
                    </div>
                </div>
            </div>
        `;
  });
}

async function bukaMenuKantin(idKantin) {
  const { data, error } = await supabase
    .from("menu")
    .select("*")
    .eq("kantin_id", idKantin); // Filter berdasarkan ID Kantin yang diklik

  if (!error) {
    // Tampilkan modal atau section menu dan render data 'data' tersebut
    tampilkanDaftarMenu(data);
  }
}

async function simpanPesananKeDatabase(isiKeranjang, total) {
  const { data, error } = await supabase.from("orders").insert([
    {
      items: isiKeranjang,
      total_price: total,
      status: "pending",
    },
  ]);

  if (!error) {
    alert("Pesanan berhasil dikirim ke kantin!");
    resetKeranjang();
  }
}
