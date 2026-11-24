// =========================================================================
// STATE GLOBAL & HELPER UTILITAS
// =========================================================================
let currentUser = null;
let currentRole = '';
let allPelangganCache = [];
let allTagihanCache = [];
let allUsersCache = [];
let allTarifCache = [];
let allSpkCache = [];
let spkCacheMap = {};
let lastLaporanData = null;
let addFotoKtpBase64 = '';
let ptgSpkFotoBase64 = '';

let chartArusKasInstance = null;
let chartPemakaianAirInstance = null;
let chartStatusBayarInstance = null;

const PERMISSION_LABELS = {
    'FULL_ACCESS': 'Full Akses',
    'input_pelanggan': 'Input Pelanggan Baru',
    'edit_hapus_pelanggan': 'Edit Data Pelanggan',
    'pelunasan_tagihan': 'Pelunasan Tagihan',
    'catat_meter': 'Validasi & Catat Meter',
    'kelola_laporan': 'Laporan & Pengeluaran',
    'kelola_tarif': 'Tarif & Denda',
    'kelola_spk': 'Mutasi & SPK Teknik',
    'kelola_aset': 'Stok & Aset Pompa',
    'kelola_aduan': 'Tiket Pengaduan',
    'lihat_audit': 'Log Aktivitas',
    'kelola_tarif_spk': 'Tarif, SPK, Aset & Aduan',
    'hapus_data': 'Hapus Data Sistem',
    'kelola_akun': 'Manajemen Akun'
};

const MENU_BREADCRUMBS = {
    'admin-dashboard': { group: 'General', page: 'Dashboard' },
    'admin-pelanggan': { group: 'Master Data', page: 'Data Pelanggan' },
    'admin-tagihan': { group: 'Transaksi', page: 'Data Tagihan' },
    'admin-laporan': { group: 'Reports', page: 'Laporan Keuangan & Operasional' },
    'admin-tarif': { group: 'Pengaturan', page: 'Tarif & Denda' },
    'admin-teknik': { group: 'Operasional', page: 'Mutasi & SPK Teknik' },
    'admin-users': { group: 'Pengaturan', page: 'Manajemen Akun' },
    'admin-aset': { group: 'Inventory', page: 'Stok & Aset Pompa' },
    'admin-audit': { group: 'System', page: 'Log Aktivitas' },
    'admin-pengaduan': { group: 'Layanan', page: 'Tiket Pengaduan' },
    'admin-validasi': { group: 'Operasional Cutoff', page: 'Validasi Meter (25-31)' },
    'admin-rilis': { group: 'Operasional Cutoff', page: 'Rilis Tagihan (Tgl 1)' },
    'admin-kunci': { group: 'Operasional Cutoff', page: 'Kunci Periode' }
};

function parseGAS(res) {
    if (!res) return { status: 'error', message: 'Respon server kosong.' };
    if (typeof res === 'string') {
        try { return JSON.parse(res); } catch (e) { return { status: 'error', message: res }; }
    }
    return res;
}

// =========================================================================
// PENGHUBUNG BACKEND GOOGLE APPS SCRIPT (google.script.run -> Code.gs)
// =========================================================================
function panggilServer(namaFungsi, argsArray, onSuccess, onFailure) {
    const runner = window.google && window.google.script && window.google.script.run;
    if (!runner) {
        const err = new Error('Adapter Supabase tidak ditemukan. Periksa supabase-adapter.js.');
        if (typeof onFailure === 'function') onFailure(err);
        else console.error(err);
        return;
    }

    const args = Array.isArray(argsArray) ? argsArray : (argsArray !== undefined ? [argsArray] : []);
    let call = runner.withSuccessHandler(function (res) {
        if (typeof onSuccess === 'function') onSuccess(res);
    });

    if (typeof onFailure === 'function') {
        call = call.withFailureHandler(onFailure);
    }

    if (typeof call[namaFungsi] === 'function') {
        call[namaFungsi].apply(call, args);
    } else {
        const err = new Error('Fungsi "' + namaFungsi + '" belum terdaftar.');
        if (typeof onFailure === 'function') onFailure(err);
    }
}
function formatRupiah(angka) {
    const num = Number(angka) || 0;
    return 'Rp ' + num.toLocaleString('id-ID');
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getCurrentYYYYMM() {
    const now = new Date();
    return ("" + (now.getFullYear()) + "-" + (String(now.getMonth() + 1).padStart(2, '0')));
}

function getCurrentYYYYMMDD() {
    const now = new Date();
    return ("" + (now.getFullYear()) + "-" + (String(now.getMonth() + 1).padStart(2, '0')) + "-" + (String(now.getDate()).padStart(2, '0')));
}

function formatBulanLabel(ym) {
    if (!ym) return '-';
    const [y, m] = String(ym).split('-').map(Number);
    const namaBln = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const lastDay = new Date(y, m, 0).getDate();
    return '01-' + lastDay + ' ' + (namaBln[m - 1] || m) + ' ' + y;
}

function formatYtdLabel(ym) {
    if (!ym) return '-';
    const [y, m] = String(ym).split('-').map(Number);
    const namaBln = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const lastDay = new Date(y, m, 0).getDate();
    return '01 Jan-' + lastDay + ' ' + (namaBln[m - 1] || m);
}

function getInitials(name) {
    const parts = String(name || 'AD').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getActorPayload() {
    if (!currentUser) return null;
    return {
        id_user: currentUser.id_user || currentUser.id_pelanggan || '',
        nama: currentUser.nama_lengkap || currentUser.nama_pelanggan || currentUser.username || 'Admin',
        role: currentRole || 'admin',
        hak_akses: currentUser.hak_akses || ''
    };
}

function getSessionPayloadPelanggan() {
    if (!currentUser) return null;
    return {
        role: currentRole || 'pelanggan',
        id_pelanggan: currentUser.id_pelanggan || ''
    };
}

function userHasPerm(permKey) {
    if (!currentUser) return false;
    const role = String(currentUser.role || '').toLowerCase();
    if (role !== 'admin') return false;

    const raw = String(currentUser.hak_akses || '').trim().toUpperCase();
    // Anggap kosong, FULL_ACCESS, atau ALL sebagai akses penuh ke semua panel
    if (!raw || raw === 'FULL_ACCESS' || raw === 'ALL') return true;

    const perms = raw.split(',').map(s => s.trim().toLowerCase());
    return perms.includes(String(permKey || '').trim().toLowerCase());
}

function estimateDataUrlBytes(dataUrl) {
    const idx = String(dataUrl || '').indexOf(',');
    const b64 = idx !== -1 ? dataUrl.slice(idx + 1) : String(dataUrl || '');
    const pad = b64.endsWith('==') ? 2 : (b64.endsWith('=') ? 1 : 0);
    return Math.max(0, Math.floor((b64.length * 3) / 4) - pad);
}

function compressImageToTargetKB(file, maxWidth = 800, minKB = 80, maxKB = 120) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const minBytes = minKB * 1024;
                const maxBytes = maxKB * 1024;
                let curWidth = Math.min(img.width, maxWidth);
                let curHeight = Math.max(1, Math.round((img.height * curWidth) / img.width));

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                let bestUrl = '';

                for (let pass = 0; pass < 3; pass++) {
                    canvas.width = curWidth;
                    canvas.height = curHeight;
                    ctx.clearRect(0, 0, curWidth, curHeight);
                    ctx.drawImage(img, 0, 0, curWidth, curHeight);

                    let foundInRange = false;
                    let candidateUrl = '';
                    for (let q = 0.92; q >= 0.25; q = Number((q - 0.08).toFixed(2))) {
                        const url = canvas.toDataURL('image/jpeg', q);
                        const bytes = estimateDataUrlBytes(url);
                        candidateUrl = url;
                        if (bytes <= maxBytes && bytes >= minBytes) {
                            bestUrl = url;
                            foundInRange = true;
                            break;
                        }
                        if (bytes <= maxBytes) {
                            bestUrl = url;
                            foundInRange = true;
                            break;
                        }
                    }

                    if (foundInRange) break;
                    bestUrl = candidateUrl;
                    curWidth = Math.max(320, Math.round(curWidth * 0.78));
                    curHeight = Math.max(1, Math.round((img.height * curWidth) / img.width));
                }
                resolve(bestUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function compressImageFile(file, maxWidth = 800, quality = 0.8) {
    return compressImageToTargetKB(file, maxWidth, 80, 120);
}

function convertDriveUrlToImgSrc(url) {
    const str = String(url || '').trim();
    if (!str) return '';
    const match = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return ("https://drive.google.com/thumbnail?id=" + (match[1]) + "&sz=w1000");
    }
    return str;
}

// =========================================================================
// NAVIGASI PANEL & HAK AKSES UI ADMIN
// =========================================================================
function showPanel(panelId) {
    document.querySelectorAll('.panel-view').forEach(p => p.classList.remove('panel-active'));
    const target = document.getElementById(panelId);
    if (target) target.classList.add('panel-active');
}

function toggleSidebar() {
    document.getElementById('adminSidebar').classList.toggle('show');
    document.getElementById('mobileOverlay').classList.toggle('show');
}

function applyAdminPermissionsUI() {
    const isFull = userHasPerm('FULL_ACCESS');
    const badge = document.getElementById('badgeHakAksesAdmin');
    if (badge) {
        badge.textContent = isFull ? 'Full Akses' : 'Akses Terbatas';
        badge.className = isFull
            ? 'badge bg-light text-secondary border'
            : 'badge bg-warning-subtle text-warning-emphasis border';
    }

    const menuPermissions = {
        'admin-dashboard': true,
        'admin-pelanggan': userHasPerm('input_pelanggan') || userHasPerm('edit_hapus_pelanggan'),
        'admin-tagihan': userHasPerm('pelunasan_tagihan'),
        'admin-laporan': userHasPerm('kelola_laporan'),
        'admin-tarif': userHasPerm('kelola_tarif'),
        'admin-teknik': userHasPerm('kelola_spk'),
        'admin-users': userHasPerm('kelola_akun'),
        'admin-aset': userHasPerm('kelola_aset'),
        'admin-audit': userHasPerm('lihat_audit'),
        'admin-pengaduan': userHasPerm('kelola_aduan'),
        'admin-validasi': userHasPerm('catat_meter'),
        'admin-rilis': userHasPerm('catat_meter') || userHasPerm('kelola_tarif'),
        'admin-kunci': userHasPerm('catat_meter')
    };

    document.querySelectorAll('#adminSidebar .menu-btn[data-menu-id]').forEach(btn => {
        const menuId = btn.getAttribute('data-menu-id');
        if (menuId && menuPermissions.hasOwnProperty(menuId)) {
            btn.style.display = menuPermissions[menuId] ? 'flex' : 'none';
        }
    });

    const hasCutoffMenu = ['admin-validasi', 'admin-rilis', 'admin-kunci']
        .some(id => menuPermissions[id]);
    const labelCutoff = document.getElementById('labelOperasionalCutoff');
    if (labelCutoff) labelCutoff.style.display = hasCutoffMenu ? 'block' : 'none';

    const btnTambahPlg = document.getElementById('btnBukaModalTambahPelanggan');
    if (btnTambahPlg) {
        btnTambahPlg.style.display = userHasPerm('input_pelanggan') ? 'inline-block' : 'none';
    }
}

function updateAdminBreadcrumb(sectionId) {
    const info = MENU_BREADCRUMBS[sectionId] || { group: 'General', page: 'Dashboard' };
    const grpEl = document.getElementById('breadcrumbGroup');
    const pgEl = document.getElementById('breadcrumbPage');
    if (grpEl) grpEl.textContent = info.group;
    if (pgEl) pgEl.textContent = info.page;
}

function showAdminMenu(sectionId, el) {
    currentAdminMenu = sectionId;
    simpanSesi();
    updateAdminBreadcrumb(sectionId);

    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('admin-section-active'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('admin-section-active');

    document.querySelectorAll('#adminSidebar .menu-btn').forEach(btn => btn.classList.remove('active'));
    if (el) el.classList.add('active');

    const sidebar = document.getElementById('adminSidebar');
    if (sidebar && sidebar.classList.contains('show')) toggleSidebar();

    const mainScroll = document.querySelector('#panel-admin .admin-main-content');
    if (mainScroll) mainScroll.scrollTop = 0;

    if (sectionId === 'admin-dashboard') loadDashboardStats();
    else if (sectionId === 'admin-pelanggan') {
        kembaliKeDaftarPelanggan();
        loadDataPelanggan();
    }
    else if (sectionId === 'admin-tagihan') { loadDataTagihan(); loadSetoranPetugasAdmin(); }
    else if (sectionId === 'admin-laporan') loadLaporanKeuangan();
    else if (sectionId === 'admin-tarif') loadDataTarif();
    else if (sectionId === 'admin-teknik') loadDataSPKTeknik();
    else if (sectionId === 'admin-users') loadDataManajemenUser();
    else if (sectionId === 'admin-aset') loadDataStokDanAset();
    else if (sectionId === 'admin-audit') loadDataAudit();
    else if (sectionId === 'admin-pengaduan') loadDataPengaduan();
    else if (sectionId === 'admin-validasi') loadValidasiMeter();
    else if (sectionId === 'admin-kunci') checkStatusKunci();
}

// =========================================================================
// 1. AUTHENTICATION & SESI
// =========================================================================
const SESSION_KEY = 'pdam_sesi_login_v1';
const SESSION_IDLE_LIMIT_MS = 3 * 60 * 60 * 1000;
let currentAdminMenu = 'admin-dashboard';
let memSession = null;
let lastActivityTs = Date.now();
let lastPersistTs = 0;
let idleWatcherStarted = false;

document.addEventListener('DOMContentLoaded', function () {
    const ymNow = getCurrentYYYYMM();
    const ymdNow = getCurrentYYYYMMDD();

    ['periodeRilisInput', 'filterLaporanPeriode', 'nrw_periode', 'ptg_periode', 'dashFilterPeriode'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.value) el.value = ymNow;
    });
    ['out_tanggal', 'bayar_tgl', 'ast_tanggal'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.value) el.value = ymdNow;
    });
});

const formLoginEl = document.getElementById('formLogin');
if (formLoginEl) {
    formLoginEl.addEventListener('submit', function (e) {
        e.preventDefault();
        const role = document.getElementById('loginRole').value;
        const user = document.getElementById('loginUser').value.trim();
        const pass = document.getElementById('loginPass').value.trim();
        const btn = document.getElementById('btnLogin');

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Memverifikasi...';

        panggilServer('prosesLogin', [role, user, pass],
            function (rawRes) {
                btn.disabled = false;
                btn.innerHTML = 'Masuk Aplikasi';
                const res = parseGAS(rawRes);

                if (res.status === 'success') {
                    currentUser = res.data;
                    currentRole = res.role;

                    currentAdminMenu = 'admin-dashboard';
                    lastActivityTs = Date.now();
                    simpanSesi();
                    aktifkanSesi('admin-dashboard');
                } else {
                    Swal.fire('Login Gagal', res.message || 'Periksa kembali akun Anda.', 'error');
                }
            },
            function (err) {
                btn.disabled = false;
                btn.innerHTML = 'Masuk Aplikasi';
                Swal.fire('Error Koneksi', err.message, 'error');
            }
        );
    });
}

function sesiBaca() {
    try { const v = window.localStorage.getItem(SESSION_KEY); if (v) return v; } catch (e) { }
    try { const v = window.sessionStorage.getItem(SESSION_KEY); if (v) return v; } catch (e) { }
    return memSession;
}

function sesiTulis(str) {
    memSession = str;
    try { window.localStorage.setItem(SESSION_KEY, str); return; } catch (e) { }
    try { window.sessionStorage.setItem(SESSION_KEY, str); } catch (e) { }
}

function sesiHapus() {
    memSession = null;
    try { window.localStorage.removeItem(SESSION_KEY); } catch (e) { }
    try { window.sessionStorage.removeItem(SESSION_KEY); } catch (e) { }
}

function readSession() {
    try {
        const raw = sesiBaca();
        if (!raw) return null;
        const s = JSON.parse(raw);
        if (!s || !s.user || typeof s.user !== 'object') return null;
        if (['admin', 'petugas', 'pelanggan'].indexOf(s.role) === -1) return null;
        s.lastActive = Number(s.lastActive) || 0;
        return s;
    } catch (e) {
        return null;
    }
}

function simpanSesi() {
    if (!currentUser || !currentRole) return;
    sesiTulis(JSON.stringify({
        role: currentRole,
        user: currentUser,
        menu: currentAdminMenu,
        lastActive: lastActivityTs
    }));
    lastPersistTs = Date.now();
}

function catatAktivitas() {
    if (!currentUser) return;
    const now = Date.now();
    if (now - lastActivityTs > SESSION_IDLE_LIMIT_MS) { logoutKarenaIdle(); return; }
    lastActivityTs = now;
    if (now - lastPersistTs > 15000) simpanSesi();
}

function cekSesiIdle() {
    if (!currentUser) return;
    const s = readSession();
    if (!s) { logout(); return; }
    const last = Math.max(lastActivityTs, s.lastActive || 0);
    if (Date.now() - last > SESSION_IDLE_LIMIT_MS) logoutKarenaIdle();
}

function logoutKarenaIdle() {
    logout();
    Swal.fire('Sesi Berakhir', 'Anda otomatis keluar karena tidak ada aktivitas selama 3 jam. Silakan login kembali.', 'info');
}

function mulaiPemantauSesi() {
    if (idleWatcherStarted) return;
    idleWatcherStarted = true;
    ['click', 'keydown', 'touchstart', 'mousemove', 'scroll', 'input', 'change'].forEach(function (evt) {
        document.addEventListener(evt, catatAktivitas, { capture: true, passive: true });
    });
    setInterval(cekSesiIdle, 30000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) cekSesiIdle(); });
    window.addEventListener('pageshow', cekSesiIdle);
    window.addEventListener('focus', cekSesiIdle);
    window.addEventListener('pagehide', simpanSesi);
    window.addEventListener('beforeunload', simpanSesi);
}

function aktifkanSesi(menuAwal) {
    if (currentRole === 'admin') {
        const nama = currentUser.nama_lengkap || currentUser.username || 'Admin';
        document.getElementById('namaAdmin').textContent = nama;
        document.getElementById('dashGreetingName').textContent = 'Hello, ' + nama;
        document.getElementById('avatarInitialsAdmin').textContent = getInitials(nama);
        applyAdminPermissionsUI();
        showPanel('panel-admin');
        let menuId = menuAwal || 'admin-dashboard';
        let btn = document.querySelector('#adminSidebar .menu-btn[data-menu-id="' + menuId + '"]');
        if (!btn || btn.style.display === 'none') {
            menuId = 'admin-dashboard';
            btn = document.querySelector('#adminSidebar .menu-btn[data-menu-id="admin-dashboard"]');
        }
        showAdminMenu(menuId, btn);
        loadDataTarif();
    } else if (currentRole === 'petugas') {
        const namaPtg = currentUser.nama_lengkap || currentUser.username || 'Petugas';
        document.getElementById('namaPetugasHeader').textContent = namaPtg;
        const avPtg = document.getElementById('avatarInitialsPetugas');
        if (avPtg) avPtg.textContent = getInitials(namaPtg);
        const areaBadge = document.getElementById('badgeAreaPetugas');
        if (areaBadge) areaBadge.innerHTML = '<i class="fas fa-map-marker-alt"></i> ' + escapeHtml(currentUser.area_tugas || 'Semua Area');
        showPanel('panel-petugas');
        initPanelPetugas(menuAwal);
    } else if (currentRole === 'pelanggan') {
        showPanel('panel-pelanggan');
        initPanelPelanggan(menuAwal);
    }
}

function pulihkanSesiSaatMuat() {
    const s = readSession();
    if (!s) return;
    if (Date.now() - s.lastActive > SESSION_IDLE_LIMIT_MS) {
        sesiHapus();
        Swal.fire('Sesi Berakhir', 'Anda otomatis keluar karena tidak ada aktivitas selama 3 jam. Silakan login kembali.', 'info');
        return;
    }
    currentUser = s.user;
    currentRole = s.role;
    currentAdminMenu = s.menu || 'admin-dashboard';
    lastActivityTs = Date.now();
    simpanSesi();
    aktifkanSesi(currentAdminMenu);
}

function logout() {
    currentUser = null;
    currentRole = '';
    currentAdminMenu = 'admin-dashboard';
    sesiHapus();
    ['adminSidebar', 'mobileOverlay', 'petugasSidebar', 'petugasOverlay', 'pelangganSidebar', 'pelangganOverlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('show');
    });
    document.getElementById('formLogin').reset();
    showPanel('panel-login');
}

function formatPeriodeBulanTahun(val) {
  if (!val) return '-';
  const str = String(val).trim();
  const bulanIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Format YYYY-MM (contoh: 2026-11)
  const matchYM = str.match(/^(\d{4})-(\d{2})/);
  if (matchYM) {
    const idx = parseInt(matchYM[2], 10) - 1;
    if (bulanIndo[idx]) return bulanIndo[idx] + ' ' + matchYM[1];
  }

  // Format Date string panjang (contoh: Sun Nov 01 2026 00:00:00...)
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return bulanIndo[d.getMonth()] + ' ' + d.getFullYear();
  }
  return str;
}