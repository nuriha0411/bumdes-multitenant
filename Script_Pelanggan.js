    // 12. PANEL PORTAL PELANGGAN (SIDEBAR, GRAFIK, SIMULASI, METER MANDIRI, LAYANAN)
    // =========================================================================
    const PELANGGAN_BREADCRUMBS = {
      'pelanggan-beranda': { group: 'Portal Pelanggan', page: 'Beranda Pelanggan' },
      'pelanggan-tagihan': { group: 'Keuangan', page: 'Tagihan & Pembayaran' },
      'pelanggan-meter': { group: 'Transparansi', page: 'Riwayat Meter & Foto' },
      'pelanggan-layanan': { group: 'Layanan', page: 'Lapor Gangguan & Layanan' },
      'pelanggan-profil': { group: 'Akun', page: 'Profil & Keamanan' }
    };

    let plgTagihanCache = [];
    let plgRiwayatMeterCache = [];
    let plgTarifObj = null;
    let plgLastMeterValue = 0;
    let plgInfoPembayaran = null;
    let plgLastKonfirmasi = null;
    let chartPemakaianPlg6BlnInstance = null;

    function togglePelangganSidebar() {
      const sb = document.getElementById('pelangganSidebar');
      const ov = document.getElementById('pelangganOverlay');
      if (sb) sb.classList.toggle('show');
      if (ov) ov.classList.toggle('show');
    }

    function showPelangganMenu(sectionId, el) {
      currentAdminMenu = sectionId;
      simpanSesi();

      const info = PELANGGAN_BREADCRUMBS[sectionId] || PELANGGAN_BREADCRUMBS['pelanggan-beranda'];
      const gEl = document.getElementById('plgBreadcrumbGroup');
      const pEl = document.getElementById('plgBreadcrumbPage');
      if (gEl) gEl.textContent = info.group;
      if (pEl) pEl.textContent = info.page;

      document.querySelectorAll('.pelanggan-section').forEach(s => s.classList.remove('pelanggan-section-active'));
      const target = document.getElementById(sectionId);
      if (target) target.classList.add('pelanggan-section-active');

      document.querySelectorAll('#pelangganSidebar .menu-btn').forEach(b => b.classList.remove('active'));
      const btn = el || document.querySelector('#pelangganSidebar .menu-btn[data-plg-menu="' + sectionId + '"]');
      if (btn) btn.classList.add('active');

      const sb = document.getElementById('pelangganSidebar');
      if (sb && sb.classList.contains('show')) togglePelangganSidebar();

      const mainScroll = document.querySelector('#panel-pelanggan .admin-main-content');
      if (mainScroll) mainScroll.scrollTop = 0;

      if (sectionId === 'pelanggan-tagihan') loadKonfirmasiPelanggan();
      else if (sectionId === 'pelanggan-layanan') loadLayananGangguanPelanggan();
    }

    function refreshTagihanPelanggan(btnEl) {
      const btn = btnEl || document.getElementById('btnRefreshTagihanPelanggan');
      const tbody = document.getElementById('tbodyTagihanPelanggan');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-sync fa-spin me-1"></i>Memuat...';
      }
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin me-2"></i>Memperbarui data tagihan...</td></tr>';
      }

      initPanelPelanggan('pelanggan-tagihan', function () {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-sync me-1"></i>Refresh';
        }
      });
    }

    function initPanelPelanggan(menuAwal, onDone) {
      if (!currentUser) {
        if (typeof onDone === 'function') onDone();
        return;
      }

      // Deteksi menu aktif dari parameter, DOM yang sedang tampil, atau sesi terakhir
      const activeSectionEl = document.querySelector('#panel-pelanggan .pelanggan-section.pelanggan-section-active');
      const activeDomMenu = activeSectionEl ? activeSectionEl.id : '';
      const candidateMenu = menuAwal || activeDomMenu || (typeof currentAdminMenu !== 'undefined' ? currentAdminMenu : '') || 'pelanggan-beranda';
      const targetMenu = PELANGGAN_BREADCRUMBS[candidateMenu] ? candidateMenu : 'pelanggan-beranda';

      const namaPlg = currentUser.nama_pelanggan || '-';
      const idPlg = currentUser.id_pelanggan || '-';
      const alamatPlg = [currentUser.dusun, currentUser.rt_rw ? ('RT/RW ' + currentUser.rt_rw) : '', currentUser.desa].filter(Boolean).join(', ');

      document.getElementById('plgNamaHeader').textContent = namaPlg;
      document.getElementById('plgIdHeader').textContent = idPlg;
      document.getElementById('plgAlamatHeader').textContent = alamatPlg || '-';
      document.getElementById('plgNamaHeaderTop').textContent = namaPlg;
      document.getElementById('plgIdHeaderTop').textContent = idPlg;
      document.getElementById('avatarInitialsPelanggan').textContent = getInitials(namaPlg);

      const tglEl = document.getElementById('byr_tgl_transfer');
      if (tglEl && !tglEl.value) tglEl.value = getCurrentYYYYMMDD();

      // Pastikan panel tetap bertahan di targetMenu sebelum & sesudah fetch data
      showPelangganMenu(targetMenu);

      panggilServer('getPortalPelangganDashboard', [idPlg, getSessionPayloadPelanggan()],
        rawRes => {
          if (typeof onDone === 'function') onDone();
          const res = parseGAS(rawRes);
          if (res.status !== 'success') {
            renderTabelTagihanPelanggan(plgTagihanCache);
            Swal.fire('Gagal Memuat', res.message || 'Tidak dapat memuat data portal pelanggan.', 'error');
            return;
          }

          if (res.pelanggan) {
            const keptRole = currentUser.role || 'pelanggan';
            currentUser = Object.assign({}, currentUser, res.pelanggan, { role: keptRole });
            simpanSesi();
          }
          plgTarifObj = res.tarif_pelanggan || { kode_golongan: 'RT', nama_golongan: 'Rumah Tangga', blok1_batas: 10, blok1_tarif: 2000, blok2_batas: 20, blok2_tarif: 2500, blok3_tarif: 3500, biaya_admin: 3000 };
          plgLastMeterValue = Number(res.last_meter) || 0;
          plgTagihanCache = res.dataRiwayat || [];
          plgRiwayatMeterCache = res.riwayat_meter || [];
          plgInfoPembayaran = res.info_pembayaran || null;

          document.getElementById('plgTotalTunggakan').textContent = formatRupiah(res.totalTunggakan || 0);
          document.getElementById('plgInfoGolongan').textContent = (plgTarifObj.kode_golongan || 'RT') + ' - ' + (plgTarifObj.nama_golongan || '');
          document.getElementById('plgInfoStandTerakhir').textContent = plgLastMeterValue + ' m³';
          document.getElementById('plgInfoStatusSambungan').textContent = currentUser.status_sambungan || 'Aktif';
          document.getElementById('plgSimulasiGolLabel').textContent = 'Gol. ' + (plgTarifObj.kode_golongan || 'RT');

          // Profil Tab
          document.getElementById('plgProfilId').textContent = idPlg;
          document.getElementById('plgProfilNama').textContent = namaPlg;
          document.getElementById('plgProfilAlamat').textContent = res.alamat_lengkap || alamatPlg || '-';
          document.getElementById('plgProfilGolongan').textContent = (plgTarifObj.kode_golongan || 'RT') + ' - ' + (plgTarifObj.nama_golongan || '');
          document.getElementById('plgProfilStatus').textContent = currentUser.status_sambungan || 'Aktif';
          document.getElementById('plgProfilNoHp').value = currentUser.no_hp || '';

          // Status Tagihan Aktif
          const statusAktifEl = document.getElementById('plgStatusTagihanAktifText');
          if (Number(res.totalTunggakan) > 0) {
            statusAktifEl.innerHTML = '<span class="badge bg-danger me-1">Belum Lunas</span> Ada tagihan aktif yang belum diselesaikan.';
          } else {
            statusAktifEl.innerHTML = '<span class="badge bg-success me-1">Lunas</span> Tidak ada tunggakan tagihan.';
          }

          // Alert Rumah Terkunci
          const alertTerkunci = document.getElementById('plgAlertRumahTerkunci');
          if (alertTerkunci) {
            const isLockedAlert = Boolean(res.rumah_terkunci_alert && res.rumah_terkunci_alert.active);
            alertTerkunci.classList.toggle('d-none', !isLockedAlert);
            if (isLockedAlert) {
              document.getElementById('plgAlertRumahTerkunciMsg').textContent =
                'Periode ' + res.rumah_terkunci_alert.periode + ': ' + (res.rumah_terkunci_alert.catatan_kendala || 'Rumah dalam kondisi terkunci saat pencatatan. Kirim foto meteran secara mandiri.');
            }
          }

          renderChartPemakaianPelanggan6Bln(res.chart_6_bulan || []);
          hitungSimulasiPelanggan();
          renderTabelTagihanPelanggan(plgTagihanCache);
          renderTabelRiwayatMeterPelanggan(plgRiwayatMeterCache);
          renderPilihanTagihanBayar();
          renderInfoPembayaran();
        },
        err => {
          if (typeof onDone === 'function') onDone();
          renderTabelTagihanPelanggan(plgTagihanCache);
          Swal.fire('Gagal Memuat', err.message || 'Tidak dapat menyegarkan data tagihan.', 'error');
        }
      );

      if (targetMenu !== 'pelanggan-tagihan') loadKonfirmasiPelanggan();
      if (targetMenu !== 'pelanggan-layanan') loadLayananGangguanPelanggan();
    }
    
    function renderChartPemakaianPelanggan6Bln(chartData) {
      const ctx = document.getElementById('chartPemakaianPlg6Bln');
      if (!ctx || typeof Chart === 'undefined') return;
      if (chartPemakaianPlg6BlnInstance) chartPemakaianPlg6BlnInstance.destroy();
      chartPemakaianPlg6BlnInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: chartData.map(x => x.label),
          datasets: [{
            label: 'Pemakaian Air (m³)',
            data: chartData.map(x => x.pemakaian),
            backgroundColor: '#f05a28',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    function hitungSimulasiPelanggan() {
      const box = document.getElementById('plgSimulasiRincian');
      if (!box) return;
      const g = plgTarifObj || { blok1_batas: 10, blok1_tarif: 2000, blok2_batas: 20, blok2_tarif: 2500, blok3_tarif: 3500, biaya_admin: 3000 };
      const pakai = Math.max(0, Number(document.getElementById('plgSimulasiKubik')?.value) || 0);
      const b1Batas = Number(g.blok1_batas) || 10;
      const b2Batas = Number(g.blok2_batas) || 20;
      const b1Tarif = Number(g.blok1_tarif) || 2000;
      const b2Tarif = Number(g.blok2_tarif) || 2500;
      const b3Tarif = Number(g.blok3_tarif) || 3500;
      const admin = Number(g.biaya_admin) || 0;

      const m1 = Math.min(pakai, b1Batas);
      const m2 = pakai > b1Batas ? Math.min(pakai - b1Batas, Math.max(0, b2Batas - b1Batas)) : 0;
      const m3 = pakai > b2Batas ? (pakai - b2Batas) : 0;

      const r1 = m1 * b1Tarif;
      const r2 = m2 * b2Tarif;
      const r3 = m3 * b3Tarif;
      const total = r1 + r2 + r3 + admin;

      box.innerHTML =
        '<div class="d-flex justify-content-between mb-1"><span>Blok 1 (' + m1 + ' m³ × ' + formatRupiah(b1Tarif) + '):</span><span>' + formatRupiah(r1) + '</span></div>' +
        '<div class="d-flex justify-content-between mb-1"><span>Blok 2 (' + m2 + ' m³ × ' + formatRupiah(b2Tarif) + '):</span><span>' + formatRupiah(r2) + '</span></div>' +
        '<div class="d-flex justify-content-between mb-1"><span>Blok 3 (' + m3 + ' m³ × ' + formatRupiah(b3Tarif) + '):</span><span>' + formatRupiah(r3) + '</span></div>' +
        '<div class="d-flex justify-content-between mb-1"><span>Biaya Admin:</span><span>' + formatRupiah(admin) + '</span></div>' +
        '<hr class="my-2">' +
        '<div class="d-flex justify-content-between fw-bold text-primary fs-6"><span>Estimasi Tagihan:</span><span>' + formatRupiah(total) + '</span></div>';
    }

    function renderTabelTagihanPelanggan(list) {
      const tbody = document.getElementById('tbodyTagihanPelanggan');
      if (!tbody) return;
      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Belum ada riwayat tagihan.</td></tr>';
        return;
      }
      tbody.innerHTML = list.map(t => {
        const stRaw = String(t.status_bayar || 'Belum Lunas');
        const stLow = stRaw.toLowerCase();
        const isLunas = stLow === 'lunas';
        const isMenunggu = stLow.includes('menunggu');
        const badge = isLunas
          ? '<span class="badge bg-success">Lunas</span>'
          : (isMenunggu ? '<span class="badge bg-warning text-dark">Menunggu Verifikasi</span>' : '<span class="badge bg-danger">Belum Lunas</span>');

        const btnRincian = '<button type="button" class="btn btn-xs btn-outline-primary me-1" onclick="bukaModalRincianTagihanPlg(\'' + escapeHtml(t.id_tagihan) + '\')">Rincian</button>';
        const btnStruk = isLunas
          ? '<button type="button" class="btn btn-xs btn-outline-success" onclick="bukaStrukDigitalPlg(\'' + escapeHtml(t.id_tagihan) + '\')"><i class="fas fa-receipt me-1"></i>Lihat Struk</button>'
          : '';

        return '<tr><td class="fw-bold">' + escapeHtml(t.periode) + '</td><td>' + t.meter_awal + ' - ' + t.meter_akhir + '</td>' +
          '<td>' + t.total_pemakaian + ' m³</td><td class="fw-bold">' + formatRupiah(t.total_bayar) + '</td>' +
          '<td>' + badge + '</td><td class="text-end text-nowrap">' + btnRincian + btnStruk + '</td></tr>';
      }).join('');
    }

    function bukaModalRincianTagihanPlg(idTagihan) {
      const t = plgTagihanCache.find(x => String(x.id_tagihan) === String(idTagihan));
      if (!t) return;
      document.getElementById('plgModalRincianBody').innerHTML =
        '<div class="d-flex justify-content-between mb-1"><span>ID Tagihan:</span><strong>' + escapeHtml(t.id_tagihan) + '</strong></div>' +
        '<div class="d-flex justify-content-between mb-1"><span>Periode:</span><strong>' + escapeHtml(t.periode) + '</strong></div>' +
        '<div class="d-flex justify-content-between mb-1"><span>Stand Meter:</span><strong>' + t.meter_awal + ' → ' + t.meter_akhir + ' (' + t.total_pemakaian + ' m³)</strong></div>' +
        '<hr class="my-2">' +
        '<div class="d-flex justify-content-between mb-1"><span>Tagihan Pemakaian Air:</span><span>' + formatRupiah(t.tagihan_air || 0) + '</span></div>' +
        '<div class="d-flex justify-content-between mb-1"><span>Biaya Admin:</span><span>' + formatRupiah(t.biaya_admin || 0) + '</span></div>' +
        '<div class="d-flex justify-content-between mb-1"><span>Denda Keterlambatan:</span><span>' + formatRupiah(t.denda || 0) + '</span></div>' +
        '<hr class="my-2">' +
        '<div class="d-flex justify-content-between fw-bold fs-6 text-primary"><span>Total Tagihan:</span><span>' + formatRupiah(t.total_bayar || 0) + '</span></div>';
      new bootstrap.Modal(document.getElementById('modalRincianTagihanPlg')).show();
    }

    function bukaStrukDigitalPlg(idTagihan) {
      const t = plgTagihanCache.find(x => String(x.id_tagihan) === String(idTagihan));
      if (!t) return;
      document.getElementById('plgModalStrukBody').innerHTML =
        '<div class="text-center border-bottom pb-3 mb-3">' +
        '<div class="fw-bold text-primary">PDAM BUMDES PERCOBAAN</div>' +
        '<div class="small text-muted">Bukti Pembayaran Sah Pelanggan</div>' +
        '<span class="badge bg-success mt-2 px-3 py-1">LUNAS</span></div>' +
        '<div class="small">' +
        '<div class="d-flex justify-content-between mb-1"><span>No. Invoice:</span><strong>' + escapeHtml(t.id_tagihan) + '</strong></div>' +
        '<div class="d-flex justify-content-between mb-1"><span>Pelanggan:</span><strong>' + escapeHtml(currentUser?.nama_pelanggan || '-') + ' (' + escapeHtml(currentUser?.id_pelanggan || '-') + ')</strong></div>' +
        '<div class="d-flex justify-content-between mb-1"><span>Periode:</span><strong>' + escapeHtml(t.periode) + '</strong></div>' +
        '<div class="d-flex justify-content-between mb-1"><span>Tanggal Bayar:</span><strong>' + escapeHtml(t.tgl_bayar || '-') + '</strong></div>' +
        '<div class="d-flex justify-content-between mb-1"><span>Metode:</span><strong>' + escapeHtml(t.metode_bayar || 'Kas / Transfer') + '</strong></div>' +
        '<div class="d-flex justify-content-between mb-1"><span>Pemakaian:</span><strong>' + t.total_pemakaian + ' m³ (' + t.meter_awal + ' → ' + t.meter_akhir + ')</strong></div>' +
        '<hr class="my-2">' +
        '<div class="d-flex justify-content-between fs-6 fw-bold text-success"><span>TOTAL DIBAYAR:</span><span>' + formatRupiah(t.total_bayar || 0) + '</span></div></div>';
      const btnPdf = document.getElementById('btnPlgCetakNotaPdf');
      if (btnPdf) btnPdf.onclick = () => cetakStrukPDFTagihan(t.id_tagihan);
      new bootstrap.Modal(document.getElementById('modalStrukDigitalPlg')).show();
    }

    function renderTabelRiwayatMeterPelanggan(list) {
      const tbody = document.getElementById('tbodyRiwayatMeterPlg');
      if (!tbody) return;
      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Belum ada data pencatatan meter.</td></tr>';
        return;
      }
      tbody.innerHTML = list.map(m => {
        const valLow = String(m.status_validasi || 'Pending').toLowerCase();
        const badgeVal = valLow === 'approved'
          ? '<span class="badge bg-success">Valid</span>'
          : (valLow === 'rejected' ? '<span class="badge bg-danger">Ditolak</span>' : '<span class="badge bg-warning text-dark">Pending</span>');
        const btnFoto = m.foto_meter
          ? '<button type="button" class="btn btn-xs btn-outline-primary" onclick="bukaPreviewFotoMeterPlg(\'' + escapeHtml(m.foto_meter) + '\', \'' + escapeHtml(m.periode) + '\')"><i class="fas fa-image me-1"></i>Foto Meteran</button>'
          : '<span class="small text-muted">-</span>';

        return '<tr>' +
          '<td class="fw-bold">' + escapeHtml(m.periode) + '</td>' +
          '<td>' + m.meter_awal + ' → ' + m.meter_akhir + '</td>' +
          '<td class="fw-bold text-primary">' + m.total_pemakaian + ' m³</td>' +
          '<td>' + (m.kondisi_lapangan === 'Normal' ? '<span class="badge bg-light text-dark border">Normal</span>' : '<span class="badge bg-warning text-dark">' + escapeHtml(m.kondisi_lapangan) + '</span>') + '</td>' +
          '<td class="small">' + escapeHtml(m.sumber_pencatatan || 'Petugas') + '</td>' +
          '<td>' + badgeVal + '</td>' +
          '<td class="text-end">' + btnFoto + '</td>' +
          '</tr>';
      }).join('');
    }

    function bukaPreviewFotoMeterPlg(url, periode) {
      document.getElementById('plgPreviewFotoTitle').textContent = 'Foto Angka Meteran — Periode ' + (periode || '-');
      document.getElementById('plgPreviewFotoImg').src = convertDriveUrlToImgSrc(url);
      new bootstrap.Modal(document.getElementById('modalPreviewFotoMeterPlg')).show();
    }

    function bukaModalMeterMandiriPelanggan() {
      document.getElementById('formMeterMandiriPelanggan').reset();
      document.getElementById('plgMandiriMeterAwal').textContent = plgLastMeterValue;
      document.getElementById('plgMandiriMeterAkhir').value = plgLastMeterValue;
      new bootstrap.Modal(document.getElementById('modalMeterMandiriPelanggan')).show();
    }

    document.getElementById('formMeterMandiriPelanggan').addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!currentUser) return;
      const mAkhir = Number(document.getElementById('plgMandiriMeterAkhir').value);
      if (isNaN(mAkhir) || mAkhir < plgLastMeterValue) {
        Swal.fire('Angka Tidak Valid', 'Stand meter sekarang tidak boleh lebih kecil dari stand meter terakhir (' + plgLastMeterValue + ').', 'warning');
        return;
      }
      const fileInput = document.getElementById('plgMandiriFoto');
      if (!fileInput.files || !fileInput.files[0]) {
        Swal.fire('Foto Wajib', 'Unggah foto angka meteran terlebih dahulu.', 'warning');
        return;
      }
      const btn = document.getElementById('btnKirimMeterMandiri');
      btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Mengirim...';
      let fotoBase64 = '';
      try { fotoBase64 = await compressImageToTargetKB(fileInput.files[0], 800, 80, 120); }
      catch (err) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Kirim Foto Meter ke Admin'; Swal.fire('Gagal', 'Foto tidak dapat dibaca.', 'error'); return; }

      panggilServer('submitMeterMandiriPelanggan', [{
        id_pelanggan: currentUser.id_pelanggan,
        periode: getCurrentYYYYMM(),
        meter_awal: plgLastMeterValue,
        meter_akhir: mAkhir,
        catatan: document.getElementById('plgMandiriCatatan').value.trim(),
        fotoBase64: fotoBase64
      }, getSessionPayloadPelanggan()],
        rawRes => {
          btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Kirim Foto Meter ke Admin';
          const res = parseGAS(rawRes);
          if (res.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modalMeterMandiriPelanggan'))?.hide();
            Swal.fire('Terkirim', res.message, 'success');
            initPanelPelanggan('pelanggan-meter');
          } else Swal.fire('Gagal', res.message, 'error');
        },
        err => { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Kirim Foto Meter ke Admin'; Swal.fire('Error', err.message, 'error'); }
      );
    });

    function loadLayananGangguanPelanggan() {
      if (!currentUser) return;
      panggilServer('getLayananGangguanPelanggan', [currentUser.id_pelanggan, getSessionPayloadPelanggan()], rawRes => {
        const res = parseGAS(rawRes);
        const list = (res.status === 'success' && Array.isArray(res.data)) ? res.data : [];
        const tbody = document.getElementById('tbodyLayananGangguanPlg');
        if (!tbody) return;
        if (list.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted small py-3">Belum ada laporan gangguan.</td></tr>';
          return;
        }
        tbody.innerHTML = list.map(a => {
          const stLow = String(a.status || 'Menunggu').toLowerCase();
          let badge = '<span class="badge bg-secondary">Menunggu</span>';
          if (stLow === 'selesai') badge = '<span class="badge bg-success">Selesai</span>';
          else if (stLow === 'diproses') badge = '<span class="badge bg-warning text-dark">Diproses</span>';
          return '<tr class="small">' +
            '<td><div class="fw-bold text-primary">' + escapeHtml(a.id_tiket) + '</div><small class="text-muted">' + escapeHtml(String(a.tanggal || '').slice(0, 10)) + '</small></td>' +
            '<td><div class="fw-semibold">' + escapeHtml(a.kategori) + '</div><div class="text-muted">' + escapeHtml(a.deskripsi) + '</div></td>' +
            '<td>' + escapeHtml(a.petugas || '-') + '</td>' +
            '<td>' + badge + '</td>' +
            '</tr>';
        }).join('');
      });
    }

    document.getElementById('formLayananGangguanPlg').addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!currentUser) return;
      const btn = document.getElementById('btnKirimGangguanPlg');
      btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Mengirim...';
      let fotoBase64 = '';
      const fileInput = document.getElementById('gangguan_foto');
      if (fileInput.files && fileInput.files[0]) {
        try { fotoBase64 = await compressImageToTargetKB(fileInput.files[0], 800, 80, 120); } catch (err) { console.error(err); }
      }
      panggilServer('submitLayananGangguanPelanggan', [{
        id_pelanggan: currentUser.id_pelanggan,
        kategori: document.getElementById('gangguan_kategori').value,
        deskripsi: document.getElementById('gangguan_deskripsi').value.trim(),
        fotoBase64: fotoBase64
      }, getSessionPayloadPelanggan()],
        rawRes => {
          btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Kirim Laporan Gangguan';
          const res = parseGAS(rawRes);
          if (res.status === 'success') {
            document.getElementById('formLayananGangguanPlg').reset();
            Swal.fire('Laporan Terkirim', res.message, 'success');
            loadLayananGangguanPelanggan();
          } else Swal.fire('Gagal', res.message, 'error');
        },
        err => { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Kirim Laporan Gangguan'; Swal.fire('Error', err.message, 'error'); }
      );
    });

    document.getElementById('formUpdateProfilPlg').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!currentUser) return;
      const noHp = document.getElementById('plgProfilNoHp').value.trim();
      panggilServer('updateProfilPelanggan', [{ id_pelanggan: currentUser.id_pelanggan, no_hp: noHp }, getSessionPayloadPelanggan()],
        rawRes => {
          const res = parseGAS(rawRes);
          if (res.status === 'success') {
            currentUser.no_hp = res.no_hp || noHp;
            simpanSesi();
            Swal.fire('Berhasil', res.message, 'success');
          } else Swal.fire('Gagal', res.message, 'error');
        },
        err => Swal.fire('Error', err.message, 'error')
      );
    });

    document.getElementById('formGantiPassPlg').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!currentUser) return;
      const lama = document.getElementById('plgPassLama').value.trim();
      const baru = document.getElementById('plgPassBaru').value.trim();
      const ulang = document.getElementById('plgPassUlang').value.trim();
      if (baru !== ulang) {
        Swal.fire('Password Tidak Cocok', 'Konfirmasi password baru harus sama.', 'warning');
        return;
      }
      panggilServer('gantiPasswordPelanggan', [{ id_pelanggan: currentUser.id_pelanggan, password_lama: lama, password_baru: baru }, getSessionPayloadPelanggan()],
        rawRes => {
          const res = parseGAS(rawRes);
          if (res.status === 'success') {
            document.getElementById('formGantiPassPlg').reset();
            Swal.fire('Berhasil', res.message, 'success');
          } else Swal.fire('Gagal', res.message, 'error');
        },
        err => Swal.fire('Error', err.message, 'error')
      );
    });

    // =========================================================================
    // 14. PORTAL PELANGGAN: MENU BAYAR TAGIHAN & QRIS
    // =========================================================================
    function renderInfoPembayaran() {
      const wrap = document.getElementById('byrRekeningList');
      const qrisBox = document.getElementById('byrQrisBox');
      const qrisImg = document.getElementById('byrQrisImg');
      const qrisLabel = document.getElementById('byrQrisLabel');
      const info = plgInfoPembayaran;

      if (!wrap) return;
      if (!info || !Array.isArray(info.rekening) || info.rekening.length === 0) {
        wrap.innerHTML = '<div class="text-muted small">Informasi rekening belum tersedia. Silakan hubungi admin.</div>';
        document.getElementById('byrCatatanRekening').textContent = '';
      } else {
        wrap.innerHTML = info.rekening.map(r => '<div class="border rounded-3 p-3 mb-2"><div class="small text-muted fw-bold text-uppercase">' + escapeHtml(r.bank) + '</div>' +
          '<div class="d-flex align-items-center justify-content-between gap-2"><div class="fs-5 fw-bold text-primary">' + escapeHtml(r.no_rekening) + '</div>' +
          '<button type="button" class="btn btn-sm btn-outline-primary" data-norek="' + escapeHtml(r.no_rekening) + '" onclick="salinNoRekening(this)"><i class="far fa-copy me-1"></i>Salin</button></div>' +
          '<div class="small">a.n. <strong>' + escapeHtml(r.atas_nama) + '</strong></div></div>').join('');
        document.getElementById('byrCatatanRekening').textContent = info.catatan || '';
      }

      if (qrisBox && qrisImg) {
        if (info && info.qris && info.qris.image_url) {
          qrisImg.src = info.qris.image_url;
          if (qrisLabel) qrisLabel.textContent = info.qris.label || 'Scan QRIS BUMDes PERCOBAAN';
          qrisBox.classList.remove('d-none');
        } else {
          qrisBox.classList.add('d-none');
        }
      }
    }

    function salinNoRekening(btn) {
      const raw = btn.getAttribute('data-norek') || '', teks = raw.replace(/[^0-9]/g, '') || raw;
      const sukses = () => Swal.fire({ icon: 'success', title: 'Nomor rekening disalin', text: teks, timer: 1400, showConfirmButton: false });
      const fallback = () => {
        const ta = document.createElement('textarea'); ta.value = teks; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); sukses(); } catch (e) { Swal.fire('Salin manual', teks, 'info'); }
        document.body.removeChild(ta);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teks).then(sukses).catch(fallback); else fallback();
    }

    function getTagihanBelumDibayar() { return (plgTagihanCache || []).filter(t => t.dapat_dibayar); }

    function renderPilihanTagihanBayar() {
      const sel = document.getElementById('byr_tagihan'), kosong = document.getElementById('byrKosong'), wrap = document.getElementById('byrFormWrap');
      if (!sel) return;
      const list = getTagihanBelumDibayar();
      if (list.length === 0) { sel.innerHTML = ''; kosong.classList.remove('d-none'); wrap.classList.add('d-none'); sel.required = false; return; }
      kosong.classList.add('d-none'); wrap.classList.remove('d-none'); sel.required = true;
      let html = list.length > 1 ? '<option value="SEMUA">Semua tagihan belum lunas (' + list.length + ' bulan)</option>' : '';
      list.forEach(t => { html += '<option value="' + escapeHtml(t.id_tagihan) + '">Periode ' + escapeHtml(t.periode) + ' - ' + escapeHtml(formatRupiah(t.total_bayar)) + '</option>'; });
      sel.innerHTML = html; onChangeTagihanBayar();
    }

    function getPilihanBayar() {
      const sel = document.getElementById('byr_tagihan'), list = getTagihanBelumDibayar();
      if (!sel || !sel.value || list.length === 0) return null;
      if (sel.value === 'SEMUA') return { id: 'SEMUA', nominal: list.reduce((a, t) => a + (Number(t.total_bayar) || 0), 0), periode: list.map(t => t.periode).join(', ') };
      const t = list.find(x => String(x.id_tagihan) === String(sel.value));
      return t ? { id: String(t.id_tagihan), nominal: Number(t.total_bayar) || 0, periode: String(t.periode || '-') } : null;
    }

    function onChangeTagihanBayar() { const pil = getPilihanBayar(); document.getElementById('byr_nominal').value = formatRupiah(pil ? pil.nominal : 0); }

    document.getElementById('formBuktiBayar').addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!currentUser) return;
      const pil = getPilihanBayar(); if (!pil) { Swal.fire('Perhatian', 'Pilih tagihan yang akan dibayar.', 'warning'); return; }
      const fileInput = document.getElementById('byr_bukti');
      if (!fileInput.files || !fileInput.files[0]) { Swal.fire('Bukti Belum Dipilih', 'Pilih foto / screenshot bukti transfer terlebih dahulu.', 'warning'); return; }
      const btn = document.getElementById('btnKirimBukti'), labelAwal = '<i class="fas fa-upload me-1"></i> Kirim Bukti Transfer';
      btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Mengirim...';
      let fotoBase64 = '';
      try { fotoBase64 = await compressImageToTargetKB(fileInput.files[0], 800, 80, 120); }
      catch (err) { btn.disabled = false; btn.innerHTML = labelAwal; Swal.fire('Gagal', 'File tidak dapat dibaca.', 'error'); return; }

      const payload = {
        id_pelanggan: currentUser.id_pelanggan,
        id_tagihan: pil.id,
        tgl_transfer: document.getElementById('byr_tgl_transfer').value,
        catatan: document.getElementById('byr_catatan').value.trim(),
        fotoBase64: fotoBase64
      };
      panggilServer('submitKonfirmasiPembayaran', [payload, getSessionPayloadPelanggan()],
        rawRes => {
          btn.disabled = false; btn.innerHTML = labelAwal;
          const res = parseGAS(rawRes);
          if (res.status === 'success') {
            plgLastKonfirmasi = { id: pil.id, nominal: res.nominal || pil.nominal, periode: res.periode || pil.periode, bukti_url: res.bukti_url || '', tgl_transfer: payload.tgl_transfer };
            fileInput.value = ''; document.getElementById('byr_catatan').value = '';
            initPanelPelanggan('pelanggan-tagihan');
            Swal.fire({ icon: 'success', title: 'Bukti Transfer Terkirim', text: 'Status tagihan Anda kini Menunggu Verifikasi admin. Lanjutkan konfirmasi via WhatsApp bila diperlukan.', showCancelButton: true, confirmButtonText: 'Konfirmasi via WhatsApp', cancelButtonText: 'Nanti' })
              .then(r => { if (r.isConfirmed) bukaWhatsAppKonfirmasi(true); });
          } else Swal.fire('Gagal', res.message || 'Bukti transfer gagal dikirim.', 'error');
        },
        err => { btn.disabled = false; btn.innerHTML = labelAwal; Swal.fire('Error', err.message, 'error'); }
      );
    });

    function bukaWhatsAppKonfirmasi(lewatiCek) {
      if (!currentUser) return;
      const info = plgInfoPembayaran || {};
      let wa = normalizeWaNumber(info.whatsapp_admin || '');
      if (!wa) { Swal.fire('Nomor WhatsApp Belum Tersedia', 'Silakan hubungi admin untuk konfirmasi pembayaran.', 'warning'); return; }
      const pil = getPilihanBayar(), last = (plgLastKonfirmasi && pil && plgLastKonfirmasi.id === pil.id) ? plgLastKonfirmasi : null;
      if (!last && !lewatiCek) {
        Swal.fire({ icon: 'question', title: 'Bukti transfer belum diupload', text: 'Tetap lanjut konfirmasi via WhatsApp?', showCancelButton: true, confirmButtonText: 'Tetap Lanjut', cancelButtonText: 'Batal' })
          .then(r => { if (r.isConfirmed) bukaWhatsAppKonfirmasi(true); });
        return;
      }
      const nominal = last ? last.nominal : (pil ? pil.nominal : 0), periode = last ? last.periode : (pil ? pil.periode : '-'), tgl = last ? last.tgl_transfer : document.getElementById('byr_tgl_transfer').value;
      const baris = ['Halo Admin BUMDes PERCOBAAN, saya ingin konfirmasi pembayaran tagihan air.', '', 'ID Pelanggan: ' + (currentUser.id_pelanggan || '-'), 'Nama: ' + (currentUser.nama_pelanggan || '-'), 'Periode: ' + periode, 'Total Transfer: ' + formatRupiah(nominal), 'Tanggal Transfer: ' + (tgl || '-'), (last && last.bukti_url) ? ('Bukti transfer: ' + last.bukti_url) : 'Bukti transfer saya lampirkan pada chat ini.'];
      const url = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(baris.join('\n'));
      const w = window.open(url, '_blank');
      if (!w) Swal.fire({ icon: 'info', title: 'Buka WhatsApp', html: '<a href="' + escapeHtml(url) + '" target="_blank" class="btn btn-success fw-bold"><i class="fab fa-whatsapp me-1"></i> Buka WhatsApp</a>', showConfirmButton: false, showCloseButton: true });
    }

    function loadKonfirmasiPelanggan() {
      if (!currentUser) return;
      panggilServer('getKonfirmasiPembayaranPelanggan', [currentUser.id_pelanggan], rawRes => {
        const res = parseGAS(rawRes);
        const tbody = document.getElementById('tbodyKonfirmasiBayar');
        if (!tbody) return;
        const list = (res.status === 'success' && res.data) ? res.data : [];
        if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted small">Belum ada konfirmasi pembayaran.</td></tr>'; return; }
        tbody.innerHTML = list.map(k => {
          const st = String(k.status || 'Menunggu Verifikasi'), stl = st.toLowerCase();
          const badge = stl === 'terverifikasi' ? '<span class="badge bg-success">Terverifikasi</span>' : (stl === 'ditolak' ? '<span class="badge bg-danger">Ditolak</span>' : '<span class="badge bg-warning text-dark">' + escapeHtml(st) + '</span>');
          return '<tr class="small"><td>' + escapeHtml(String(k.timestamp || '').slice(0, 10)) + '</td><td>' + escapeHtml(k.periode) + '</td><td class="fw-bold">' + formatRupiah(k.nominal) + '</td><td>' + badge + '</td></tr>';
        }).join('');
      });
    }

    // =========================================================================
    // AKTIFKAN PEMANTAU SESI & PULIHKAN LOGIN SAAT HALAMAN DI-REFRESH
    // =========================================================================
    mulaiPemantauSesi();
    pulihkanSesiSaatMuat();