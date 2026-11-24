// =========================================================================
// 2. DASHBOARD UTAMA ADMIN (SPARK UI SIMETRIS)
// =========================================================================
function formatPeriodeBulanTahun(val) {
    if (!val) return '-';
    const str = String(val).trim();
    const bulanIndo = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // Jika format YYYY-MM (contoh: 2026-11)
    const matchYM = str.match(/^(\d{4})-(\d{2})/);
    if (matchYM) {
        const idx = parseInt(matchYM[2], 10) - 1;
        if (bulanIndo[idx]) return `${bulanIndo[idx]} ${matchYM[1]}`;
    }

    // Jika string Date panjang (contoh: Sun Nov 01 2026...)
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return `${bulanIndo[d.getMonth()]} ${d.getFullYear()}`;
    }
    return str;
}


function switchDashTargetTab(tab) {
    const isWilayah = tab === 'wilayah';
    document.getElementById('tabBtnWilayah').classList.toggle('active', isWilayah);
    document.getElementById('tabBtnKesehatan').classList.toggle('active', !isWilayah);
    document.getElementById('dashTabWilayah').classList.toggle('d-none', !isWilayah);
    document.getElementById('dashTabKesehatan').classList.toggle('d-none', isWilayah);
}

function loadDashboardStats(btnEl) {
    const tombol = btnEl || document.getElementById('btnRefreshDashboard');
    const icon = tombol ? tombol.querySelector('i') : null;

    if (tombol) tombol.disabled = true;
    if (icon) icon.classList.add('fa-spin');

    const periodeEl = document.getElementById('dashFilterPeriode');
    const dusunEl = document.getElementById('dashFilterDusun');
    const periodeInput = periodeEl ? periodeEl.value : '';
    const dusunInput = dusunEl ? dusunEl.value : 'semua';

    const setEl = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    const hentikanAnimasi = (berhasil) => {
        setTimeout(() => {
            if (icon) icon.classList.remove('fa-spin');
            if (tombol) tombol.disabled = false;
            if (berhasil && btnEl && typeof Swal !== 'undefined') {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Data dashboard diperbarui',
                    showConfirmButton: false,
                    timer: 1500
                });
            }
        }, 450);
    };

    panggilServer(
        'getDashboardStats',
        [periodeInput, dusunInput],
        function (res) {
            hentikanAnimasi(true);
            try {
                const parsed = typeof res === 'string' ? JSON.parse(res) : res;
                if (!parsed || parsed.status !== 'success' || !parsed.data) {
                    if (parsed && parsed.message) Swal.fire('Gagal', parsed.message, 'error');
                    return;
                }

                const d = parsed.data;
                const mtd = d.mtd || {};
                const ytd = d.ytd || {};
                const growth = d.growth || {};
                const rem = d.reminder || {};

                // 1. Set default input filter periode & isi dropdown Dusun
                if (periodeEl && !periodeEl.value && d.periode) {
                    periodeEl.value = d.periode;
                }
                if (dusunEl && Array.isArray(d.dusunOptions)) {
                    const currentVal = dusunEl.value || 'semua';
                    dusunEl.innerHTML = '<option value="semua">Semua Dusun / Wilayah</option>' +
                        d.dusunOptions.map(dsn => `<option value="${escapeHtml(dsn)}">${escapeHtml(dsn)}</option>`).join('');
                    dusunEl.value = currentVal;
                }

                // 2. Kartu Reminder
                setEl('remMeterPending', rem.meterPending ?? 0);
                setEl('remTagihanBelum', rem.tagihanBelumLunas ?? 0);
                setEl('remAduanOpen', rem.pengaduanOpen ?? 0);
                setEl('remSpkPending', rem.spkMenunggu ?? 0);

                // 3. Grup 1: Tagihan & Penerimaan Kas
                const labelPeriode = formatPeriodeBulanTahun(d.periode || periodeInput || '-');
                const labelTahun = d.tahun || (d.periode ? String(d.periode).slice(0, 4) : '-');

                setEl('dashMtdDateLabel', labelPeriode);
                setEl('dashMtdActual', formatRupiah(mtd.actual ?? 0));
                setEl('dashMtdTarget', formatRupiah(mtd.target ?? 0));
                setEl('dashMtdAchieve', (mtd.achievement ?? 0) + '%');

                setEl('dashYtdDateLabel', labelTahun);
                setEl('dashYtdActual', formatRupiah(ytd.actual ?? 0));
                setEl('dashYtdTarget', formatRupiah(ytd.target ?? 0));
                setEl('dashYtdAchieve', (ytd.achievement ?? 0) + '%');

                setEl('dashKasBulanLalu', formatRupiah(growth.kasBulanLalu ?? 0));
                setEl('dashGrowthKasMoM', (growth.growthKasMoM ?? 0) + '%');
                setEl('dashTotalTunggakan', formatRupiah(d.totalTunggakan ?? 0));
                setEl('dashJumlahTunggakan', (d.jumlahMenunggak ?? 0) + ' Inv');

                // 4. Grup 2: Distribusi Air & Pelanggan
                setEl('dashAirMtdLabel', labelPeriode);
                setEl('dashAirMtdKubik', (mtd.kubikasi ?? 0) + ' m³');
                setEl('dashTotalPelanggan', d.totalPelanggan ?? 0);
                setEl('dashPelangganAktif', (d.pelangganAktif ?? 0) + ' Aktif');

                setEl('dashAirYtdLabel', labelTahun);
                setEl('dashAirYtdKubik', (ytd.kubikasi ?? 0) + ' m³');
                setEl('dashYtdInvCount', ytd.jumlahInvoice ?? 0);
                setEl('dashPersenTerbayar', (d.persenTerbayar ?? 0) + '%');

                setEl('dashAirBulanLalu', (growth.airBulanLalu ?? 0) + ' m³');
                setEl('dashGrowthAirMoM', (growth.growthAirMoM ?? 0) + '%');
                setEl('dashTotalKubikasi', (d.totalPemakaianAir ?? 0) + ' m³');
                setEl('dashTotalPendapatan', formatRupiah(d.totalPendapatan ?? 0));

                // 5. Grup 3: Tabel Realisasi & Kesehatan per Dusun
                const listDusun = Array.isArray(d.rekapDusun) ? d.rekapDusun : [];
                const tbodyRekap = document.getElementById('tbodyDashRekapDusun');
                const tbodyKesehatan = document.getElementById('tbodyDashKesehatanDusun');

                if (tbodyRekap) {
                    if (!listDusun.length) {
                        tbodyRekap.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Belum ada data realisasi wilayah.</td></tr>';
                    } else {
                        tbodyRekap.innerHTML = listDusun.map(w => `<tr>
                            <td class="ps-3 fw-semibold">${escapeHtml(w.dusun || '-')}</td>
                            <td>${w.kubikasi ?? 0} m³</td>
                            <td>${formatRupiah(w.tagihan ?? 0)}</td>
                            <td class="text-success fw-semibold">${formatRupiah(w.terbayar ?? 0)}</td>
                            <td class="pe-3 text-end"><span class="badge bg-primary-subtle text-primary">${w.persen ?? 0}%</span></td>
                        </tr>`).join('');
                    }
                }

                if (tbodyKesehatan) {
                    if (!listDusun.length) {
                        tbodyKesehatan.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">Belum ada data pelanggan wilayah.</td></tr>';
                    } else {
                        tbodyKesehatan.innerHTML = listDusun.map(w => {
                            const tot = Number(w.pelanggan ?? 0);
                            const akt = Number(w.aktif ?? 0);
                            const rasio = tot > 0 ? Math.round((akt / tot) * 100) : 0;
                            return `<tr>
                                <td class="ps-3 fw-semibold">${escapeHtml(w.dusun || '-')}</td>
                                <td>${tot}</td>
                                <td>${akt}</td>
                                <td class="pe-3 text-end"><span class="badge bg-success-subtle text-success">${rasio}%</span></td>
                            </tr>`;
                        }).join('');
                    }
                }
            } catch (e) {
                console.error('Error parse dashboard:', e);
            }
        },
        function (err) {
            hentikanAnimasi(false);
            Swal.fire('Error', err.message || 'Gagal memuat ulang dashboard', 'error');
        }
    );
}

// 3. DATA PELANGGAN & AMBIL FOTO KTP
// =========================================================================
function loadDataPelanggan() {
    const tbody = document.getElementById('dataPelanggan');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin me-2"></i>Memuat data pelanggan...</td></tr>';

    panggilServer('getPelanggan', [],
        function (rawRes) {
            const res = parseGAS(rawRes);
            if (res.status === 'success') { allPelangganCache = res.data || []; filterDataPelanggan(); }
            else { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">' + escapeHtml(res.message) + '</td></tr>'; }
        },
        function (err) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Gagal memuat data: ' + escapeHtml(err.message) + '</td></tr>'; }
    );
}

function renderTabelPelanggan(list) {
    const tbody = document.getElementById('dataPelanggan');
    document.getElementById('infoJumlahPelanggan').textContent = 'Menampilkan ' + list.length + ' pelanggan';

    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Tidak ada data pelanggan ditemukan.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(p => {
        const isAktif = String(p.status_sambungan || 'Aktif').toLowerCase() === 'aktif';
        const badgeStatus = isAktif
            ? '<span class="badge bg-success-subtle text-success border">Aktif</span>'
            : '<span class="badge bg-danger-subtle text-danger border">' + escapeHtml(p.status_sambungan || 'Non-Aktif') + '</span>';
        const alamatStr = [p.dusun, p.rt_rw ? ('RT/RW ' + p.rt_rw) : '', p.desa].filter(Boolean).join(', ') || '-';
        const ktpIcon = p.foto_ktp ? '<i class="fas fa-id-card text-primary ms-1" title="Foto KTP Tersedia"></i>' : '';

        return '<tr style="cursor:pointer;" onclick="bukaDetailPelanggan(\'' + escapeHtml(p.id_pelanggan) + '\')">' +
            '<td class="fw-bold text-primary">' + escapeHtml(p.id_pelanggan) + ' ' + ktpIcon + '</td>' +
            '<td><div class="fw-bold text-dark">' + escapeHtml(p.nama_pelanggan) + '</div><small class="text-muted">NIK: ' + escapeHtml(p.nik || '-') + '</small></td>' +
            '<td class="small">' + escapeHtml(alamatStr) + '</td>' +
            '<td class="small">' + escapeHtml(p.no_hp || '-') + '</td>' +
            '<td>' + badgeStatus + '</td>' +
            '</tr>';
    }).join('');
}

function filterDataPelanggan() {
    const input = document.getElementById('searchAdminPelanggan');
    const kw = (input.value || '').trim().toLowerCase();
    const btnClear = document.getElementById('btnClearSearchPelanggan');
    if (btnClear) btnClear.classList.toggle('d-none', kw.length === 0);
    if (!kw) { renderTabelPelanggan(allPelangganCache); return; }

    const filtered = allPelangganCache.filter(p =>
        String(p.nama_pelanggan || '').toLowerCase().includes(kw) ||
        String(p.id_pelanggan || '').toLowerCase().includes(kw) ||
        String(p.dusun || '').toLowerCase().includes(kw) ||
        String(p.nik || '').toLowerCase().includes(kw)
    );
    renderTabelPelanggan(filtered);
}

function resetSearchPelanggan() { document.getElementById('searchAdminPelanggan').value = ''; filterDataPelanggan(); }

function resetFormTambahPelanggan() {
    document.getElementById('formTambahPelanggan').reset();
    document.getElementById('add_desa').value = 'PERCOBAAN';
    document.getElementById('add_stand_meter_awal').value = '0';
    document.getElementById('add_password').value = '12345';
    hapusFotoKtpBaru();
    populateDropdownGolongan();
}

function handleFotoKTPBaru(input) {
    if (!input.files || !input.files[0]) return;
    const statusEl = document.getElementById('statusOcrKtp');
    statusEl.textContent = 'Memproses gambar KTP...';
    compressImageFile(input.files[0], 1024, 0.82)
        .then(base64 => {
            addFotoKtpBase64 = base64;
            document.getElementById('imgPreviewAddKtp').src = base64;
            document.getElementById('previewAddKtpBox').classList.remove('d-none');
            document.getElementById('hintFotoKtpBaru').classList.add('d-none');
            statusEl.textContent = 'Foto KTP siap diunggah. Klik "Baca NIK & Nama Otomatis" jika ingin scan OCR.';
        })
        .catch(() => { statusEl.textContent = 'Gagal membaca file gambar KTP.'; });
}

function hapusFotoKtpBaru() {
    addFotoKtpBase64 = '';
    const cam = document.getElementById('add_foto_ktp_camera');
    const gal = document.getElementById('add_foto_ktp_galeri');
    if (cam) cam.value = ''; if (gal) gal.value = '';
    document.getElementById('imgPreviewAddKtp').src = '';
    document.getElementById('previewAddKtpBox').classList.add('d-none');
    document.getElementById('hintFotoKtpBaru').classList.remove('d-none');
    document.getElementById('statusOcrKtp').textContent = '';
}

function scanOcrKtpBaru() {
    if (!addFotoKtpBase64) { Swal.fire('Info', 'Ambil atau pilih foto KTP terlebih dahulu.', 'info'); return; }
    if (typeof Tesseract === 'undefined') { Swal.fire('Info', 'Library OCR belum termuat.', 'warning'); return; }
    const btn = document.getElementById('btnScanOcrKtp');
    const statusEl = document.getElementById('statusOcrKtp');
    btn.disabled = true;
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Membaca teks KTP (OCR)...';

    Tesseract.recognize(addFotoKtpBase64, 'ind')
        .then(({ data: { text } }) => {
            btn.disabled = false;
            const cleanText = text || '';
            const nikMatch = cleanText.replace(/[Oo]/g, '0').match(/\b\d{16}\b/);
            if (nikMatch) document.getElementById('add_nik').value = nikMatch[0];
            const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
            for (let line of lines) {
                const namaMatch = line.match(/nama\s*[:\-]?\s*([a-zA-Z\s'.]{3,})/i);
                if (namaMatch && namaMatch[1]) { document.getElementById('add_nama').value = namaMatch[1].trim().toUpperCase(); break; }
            }
            statusEl.innerHTML = nikMatch
                ? '<span class="text-success fw-bold">Scan selesai! NIK ' + nikMatch[0] + ' terdeteksi.</span>'
                : '<span class="text-warning-emphasis">Scan selesai, silakan lengkapi NIK & Nama secara manual.</span>';
        })
        .catch(() => { btn.disabled = false; statusEl.innerHTML = '<span class="text-danger">Gagal memindai teks KTP.</span>'; });
}

document.getElementById('formTambahPelanggan').addEventListener('submit', function (e) {
    e.preventDefault();
    const btn = document.getElementById('btnSimpanPelangganBaru');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Menyimpan...';
    const payload = {
        nik: document.getElementById('add_nik').value.trim(),
        nama: document.getElementById('add_nama').value.trim(),
        dusun: document.getElementById('add_dusun').value.trim(),
        rt_rw: document.getElementById('add_rt_rw').value.trim(),
        desa: document.getElementById('add_desa').value.trim(),
        no_hp: document.getElementById('add_no_hp').value.trim(),
        golongan: document.getElementById('add_golongan').value,
        stand_meter_awal: document.getElementById('add_stand_meter_awal').value,
        password: document.getElementById('add_password').value.trim(),
        fotoKtpBase64: addFotoKtpBase64
    };
    panggilServer('addPelanggan', [payload, getActorPayload()],
        function (rawRes) {
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-1"></i> Simpan Pelanggan';
            const res = parseGAS(rawRes);
            if (res.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('modalTambahPelanggan'))?.hide();
                Swal.fire('Berhasil', res.message, 'success');
                resetFormTambahPelanggan();
                loadDataPelanggan();
            } else { Swal.fire('Gagal', res.message, 'error'); }
        },
        function (err) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-1"></i> Simpan Pelanggan'; Swal.fire('Error', err.message, 'error'); }
    );
});

let pelangganDetailAktif = null;

function isiFormDetailPelanggan(plg) {
    document.getElementById('edit_id_pelanggan').value = plg.id_pelanggan || '';
    document.getElementById('edit_id_display').value = plg.id_pelanggan || '';
    document.getElementById('edit_status').value = String(plg.status_sambungan || 'Aktif').toLowerCase() === 'aktif' ? 'Aktif' : 'Non-Aktif';
    document.getElementById('edit_nik').value = plg.nik || '';
    document.getElementById('edit_nama').value = plg.nama_pelanggan || '';
    document.getElementById('edit_dusun').value = plg.dusun || '';
    document.getElementById('edit_rt_rw').value = plg.rt_rw || '';
    document.getElementById('edit_desa').value = plg.desa || 'PERCOBAAN';
    document.getElementById('edit_no_hp').value = plg.no_hp || '';
    document.getElementById('edit_golongan').value = plg.golongan || plg.id_golongan || 'RT';
    document.getElementById('edit_password').value = plg.password || '12345';
    document.getElementById('edit_foto_ktp_lama').value = plg.foto_ktp || '';
    document.getElementById('edit_foto_ktp_file').value = '';

    const imgEl = document.getElementById('imgDetailKtp');
    const noTxt = document.getElementById('noFotoKtpText');
    const btnFull = document.getElementById('btnLihatKtpFull');
    if (plg.foto_ktp) {
        imgEl.src = convertDriveUrlToImgSrc(plg.foto_ktp);
        imgEl.classList.remove('d-none'); noTxt.classList.add('d-none'); btnFull.href = plg.foto_ktp; btnFull.classList.remove('d-none');
    } else {
        imgEl.src = ''; imgEl.classList.add('d-none'); noTxt.classList.remove('d-none'); btnFull.classList.add('d-none');
    }
}

function setModeEditPelanggan(isEditMode) {
    const canEdit = userHasPerm('edit_hapus_pelanggan');
    document.getElementById('alertReadOnlyPelanggan').classList.toggle('d-none', canEdit);

    const aktifkanInput = canEdit && isEditMode;
    ['edit_status', 'edit_nik', 'edit_nama', 'edit_dusun', 'edit_rt_rw', 'edit_desa', 'edit_no_hp', 'edit_golongan', 'edit_password']
        .forEach(id => { const el = document.getElementById(id); if (el) el.disabled = !aktifkanInput; });

    document.getElementById('blokGantiFotoKtpEdit').classList.toggle('d-none', !aktifkanInput);
    document.getElementById('btnModeEditPelanggan').classList.toggle('d-none', !canEdit || isEditMode);
    document.getElementById('btnBatalEditPelanggan').classList.toggle('d-none', !aktifkanInput);
    document.getElementById('btnUpdatePelanggan').classList.toggle('d-none', !aktifkanInput);
}

function aktifkanModeEditPelanggan() {
    if (!userHasPerm('edit_hapus_pelanggan')) return;
    setModeEditPelanggan(true);
}

function batalEditPelanggan() {
    if (pelangganDetailAktif) {
        isiFormDetailPelanggan(pelangganDetailAktif);
    }
    setModeEditPelanggan(false);
}

function loadPemakaian3BulanPelanggan(idPelanggan) {
    const tbody = document.getElementById('tbodyPemakaian3Bulan');
    const badgeTotal = document.getElementById('badgeTotal3Bulan');
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-2"><i class="fas fa-spinner fa-spin me-1"></i>Memuat riwayat...</td></tr>';
    badgeTotal.textContent = '0 m³';

    panggilServer('getRiwayatPemakaianPelanggan', [idPelanggan, 3],
        function (rawRes) {
            const res = parseGAS(rawRes);
            const list = (res.status === 'success' && Array.isArray(res.data)) ? res.data : [];
            if (list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-2">Belum ada data pemakaian.</td></tr>';
                return;
            }
            const totalKubik = list.reduce((sum, item) => sum + (Number(item.total_pemakaian) || 0), 0);
            badgeTotal.textContent = 'Total: ' + totalKubik + ' m³';
            tbody.innerHTML = list.map(item => (
                '<tr>' +
                '<td class="fw-semibold">' + escapeHtml(item.periode) + '</td>' +
                '<td class="text-center text-muted">' + item.meter_awal + ' → ' + item.meter_akhir + '</td>' +
                '<td class="text-end fw-bold text-primary">' + item.total_pemakaian + ' m³</td>' +
                '</tr>'
            )).join('');
        },
        function () {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger py-2">Gagal memuat pemakaian.</td></tr>';
        }
    );
}

function bukaDetailPelanggan(idPelanggan) {
    const plg = allPelangganCache.find(p => String(p.id_pelanggan) === String(idPelanggan));
    if (!plg) return;
    pelangganDetailAktif = Object.assign({}, plg);

    document.getElementById('pelanggan-list-view').classList.add('d-none');
    document.getElementById('pelanggan-detail-view').classList.remove('d-none');

    isiFormDetailPelanggan(pelangganDetailAktif);
    setModeEditPelanggan(false);
    loadPemakaian3BulanPelanggan(plg.id_pelanggan);
}

function kembaliKeDaftarPelanggan() {
    pelangganDetailAktif = null;
    document.getElementById('pelanggan-detail-view').classList.add('d-none');
    document.getElementById('pelanggan-list-view').classList.remove('d-none');
}

document.getElementById('formEditPelanggan').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!userHasPerm('edit_hapus_pelanggan')) { Swal.fire('Akses Ditolak', 'Akun Anda tidak memiliki izin mengedit data pelanggan.', 'warning'); return; }
    const btn = document.getElementById('btnUpdatePelanggan');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Menyimpan...';
    let fotoBaruBase64 = '';
    const fileInput = document.getElementById('edit_foto_ktp_file');
    if (fileInput.files && fileInput.files[0]) {
        try { fotoBaruBase64 = await compressImageFile(fileInput.files[0], 1024, 0.82); } catch (err) { console.error(err); }
    }
    const payload = {
        id_pelanggan: document.getElementById('edit_id_pelanggan').value,
        status: document.getElementById('edit_status').value,
        nik: document.getElementById('edit_nik').value.trim(),
        nama: document.getElementById('edit_nama').value.trim(),
        dusun: document.getElementById('edit_dusun').value.trim(),
        rt_rw: document.getElementById('edit_rt_rw').value.trim(),
        desa: document.getElementById('edit_desa').value.trim(),
        no_hp: document.getElementById('edit_no_hp').value.trim(),
        golongan: document.getElementById('edit_golongan').value,
        password: document.getElementById('edit_password').value.trim(),
        fotoKtpLama: document.getElementById('edit_foto_ktp_lama').value,
        fotoKtpBase64: fotoBaruBase64
    };
    panggilServer('updatePelanggan', [payload, getActorPayload()],
        function (rawRes) {
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-1"></i> Save';
            const res = parseGAS(rawRes);
            if (res.status === 'success') {
                Swal.fire('Berhasil', res.message, 'success');
                kembaliKeDaftarPelanggan();
                loadDataPelanggan();
            } else { Swal.fire('Gagal', res.message, 'error'); }
        },
        function (err) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-1"></i> Save'; Swal.fire('Error', err.message, 'error'); }
    );
});

function downloadExcelPelanggan() {
    if (!allPelangganCache || allPelangganCache.length === 0) { Swal.fire('Info', 'Data pelanggan masih kosong.', 'info'); return; }
    const rows = allPelangganCache.map(p => ({
        'ID Pelanggan': p.id_pelanggan, 'NIK': p.nik, 'Nama Pelanggan': p.nama_pelanggan, 'Dusun': p.dusun,
        'RT/RW': p.rt_rw, 'Desa': p.desa, 'No HP': p.no_hp, 'Golongan': p.golongan || p.id_golongan,
        'Stand Awal': p.stand_meter_awal, 'Status': p.status_sambungan
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Pelanggan');
    XLSX.writeFile(wb, 'Data_Pelanggan_PDAM_' + getCurrentYYYYMMDD() + '.xlsx');
}

// =========================================================================
// 4. DATA TAGIHAN & PEMBAYARAN KASIR
// =========================================================================
function loadDataTagihan() {
    const tbody = document.getElementById('dataTagihan');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin me-2"></i>Memuat data tagihan...</td></tr>';
    panggilServer('getTagihan', [],
        function (rawRes) {
            const res = parseGAS(rawRes);
            if (res.status === 'success') { allTagihanCache = res.data || []; filterDataTagihan(); }
            else { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">' + escapeHtml(res.message) + '</td></tr>'; }
        },
        function (err) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Gagal memuat tagihan: ' + escapeHtml(err.message) + '</td></tr>'; }
    );
}

function renderTabelTagihan(list) {
    const tbody = document.getElementById('dataTagihan');
    document.getElementById('infoJumlahTagihan').textContent = 'Menampilkan ' + list.length + ' tagihan';
    if (!list || list.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Tidak ada data tagihan ditemukan.</td></tr>'; return; }
    const canBayar = userHasPerm('pelunasan_tagihan');

    tbody.innerHTML = list.map(t => {
        const rawStatus = String(t.status_bayar || '').trim();
        const stLow = rawStatus.toLowerCase();
        const isLunas = stLow === 'lunas';
        const isMenungguVerif = stLow.includes('menunggu');
        const stRilisLow = String(t.status_rilis || '').trim().toLowerCase();
        const isBelumRilis = !isLunas && (stRilisLow === 'draft' || stRilisLow === 'belum rilis');

        let badgeStatus = '<span class="badge bg-danger-subtle text-danger border">Belum Lunas</span>';
        if (isLunas) {
            badgeStatus = '<span class="badge bg-success-subtle text-success border">Lunas</span>' +
                '<div class="small text-muted" style="font-size:0.72rem;">' + escapeHtml(t.tgl_bayar || '') + (t.metode_bayar ? ' • ' + escapeHtml(t.metode_bayar) : '') + '</div>';
        } else if (isBelumRilis) {
            badgeStatus = '<span class="badge bg-secondary-subtle text-secondary border"><i class="fas fa-clock me-1"></i>Belum Rilis</span>' +
                '<div class="small text-muted" style="font-size:0.72rem;">Menunggu rilis tgl 1</div>';
        } else if (isMenungguVerif) {
            badgeStatus = '<span class="badge bg-warning text-dark">Menunggu Verifikasi</span>' +
                (t.tgl_transfer ? '<div class="small text-muted" style="font-size:0.72rem;">Trf: ' + escapeHtml(String(t.tgl_transfer).slice(0, 10)) + '</div>' : '');
        }

        let aksiHtml = '';
        if (isLunas) {
            aksiHtml = '<div class="btn-group btn-group-sm">' +
                '<button class="btn btn-outline-primary" onclick="cetakStrukTermal(\'' + escapeHtml(t.id_tagihan) + '\')" title="Cetak Struk Termal"><i class="fas fa-print"></i> Struk</button>' +
                '<button class="btn btn-outline-danger" onclick="cetakStrukPDFTagihan(\'' + escapeHtml(t.id_tagihan) + '\')" title="Cetak Nota PDF"><i class="fas fa-file-pdf"></i> PDF</button></div>';
        } else if (isBelumRilis) {
            aksiHtml = '<button class="btn btn-sm btn-secondary" disabled title="Tagihan belum dirilis (Rilis melalui panel Rilis Tagihan tanggal 1)"><i class="fas fa-lock me-1"></i> Belum Rilis</button>';
        } else if (isMenungguVerif && canBayar) {
            aksiHtml = '<div class="d-flex flex-wrap gap-1">' +
                (t.bukti_transfer ? '<button class="btn btn-xs btn-outline-info" onclick="bukaModalBuktiTransferAdmin(\'' + escapeHtml(t.id_tagihan) + '\')"><i class="fas fa-image me-1"></i>Bukti</button>' : '') +
                '<button class="btn btn-xs btn-success fw-semibold" onclick="bukaModalBayar(\'' + escapeHtml(t.id_tagihan) + '\', true)"><i class="fas fa-check me-1"></i>Verifikasi</button>' +
                '<button class="btn btn-xs btn-outline-danger" onclick="tolakBuktiTransferAdmin(\'' + escapeHtml(t.id_tagihan) + '\')"><i class="fas fa-times"></i></button>' +
                '</div>';
        } else if (canBayar) {
            aksiHtml = '<button class="btn btn-sm btn-success fw-semibold" onclick="bukaModalBayar(\'' + escapeHtml(t.id_tagihan) + '\')"><i class="fas fa-cash-register me-1"></i> Bayar</button>';
        } else { aksiHtml = '<span class="text-muted small">-</span>'; }

        return '<tr><td class="fw-bold small">' + escapeHtml(t.id_tagihan) + '</td>' +
            '<td><div class="fw-bold text-dark">' + escapeHtml(t.nama_pelanggan) + '</div><small class="text-muted">' + escapeHtml(t.id_pelanggan) + (t.dusun ? ' • ' + escapeHtml(t.dusun) : '') + '</small></td>' +
            '<td><span class="badge bg-light text-dark border">' + escapeHtml(formatPeriodeBulanTahun(t.periode)) + '</span></td>' +
            '<td class="fw-bold">' + formatRupiah(t.total_bayar) + '</td><td>' + badgeStatus + '</td><td>' + aksiHtml + '</td></tr>';
    }).join('');
}

function bukaModalBuktiTransferAdmin(idTagihan) {
    const t = allTagihanCache.find(x => String(x.id_tagihan) === String(idTagihan));
    if (!t) return;
    document.getElementById('admBuktiTransferTitle').textContent = 'Bukti Transfer: ' + (t.nama_pelanggan || t.id_pelanggan);
    document.getElementById('admBuktiTransferMeta').textContent = (t.id_tagihan || '') + ' • Periode ' + (t.periode || '-') + ' • ' + formatRupiah(t.total_bayar);
    const src = convertDriveUrlToImgSrc(t.bukti_transfer || '');
    document.getElementById('admBuktiTransferImg').src = src;
    document.getElementById('admBuktiTransferLinkBox').innerHTML = t.bukti_transfer
        ? '<a href="' + escapeHtml(t.bukti_transfer) + '" target="_blank" class="btn btn-sm btn-outline-primary"><i class="fas fa-external-link-alt me-1"></i>Buka File Asli</a>'
        : '';
    new bootstrap.Modal(document.getElementById('modalBuktiTransferAdmin')).show();
}

function tolakBuktiTransferAdmin(idTagihan) {
    Swal.fire({
        title: 'Tolak Bukti Transfer?',
        input: 'text',
        inputPlaceholder: 'Alasan penolakan (contoh: Nominal tidak sesuai / gambar buram)...',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Tolak Bukti',
        cancelButtonText: 'Batal'
    }).then(r => {
        if (!r.isConfirmed) return;
        panggilServer('tolakBuktiTransferTagihan', [idTagihan, String(r.value || '').trim(), getActorPayload()],
            rawRes => {
                const res = parseGAS(rawRes);
                if (res.status === 'success') { Swal.fire('Ditolak', res.message, 'info'); loadDataTagihan(); }
                else Swal.fire('Gagal', res.message, 'error');
            },
            err => Swal.fire('Error', err.message, 'error')
        );
    });
}

function loadSetoranPetugasAdmin() {
    const tbody = document.getElementById('tbodySetoranPetugasAdmin');
    const badgeEl = document.getElementById('badgePendingSetoranAdmin');
    if (!tbody) return;
    panggilServer('getSetoranPetugasAdmin', [],
        rawRes => {
            const res = parseGAS(rawRes);
            const list = (res.status === 'success' && Array.isArray(res.data)) ? res.data : [];
            const pendingCount = list.filter(s => String(s.status_setoran || '').toLowerCase().includes('menunggu')).length;
            if (badgeEl) {
                badgeEl.textContent = pendingCount;
                badgeEl.classList.toggle('d-none', pendingCount === 0);
            }
            if (list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted small py-2">Belum ada pengajuan setoran tunai dari petugas.</td></tr>';
                return;
            }
            tbody.innerHTML = list.map(s => {
                const st = String(s.status_setoran || 'Menunggu Verifikasi Bendahara');
                const stLow = st.toLowerCase();
                let badge = '<span class="badge bg-warning text-dark">Menunggu Verifikasi</span>';
                if (stLow.includes('diterima') || stLow.includes('sudah')) badge = '<span class="badge bg-success">Diterima Bendahara</span>';
                else if (stLow.includes('tolak')) badge = '<span class="badge bg-danger">Ditolak</span>';

                const canAct = stLow.includes('menunggu') && (userHasPerm('pelunasan_tagihan') || userHasPerm('kelola_laporan'));
                const aksi = canAct
                    ? '<div class="btn-group btn-group-sm">' +
                    '<button class="btn btn-success fw-semibold" onclick="prosesVerifikasiSetoranAdmin(\'' + escapeHtml(s.id_setoran) + '\', \'Terima\')"><i class="fas fa-check me-1"></i>Terima Setoran</button>' +
                    '<button class="btn btn-outline-danger" onclick="prosesVerifikasiSetoranAdmin(\'' + escapeHtml(s.id_setoran) + '\', \'Tolak\')"><i class="fas fa-times"></i></button>' +
                    '</div>'
                    : '<span class="small text-muted">' + escapeHtml(s.verifikator || '-') + '</span>';

                return '<tr class="small">' +
                    '<td class="fw-bold text-primary">' + escapeHtml(s.id_setoran) + '</td>' +
                    '<td>' + escapeHtml(String(s.tanggal || '').slice(0, 10)) + '</td>' +
                    '<td><div class="fw-semibold">' + escapeHtml(s.nama_petugas) + '</div>' + (s.catatan ? '<small class="text-muted">' + escapeHtml(s.catatan) + '</small>' : '') + '</td>' +
                    '<td>' + (Number(s.jumlah_nota) || 0) + ' nota</td>' +
                    '<td class="fw-bold">' + formatRupiah(s.total_nominal) + '</td>' +
                    '<td>' + badge + '</td>' +
                    '<td class="text-end">' + aksi + '</td>' +
                    '</tr>';
            }).join('');
        },
        err => {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger small py-2">' + escapeHtml(err.message) + '</td></tr>';
        }
    );
}

function prosesVerifikasiSetoranAdmin(idSetoran, aksi) {
    const isTerima = aksi === 'Terima';
    Swal.fire({
        title: isTerima ? 'Terima Setoran Tunai Petugas?' : 'Tolak Pengajuan Setoran?',
        text: isTerima
            ? 'Dana setoran dinyatakan masuk kas Bendahara dan tagihan terkait ditandai Sudah Disetor.'
            : 'Pengajuan ditolak dan saldo kembali ke status Belum Disetor pada petugas.',
        icon: isTerima ? 'question' : 'warning',
        showCancelButton: true,
        confirmButtonText: isTerima ? 'Ya, Terima Setoran' : 'Ya, Tolak',
        cancelButtonText: 'Batal'
    }).then(r => {
        if (!r.isConfirmed) return;
        panggilServer('verifikasiSetoranPetugas', [idSetoran, aksi, getActorPayload()],
            rawRes => {
                const res = parseGAS(rawRes);
                if (res.status === 'success') {
                    Swal.fire('Berhasil', res.message, 'success');
                    loadSetoranPetugasAdmin();
                    loadDataTagihan();
                } else {
                    Swal.fire('Gagal', res.message, 'error');
                }
            },
            err => Swal.fire('Error', err.message, 'error')
        );
    });
}

function filterDataTagihan() {
    const kw = (document.getElementById('searchAdminTagihan').value || '').trim().toLowerCase();
    document.getElementById('btnClearSearchTagihan').classList.toggle('d-none', kw.length === 0);
    if (!kw) { renderTabelTagihan(allTagihanCache); return; }
    const filtered = allTagihanCache.filter(t =>
        String(t.nama_pelanggan || '').toLowerCase().includes(kw) ||
        String(t.id_pelanggan || '').toLowerCase().includes(kw) ||
        String(t.dusun || '').toLowerCase().includes(kw) ||
        String(t.id_tagihan || '').toLowerCase().includes(kw)
    );
    renderTabelTagihan(filtered);
}

function resetSearchTagihan() { document.getElementById('searchAdminTagihan').value = ''; filterDataTagihan(); }

function bukaModalBayar(idTagihan, isFromTransfer) {
    const t = allTagihanCache.find(x => String(x.id_tagihan) === String(idTagihan));
    if (!t) return;
    const stRilisLow = String(t.status_rilis || '').trim().toLowerCase();
    if (String(t.status_bayar || '').trim().toLowerCase() !== 'lunas' && (stRilisLow === 'draft' || stRilisLow === 'belum rilis')) {
        Swal.fire('Belum Dirilis', 'Tagihan ini masih berstatus Belum Rilis. Silakan rilis tagihan terlebih dahulu di panel Rilis Tagihan tanggal 1.', 'warning');
        return;
    }
    document.getElementById('bayar_id_tagihan').value = t.id_tagihan;
    document.getElementById('bayar_info_pelanggan').textContent = t.nama_pelanggan + ' (' + t.id_pelanggan + ')';
    document.getElementById('bayar_info_nominal').textContent = t.periode + ' — ' + formatRupiah(t.total_bayar);
    document.getElementById('bayar_tgl').value = (isFromTransfer && t.tgl_transfer) ? String(t.tgl_transfer).slice(0, 10) : getCurrentYYYYMMDD();
    document.getElementById('bayar_metode').value = isFromTransfer ? 'Transfer Bank' : 'Kas Tunai';
    new bootstrap.Modal(document.getElementById('modalBayarTagihan')).show();
}

document.getElementById('formBayarTagihan').addEventListener('submit', function (e) {
    e.preventDefault();
    const idTagihan = document.getElementById('bayar_id_tagihan').value;
    const tglBayar = document.getElementById('bayar_tgl').value;
    const metode = document.getElementById('bayar_metode').value;
    const btn = document.getElementById('btnKonfirmasiBayar');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Memproses...';

    panggilServer('prosesBayarTagihan', [idTagihan, tglBayar, metode, getActorPayload()],
        function (rawRes) {
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Proses Lunas & Simpan Invoice';
            const res = parseGAS(rawRes);
            if (res.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('modalBayarTagihan'))?.hide();
                Swal.fire('Pembayaran Lunas', res.message, 'success');
                loadDataTagihan();
            } else { Swal.fire('Gagal', res.message, 'error'); }
        },
        function (err) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Proses Lunas & Simpan Invoice'; Swal.fire('Error', err.message, 'error'); }
    );
});

function cetakStrukPDFTagihan(idTagihan) {
    Swal.fire({ title: 'Membuat PDF Nota...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    panggilServer('generateStrukPDF', [idTagihan],
        function (rawRes) {
            const res = parseGAS(rawRes);
            if (res.status === 'success' && res.pdfBase64) {
                Swal.close();
                const link = document.createElement('a');
                link.href = 'data:application/pdf;base64,' + res.pdfBase64;
                link.download = 'Nota_' + idTagihan + '.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                Swal.close();
                cetakNotaPrintPreview(idTagihan);
            }
        },
        function () {
            Swal.close();
            cetakNotaPrintPreview(idTagihan);
        }
    );
}

function cetakNotaPrintPreview(idTagihan) {
    Swal.fire({ title: 'Menyiapkan Nota PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    panggilServer('getDataStruk', [idTagihan],
        function (rawRes) {
            Swal.close();
            const res = parseGAS(rawRes);
            if (res.status === 'success' && res.data) {
                const d = res.data;
                const win = window.open('', '_blank', 'width=820,height=680');
                win.document.write(
                    '<!DOCTYPE html><html><head><title>Nota Pembayaran ' + escapeHtml(d.invoice_no) + '</title>' +
                    '<style>body{font-family:Arial,sans-serif;padding:28px;color:#111;max-width:760px;margin:auto;}.toolbar{background:#f3f4f6;padding:10px 14px;border-radius:8px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;}.btn{padding:8px 14px;border:none;border-radius:6px;cursor:pointer;font-weight:bold;}.btn-pdf{background:#f05a28;color:#fff;}.btn-cls{background:#e5e7eb;color:#111;}.kop{border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:16px;display:flex;justify-content:space-between;}table{width:100%;border-collapse:collapse;margin-top:12px;}th,td{border:1px solid #d1d5db;padding:8px 10px;font-size:13px;}th{background:#f9fafb;text-align:left;}.r{text-align:right;}.lunas{border:2px solid #16a34a;color:#16a34a;padding:4px 10px;font-weight:bold;border-radius:6px;display:inline-block;}@media print{.toolbar{display:none!important;}body{padding:0;}}</style></head><body>' +
                    '<div class="toolbar"><span>Pratinjau Nota Tagihan Air</span><div><button class="btn btn-pdf" onclick="window.print()">Cetak / Simpan PDF</button> <button class="btn btn-cls" onclick="window.close()">Tutup</button></div></div>' +
                    '<div class="kop"><div><h3 style="margin:0;">BUMDES PERCOBAAN</h3><small>Unit Layanan Air Bersih (PDAM Desa)</small></div><div style="text-align:right;"><div class="lunas">LUNAS</div><br><small>No: ' + escapeHtml(d.invoice_no) + '</small></div></div>' +
                    '<table style="margin-bottom:14px;"><tr><th width="22%">ID Pelanggan</th><td width="28%">' + escapeHtml(d.id_pelanggan) + '</td><th width="22%">Periode</th><td width="28%">' + escapeHtml(d.periode_bulan) + '</td></tr>' +
                    '<tr><th>Nama</th><td>' + escapeHtml(d.nama_pelanggan) + '</td><th>Tgl Bayar</th><td>' + escapeHtml(d.tanggal_invoice) + '</td></tr>' +
                    '<tr><th>Alamat</th><td>Dusun ' + escapeHtml(d.dusun) + ' ' + escapeHtml(d.rt_rw) + '</td><th>Metode</th><td>' + escapeHtml(d.metode_bayar) + '</td></tr></table>' +
                    '<table><thead><tr><th>Rincian Tagihan</th><th class="r">Keterangan</th><th class="r">Nominal</th></tr></thead><tbody>' +
                    '<tr><td>Pemakaian Air</td><td class="r">' + d.meter_awal + ' - ' + d.meter_akhir + ' (' + d.total_pemakaian + ' m³)</td><td class="r">' + formatRupiah(d.tagihan_air) + '</td></tr>' +
                    '<tr><td>Biaya Admin / Beban</td><td class="r">-</td><td class="r">' + formatRupiah(d.biaya_admin) + '</td></tr>' +
                    '<tr><td>Denda Keterlambatan</td><td class="r">-</td><td class="r">' + formatRupiah(d.denda) + '</td></tr>' +
                    '<tr><th colspan="2" class="r">TOTAL DIBAYAR</th><th class="r">' + formatRupiah(d.total_bayar) + '</th></tr></tbody></table>' +
                    '<p style="margin-top:24px;font-size:12px;color:#555;">Terima kasih telah melakukan pembayaran tepat waktu. Simpan nota ini sebagai bukti pembayaran yang sah.</p></body></html>'
                );
                win.document.close();
            } else { Swal.fire('Gagal', res.message || 'Data nota tidak ditemukan.', 'error'); }
        },
        err => { Swal.close(); Swal.fire('Error', err.message, 'error'); }
    );
}

function cetakStrukTermal(idTagihan) {
    Swal.fire({ title: 'Menyiapkan Struk...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    panggilServer('getDataStruk', [idTagihan],
        function (rawRes) {
            Swal.close();
            const res = parseGAS(rawRes);
            if (res.status === 'success' && res.data) {
                const d = res.data;
                const win = window.open('', '_blank', 'width=360,height=600');
                win.document.write(
                    '<html><head><title>Struk ' + escapeHtml(d.invoice_no) + '</title><style>body{font-family:monospace;width:58mm;margin:0 auto;padding:8px;font-size:12px;}.center{text-align:center;}.line{border-top:1px dashed #000;margin:6px 0;}table{width:100%;font-size:12px;}td.r{text-align:right;}</style></head><body onload="window.print();">' +
                    '<div class="center"><strong>BUMDES PERCOBAAN</strong><br>Unit Layanan Air Bersih<br>BUKTI PEMBAYARAN</div><div class="line"></div>' +
                    '<div>No: ' + escapeHtml(d.invoice_no) + '</div><div>Tgl: ' + escapeHtml(d.tanggal_invoice) + '</div><div>ID : ' + escapeHtml(d.id_pelanggan) + '</div><div>Nama: ' + escapeHtml(d.nama_pelanggan) + '</div>' +
                    '<div>Wilayah: ' + escapeHtml(d.dusun) + ' ' + escapeHtml(d.rt_rw) + '</div><div>Periode: ' + escapeHtml(d.periode_bulan) + '</div><div>Pakai: ' + d.total_pemakaian + ' m3</div><div class="line"></div>' +
                    '<table><tr><td>Tagihan Air</td><td class="r">' + Number(d.tagihan_air).toLocaleString('id-ID') + '</td></tr><tr><td>Biaya Admin</td><td class="r">' + Number(d.biaya_admin).toLocaleString('id-ID') + '</td></tr>' +
                    '<tr><td>Denda</td><td class="r">' + Number(d.denda).toLocaleString('id-ID') + '</td></tr><tr><td><strong>TOTAL</strong></td><td class="r"><strong>Rp ' + Number(d.total_bayar).toLocaleString('id-ID') + '</strong></td></tr></table>' +
                    '<div class="line"></div><div class="center">Status: LUNAS<br>Terima Kasih</div></body></html>'
                );
                win.document.close();
            } else { Swal.fire('Gagal', res.message, 'error'); }
        },
        function (err) { Swal.close(); Swal.fire('Error', err.message, 'error'); }
    );
}

function downloadExcelTagihan() {
    if (!allTagihanCache || allTagihanCache.length === 0) { Swal.fire('Info', 'Data tagihan masih kosong.', 'info'); return; }
    const rows = allTagihanCache.map(t => {
        const isLunas = String(t.status_bayar || '').trim().toLowerCase() === 'lunas';
        const stRilisLow = String(t.status_rilis || '').trim().toLowerCase();
        const statusTampil = (!isLunas && (stRilisLow === 'draft' || stRilisLow === 'belum rilis')) ? 'Belum Rilis' : t.status_bayar;
        return {
            'ID Tagihan': t.id_tagihan, 'ID Pelanggan': t.id_pelanggan, 'Nama Pelanggan': t.nama_pelanggan, 'Dusun': t.dusun,
            'Periode': t.periode, 'Tagihan Air': Number(t.tagihan_air) || 0, 'Biaya Admin': Number(t.biaya_admin) || 0,
            'Denda': Number(t.denda) || 0, 'Total Bayar': Number(t.total_bayar) || 0, 'Status Bayar': statusTampil,
            'Tanggal Bayar': t.tgl_bayar || '-', 'Metode': t.metode_bayar || '-'
        };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Tagihan');
    XLSX.writeFile(wb, 'Data_Tagihan_PDAM_' + getCurrentYYYYMMDD() + '.xlsx');
}

// =========================================================================
// 5. LAPORAN KEUANGAN & OPERASIONAL
// =========================================================================
function loadLaporanKeuangan() {
    const periodeInput = document.getElementById('filterLaporanPeriode');
    if (!periodeInput.value) periodeInput.value = getCurrentYYYYMM();
    const periode = periodeInput.value;
    const wilayah = document.getElementById('filterLaporanWilayah').value || 'semua';
    const rentang = Number(document.getElementById('filterLaporanRentangGrafik').value) || 6;
    const btnMuat = document.getElementById('btnMuatLaporan');
    if (btnMuat) { btnMuat.disabled = true; btnMuat.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Memuat...'; }

    document.getElementById('tabelKategoriPengeluaran').innerHTML = '<tr><td colspan="3" class="text-center text-muted small py-2"><i class="fas fa-spinner fa-spin me-1"></i>Memuat...</td></tr>';
    document.getElementById('tabelTopDelinquents').innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin me-1"></i>Memuat...</td></tr>';
    document.getElementById('tabelBukuKasUmum').innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin me-1"></i>Memuat...</td></tr>';

    panggilServer('getLaporanKeuangan', [periode, wilayah, rentang],
        function (rawRes) {
            if (btnMuat) { btnMuat.disabled = false; btnMuat.innerHTML = '<i class="fas fa-sync me-1"></i> Muat Laporan'; }
            const res = parseGAS(rawRes);
            if (res.status !== 'success') {
                const errMsg = escapeHtml(res.message || 'Gagal memuat laporan.');
                document.getElementById('tabelKategoriPengeluaran').innerHTML = '<tr><td colspan="3" class="text-center text-danger small">' + errMsg + '</td></tr>';
                document.getElementById('tabelTopDelinquents').innerHTML = '<tr><td colspan="6" class="text-center text-danger">' + errMsg + '</td></tr>';
                document.getElementById('tabelBukuKasUmum').innerHTML = '<tr><td colspan="7" class="text-center text-danger">' + errMsg + '</td></tr>';
                Swal.fire('Gagal Memuat Laporan', res.message || 'Terjadi kesalahan saat membaca data laporan.', 'error');
                return;
            }

            lastLaporanData = res;
            const selectWil = document.getElementById('filterLaporanWilayah');
            const prevWil = selectWil.value || 'semua';
            let optHtml = '<option value="semua">Semua Wilayah Layanan</option>';
            if (res.wilayahOptions && Array.isArray(res.wilayahOptions.dusun)) {
                res.wilayahOptions.dusun.forEach(d => { optHtml += '<option value="' + escapeHtml(d) + '">Dusun ' + escapeHtml(d) + '</option>'; });
            }
            if (res.wilayahOptions && Array.isArray(res.wilayahOptions.dusunRt)) {
                res.wilayahOptions.dusunRt.forEach(dr => {
                    const [d, r] = dr.split('|');
                    optHtml += '<option value="' + escapeHtml(dr) + '">Dusun ' + escapeHtml(d) + ' - RT/RW ' + escapeHtml(r) + '</option>';
                });
            }
            selectWil.innerHTML = optHtml; selectWil.value = prevWil;

            const kpi = res.kpi || {};
            document.getElementById('kpiOmzetKotor').textContent = formatRupiah(kpi.totalTagihanTerbit);
            document.getElementById('kpiKasMasuk').textContent = formatRupiah(kpi.totalPenerimaan);
            document.getElementById('kpiTotalTunggakan').textContent = formatRupiah(kpi.totalTunggakan);
            document.getElementById('kpiPengeluaran').textContent = formatRupiah(kpi.totalPengeluaran);
            document.getElementById('kpiLabaBersih').textContent = formatRupiah(kpi.labaBersih);
            const rate = Number(kpi.collectionRate) || 0;
            document.getElementById('kpiCollectionRate').textContent = rate + '% Terbayar';
            document.getElementById('barCollectionRate').style.width = rate + '%';

            const charts = res.charts || {};
            renderChartArusKas(charts.arusKas || []);
            renderChartPemakaianAir(charts.arusKas || []);
            renderChartStatusBayar(charts.donutStatus || { lunas: 0, belumBulanIni: 0, menunggakLama: 0 });

            const rk = res.rekapKas || {};
            document.getElementById('rekapKasTunai').textContent = formatRupiah(rk.kasTunai);
            document.getElementById('rekapKasBank').textContent = formatRupiah(rk.kasBank);
            document.getElementById('rekapTotalSaldo').textContent = formatRupiah(rk.totalSaldo);

            const nrw = res.nrw || {};
            document.getElementById('nrwProduksi').textContent = (Number(nrw.volumeProduksi) || 0).toLocaleString('id-ID') + ' m³';
            document.getElementById('nrwTerjual').textContent = (Number(nrw.volumeTerjual) || 0).toLocaleString('id-ID') + ' m³';
            document.getElementById('nrwSelisih').textContent = (Number(nrw.selisihNRW) || 0).toLocaleString('id-ID') + ' m³ (' + (nrw.persenNRW || 0) + '%)';

            const badgeNrw = document.getElementById('badgeStatusNRW');
            if (Number(nrw.volumeProduksi) > 0) {
                const pNrw = Number(nrw.persenNRW) || 0;
                badgeNrw.textContent = pNrw <= 20 ? 'Normal (<=20%)' : 'Tinggi (>20%)';
                badgeNrw.className = pNrw <= 20 ? 'badge bg-success' : 'badge bg-danger';
                document.getElementById('nrwKeterangan').textContent = 'Meter Induk: ' + nrw.meterAwal + ' → ' + nrw.meterAkhir + ' m³. ' + (nrw.catatan ? 'Catatan: ' + nrw.catatan : '');
            } else {
                badgeNrw.textContent = 'Belum Diinput'; badgeNrw.className = 'badge bg-secondary';
                document.getElementById('nrwKeterangan').innerHTML = 'Klik tombol <strong>Input Meter Induk</strong> di atas untuk membandingkan produksi air sumber vs meteran pelanggan.';
            }

            const katMap = res.pengeluaranKategori || {};
            const totalOut = Number(kpi.totalPengeluaran) || 0;
            const katEntries = Object.entries(katMap);
            document.getElementById('tabelKategoriPengeluaran').innerHTML = katEntries.length > 0
                ? katEntries.map(([kat, nom]) => {
                    const val = Number(nom) || 0;
                    const porsi = totalOut > 0 ? Math.round((val / totalOut) * 100) : 0;
                    return '<tr class="small"><td>' + escapeHtml(kat) + '</td><td class="text-end fw-bold">' + formatRupiah(val) + '</td><td class="text-end text-muted">' + porsi + '%</td></tr>';
                }).join('')
                : '<tr><td colspan="3" class="text-center text-muted small">Belum ada pengeluaran bulan ini.</td></tr>';

            const listOut = res.transaksiPengeluaran || [];
            const canDeleteOut = userHasPerm('hapus_data');
            document.getElementById('tabelDetailPengeluaran').innerHTML = listOut.length === 0
                ? '<tr><td class="text-center text-muted small py-2">Belum ada catatan pengeluaran bulan ini.</td></tr>'
                : listOut.map(item => (
                    '<tr class="small"><td><div class="fw-bold text-dark">' + escapeHtml(item.uraian) + '</div><span class="text-muted">' + escapeHtml(item.tanggal) + ' • ' + escapeHtml(item.kategori) + ' (' + escapeHtml(item.sumber_kas) + ')</span></td>' +
                    '<td class="text-end fw-bold text-danger">' + formatRupiah(item.nominal) + '</td>' +
                    '<td class="text-end" width="36">' + (canDeleteOut ? '<button class="btn btn-xs btn-outline-danger py-0 px-1" onclick="hapusItemPengeluaran(\'' + escapeHtml(item.id_pengeluaran) + '\')" title="Hapus"><i class="fas fa-trash"></i></button>' : '') + '</td></tr>'
                )).join('');

            const topDel = res.topDelinquents || [];
            document.getElementById('tabelTopDelinquents').innerHTML = topDel.length === 0
                ? '<tr><td colspan="6" class="text-center text-success py-3"><i class="fas fa-check-circle me-1"></i>Tidak ada pelanggan menunggak pada filter ini.</td></tr>'
                : topDel.map((d, idx) => {
                    const hpClean = String(d.no_hp || '').replace(/[^0-9]/g, '');
                    const waNum = hpClean.startsWith('0') ? '62' + hpClean.slice(1) : hpClean;
                    const pesanWa = encodeURIComponent('Yth. Bapak/Ibu ' + d.nama_pelanggan + ' (' + d.id_pelanggan + '), tagihan air PDAM BUMDes PERCOBAAN Anda menunggak ' + d.jumlah_bulan + ' bulan sebesar ' + formatRupiah(d.total_tunggakan) + '. Mohon segera melakukan pembayaran.melalui transfer ke rek. bank & konfirmasi melalui aplikasi atau WA di nomer ini. Terima kasih.');
                    const waBtn = waNum ? '<a href="https://wa.me/' + waNum + '?text=' + pesanWa + '" target="_blank" class="btn btn-xs btn-success py-1 px-2"><i class="fab fa-whatsapp me-1"></i>Tagih WA</a>' : '<span class="text-muted small">No HP Kosong</span>';
                    return '<tr><td class="fw-bold">' + (idx + 1) + '</td><td><div class="fw-bold text-dark">' + escapeHtml(d.nama_pelanggan) + '</div><small class="text-muted">' + escapeHtml(d.id_pelanggan) + '</small></td>' +
                        '<td class="small">' + escapeHtml(d.dusun) + (d.rt_rw && d.rt_rw !== '-' ? ' RT/RW ' + escapeHtml(d.rt_rw) : '') + '</td>' +
                        '<td><span class="badge bg-warning-subtle text-warning-emphasis border">' + d.jumlah_bulan + ' Bulan</span></td>' +
                        '<td class="fw-bold text-danger">' + formatRupiah(d.total_tunggakan) + '</td><td class="text-end">' + waBtn + '</td></tr>';
                }).join('');

            const bku = res.bku || { saldoAwal: 0, rows: [], totalDebit: 0, totalKredit: 0, saldoAkhir: 0 };
            document.getElementById('badgePeriodeBKU').textContent = 'Periode ' + (res.periode || periode);
            let bkuHtml = '<tr class="table-secondary fw-bold"><td colspan="4">Saldo Awal Periode ' + escapeHtml(res.periode || periode) + '</td><td class="text-end">-</td><td class="text-end">-</td><td class="text-end">' + formatRupiah(bku.saldoAwal) + '</td></tr>';
            if (!bku.rows || bku.rows.length === 0) {
                bkuHtml += '<tr><td colspan="7" class="text-center text-muted py-3">Belum ada mutasi transaksi kas pada periode ini.</td></tr>';
            } else {
                bkuHtml += bku.rows.map(r => (
                    '<tr><td class="text-nowrap">' + escapeHtml(r.tanggal) + '</td><td class="small fw-bold">' + escapeHtml(r.ref) + '</td><td>' + escapeHtml(r.uraian) + '</td><td class="small">' + escapeHtml(r.sumber_kas) + '</td>' +
                    '<td class="text-end text-success fw-bold">' + (r.debit > 0 ? formatRupiah(r.debit) : '-') + '</td>' +
                    '<td class="text-end text-danger fw-bold">' + (r.kredit > 0 ? formatRupiah(r.kredit) : '-') + '</td>' +
                    '<td class="text-end fw-bold">' + formatRupiah(r.saldo) + '</td></tr>'
                )).join('');
            }
            bkuHtml += '<tr class="table-light fw-bold"><td colspan="4" class="text-end">TOTAL MUTASI & SALDO AKHIR</td><td class="text-end text-success">' + formatRupiah(bku.totalDebit) + '</td><td class="text-end text-danger">' + formatRupiah(bku.totalKredit) + '</td><td class="text-end text-primary">' + formatRupiah(bku.saldoAkhir) + '</td></tr>';
            document.getElementById('tabelBukuKasUmum').innerHTML = bkuHtml;

            const lr = res.labaRugi || {};
            document.getElementById('lrPendapatanAir').textContent = formatRupiah(lr.pendapatanAir);
            document.getElementById('lrPendapatanAdmin').textContent = formatRupiah(lr.pendapatanAdmin);
            document.getElementById('lrPendapatanDenda').textContent = formatRupiah(lr.pendapatanDenda);
            document.getElementById('lrTotalPendapatan').textContent = formatRupiah(lr.totalPendapatan);
            const biayaEntries = Object.entries(lr.kategoriBiaya || {});
            document.getElementById('lrListBiaya').innerHTML = biayaEntries.map(([k, v]) => '<tr><td>' + escapeHtml(k) + '</td><td class="text-end">' + formatRupiah(v) + '</td></tr>').join('');
            document.getElementById('lrTotalBiaya').textContent = formatRupiah(lr.totalBiaya);
            document.getElementById('lrSurplusBersih').textContent = formatRupiah(lr.surplusBersih);
        },
        function (err) {
            if (btnMuat) { btnMuat.disabled = false; btnMuat.innerHTML = '<i class="fas fa-sync me-1"></i> Muat Laporan'; }
            const msg = escapeHtml(err.message || 'Gagal terhubung ke server.');
            document.getElementById('tabelKategoriPengeluaran').innerHTML = '<tr><td colspan="3" class="text-center text-danger small">' + msg + '</td></tr>';
            document.getElementById('tabelTopDelinquents').innerHTML = '<tr><td colspan="6" class="text-center text-danger">' + msg + '</td></tr>';
            document.getElementById('tabelBukuKasUmum').innerHTML = '<tr><td colspan="7" class="text-center text-danger">' + msg + '</td></tr>';
            Swal.fire('Error Laporan', err.message, 'error');
        }
    );
}

function renderChartArusKas(arusKasData) {
    const ctx = document.getElementById('chartArusKasCanvas');
    if (!ctx || typeof Chart === 'undefined') return;
    if (chartArusKasInstance) chartArusKasInstance.destroy();
    chartArusKasInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: arusKasData.map(d => d.periode),
            datasets: [
                { label: 'Pemasukan (Rp)', data: arusKasData.map(d => Number(d.pemasukan) || 0), backgroundColor: 'rgba(25, 135, 84, 0.8)', borderRadius: 4 },
                { label: 'Pengeluaran (Rp)', data: arusKasData.map(d => Number(d.pengeluaran) || 0), backgroundColor: 'rgba(220, 53, 69, 0.8)', borderRadius: 4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });
}

function renderChartPemakaianAir(arusKasData) {
    const ctx = document.getElementById('chartPemakaianAirCanvas');
    if (!ctx || typeof Chart === 'undefined') return;
    if (chartPemakaianAirInstance) chartPemakaianAirInstance.destroy();
    chartPemakaianAirInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: arusKasData.map(d => d.periode),
            datasets: [{ label: 'Pemakaian (m³)', data: arusKasData.map(d => Number(d.kubikasi) || 0), borderColor: '#f05a28', backgroundColor: 'rgba(240, 90, 40, 0.12)', fill: true, tension: 0.3 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });
}

function renderChartStatusBayar(donutData) {
    const ctx = document.getElementById('chartStatusBayarCanvas');
    if (!ctx || typeof Chart === 'undefined') return;
    if (chartStatusBayarInstance) chartStatusBayarInstance.destroy();
    chartStatusBayarInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Lunas', 'Belum Bulan Ini', 'Menunggak >1 Bln'],
            datasets: [{ data: [Number(donutData.lunas) || 0, Number(donutData.belumBulanIni) || 0, Number(donutData.menunggakLama) || 0], backgroundColor: ['#198754', '#ffc107', '#dc3545'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

document.getElementById('formTambahPengeluaran').addEventListener('submit', function (e) {
    e.preventDefault();
    const btn = document.getElementById('btnSimpanPengeluaran');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Menyimpan...';
    const payload = {
        tanggal: document.getElementById('out_tanggal').value,
        sumber_kas: document.getElementById('out_sumber_kas').value,
        kategori: document.getElementById('out_kategori').value,
        uraian: document.getElementById('out_uraian').value.trim(),
        nominal: document.getElementById('out_nominal').value
    };
    panggilServer('simpanPengeluaran', [payload, getActorPayload()],
        function (rawRes) {
            btn.disabled = false; btn.innerHTML = 'Simpan Pengeluaran';
            const res = parseGAS(rawRes);
            if (res.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('modalTambahPengeluaran'))?.hide();
                document.getElementById('formTambahPengeluaran').reset();
                document.getElementById('out_tanggal').value = getCurrentYYYYMMDD();
                Swal.fire('Tersimpan', res.message, 'success');
                loadLaporanKeuangan();
            } else { Swal.fire('Gagal', res.message, 'error'); }
        },
        function (err) { btn.disabled = false; btn.innerHTML = 'Simpan Pengeluaran'; Swal.fire('Error', err.message, 'error'); }
    );
});

function hapusItemPengeluaran(idPengeluaran) {
    Swal.fire({ title: 'Hapus Pengeluaran?', text: 'Saldo BKU akan otomatis diperbarui.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal' }).then(result => {
        if (!result.isConfirmed) return;
        panggilServer('hapusPengeluaran', [idPengeluaran, getActorPayload()],
            function (rawRes) {
                const res = parseGAS(rawRes);
                if (res.status === 'success') { Swal.fire('Terhapus', res.message, 'success'); loadLaporanKeuangan(); }
                else { Swal.fire('Gagal', res.message, 'error'); }
            },
            err => Swal.fire('Error', err.message, 'error')
        );
    });
}

document.getElementById('formInputNRW').addEventListener('submit', function (e) {
    e.preventDefault();
    const btn = document.getElementById('btnSimpanNRW');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Menyimpan...';
    const payload = {
        periode: document.getElementById('nrw_periode').value,
        meter_induk_awal: document.getElementById('nrw_awal').value,
        meter_induk_akhir: document.getElementById('nrw_akhir').value,
        catatan: document.getElementById('nrw_catatan').value.trim()
    };
    panggilServer('simpanProduksiAir', [payload],
        function (rawRes) {
            btn.disabled = false; btn.innerHTML = 'Simpan Data Produksi';
            const res = parseGAS(rawRes);
            if (res.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('modalInputNRW'))?.hide();
                Swal.fire('Berhasil', res.message, 'success');
                loadLaporanKeuangan();
            } else { Swal.fire('Gagal', res.message, 'error'); }
        },
        function (err) { btn.disabled = false; btn.innerHTML = 'Simpan Data Produksi'; Swal.fire('Error', err.message, 'error'); }
    );
});

function cetakLaporanPDF() { window.print(); }

function downloadExcelLaporan() {
    if (!lastLaporanData) { Swal.fire('Info', 'Muat data laporan terlebih dahulu sebelum export Excel.', 'info'); return; }
    const wb = XLSX.utils.book_new();
    const kpi = lastLaporanData.kpi || {};
    const sheetRingkasan = XLSX.utils.json_to_sheet([
        { Indikator: 'Periode Laporan', Nilai: lastLaporanData.periode },
        { Indikator: 'Total Tagihan Terbit', Nilai: kpi.totalTagihanTerbit || 0 },
        { Indikator: 'Total Penerimaan Kas', Nilai: kpi.totalPenerimaan || 0 },
        { Indikator: 'Total Tunggakan Piutang', Nilai: kpi.totalTunggakan || 0 },
        { Indikator: 'Total Pengeluaran Operasional', Nilai: kpi.totalPengeluaran || 0 },
        { Indikator: 'Laba / Surplus Bersih', Nilai: kpi.labaBersih || 0 },
        { Indikator: 'Collection Rate (%)', Nilai: kpi.collectionRate || 0 }
    ]);
    XLSX.utils.book_append_sheet(wb, sheetRingkasan, 'Ringkasan KPI');
    const bkuRows = (lastLaporanData.bku && lastLaporanData.bku.rows) ? lastLaporanData.bku.rows : [];
    if (bkuRows.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bkuRows), 'Buku Kas Umum');
    const delRows = lastLaporanData.topDelinquents || [];
    if (delRows.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(delRows), 'Top Penunggak');
    XLSX.writeFile(wb, 'Laporan_Keuangan_PDAM_' + (lastLaporanData.periode || getCurrentYYYYMM()) + '.xlsx');
}

// =========================================================================
// 6. TARIF GOLONGAN, DENDA & SIMULASI
// =========================================================================
function loadDataTarif() {
    panggilServer('getTarifDanDenda', [],
        function (rawRes) {
            const res = parseGAS(rawRes);
            if (res.status !== 'success') return;

            allTarifCache = res.tarif || [];
            populateDropdownGolongan();

            const tbody = document.getElementById('tbodyTarifGolongan');
            const canDelete = userHasPerm('hapus_data');
            if (tbody) {
                tbody.innerHTML = allTarifCache.map(g => (
                    '<tr>' +
                    '<td class="fw-bold text-primary">' + escapeHtml(g.kode_golongan) + '</td>' +
                    '<td class="fw-bold">' + escapeHtml(g.nama_golongan) + '</td>' +
                    '<td class="small">0–' + g.blok1_batas + ' m³: <strong>' + formatRupiah(g.blok1_tarif) + '</strong></td>' +
                    '<td class="small">' + (Number(g.blok1_batas) + 1) + '–' + g.blok2_batas + ' m³: <strong>' + formatRupiah(g.blok2_tarif) + '</strong></td>' +
                    '<td class="small">&gt;' + g.blok2_batas + ' m³: <strong>' + formatRupiah(g.blok3_tarif) + '</strong></td>' +
                    '<td class="fw-bold">' + formatRupiah(g.biaya_admin) + '</td>' +
                    '<td><span class="badge bg-success-subtle text-success border">' + escapeHtml(g.status || 'Aktif') + '</span></td>' +
                    '<td class="text-end">' +
                    '<button class="btn btn-xs btn-outline-warning text-dark me-1" onclick="bukaModalTarif(\'' + escapeHtml(g.id_golongan) + '\')"><i class="fas fa-edit"></i></button>' +
                    (canDelete ? '<button class="btn btn-xs btn-outline-danger" onclick="hapusItemTarif(\'' + escapeHtml(g.id_golongan) + '\', \'' + escapeHtml(g.nama_golongan) + '\')"><i class="fas fa-trash"></i></button>' : '') +
                    '</td>' +
                    '</tr>'
                )).join('');
            }

            if (res.denda) {
                document.getElementById('set_tgl_jt').value = res.denda.tgl_jatuh_tempo || 20;
                document.getElementById('set_aktif_denda').value = res.denda.aktif_otomatis || 'Ya';
                document.getElementById('set_tipe_denda').value = res.denda.tipe_denda || 'Nominal';
                document.getElementById('set_nilai_denda').value = res.denda.nilai_denda || 5000;
            }

            hitungSimulasiTarif();
        },
        err => console.error('Gagal memuat tarif:', err)
    );
}

function populateDropdownGolongan() {
    const list = allTarifCache.length > 0
        ? allTarifCache
        : [{ kode_golongan: 'RT', nama_golongan: 'Rumah Tangga' }];

    const optsHtml = list.map(g =>
        '<option value="' + escapeHtml(g.kode_golongan) + '">' + escapeHtml(g.nama_golongan) + ' (' + escapeHtml(g.kode_golongan) + ')</option>'
    ).join('');

    document.querySelectorAll('.select-golongan-tarif').forEach(sel => {
        const cur = sel.value;
        sel.innerHTML = optsHtml;
        if (cur) sel.value = cur;
    });

    const simSel = document.getElementById('sim_golongan');
    if (simSel) {
        const curSim = simSel.value;
        simSel.innerHTML = optsHtml;
        if (curSim) simSel.value = curSim;
    }
}

function bukaModalTarif(idGolongan = '') {
    document.getElementById('formTarifGolongan').reset();
    document.getElementById('trf_id').value = '';

    if (idGolongan) {
        const g = allTarifCache.find(x => String(x.id_golongan) === String(idGolongan));
        if (g) {
            document.getElementById('trf_id').value = g.id_golongan;
            document.getElementById('trf_kode').value = g.kode_golongan;
            document.getElementById('trf_nama').value = g.nama_golongan;
            document.getElementById('trf_b1_batas').value = g.blok1_batas;
            document.getElementById('trf_b1_tarif').value = g.blok1_tarif;
            document.getElementById('trf_b2_batas').value = g.blok2_batas;
            document.getElementById('trf_b2_tarif').value = g.blok2_tarif;
            document.getElementById('trf_b3_tarif').value = g.blok3_tarif;
            document.getElementById('trf_admin').value = g.biaya_admin;
        }
    }
    new bootstrap.Modal(document.getElementById('modalTarifGolongan')).show();
}

document.getElementById('formTarifGolongan').addEventListener('submit', function (e) {
    e.preventDefault();
    const btn = document.getElementById('btnSimpanTarif');
    btn.disabled = true;

    const payload = {
        id_golongan: document.getElementById('trf_id').value,
        kode_golongan: document.getElementById('trf_kode').value.trim().toUpperCase(),
        nama_golongan: document.getElementById('trf_nama').value.trim(),
        blok1_batas: document.getElementById('trf_b1_batas').value,
        blok1_tarif: document.getElementById('trf_b1_tarif').value,
        blok2_batas: document.getElementById('trf_b2_batas').value,
        blok2_tarif: document.getElementById('trf_b2_tarif').value,
        blok3_tarif: document.getElementById('trf_b3_tarif').value,
        biaya_admin: document.getElementById('trf_admin').value,
        status: 'Aktif'
    };

    panggilServer('simpanTarifGolongan', [payload, getActorPayload()],
        function (rawRes) {
            btn.disabled = false;
            const res = parseGAS(rawRes);
            if (res.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('modalTarifGolongan'))?.hide();
                Swal.fire('Berhasil', res.message, 'success');
                loadDataTarif();
            } else { Swal.fire('Gagal', res.message, 'error'); }
        },
        function (err) { btn.disabled = false; Swal.fire('Error', err.message, 'error'); }
    );
});

function hapusItemTarif(idGolongan, namaGol) {
    Swal.fire({ title: 'Hapus Golongan ' + namaGol + '?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Hapus', cancelButtonText: 'Batal' }).then(r => {
        if (!r.isConfirmed) return;
        panggilServer('hapusTarifGolongan', [idGolongan, getActorPayload()],
            function (rawRes) {
                const res = parseGAS(rawRes);
                if (res.status === 'success') { Swal.fire('Terhapus', res.message, 'success'); loadDataTarif(); }
                else { Swal.fire('Gagal', res.message, 'error'); }
            },
            err => Swal.fire('Error', err.message, 'error')
        );
    });
}

document.getElementById('formPengaturanDenda').addEventListener('submit', function (e) {
    e.preventDefault();
    const payload = {
        tgl_jatuh_tempo: document.getElementById('set_tgl_jt').value,
        aktif_otomatis: document.getElementById('set_aktif_denda').value,
        tipe_denda: document.getElementById('set_tipe_denda').value,
        nilai_denda: document.getElementById('set_nilai_denda').value
    };
    panggilServer('simpanAturanDenda', [payload, getActorPayload()],
        function (rawRes) {
            const res = parseGAS(rawRes);
            if (res.status === 'success') Swal.fire('Tersimpan', res.message, 'success');
            else Swal.fire('Gagal', res.message, 'error');
        },
        err => Swal.fire('Error', err.message, 'error')
    );
});

function eksekusiDendaMassal() {
    Swal.fire({ title: 'Terapkan Denda Bulan Ini?', text: 'Denda akan ditambahkan ke tagihan bulan berjalan yang belum lunas.', icon: 'question', showCancelButton: true, confirmButtonText: 'Ya, Terapkan', cancelButtonText: 'Batal' }).then(r => {
        if (!r.isConfirmed) return;
        panggilServer('terapkanDendaOtomatis', [getCurrentYYYYMM(), getActorPayload()],
            function (rawRes) {
                const res = parseGAS(rawRes);
                if (res.status === 'success') Swal.fire('Berhasil', res.message, 'success');
                else Swal.fire('Gagal', res.message, 'error');
            },
            err => Swal.fire('Error', err.message, 'error')
        );
    });
}

function hitungSimulasiTarif() {
    const kode = document.getElementById('sim_golongan').value || 'RT';
    const m3 = Math.max(0, Number(document.getElementById('sim_kubik').value) || 0);
    const gol = allTarifCache.find(g => String(g.kode_golongan).toUpperCase() === kode.toUpperCase()) || {
        blok1_batas: 10, blok1_tarif: 2000, blok2_batas: 20, blok2_tarif: 2500, blok3_tarif: 3500, biaya_admin: 3000
    };
    const b1 = Number(gol.blok1_batas) || 10, b2 = Number(gol.blok2_batas) || 20;
    const t1 = Number(gol.blok1_tarif) || 0, t2 = Number(gol.blok2_tarif) || 0, t3 = Number(gol.blok3_tarif) || 0;
    const admin = Number(gol.biaya_admin) || 0;
    let air = 0;
    if (m3 <= b1) air = m3 * t1;
    else if (m3 <= b2) air = (b1 * t1) + ((m3 - b1) * t2);
    else air = (b1 * t1) + ((b2 - b1) * t2) + ((m3 - b2) * t3);
    document.getElementById('sim_hasil_air').textContent = formatRupiah(air);
    document.getElementById('sim_hasil_admin').textContent = formatRupiah(admin);
    document.getElementById('sim_hasil_total').textContent = formatRupiah(air + admin);
}

// =========================================================================
// 7. MUTASI SAMBUNGAN & SPK TEKNIK + BUKTI FOTO + CETAK PDF
// =========================================================================
function loadDataSPKTeknik() {
    const tbody = document.getElementById('tbodySPKTeknik');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin me-2"></i>Memuat daftar SPK teknik...</td></tr>';

    panggilServer('getDataSPKTeknik', [],
        function (rawRes) {
            const res = parseGAS(rawRes);
            if (res.status !== 'success') {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">' + escapeHtml(res.message || 'Gagal memuat SPK.') + '</td></tr>';
                return;
            }

            const spkList = res.spk || [];
            const plgList = res.pelanggan || [];
            const ptgList = res.petugasList || [];
            allSpkCache = spkList;
            spkCacheMap = {};
            spkList.forEach(s => { spkCacheMap[s.id_spk] = s; });

            const selPlg = document.getElementById('spk_id_pelanggan');
            if (selPlg) {
                selPlg.innerHTML = plgList.length > 0
                    ? plgList.map(p => '<option value="' + escapeHtml(p.id_pelanggan) + '">' + escapeHtml(p.id_pelanggan) + ' - ' + escapeHtml(p.nama_pelanggan) + ' (' + escapeHtml(p.dusun || '-') + ')</option>').join('')
                    : '<option value="">-- Tidak ada data pelanggan --</option>';
            }

            const selPtg = document.getElementById('spk_id_petugas');
            if (selPtg) {
                selPtg.innerHTML = ptgList.length > 0
                    ? ptgList.map(u => '<option value="' + escapeHtml(u.id_user) + '" data-nama="' + escapeHtml(u.nama_lengkap) + '">' + escapeHtml(u.nama_lengkap) + ' (' + escapeHtml(u.area_tugas || 'Semua Area') + ')</option>').join('')
                    : '<option value="PTG-UMUM" data-nama="Petugas Lapangan">Petugas Lapangan</option>';
            }

            filterDataSPKTeknik();
        },
        function (err) {
            const infoEl = document.getElementById('infoJumlahSPK');
            if (infoEl) infoEl.textContent = 'Gagal memuat data Mutasi & SPK Teknik';
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Gagal memuat SPK: ' + escapeHtml(err.message) + '</td></tr>';
        }
    );
}

function renderTabelSPKTeknik(list) {
    const tbody = document.getElementById('tbodySPKTeknik');
    const infoEl = document.getElementById('infoJumlahSPK');
    if (infoEl) {
        infoEl.textContent = list.length === allSpkCache.length
            ? ('Menampilkan ' + list.length + ' data Mutasi & SPK Teknik')
            : ('Menampilkan ' + list.length + ' dari ' + allSpkCache.length + ' data Mutasi & SPK Teknik');
    }

    if (!list || list.length === 0) {
        if (allSpkCache.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3">Belum ada SPK / Berita Acara mutasi teknik.</td></tr>';
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">' +
                '<div class="mb-2">Tidak ada data Mutasi & SPK Teknik yang cocok dengan pencarian Anda.</div>' +
                '<button type="button" class="btn btn-sm btn-outline-secondary" onclick="resetSearchSPKTeknik()"><i class="fas fa-undo me-1"></i> Reset Pencarian</button>' +
                '</td></tr>';
        }
        return;
    }

    tbody.innerHTML = list.map(s => {
        const isSelesai = String(s.status_spk || '').toLowerCase() === 'selesai';
        const badgeStatus = isSelesai
            ? '<span class="badge bg-success-subtle text-success border">Selesai</span><div class="small text-muted" style="font-size:0.7rem;">' + escapeHtml(s.waktu_selesai || '') + '</div>'
            : '<span class="badge bg-warning-subtle text-warning-emphasis border">' + escapeHtml(s.status_spk || 'Menunggu Eksekusi') + '</span>';

        const detailStand = (Number(s.meter_lama_akhir) > 0 || Number(s.meter_baru_awal) > 0)
            ? '<span class="small">Lama: <strong>' + s.meter_lama_akhir + '</strong> → Baru: <strong>' + s.meter_baru_awal + '</strong></span>'
            : '<span class="text-muted small">-</span>';

        const buktiHtml = s.foto_bukti
            ? '<button class="btn btn-xs btn-outline-info py-1 px-2" onclick="lihatFotoBuktiSPK(\'' + escapeHtml(s.id_spk) + '\')"><i class="fas fa-image me-1"></i>Lihat Foto</button>'
            : '<span class="text-muted small">-</span>';

        const btnCetak = '<button class="btn btn-xs btn-outline-danger py-1 px-2 me-1" onclick="cetakSuratSPK(\'' + escapeHtml(s.id_spk) + '\')" title="Cetak / Simpan PDF Surat SPK"><i class="fas fa-file-pdf me-1"></i>Surat PDF</button>';

        const aksiBtn = isSelesai
            ? (btnCetak + '<span class="text-success small fw-bold"><i class="fas fa-check"></i></span>')
            : (btnCetak + '<button class="btn btn-xs btn-success fw-bold py-1 px-2" onclick="selesaikanSPKAdmin(\'' + escapeHtml(s.id_spk) + '\')"><i class="fas fa-check me-1"></i>Selesaikan</button>');

        return '<tr>' +
            '<td><div class="fw-bold text-primary small">' + escapeHtml(s.id_spk) + '</div><small class="text-muted">' + escapeHtml(s.tanggal) + '</small></td>' +
            '<td><span class="badge bg-dark-subtle text-dark border">' + escapeHtml(s.jenis_mutasi) + '</span></td>' +
            '<td><div class="fw-bold text-dark">' + escapeHtml(s.nama_pelanggan) + '</div><small class="text-muted">' + escapeHtml(s.id_pelanggan) + ' • ' + escapeHtml(s.dusun || '-') + '</small></td>' +
            '<td>' + detailStand + '</td>' +
            '<td><div class="small fw-bold">' + escapeHtml(s.petugas_teknik || '-') + '</div><small class="text-muted">' + formatRupiah(s.biaya_teknik) + ' (' + escapeHtml(s.status_biaya || '-') + ')</small></td>' +
            '<td>' + buktiHtml + '</td>' +
            '<td>' + badgeStatus + '</td>' +
            '<td class="text-end text-nowrap">' + aksiBtn + '</td>' +
            '</tr>';
    }).join('');
}

function filterDataSPKTeknik() {
    const inputEl = document.getElementById('searchAdminSPK');
    const jenisEl = document.getElementById('filterJenisSPK');
    const statusEl = document.getElementById('filterStatusSPK');
    const btnClear = document.getElementById('btnClearSearchSPK');

    const kw = (inputEl ? inputEl.value : '').trim().toLowerCase();
    const jenisFilter = (jenisEl ? jenisEl.value : 'semua').trim().toLowerCase();
    const statusFilter = (statusEl ? statusEl.value : 'semua').trim().toLowerCase();

    if (btnClear) {
        btnClear.classList.toggle('d-none', kw.length === 0 && jenisFilter === 'semua' && statusFilter === 'semua');
    }

    const tokens = kw ? kw.split(/\s+/).filter(Boolean) : [];
    const filtered = allSpkCache.filter(s => {
        const jenisLow = String(s.jenis_mutasi || '').trim().toLowerCase();
        const statusLow = String(s.status_spk || '').trim().toLowerCase();

        if (jenisFilter && jenisFilter !== 'semua') {
            if (jenisFilter === 'segel') {
                if (!jenisLow.includes('segel') || jenisLow.includes('buka')) return false;
            } else if (!jenisLow.includes(jenisFilter)) {
                return false;
            }
        }

        if (statusFilter && statusFilter !== 'semua') {
            if (statusLow !== statusFilter) return false;
        }

        if (tokens.length === 0) return true;

        const haystack = [
            s.id_spk,
            s.tanggal,
            s.jenis_mutasi,
            s.id_pelanggan,
            s.nama_pelanggan,
            s.dusun,
            s.petugas_teknik,
            s.status_spk,
            s.keterangan,
            s.catatan_petugas,
            s.status_biaya
        ].map(v => String(v || '').toLowerCase()).join(' ');

        return tokens.every(t => haystack.includes(t));
    });

    renderTabelSPKTeknik(filtered);
}

function resetSearchSPKTeknik() {
    const inputEl = document.getElementById('searchAdminSPK');
    const jenisEl = document.getElementById('filterJenisSPK');
    const statusEl = document.getElementById('filterStatusSPK');
    if (inputEl) inputEl.value = '';
    if (jenisEl) jenisEl.value = 'semua';
    if (statusEl) statusEl.value = 'semua';
    filterDataSPKTeknik();
}

function lihatFotoBuktiSPK(idSpk) {
    const s = spkCacheMap[idSpk];
    const tampilkan = function (data) {
        if (!data || !data.foto_bukti) {
            Swal.fire('Info', 'Belum ada bukti foto yang diunggah untuk SPK ini.', 'info');
            return;
        }
        const imgSrc = String(data.foto_bukti).indexOf('data:image') === 0
            ? data.foto_bukti
            : convertDriveUrlToImgSrc(data.foto_bukti);
        Swal.fire({
            title: 'Bukti Foto SPK ' + escapeHtml(data.id_spk),
            html: '<div class="text-start small text-muted mb-2"><strong>Pelanggan:</strong> ' + escapeHtml(data.nama_pelanggan) + ' (' + escapeHtml(data.jenis_mutasi) + ')<br><strong>Petugas:</strong> ' + escapeHtml(data.petugas_teknik || '-') + '</div>' +
                '<img src="' + imgSrc + '" class="img-fluid rounded border shadow-sm" style="max-height:420px;object-fit:contain;" alt="Bukti Foto SPK">',
            width: 600,
            confirmButtonText: 'Tutup'
        });
    };
    if (s && s.foto_bukti) { tampilkan(s); return; }
    panggilServer('getDetailSPKTeknik', [idSpk], rawRes => {
        const res = parseGAS(rawRes);
        if (res.status === 'success' && res.data) tampilkan(res.data);
        else Swal.fire('Info', 'Bukti foto tidak ditemukan.', 'info');
    });
}

function cetakSuratSPK(idSpk) {
    Swal.fire({ title: 'Menyiapkan Surat SPK...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    panggilServer('getDetailSPKTeknik', [idSpk],
        function (rawRes) {
            Swal.close();
            const res = parseGAS(rawRes);
            if (res.status !== 'success' || !res.data) { Swal.fire('Gagal', res.message || 'Data SPK tidak ditemukan.', 'error'); return; }
            const s = res.data;
            const isGantiAtauPsb = String(s.jenis_mutasi || '').includes('Ganti Meteran') || String(s.jenis_mutasi || '').includes('Pasang Baru');
            const win = window.open('', '_blank', 'width=850,height=900');
            win.document.write(
                '<!DOCTYPE html><html><head><title>Surat SPK ' + escapeHtml(s.id_spk) + '</title>' +
                '<style>body{font-family:"Times New Roman",serif;color:#111;margin:0;padding:24px;background:#f3f4f6;}.toolbar{max-width:780px;margin:0 auto 14px;background:#fff;padding:10px 16px;border-radius:8px;border:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;font-family:Arial,sans-serif;}.btn{padding:8px 14px;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;}.btn-pdf{background:#f05a28;color:#fff;}.btn-close{background:#e5e7eb;color:#111;margin-left:6px;}.sheet{max-width:780px;margin:0 auto;background:#fff;padding:36px 42px;border:1px solid #d1d5db;box-shadow:0 2px 8px rgba(0,0,0,.06);}.kop{text-align:center;border-bottom:3px double #111;padding-bottom:10px;margin-bottom:18px;}.kop h2{margin:0;font-size:18px;letter-spacing:.5px;}.kop p{margin:3px 0 0;font-size:12px;}.title{text-align:center;margin-bottom:18px;}.title h3{margin:0;text-decoration:underline;font-size:15px;}.title span{font-size:12px;}table.info{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px;}table.info th,table.info td{border:1px solid #374151;padding:7px 10px;vertical-align:top;text-align:left;}table.info th{background:#f3f4f6;width:28%;}.box-ket{border:1px solid #374151;padding:10px 12px;min-height:54px;font-size:13px;margin-bottom:18px;}.ttd-grid{display:table;width:100%;margin-top:26px;font-size:13px;text-align:center;}.ttd-col{display:table-cell;width:33.33%;vertical-align:top;}.ttd-space{height:64px;}@media print{body{background:#fff;padding:0;}.toolbar{display:none!important;}.sheet{border:none;box-shadow:none;padding:10px;max-width:100%;}}</style></head><body>' +
                '<div class="toolbar"><span><strong>Pratinjau Cetak / PDF Surat SPK</strong> (' + escapeHtml(s.id_spk) + ')</span><div><button class="btn btn-pdf" onclick="window.print()">Cetak / Simpan sebagai PDF</button><button class="btn btn-close" onclick="window.close()">Tutup</button></div></div>' +
                '<div class="sheet"><div class="kop"><h2>BUMDES PERCOBAAN</h2><p>UNIT PENGELOLAAN AIR BERSIH (PDAM DESA PERCOBAAN)</p><p>Desa Percobaan, Kecamatan Palang, Kabupaten Tuban</p></div>' +
                '<div class="title"><h3>SURAT PERINTAH KERJA (SPK) & BERITA ACARA TEKNIK</h3><span>Nomor: ' + escapeHtml(s.id_spk) + ' &nbsp;|&nbsp; Tanggal Terbit: ' + escapeHtml(s.tanggal) + '</span></div>' +
                '<p style="font-size:13px;margin-bottom:10px;">Dengan ini menugaskan kepada Petugas Lapangan untuk melaksanakan pekerjaan teknik / mutasi sambungan air dengan rincian sebagai berikut:</p>' +
                '<table class="info"><tr><th>Jenis Pekerjaan / Mutasi</th><td><strong>' + escapeHtml(s.jenis_mutasi) + '</strong></td></tr>' +
                '<tr><th>Status SPK</th><td>' + escapeHtml(s.status_spk || 'Menunggu Eksekusi') + (s.waktu_selesai ? ' (Selesai: ' + escapeHtml(s.waktu_selesai) + ')' : '') + '</td></tr>' +
                '<tr><th>Petugas Pelaksana</th><td>' + escapeHtml(s.petugas_teknik || '-') + ' (ID: ' + escapeHtml(s.id_petugas || '-') + ')</td></tr>' +
                '<tr><th>Biaya Teknik / PSB</th><td>' + formatRupiah(s.biaya_teknik) + ' (' + escapeHtml(s.status_biaya || '-') + ')</td></tr></table>' +
                '<table class="info"><tr><th>ID Pelanggan</th><td>' + escapeHtml(s.id_pelanggan) + ' (Golongan: ' + escapeHtml(s.golongan) + ')</td></tr>' +
                '<tr><th>Nama Pelanggan</th><td><strong>' + escapeHtml(s.nama_pelanggan) + '</strong></td></tr>' +
                '<tr><th>NIK / No. HP</th><td>' + escapeHtml(s.nik) + ' / ' + escapeHtml(s.no_hp) + '</td></tr>' +
                '<tr><th>Alamat Pemasangan</th><td>Dusun ' + escapeHtml(s.dusun) + ', RT/RW ' + escapeHtml(s.rt_rw) + ', Desa ' + escapeHtml(s.desa) + '</td></tr>' +
                (isGantiAtauPsb ? '<tr><th>Stand Meter</th><td>Stand Akhir Meter Lama: <strong>' + (Number(s.meter_lama_akhir) || 0) + ' m³</strong> &nbsp;|&nbsp; Stand Awal Meter Baru: <strong>' + (Number(s.meter_baru_awal) || 0) + ' m³</strong></td></tr>' : '') + '</table>' +
                '<div style="font-size:13px;font-weight:bold;margin-bottom:4px;">Perintah Kerja / Catatan Lapangan:</div><div class="box-ket">' + escapeHtml(s.keterangan || '-') + '</div>' +
                '<p style="font-size:12px;line-height:1.5;">Demikian Surat Perintah Kerja & Berita Acara ini dibuat untuk dilaksanakan dengan penuh tanggung jawab dan dipergunakan sebagaimana mestinya.</p>' +
                '<div class="ttd-grid"><div class="ttd-col"><div>Pelanggan / Pemohon,</div><div class="ttd-space"></div><div>( ' + escapeHtml(s.nama_pelanggan) + ' )</div></div>' +
                '<div class="ttd-col"><div>Petugas Lapangan,</div><div class="ttd-space"></div><div>( ' + escapeHtml(s.petugas_teknik || '....................') + ' )</div></div>' +
                '<div class="ttd-col"><div>Mengetahui,<br>Pengelola PDAM BUMDes</div><div class="ttd-space"></div><div>( ____________________ )</div></div></div></div></body></html>'
            );
            win.document.close();
        },
        err => { Swal.close(); Swal.fire('Error', err.message, 'error'); }
    );
}

function toggleFormSPKFields() {
    const jenis = document.getElementById('spk_jenis').value;
    const isPsb = jenis.includes('Pasang Baru');
    const isGantiMeter = jenis.includes('Ganti Meteran') || isPsb;
    document.getElementById('blokPelangganLamaSPK').classList.toggle('d-none', isPsb);
    document.getElementById('blokPelangganBaruSPK').classList.toggle('d-none', !isPsb);
    document.getElementById('blokStandMeterSPK').classList.toggle('d-none', !isGantiMeter);
}

document.getElementById('formBuatSPK').addEventListener('submit', function (e) {
    e.preventDefault();
    const btn = document.getElementById('btnSimpanSPK');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Menerbitkan...';
    const jenis = document.getElementById('spk_jenis').value;
    const isPsb = jenis.includes('Pasang Baru');
    const selPtg = document.getElementById('spk_id_petugas');
    const namaPtg = selPtg.options[selPtg.selectedIndex] ? (selPtg.options[selPtg.selectedIndex].getAttribute('data-nama') || selPtg.options[selPtg.selectedIndex].text) : '-';

    const payload = {
        tanggal: getCurrentYYYYMMDD(),
        jenis_mutasi: jenis,
        id_pelanggan: isPsb ? '' : document.getElementById('spk_id_pelanggan').value,
        nama_pelanggan_baru: isPsb ? document.getElementById('spk_nama_baru').value.trim() : '',
        dusun_baru: isPsb ? document.getElementById('spk_dusun_baru').value.trim() : '',
        meter_lama_akhir: document.getElementById('spk_meter_lama').value,
        meter_baru_awal: document.getElementById('spk_meter_baru').value,
        id_petugas: selPtg.value,
        petugas_teknik: namaPtg,
        biaya_teknik: document.getElementById('spk_biaya').value,
        status_biaya: document.getElementById('spk_status_biaya').value,
        keterangan: document.getElementById('spk_keterangan').value.trim()
    };

    panggilServer('simpanSPKTeknik', [payload, getActorPayload()],
        function (rawRes) {
            btn.disabled = false; btn.innerHTML = 'Terbitkan & Kirim ke Petugas';
            const res = parseGAS(rawRes);
            if (res.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('modalBuatSPK'))?.hide();
                document.getElementById('formBuatSPK').reset();
                Swal.fire('SPK Terbit', res.message, 'success');
                loadDataSPKTeknik();
            } else { Swal.fire('Gagal', res.message, 'error'); }
        },
        function (err) { btn.disabled = false; btn.innerHTML = 'Terbitkan & Kirim ke Petugas'; Swal.fire('Error', err.message, 'error'); }
    );
});

function selesaikanSPKAdmin(idSpk) {
    Swal.fire({ title: 'Selesaikan SPK Teknik?', text: 'Status sambungan pelanggan & stand meter akan otomatis disinkronkan.', icon: 'question', showCancelButton: true, confirmButtonText: 'Ya, Selesaikan', cancelButtonText: 'Batal' }).then(r => {
        if (!r.isConfirmed) return;
        panggilServer('selesaikanSPKTeknik', [idSpk, getActorPayload(), null],
            function (rawRes) {
                const res = parseGAS(rawRes);
                if (res.status === 'success') { Swal.fire('Selesai', res.message, 'success'); loadDataSPKTeknik(); }
                else { Swal.fire('Gagal', res.message, 'error'); }
            },
            err => Swal.fire('Error', err.message, 'error')
        );
    });
}

// =========================================================================
// 8. MANAJEMEN AKUN & BATASAN HAK AKSES
// =========================================================================
function formatBadgesHakAkses(role, hakAksesStr) {
    const rLow = String(role || '').toLowerCase();
    if (rLow === 'petugas') return '<span class="badge bg-info-subtle text-info-emphasis border">Petugas Catat Meter</span>';
    const raw = String(hakAksesStr || '').trim();
    if (!raw || raw === 'FULL_ACCESS') return '<span class="badge bg-primary">Full Akses Sistem</span>';
    return raw.split(',').map(s => s.trim()).filter(Boolean)
        .map(k => '<span class="badge bg-warning-subtle text-warning-emphasis border me-1 mb-1">' + escapeHtml(PERMISSION_LABELS[k] || k) + '</span>').join('');
}

function isiDatalistPelangganReset(daftarPelanggan) {
    const datalist = document.getElementById('listPelangganResetPass');
    if (!datalist || !Array.isArray(daftarPelanggan)) return;

    window._cachePelangganReset = daftarPelanggan;
    datalist.innerHTML = daftarPelanggan.map(p => {
        const id = p.id_pelanggan || '';
        const nama = p.nama_pelanggan || '-';
        const dusun = p.dusun ? ` • ${p.dusun}` : '';
        return `<option value="${escapeHtml(id)} - ${escapeHtml(nama)}${escapeHtml(dusun)}"></option>`;
    }).join('');
}

function syncIdPelangganResetPass(val) {
    const hiddenEl = document.getElementById('resetPassIdPelanggan');
    if (!hiddenEl) return;

    const str = String(val || '').trim();
    const idMatch = str.split(' - ')[0].trim();
    hiddenEl.value = idMatch;
}

function loadDataManajemenUser() {
    const tbody = document.getElementById('tbodyDaftarUser');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin me-2"></i>Memuat daftar akun...</td></tr>';

    panggilServer('getDataManajemenUser', [],
        function (rawRes) {
            const res = parseGAS(rawRes);
            if (res.status !== 'success') {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">' + escapeHtml(res.message) + '</td></tr>';
                return;
            }

            allUsersCache = res.users || [];
            const plgList = res.pelanggan || [];
            isiDatalistPelangganReset(plgList);

            if (allUsersCache.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Belum ada akun sistem terdaftar.</td></tr>';
                return;
            }

            tbody.innerHTML = allUsersCache.map(u => {
                const isAktif = String(u.status_aktif || 'Aktif').toLowerCase() === 'aktif';
                const badgeStatus = isAktif ? '<span class="badge bg-success-subtle text-success border">Aktif</span>' : '<span class="badge bg-danger-subtle text-danger border">Nonaktif</span>';
                return '<tr>' +
                    '<td><div class="fw-bold text-dark">' + escapeHtml(u.nama_lengkap) + '</div><small class="text-muted">' + escapeHtml(u.id_user) + (u.no_hp && u.no_hp !== '-' ? ' • ' + escapeHtml(u.no_hp) : '') + '</small></td>' +
                    '<td class="fw-bold text-primary">' + escapeHtml(u.username) + '</td>' +
                    '<td><div class="small fw-bold text-uppercase text-muted mb-1">' + escapeHtml(u.role) + '</div><div>' + formatBadgesHakAkses(u.role, u.hak_akses) + '</div></td>' +
                    '<td class="small">' + escapeHtml(u.area_tugas || 'Semua Area') + '</td><td>' + badgeStatus + '</td>' +
                    '<td class="text-end text-nowrap"><button class="btn btn-xs btn-outline-dark me-1" onclick="bukaModalEditAkses(\'' + escapeHtml(u.id_user) + '\')" title="Atur Batasan Hak Akses"><i class="fas fa-user-lock"></i> Akses</button>' +
                    '<button class="btn btn-xs btn-outline-primary" onclick="editAreaAtauStatusUser(\'' + escapeHtml(u.id_user) + '\')" title="Edit Area / Status / Password"><i class="fas fa-edit"></i></button></td></tr>';
            }).join('');
        },
        err => {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Gagal memuat akun: ' + escapeHtml(err.message) + '</td></tr>';
        }
    );
}

function eksekusiResetPassPelanggan() {
    const inputEl = document.getElementById('resetPassPelangganInput');
    const hiddenEl = document.getElementById('resetPassIdPelanggan');
    const passEl = document.getElementById('reset_plg_pass');

    const rawText = (inputEl ? inputEl.value : '').trim();
    const idPelanggan = ((hiddenEl && hiddenEl.value) ? hiddenEl.value : rawText.split(' - ')[0]).trim();
    const passwordBaru = (passEl ? passEl.value : '').trim();

    if (!idPelanggan) {
        Swal.fire('Perhatian', 'Silakan pilih pelanggan terlebih dahulu dari daftar pencarian.', 'warning');
        return;
    }
    if (!passwordBaru) {
        Swal.fire('Perhatian', 'Password baru tidak boleh kosong.', 'warning');
        return;
    }

    Swal.fire({
        title: 'Reset Password Pelanggan?',
        text: 'Password portal untuk ' + idPelanggan + ' akan diubah menjadi "' + passwordBaru + '".',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Reset',
        cancelButtonText: 'Batal'
    }).then(r => {
        if (!r.isConfirmed) return;
        panggilServer('resetPasswordPelanggan', [idPelanggan, passwordBaru, getActorPayload()],
            function (rawRes) {
                const res = parseGAS(rawRes);
                if (res.status === 'success') {
                    Swal.fire('Berhasil', res.message || 'Password pelanggan berhasil direset.', 'success');
                    if (inputEl) inputEl.value = '';
                    if (hiddenEl) hiddenEl.value = '';
                } else {
                    Swal.fire('Gagal', res.message, 'error');
                }
            },
            err => Swal.fire('Error', err.message, 'error')
        );
    });
}

function resetModalTambahUser() {
    document.getElementById('formTambahUser').reset();
    document.getElementById('usr_password').value = '123456';
    document.getElementById('usr_role').value = 'Admin';
    document.getElementById('usr_area').value = 'Semua Area';
    applyPresetAkses('add', 'full');
}

function onRoleTambahUserChange() {
    const role = document.getElementById('usr_role').value;
    if (role === 'Petugas') {
        document.getElementById('perm_full_access').checked = false;
        document.querySelectorAll('.perm-item-add').forEach(cb => { cb.checked = (cb.value === 'catat_meter'); });
    } else { applyPresetAkses('add', 'full'); }
}

function toggleFullAccessCheckbox(mode, isChecked) { document.querySelectorAll('.perm-item-' + mode).forEach(cb => { cb.checked = isChecked; }); }

function syncFullCheckboxState(mode) {
    const items = Array.from(document.querySelectorAll('.perm-item-' + mode));
    const allChecked = items.length > 0 && items.every(cb => cb.checked);
    const fullCb = document.getElementById(mode === 'add' ? 'perm_full_access' : 'perm_edit_full_access');
    if (fullCb) fullCb.checked = allChecked;
}

function applyPresetAkses(mode, preset) {
    const fullCb = document.getElementById(mode === 'add' ? 'perm_full_access' : 'perm_edit_full_access');
    if (preset === 'full') { if (fullCb) fullCb.checked = true; toggleFullAccessCheckbox(mode, true); }
    else if (preset === 'kasir_input') {
        if (fullCb) fullCb.checked = false;
        document.querySelectorAll('.perm-item-' + mode).forEach(cb => { cb.checked = (cb.value === 'input_pelanggan' || cb.value === 'pelunasan_tagihan'); });
    }
}

function getSelectedHakAkses(mode) {
    const fullCb = document.getElementById(mode === 'add' ? 'perm_full_access' : 'perm_edit_full_access');
    if (fullCb && fullCb.checked) return 'FULL_ACCESS';
    const checkedVals = Array.from(document.querySelectorAll('.perm-item-' + mode + ':checked')).map(cb => cb.value);
    return checkedVals.length > 0 ? checkedVals.join(',') : 'input_pelanggan,pelunasan_tagihan';
}

document.getElementById('formTambahUser').addEventListener('submit', function (e) {
    e.preventDefault();
    const btn = document.getElementById('btnSimpanUser');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Menyimpan...';
    const payload = {
        nama_lengkap: document.getElementById('usr_nama').value.trim(),
        username: document.getElementById('usr_username').value.trim(),
        password: document.getElementById('usr_password').value.trim(),
        role: document.getElementById('usr_role').value,
        no_hp: document.getElementById('usr_hp').value.trim() || '-',
        area_tugas: document.getElementById('usr_area').value.trim() || 'Semua Area',
        hak_akses: getSelectedHakAkses('add')
    };
    panggilServer('simpanUserSistem', [payload, getActorPayload()],
        function (rawRes) {
            btn.disabled = false; btn.innerHTML = 'Simpan Akun Baru';
            const res = parseGAS(rawRes);
            if (res.status === 'success') { bootstrap.Modal.getInstance(document.getElementById('modalTambahUser'))?.hide(); Swal.fire('Berhasil', res.message, 'success'); loadDataManajemenUser(); }
            else { Swal.fire('Gagal', res.message, 'error'); }
        },
        function (err) { btn.disabled = false; btn.innerHTML = 'Simpan Akun Baru'; Swal.fire('Error', err.message, 'error'); }
    );
});

function bukaModalEditAkses(idUser) {
    const u = allUsersCache.find(x => String(x.id_user) === String(idUser));
    if (!u) return;
    document.getElementById('edit_akses_id_user').value = u.id_user;
    document.getElementById('edit_akses_nama_user').textContent = u.nama_lengkap + ' (' + u.username + ')';
    const raw = String(u.hak_akses || '').trim();
    const isFull = (!raw && String(u.role || '').toLowerCase() === 'admin') || raw === 'FULL_ACCESS';
    if (isFull) applyPresetAkses('edit', 'full');
    else {
        document.getElementById('perm_edit_full_access').checked = false;
        const list = raw.split(',').map(s => s.trim());
        if (list.includes('kelola_tarif_spk')) {
            ['kelola_tarif', 'kelola_spk', 'kelola_aset', 'kelola_aduan'].forEach(p => {
                if (!list.includes(p)) list.push(p);
            });
        }
        document.querySelectorAll('.perm-item-edit').forEach(cb => { cb.checked = list.includes(cb.value); });
        syncFullCheckboxState('edit');
    }
    new bootstrap.Modal(document.getElementById('modalEditAksesUser')).show();
}

document.getElementById('formEditAksesUser').addEventListener('submit', function (e) {
    e.preventDefault();
    const btn = document.getElementById('btnSimpanEditAkses');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Menyimpan...';
    const payload = { id_user: document.getElementById('edit_akses_id_user').value, hak_akses: getSelectedHakAkses('edit') };
    panggilServer('updateStatusAtauAreaUser', [payload, getActorPayload()],
        function (rawRes) {
            btn.disabled = false; btn.innerHTML = 'Simpan Batasan Akses';
            const res = parseGAS(rawRes);
            if (res.status === 'success') { bootstrap.Modal.getInstance(document.getElementById('modalEditAksesUser'))?.hide(); Swal.fire('Tersimpan', res.message, 'success'); loadDataManajemenUser(); }
            else { Swal.fire('Gagal', res.message, 'error'); }
        },
        function (err) { btn.disabled = false; btn.innerHTML = 'Simpan Batasan Akses'; Swal.fire('Error', err.message, 'error'); }
    );
});

function editAreaAtauStatusUser(idUser) {
    const u = allUsersCache.find(x => String(x.id_user) === String(idUser));
    if (!u) return;
    Swal.fire({
        title: 'Edit Akun: ' + u.nama_lengkap,
        html: '<div class="text-start"><label class="form-label small fw-bold">Area Tugas (Rotasi Dusun)</label><input type="text" id="swal_usr_area" class="form-control mb-2" value="' + escapeHtml(u.area_tugas || 'Semua Area') + '">' +
            '<label class="form-label small fw-bold">Status Akun</label><select id="swal_usr_status" class="form-select mb-2"><option value="Aktif" ' + (String(u.status_aktif || 'Aktif').toLowerCase() === 'aktif' ? 'selected' : '') + '>Aktif</option><option value="Nonaktif" ' + (String(u.status_aktif || '').toLowerCase() === 'nonaktif' ? 'selected' : '') + '>Nonaktif</option></select>' +
            '<label class="form-label small fw-bold">Password Baru (Kosongkan jika tidak diubah)</label><input type="text" id="swal_usr_pass" class="form-control" placeholder="Password baru..."></div>',
        showCancelButton: true, confirmButtonText: 'Simpan', cancelButtonText: 'Batal'
    }).then(r => {
        if (!r.isConfirmed) return;
        const payload = {
            id_user: u.id_user,
            area_tugas: document.getElementById('swal_usr_area').value.trim(),
            status_aktif: document.getElementById('swal_usr_status').value,
            password: document.getElementById('swal_usr_pass').value.trim()
        };
        panggilServer('updateStatusAtauAreaUser', [payload, getActorPayload()],
            function (rawRes) {
                const res = parseGAS(rawRes);
                if (res.status === 'success') { Swal.fire('Berhasil', res.message, 'success'); loadDataManajemenUser(); }
                else { Swal.fire('Gagal', res.message, 'error'); }
            },
            err => Swal.fire('Error', err.message, 'error')
        );
    });
}

// =========================================================================
// 9. STOK MATERIAL & PERAWATAN ASET POMPA
// =========================================================================
function loadDataStokDanAset() {
    panggilServer('getDataStokDanAset', [],
        function (rawRes) {
            const res = parseGAS(rawRes);
            if (res.status !== 'success') return;
            const stokList = res.stok || [], mutasiList = res.mutasi || [], asetList = res.aset || [];
            const selMat = document.getElementById('mut_id_material');
            if (selMat) selMat.innerHTML = stokList.map(m => '<option value="' + escapeHtml(m.id_material) + '">' + escapeHtml(m.kode_barang) + ' - ' + escapeHtml(m.nama_barang) + ' (Sisa: ' + m.stok_tersedia + ' ' + escapeHtml(m.satuan) + ')</option>').join('');

            document.getElementById('tbodyStokMaterial').innerHTML = stokList.length > 0
                ? stokList.map(m => {
                    const sisa = Number(m.stok_tersedia) || 0, min = Number(m.stok_minimum) || 0;
                    const badge = sisa <= min ? '<span class="badge bg-danger-subtle text-danger border">Stok Menipis</span>' : '<span class="badge bg-success-subtle text-success border">Aman</span>';
                    return '<tr><td><div class="fw-bold text-dark">' + escapeHtml(m.nama_barang) + '</div><small class="text-muted">' + escapeHtml(m.kode_barang) + '</small></td>' +
                        '<td class="text-center fw-bold">' + sisa + ' ' + escapeHtml(m.satuan) + '</td><td class="small">' + formatRupiah(m.harga_satuan) + '</td><td>' + badge + '</td></tr>';
                }).join('')
                : '<tr><td colspan="4" class="text-center text-muted py-3">Belum ada master material.</td></tr>';

            document.getElementById('tbodyMutasiStok').innerHTML = mutasiList.length > 0
                ? mutasiList.map(mt => {
                    const isMasuk = String(mt.jenis).toLowerCase() === 'masuk';
                    return '<tr class="small"><td><div class="fw-bold">' + escapeHtml(mt.nama_barang) + '</div><span class="text-muted">' + escapeHtml(mt.tanggal) + ' • ' + escapeHtml(mt.keterangan) + '</span></td>' +
                        '<td class="text-end fw-bold ' + (isMasuk ? 'text-success' : 'text-danger') + '">' + (isMasuk ? '+' : '-') + mt.qty + '</td></tr>';
                }).join('')
                : '<tr><td class="text-center text-muted small py-2">Belum ada mutasi stok.</td></tr>';

            document.getElementById('tbodyPerawatanAset').innerHTML = asetList.length > 0
                ? asetList.map(a => '<tr><td class="small">' + escapeHtml(a.tanggal) + '</td><td class="fw-bold">' + escapeHtml(a.nama_aset) + '</td><td>' + escapeHtml(a.jenis_kegiatan) + '</td><td class="small text-primary fw-bold">' + escapeHtml(a.jadwal_berikutnya || '-') + '</td><td class="fw-bold">' + formatRupiah(a.biaya) + '</td><td class="small"><span class="badge bg-success-subtle text-success border me-1">' + escapeHtml(a.status) + '</span>' + escapeHtml(a.catatan || '') + '</td></tr>').join('')
                : '<tr><td colspan="6" class="text-center text-muted py-3">Belum ada catatan perawatan aset.</td></tr>';
        },
        err => console.error(err)
    );
}

document.getElementById('formMaterialBaru').addEventListener('submit', function (e) {
    e.preventDefault();
    const payload = {
        kode_barang: document.getElementById('mat_kode').value.trim(), nama_barang: document.getElementById('mat_nama').value.trim(),
        satuan: document.getElementById('mat_satuan').value, stok_tersedia: document.getElementById('mat_stok').value,
        stok_minimum: document.getElementById('mat_min').value, harga_satuan: document.getElementById('mat_harga').value
    };
    panggilServer('simpanMaterialBaru', [payload, getActorPayload()],
        rawRes => {
            const res = parseGAS(rawRes);
            if (res.status === 'success') { bootstrap.Modal.getInstance(document.getElementById('modalMaterialBaru'))?.hide(); document.getElementById('formMaterialBaru').reset(); Swal.fire('Berhasil', res.message, 'success'); loadDataStokDanAset(); }
            else Swal.fire('Gagal', res.message, 'error');
        },
        err => Swal.fire('Error', err.message, 'error')
    );
});

document.getElementById('formMutasiStok').addEventListener('submit', function (e) {
    e.preventDefault();
    const payload = { id_material: document.getElementById('mut_id_material').value, jenis: document.getElementById('mut_jenis').value, qty: document.getElementById('mut_qty').value, keterangan: document.getElementById('mut_ket').value.trim() };
    panggilServer('catatMutasiStok', [payload, getActorPayload()],
        rawRes => {
            const res = parseGAS(rawRes);
            if (res.status === 'success') { bootstrap.Modal.getInstance(document.getElementById('modalMutasiStok'))?.hide(); document.getElementById('formMutasiStok').reset(); Swal.fire('Tersimpan', res.message, 'success'); loadDataStokDanAset(); }
            else Swal.fire('Gagal', res.message, 'error');
        },
        err => Swal.fire('Error', err.message, 'error')
    );
});

document.getElementById('formPerawatanAset').addEventListener('submit', function (e) {
    e.preventDefault();
    const payload = {
        tanggal: document.getElementById('ast_tanggal').value, jadwal_berikutnya: document.getElementById('ast_jadwal').value,
        nama_aset: document.getElementById('ast_nama').value, jenis_kegiatan: document.getElementById('ast_kegiatan').value,
        biaya: document.getElementById('ast_biaya').value, catatan: document.getElementById('ast_catatan').value.trim()
    };
    panggilServer('simpanPerawatanAset', [payload, getActorPayload()],
        rawRes => {
            const res = parseGAS(rawRes);
            if (res.status === 'success') { bootstrap.Modal.getInstance(document.getElementById('modalPerawatanAset'))?.hide(); document.getElementById('formPerawatanAset').reset(); document.getElementById('ast_tanggal').value = getCurrentYYYYMMDD(); Swal.fire('Berhasil', res.message, 'success'); loadDataStokDanAset(); }
            else Swal.fire('Gagal', res.message, 'error');
        },
        err => Swal.fire('Error', err.message, 'error')
    );
});

// =========================================================================
// 10. AUDIT TRAIL, PENGADUAN & OPERASIONAL CUTOFF
// =========================================================================
function loadDataAudit() {
    const tbody = document.getElementById('tbodyAuditLog');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Memuat log aktivitas...</td></tr>';
    panggilServer('getAuditLogs', [],
        function (rawRes) {
            const res = parseGAS(rawRes);
            if (res.status !== 'success') {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-3">' + escapeHtml(res.message || 'Gagal memuat log aktivitas.') + '</td></tr>';
                return;
            }
            const logs = res.data || [];
            if (logs.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Belum ada catatan log aktivitas.</td></tr>'; return; }
            tbody.innerHTML = logs.map(l => (
                '<tr><td class="text-nowrap small">' + escapeHtml(l.waktu) + '</td>' +
                '<td class="fw-bold">' + escapeHtml(l.actor_nama) + ' <span class="badge bg-light text-dark border">' + escapeHtml(l.actor_role) + '</span></td>' +
                '<td><span class="badge bg-secondary-subtle text-dark">' + escapeHtml(l.modul) + '</span></td>' +
                '<td class="fw-bold text-primary">' + escapeHtml(l.aksi) + '</td><td class="small">' + escapeHtml(l.detail) + '</td></tr>'
            )).join('');
        },
        err => { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">' + escapeHtml(err.message) + '</td></tr>'; }
    );
}

function loadDataPengaduan() {
    const tbody = document.getElementById('tbodyPengaduanAdmin');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Memuat tiket pengaduan...</td></tr>';
    panggilServer('getPengaduan', [],
        function (rawRes) {
            const res = parseGAS(rawRes);
            const list = (res.status === 'success' && res.data) ? res.data.slice().reverse() : [];
            if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Belum ada laporan pengaduan masuk.</td></tr>'; return; }
            tbody.innerHTML = list.map(a => {
                const st = String(a.status || 'Open');
                const badge = st === 'Resolved' ? '<span class="badge bg-success">Selesai</span>' : (st === 'In Progress' ? '<span class="badge bg-warning text-dark">Diproses</span>' : '<span class="badge bg-danger">Open</span>');
                const fotoHtml = a.foto_kejadian ? '<a href="' + escapeHtml(a.foto_kejadian) + '" target="_blank" class="btn btn-xs btn-outline-primary py-0 px-2"><i class="fas fa-image"></i> Lihat</a>' : '-';
                return '<tr><td><div class="fw-bold small">' + escapeHtml(a.id_tiket) + '</div><small class="text-muted">' + escapeHtml((a.timestamp || '').slice(0, 10)) + '</small></td>' +
                    '<td class="fw-bold">' + escapeHtml(a.id_pelanggan) + '</td><td>' + escapeHtml(a.kategori) + '</td><td class="small">' + escapeHtml(a.deskripsi) + '</td><td>' + fotoHtml + '</td><td>' + badge + '</td>' +
                    '<td class="text-end text-nowrap"><button class="btn btn-xs btn-outline-warning text-dark me-1" onclick="ubahStatusAduan(\'' + escapeHtml(a.id_tiket) + '\', \'In Progress\')">Proses</button>' +
                    '<button class="btn btn-xs btn-outline-success" onclick="ubahStatusAduan(\'' + escapeHtml(a.id_tiket) + '\', \'Resolved\')">Selesai</button></td></tr>';
            }).join('');
        },
        err => { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">' + escapeHtml(err.message) + '</td></tr>'; }
    );
}

function ubahStatusAduan(idTiket, statusBaru) {
    panggilServer('updateStatusPengaduan', [idTiket, statusBaru],
        rawRes => { const res = parseGAS(rawRes); if (res.status === 'success') { Swal.fire('Berhasil', res.message, 'success'); loadDataPengaduan(); } else Swal.fire('Gagal', res.message, 'error'); },
        err => Swal.fire('Error', err.message, 'error')
    );
}

let allValidasiMeterCache = [];
let selectedValidasiIds = new Set();

function setLoadingRefreshValidasi(btnEl, isLoading) {
    if (!btnEl) return;
    btnEl.disabled = isLoading;
    const icon = btnEl.querySelector('i');
    if (icon) {
        icon.className = isLoading ? 'fas fa-spinner fa-spin me-1' : 'fas fa-sync-alt me-1';
    }
}

function loadValidasiMeter(btnEl) {
    const tbody = document.getElementById('tbodyValidasiMeter');
    if (tbody && allValidasiMeterCache.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4"><i class="fas fa-spinner fa-spin me-1"></i> Memuat data catatan meter...</td></tr>';
    }

    setLoadingRefreshValidasi(btnEl, true);

    // Lengkapi cache pelanggan agar pencarian Nama & Dusun tetap jalan meskipun di sheet catat meter hanya ada ID
    if (typeof allPelangganCache !== 'undefined' && allPelangganCache.length === 0) {
        panggilServer('getPelanggan', [], function (rawPlg) {
            const resPlg = parseGAS(rawPlg);
            if (resPlg.status === 'success' && Array.isArray(resPlg.data)) {
                allPelangganCache = resPlg.data;
                renderTabelValidasiMeter();
            }
        });
    }

    panggilServer('getValidasiMeter', [],
        function (rawRes) {
            setLoadingRefreshValidasi(btnEl, false);
            const res = parseGAS(rawRes);
            if (res.status !== 'success') {
                if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger py-4">' + escapeHtml(res.message || 'Gagal memuat data.') + '</td></tr>';
                return;
            }

            allValidasiMeterCache = Array.isArray(res.data) ? res.data : [];

            // Hapus ID centang yang sudah tidak ada di daftar terbaru
            const validIdSet = new Set(allValidasiMeterCache.map(item => String(item.id_catat || item.id || '').trim()));
            selectedValidasiIds.forEach(id => {
                if (!validIdSet.has(id)) selectedValidasiIds.delete(id);
            });

            renderTabelValidasiMeter();
            if (btnEl) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Data Validasi Meter diperbarui', showConfirmButton: false, timer: 1500 });
            }
        },
        function (err) {
            setLoadingRefreshValidasi(btnEl, false);
            if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger py-4">Error: ' + escapeHtml(err.message) + '</td></tr>';
        }
    );
}

function getInfoPelangganUntukValidasi(item) {
    let nama = String(item.nama_pelanggan || '').trim();
    let dusun = String(item.dusun || '').trim();
    const idPlg = String(item.id_pelanggan || '').trim();

    if ((!nama || !dusun) && typeof allPelangganCache !== 'undefined' && Array.isArray(allPelangganCache)) {
        const plg = allPelangganCache.find(p => String(p.id_pelanggan || '').trim().toLowerCase() === idPlg.toLowerCase());
        if (plg) {
            if (!nama) nama = String(plg.nama_pelanggan || '').trim();
            if (!dusun) dusun = String(plg.dusun || '').trim();
        }
    }
    return {
        id_pelanggan: idPlg || '-',
        nama_pelanggan: nama || '-',
        dusun: dusun || '-'
    };
}

function getFilteredValidasiMeter() {
    const keyword = String((document.getElementById('searchValidasiMeter') || {}).value || '').trim().toLowerCase();
    const statusFilter = String((document.getElementById('filterStatusValidasi') || {}).value || 'semua').trim();
    const tokens = keyword ? keyword.split(/\s+/).filter(Boolean) : [];

    return allValidasiMeterCache.filter(item => {
        const statusItem = String(item.status_validasi || 'Pending').trim();
        if (statusFilter !== 'semua' && statusItem.toLowerCase() !== statusFilter.toLowerCase()) {
            return false;
        }

        if (tokens.length > 0) {
            const info = getInfoPelangganUntukValidasi(item);
            const gabungan = (info.nama_pelanggan + ' ' + info.dusun + ' ' + info.id_pelanggan).toLowerCase();
            if (!tokens.every(t => gabungan.includes(t))) return false;
        }

        return true;
    });
}

function resetCariValidasiMeter() {
    const input = document.getElementById('searchValidasiMeter');
    if (input) input.value = '';
    renderTabelValidasiMeter();
}

function renderTabelValidasiMeter() {
    const tbody = document.getElementById('tbodyValidasiMeter');
    const countEl = document.getElementById('countTampilValidasi');
    if (!tbody) return;

    const filtered = getFilteredValidasiMeter();
    if (countEl) countEl.textContent = filtered.length;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">Tidak ada data catatan meter yang sesuai pencarian/filter.</td></tr>';
        perbaruiStatusToolbarValidasi(filtered);
        return;
    }

    const canValidate = userHasPerm('catat_meter');

    tbody.innerHTML = filtered.map(item => {
        const rowId = String(item.id_catat || item.id || '').trim();
        const info = getInfoPelangganUntukValidasi(item);
        const mAwal = Number(item.meter_awal) || 0;
        const mAkhir = Number(item.meter_akhir) || 0;
        let pakai = Number(item.total_pemakaian);
        if (item.total_pemakaian === '' || item.total_pemakaian === undefined || isNaN(pakai)) {
            pakai = Math.max(0, mAkhir - mAwal);
        }

        const statusVal = String(item.status_validasi || 'Pending').trim();
        let badgeHtml = '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">Pending</span>';
        if (statusVal.toLowerCase() === 'approved') {
            badgeHtml = '<span class="badge bg-success-subtle text-success border border-success-subtle">Approved</span>';
        } else if (statusVal.toLowerCase() === 'rejected') {
            badgeHtml = '<span class="badge bg-danger-subtle text-danger border border-danger-subtle">Rejected</span>';
        }

        const isChecked = selectedValidasiIds.has(rowId);
        const checkboxCell = '<td class="text-center">' +
            '<input class="form-check-input" type="checkbox" ' +
            (isChecked ? 'checked ' : '') +
            (!canValidate ? 'disabled ' : '') +
            'onchange="togglePilihValidasi(this, \'' + escapeHtml(rowId) + '\')">' +
            '</td>';

        const fotoUrl = String(item.foto_meter || item.foto || '').trim();
        const fotoCell = '<td class="text-center">' +
            (fotoUrl
                ? '<a href="' + escapeHtml(fotoUrl) + '" target="_blank" class="btn btn-sm btn-outline-primary py-0 px-2" title="Lihat Foto Meter"><i class="fas fa-image me-1"></i>Lihat</a>'
                : '<span class="text-muted small">-</span>') +
            '</td>';

        const isPending = statusVal.toLowerCase() === 'pending';
        let aksiCell = '<td class="text-end"><span class="text-muted small">-</span></td>';
        if (canValidate) {
            if (isPending) {
                aksiCell = '<td class="text-end text-nowrap">' +
                    '<button type="button" class="btn btn-sm btn-success me-1" onclick="prosesValidasiMeterSingle(\'' + escapeHtml(rowId) + '\', \'Approved\')" title="Setujui"><i class="fas fa-check"></i></button>' +
                    '<button type="button" class="btn btn-sm btn-danger" onclick="prosesValidasiMeterSingle(\'' + escapeHtml(rowId) + '\', \'Rejected\')" title="Tolak"><i class="fas fa-times"></i></button>' +
                    '</td>';
            } else {
                aksiCell = '<td class="text-end text-nowrap">' +
                    '<button type="button" class="btn btn-sm btn-outline-secondary" onclick="prosesValidasiMeterSingle(\'' + escapeHtml(rowId) + '\', \'Pending\')" title="Reset ke Pending"><i class="fas fa-undo"></i></button>' +
                    '</td>';
            }
        }

        return '<tr>' +
            checkboxCell +
            '<td><span class="fw-semibold">' + escapeHtml(item.periode || '-') + '</span></td>' +
            '<td><div class="fw-semibold">' + escapeHtml(info.nama_pelanggan) + '</div><small class="text-muted">' + escapeHtml(info.id_pelanggan) + '</small></td>' +
            '<td>' + escapeHtml(info.dusun) + '</td>' +
            '<td class="text-center text-nowrap">' + mAwal + ' → ' + mAkhir + '</td>' +
            '<td class="text-end fw-bold text-primary">' + pakai + ' m³</td>' +
            fotoCell +
            '<td class="text-center">' + badgeHtml +
            (item.kondisi_lapangan && String(item.kondisi_lapangan).toLowerCase() !== 'normal'
                ? '<div class="mt-1"><span class="badge bg-danger-subtle text-danger border border-danger-subtle">' + escapeHtml(item.kondisi_lapangan) + '</span></div>'
                : '') +
            (item.sumber_pencatatan && String(item.sumber_pencatatan).toLowerCase().includes('mandiri')
                ? '<div class="mt-1"><span class="badge bg-info-subtle text-info-emphasis border">Mandiri Plg</span></div>'
                : '') +
            (item.catatan_kendala ? '<div class="small text-muted mt-1" style="max-width:170px;white-space:normal;">' + escapeHtml(item.catatan_kendala) + '</div>' : '') +
            (item.foto_kendala ? '<div class="mt-1"><a href="' + escapeHtml(item.foto_kendala) + '" target="_blank" class="badge bg-warning-subtle text-dark text-decoration-none border"><i class="fas fa-camera me-1"></i>Bukti Kendala</a></div>' : '') +
            (item.petugas || item.nama_petugas ? '<div class="small text-muted mt-1">' + escapeHtml(item.petugas || item.nama_petugas) + '</div>' : '') +
            '</td>' +
            aksiCell +
            '</tr>';
    }).join('');

    perbaruiStatusToolbarValidasi(filtered);
}

function perbaruiStatusToolbarValidasi(filteredList) {
    const list = Array.isArray(filteredList) ? filteredList : getFilteredValidasiMeter();
    const jumlahTerpilih = selectedValidasiIds.size;

    const countSelEl = document.getElementById('countDipilihValidasi');
    if (countSelEl) countSelEl.textContent = jumlahTerpilih;

    const bulkBar = document.getElementById('bulkBarValidasiMeter');
    if (bulkBar) {
        bulkBar.classList.toggle('d-none', jumlahTerpilih === 0);
    }

    const checkAllEl = document.getElementById('checkAllValidasi');
    if (checkAllEl) {
        if (list.length === 0) {
            checkAllEl.checked = false;
            checkAllEl.indeterminate = false;
        } else {
            const allIds = list.map(item => String(item.id_catat || item.id || '').trim()).filter(Boolean);
            const selectedCountInView = allIds.filter(id => selectedValidasiIds.has(id)).length;
            checkAllEl.checked = allIds.length > 0 && selectedCountInView === allIds.length;
            checkAllEl.indeterminate = selectedCountInView > 0 && selectedCountInView < allIds.length;
        }
    }
}

function togglePilihValidasi(checkboxEl, rowId) {
    const id = String(rowId || '').trim();
    if (!id) return;
    if (checkboxEl && checkboxEl.checked) {
        selectedValidasiIds.add(id);
    } else {
        selectedValidasiIds.delete(id);
    }
    perbaruiStatusToolbarValidasi();
}

function togglePilihSemuaValidasi(masterEl) {
    const filtered = getFilteredValidasiMeter();
    const isChecked = Boolean(masterEl && masterEl.checked);
    filtered.forEach(item => {
        const id = String(item.id_catat || item.id || '').trim();
        if (!id) return;
        if (isChecked) {
            selectedValidasiIds.add(id);
        } else {
            selectedValidasiIds.delete(id);
        }
    });
    renderTabelValidasiMeter();
}

function batalPilihSemuaValidasi() {
    selectedValidasiIds.clear();
    renderTabelValidasiMeter();
}

function prosesValidasiMeterSingle(idCatat, statusBaru) {
    if (!userHasPerm('catat_meter')) {
        Swal.fire('Akses Ditolak', 'Akun Anda tidak memiliki izin validasi meter.', 'warning');
        return;
    }

    const isReject = statusBaru === 'Rejected';
    Swal.fire({
        title: statusBaru === 'Approved' ? 'Setujui Catatan Meter?' : (isReject ? 'Tolak Catatan Meter?' : 'Reset Status ke Pending?'),
        input: isReject ? 'text' : undefined,
        inputPlaceholder: isReject ? 'Alasan penolakan (opsional)...' : undefined,
        icon: isReject ? 'warning' : 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Lanjutkan',
        cancelButtonText: 'Batal'
    }).then(result => {
        if (!result.isConfirmed) return;
        const catatan = isReject ? String(result.value || '').trim() : '';

        panggilServer('validasiCatatanMeter', [{
            ids: [idCatat],
            id_catat: idCatat,
            status_validasi: statusBaru,
            catatan: catatan
        }, getActorPayload()],
            function (rawRes) {
                const res = parseGAS(rawRes);
                if (res.status === 'success') {
                    selectedValidasiIds.delete(String(idCatat));
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: res.message || 'Status berhasil diperbarui', showConfirmButton: false, timer: 1800 });
                    loadValidasiMeter();
                } else {
                    Swal.fire('Gagal', res.message || 'Gagal memproses validasi.', 'error');
                }
            },
            function (err) {
                Swal.fire('Error', err.message, 'error');
            }
        );
    });
}

function eksekusiValidasiMassal(statusBaru) {
    if (!userHasPerm('catat_meter')) {
        Swal.fire('Akses Ditolak', 'Akun Anda tidak memiliki izin validasi meter.', 'warning');
        return;
    }
    const ids = Array.from(selectedValidasiIds);
    if (ids.length === 0) return;

    const isReject = statusBaru === 'Rejected';
    Swal.fire({
        title: (statusBaru === 'Approved' ? 'Validasi ' : 'Tolak ') + ids.length + ' Data Terpilih?',
        input: isReject ? 'text' : undefined,
        inputPlaceholder: isReject ? 'Alasan penolakan (opsional)...' : undefined,
        icon: isReject ? 'warning' : 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Proses Semua',
        cancelButtonText: 'Batal'
    }).then(result => {
        if (!result.isConfirmed) return;
        const catatan = isReject ? String(result.value || '').trim() : '';

        panggilServer('validasiCatatanMeter', [{
            ids: ids,
            status_validasi: statusBaru,
            catatan: catatan
        }, getActorPayload()],
            function (rawRes) {
                const res = parseGAS(rawRes);
                if (res.status === 'success') {
                    selectedValidasiIds.clear();
                    Swal.fire('Berhasil', res.message || (ids.length + ' data berhasil diproses.'), 'success');
                    loadValidasiMeter();
                } else {
                    Swal.fire('Gagal', res.message || 'Gagal memproses validasi massal.', 'error');
                }
            },
            function (err) {
                Swal.fire('Error', err.message, 'error');
            }
        );
    });
}

let statusOverrideAktif = false;

function checkStatusKunci() {
    const boxEl = document.getElementById('statusKunciText');
    const btnEl = document.getElementById('btnToggleOverride');

    if (boxEl) {
        boxEl.className = 'alert alert-info py-2 small';
        boxEl.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Memeriksa status kuncian...';
    }
    if (btnEl) btnEl.disabled = true;

    panggilServer('checkSystemLockStatus', [],
        function (rawRes) {
            const res = parseGAS(rawRes);
            if (res.status !== 'success') {
                if (boxEl) {
                    boxEl.className = 'alert alert-danger py-2 small';
                    boxEl.textContent = res.message || 'Gagal memeriksa status kuncian.';
                }
                if (btnEl) btnEl.disabled = false;
                return;
            }

            statusOverrideAktif = Boolean(res.isOverride);

            if (boxEl) {
                boxEl.className = res.isOpen ? 'alert alert-success py-2 small fw-semibold' : 'alert alert-danger py-2 small fw-semibold';
                boxEl.innerHTML = (res.isOpen ? '<i class="fas fa-lock-open me-1"></i> ' : '<i class="fas fa-lock me-1"></i> ') + escapeHtml(res.message || '');
            }

            if (btnEl) {
                const bolehAtur = userHasPerm('catat_meter');
                btnEl.disabled = !bolehAtur;
                if (statusOverrideAktif) {
                    btnEl.className = 'btn btn-danger fw-semibold py-2';
                    btnEl.innerHTML = '<i class="fas fa-lock me-2"></i> Tutup Akses Manual (Override OFF)';
                } else {
                    btnEl.className = 'btn btn-warning fw-semibold py-2';
                    btnEl.innerHTML = '<i class="fas fa-unlock me-2"></i> Buka Akses Manual (Override ON)';
                }
            }
        },
        function (err) {
            if (boxEl) {
                boxEl.className = 'alert alert-danger py-2 small';
                boxEl.textContent = 'Error: ' + (err.message || 'Gagal terhubung ke server.');
            }
            if (btnEl) btnEl.disabled = false;
        }
    );
}

function toggleOverrideStatus() {
    if (!userHasPerm('catat_meter')) {
        Swal.fire('Akses Ditolak', 'Akun Anda tidak memiliki izin mengubah status kuncian periode.', 'warning');
        return;
    }

    const targetAktif = !statusOverrideAktif;
    const judul = targetAktif ? 'Buka Akses Manual (Override ON)?' : 'Matikan Override Manual (Override OFF)?';
    const teks = targetAktif
        ? 'Petugas lapangan akan diizinkan menginput stand meter meskipun di luar tanggal 25–31.'
        : 'Form pencatatan meter petugas akan kembali mengikuti jadwal otomatis (terkunci tanggal 1–24).';

    Swal.fire({
        title: judul,
        text: teks,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Lanjutkan',
        cancelButtonText: 'Batal'
    }).then(function (result) {
        if (!result.isConfirmed) return;

        const btnEl = document.getElementById('btnToggleOverride');
        if (btnEl) {
            btnEl.disabled = true;
            btnEl.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Menyimpan perubahan...';
        }

        panggilServer('toggleSystemOverride', [targetAktif, getActorPayload()],
            function (rawRes) {
                const res = parseGAS(rawRes);
                if (res.status === 'success') {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: res.message || 'Status override diperbarui',
                        showConfirmButton: false,
                        timer: 2000
                    });
                    checkStatusKunci();
                } else {
                    if (btnEl) btnEl.disabled = false;
                    Swal.fire('Gagal', res.message || 'Gagal mengubah status override.', 'error');
                }
            },
            function (err) {
                if (btnEl) btnEl.disabled = false;
                Swal.fire('Error', err.message, 'error');
            }
        );
    });
}