// =========================================================================
    // 11. PANEL PETUGAS LAPANGAN (SIDEBAR, VALIDASI, TAGIHAN INSTAN, WA & THERMAL)
    // =========================================================================
    const PETUGAS_BREADCRUMBS = {
      'petugas-dashboard': { group: 'Petugas Lapangan', page: 'Dashboard Petugas' },
      'petugas-catat': { group: 'Pencatatan', page: 'Catat Meter' },
      'petugas-riwayat': { group: 'Wilayah Tugas', page: 'Riwayat & Pelanggan Wilayah' },
      'petugas-tagihan': { group: 'Keuangan', page: 'Data Tagihan & Pelunasan' },
      'petugas-spk': { group: 'Teknik', page: 'Tugas SPK Teknik' },
      'petugas-setoran': { group: 'Keuangan', page: 'Setoran & Kas Petugas' }
    };

    let ptgHistoryCache = [];
    let ptgHistoryFilter = 'semua';
    let ptgTagihanCache = [];
    let ptgTagihanStatusFilter = 'belum';
    let ptgAvg3BulanCurrent = 0;
    let ptgTagihanModalData = null;
    let ptgFotoKendalaBase64 = '';
    let ptgFotoMeterBase64 = '';

    function togglePetugasSidebar() {
      const sb = document.getElementById('petugasSidebar');
      const ov = document.getElementById('petugasOverlay');
      if (sb) sb.classList.toggle('show');
      if (ov) ov.classList.toggle('show');
    }

    function showPetugasMenu(sectionId, el) {
      currentAdminMenu = sectionId;
      simpanSesi();

      const info = PETUGAS_BREADCRUMBS[sectionId] || PETUGAS_BREADCRUMBS['petugas-dashboard'];
      const gEl = document.getElementById('ptgBreadcrumbGroup');
      const pEl = document.getElementById('ptgBreadcrumbPage');
      if (gEl) gEl.textContent = info.group;
      if (pEl) pEl.textContent = info.page;

      document.querySelectorAll('.petugas-section').forEach(s => s.classList.remove('petugas-section-active'));
      const target = document.getElementById(sectionId);
      if (target) target.classList.add('petugas-section-active');

      document.querySelectorAll('#petugasSidebar .menu-btn').forEach(b => b.classList.remove('active'));
      const btn = el || document.querySelector('#petugasSidebar .menu-btn[data-ptg-menu="' + sectionId + '"]');
      if (btn) btn.classList.add('active');

      const sb = document.getElementById('petugasSidebar');
      if (sb && sb.classList.contains('show')) togglePetugasSidebar();

      const mainScroll = document.querySelector('#panel-petugas .admin-main-content');
      if (mainScroll) mainScroll.scrollTop = 0;

      if (sectionId === 'petugas-dashboard') loadPetugasDashboard();
      else if (sectionId === 'petugas-riwayat') loadHistoryPetugas();
      else if (sectionId === 'petugas-tagihan') loadTagihanPetugas();
      else if (sectionId === 'petugas-spk') loadSpkPetugas();
      else if (sectionId === 'petugas-setoran') loadSetoranPetugas();
    }

    function initPanelPetugas(menuAwal) {
      const ymNow = getCurrentYYYYMM();
      const ptgPer = document.getElementById('ptg_periode');
      const ptgHistPer = document.getElementById('ptg_riwayat_periode');
      if (ptgPer && !ptgPer.value) ptgPer.value = ymNow;
      if (ptgHistPer && !ptgHistPer.value) ptgHistPer.value = ymNow;

      const greet = document.getElementById('ptgGreeting');
      if (greet) greet.textContent = 'Halo, ' + (currentUser?.nama_lengkap || currentUser?.username || 'Petugas');

      panggilServer('checkSystemLockStatus', [], rawRes => {
        const res = parseGAS(rawRes);
        const alertEl = document.getElementById('alertKunciPetugas');
        if (alertEl && res.status === 'success') {
          alertEl.textContent = res.message;
          alertEl.className = res.isOpen ? 'alert alert-success py-2 small mb-3' : 'alert alert-danger py-2 small mb-3';
        }
      });

      panggilServer('getPelanggan', [], rawRes => {
        const res = parseGAS(rawRes);
        if (res.status === 'success' && Array.isArray(res.data)) {
          const areaTugas = String(currentUser?.area_tugas || '').trim().toLowerCase();
          let list = res.data;
          if (areaTugas && areaTugas !== 'semua area' && areaTugas !== '-') {
            const filtered = list.filter(p => String(p.dusun || '').toLowerCase().includes(areaTugas));
            if (filtered.length > 0) list = filtered;
          }
          petugasPelangganCache = list;
        }
      });

      // Muat ringkasan badge tagihan belum lunas di sidebar
      loadTagihanPetugas(true);

      const targetMenu = (menuAwal && PETUGAS_BREADCRUMBS[menuAwal]) ? menuAwal : 'petugas-dashboard';
      showPetugasMenu(targetMenu);
    }

    function loadPetugasDashboard() {
      const periode = document.getElementById('ptg_periode')?.value || getCurrentYYYYMM();
      panggilServer('getPetugasDashboardData', [
        currentUser?.id_user || '',
        currentUser?.nama_lengkap || currentUser?.username || '',
        currentUser?.area_tugas || 'Semua Area',
        periode
      ], rawRes => {
        const res = parseGAS(rawRes);
        if (res.status !== 'success') return;
        const prog = res.progres || {};
        const dom = res.dompet || {};
        document.getElementById('ptgDashPeriodeLabel').textContent = res.periode + ' (' + (res.area_tugas || 'Semua Area') + ')';
        document.getElementById('ptgDashProgresAngka').textContent = (prog.tercatat || 0) + ' / ' + (prog.total_pelanggan || 0) + ' Rumah Tercatat';
        document.getElementById('ptgDashProgresPersen').textContent = (prog.persen || 0) + '%';
        document.getElementById('ptgDashProgresBar').style.width = (prog.persen || 0) + '%';
        document.getElementById('ptgDashSisaBelum').textContent = (prog.belum || 0) + ' rumah';

        document.getElementById('ptgDashSaldoBelum').textContent = formatRupiah(dom.total_belum_disetor || 0);
        document.getElementById('ptgDashNotaBelum').textContent = (dom.jumlah_nota_belum_disetor || 0) + ' nota belum disetor';
        document.getElementById('ptgDashSaldoMenunggu').textContent = formatRupiah(dom.menunggu_verifikasi || 0);
        document.getElementById('ptgDashSaldoSudah').textContent = formatRupiah(dom.sudah_disetor || 0);
        document.getElementById('ptgDashSpkCount').textContent = res.spk_menunggu || 0;

        const spkBadge = document.getElementById('badgeSpkPetugasSidebar');
        if (spkBadge) {
          spkBadge.textContent = res.spk_menunggu || 0;
          spkBadge.classList.toggle('d-none', !res.spk_menunggu);
        }

        const belumList = Array.isArray(res.belum_dicatat) ? res.belum_dicatat : [];
        const tbody = document.getElementById('tbodyDashBelumDicatat');
        if (tbody) {
          if (belumList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-success fw-semibold py-3"><i class="fas fa-check-circle me-1"></i>Seluruh pelanggan di wilayah tugas Anda sudah dicatat bulan ini!</td></tr>';
          } else {
            tbody.innerHTML = belumList.slice(0, 8).map(p => (
              '<tr class="clickable-row-belum" onclick="catatDariRiwayat(\'' + escapeHtml(p.id_pelanggan) + '\')">' +
              '<td><div class="fw-bold">' + escapeHtml(p.nama_pelanggan) + '</div><small class="text-muted">' + escapeHtml(p.id_pelanggan) + '</small></td>' +
              '<td class="small">' + escapeHtml(p.dusun || '-') + (p.rt_rw ? ' RT/RW ' + escapeHtml(p.rt_rw) : '') + '</td>' +
              '<td class="fw-semibold">' + (Number(p.last_meter) || 0) + ' m³</td>' +
              '<td class="text-end"><button type="button" class="btn btn-xs btn-spark-primary fw-semibold" onclick="event.stopPropagation(); catatDariRiwayat(\'' + escapeHtml(p.id_pelanggan) + '\')"><i class="fas fa-edit me-1"></i>Catat</button></td>' +
              '</tr>'
            )).join('');
          }
        }
      });
    }

    function bukaBelumDicatatWilayah() {
      ptgHistoryFilter = 'belum';
      showPetugasMenu('petugas-riwayat', document.querySelector('#petugasSidebar .menu-btn[data-ptg-menu="petugas-riwayat"]'));
    }

    function getSelectedKondisiLapangan() {
      const checked = document.querySelector('input[name="ptg_kondisi_lapangan"]:checked');
      return checked ? checked.value : 'Normal';
    }

    function onKondisiLapanganChange() {
      const kondisi = getSelectedKondisiLapangan();
      const isNormal = kondisi === 'Normal';
      const box = document.getElementById('ptg_kendala_box');
      if (box) box.classList.toggle('d-none', isNormal);

      const akhirInput = document.getElementById('ptg_meter_akhir');
      const awalVal = Number(document.getElementById('ptg_meter_awal').value) || 0;
      if (!isNormal && akhirInput && !akhirInput.value) {
        akhirInput.value = awalVal;
      }
      hitungPemakaianPetugas();
    }

    function onSelectPelangganCatat() {
      const idPlg = document.getElementById('ptg_id_pelanggan').value;
      const meterAwalEl = document.getElementById('ptg_meter_awal');
      const meterDisplayEl = document.getElementById('ptg_meter_awal_display');
      const avgEl = document.getElementById('ptg_avg_3bln_info');

      if (!idPlg) {
        ptgAvg3BulanCurrent = 0;
        if (meterAwalEl) meterAwalEl.value = 0;
        if (meterDisplayEl) meterDisplayEl.textContent = '0';
        if (avgEl) avgEl.textContent = '- m³ / bulan';
        hitungPemakaianPetugas();
        return;
      }

      const pObj = petugasPelangganCache.find(x => String(x.id_pelanggan) === String(idPlg));
      const almEl = document.getElementById('ptg_alamat_terpilih');
      if (almEl && pObj) {
        const alm = [pObj.dusun ? 'Dusun ' + pObj.dusun : '', pObj.rt_rw ? 'RT/RW ' + pObj.rt_rw : '', pObj.desa].filter(Boolean).join(', ');
        almEl.textContent = 'Alamat: ' + (alm || '-') + (pObj.golongan ? ' • Gol. ' + pObj.golongan : '');
        almEl.classList.remove('d-none');
      }

      panggilServer('getLastMeter', [idPlg], rawRes => {
        const res = parseGAS(rawRes);
        const lastM = Number(res.last_meter) || 0;
        ptgAvg3BulanCurrent = Number(res.avg_3_bulan) || 0;
        if (meterAwalEl) meterAwalEl.value = lastM;
        if (meterDisplayEl) meterDisplayEl.textContent = lastM;
        if (avgEl) {
          avgEl.textContent = ptgAvg3BulanCurrent > 0 ? (ptgAvg3BulanCurrent + ' m³ / bulan') : 'Belum ada riwayat 3 bln';
        }
        hitungPemakaianPetugas();
      });
    }

    function hitungPemakaianPetugas() {
      const awal = Number(document.getElementById('ptg_meter_awal').value) || 0;
      const rawAkhir = document.getElementById('ptg_meter_akhir').value;
      const akhir = rawAkhir === '' ? awal : (Number(rawAkhir) || 0);
      const kondisi = getSelectedKondisiLapangan();
      const hintEl = document.getElementById('ptg_validasi_meter_hint');
      const anomaliEl = document.getElementById('ptg_anomali_badge');

      if (rawAkhir !== '' && kondisi === 'Normal' && akhir < awal) {
        if (hintEl) {
          hintEl.textContent = 'Meter akhir (' + akhir + ') tidak boleh lebih kecil dari meter awal (' + awal + ')!';
          hintEl.className = 'small mt-1 text-danger fw-bold';
        }
        document.getElementById('ptg_pemakaian').value = '0 m³ (Tidak Valid)';
        if (anomaliEl) anomaliEl.classList.add('d-none');
        return;
      }

      if (hintEl) hintEl.className = 'small mt-1 d-none';
      const pakai = Math.max(0, akhir - awal);
      document.getElementById('ptg_pemakaian').value = pakai + ' m³';

      if (anomaliEl) {
        const isLonjakan = rawAkhir !== '' && ptgAvg3BulanCurrent > 0 && pakai > 10 && pakai > (ptgAvg3BulanCurrent * 2);
        anomaliEl.classList.toggle('d-none', !isLonjakan);
      }
    }

    function previewFotoMeterPetugas(input) {
      const infoEl = document.getElementById('ptg_foto_meter_info');
      const box = document.getElementById('ptg_foto_meter_preview_box');
      const img = document.getElementById('ptg_foto_meter_preview');
      if (!input.files || !input.files[0]) {
        ptgFotoMeterBase64 = '';
        if (infoEl) infoEl.textContent = '';
        if (box) box.classList.add('d-none');
        return;
      }
      if (infoEl) infoEl.textContent = 'Mengompres foto ke 80–120 KB...';
      compressImageToTargetKB(input.files[0], 800, 80, 120)
        .then(base64 => {
          ptgFotoMeterBase64 = base64;
          const kb = Math.round(estimateDataUrlBytes(base64) / 1024);
          if (infoEl) infoEl.textContent = 'Foto siap dikirim (' + kb + ' KB).';
          if (img) img.src = base64;
          if (box) box.classList.remove('d-none');
        })
        .catch(() => { ptgFotoMeterBase64 = ''; });
    }

    function previewFotoKendalaPetugas(input) {
      const infoEl = document.getElementById('ptg_foto_kendala_info');
      if (!input.files || !input.files[0]) { ptgFotoKendalaBase64 = ''; if (infoEl) infoEl.textContent = ''; return; }
      if (infoEl) infoEl.textContent = 'Mengompres foto kendala...';
      compressImageToTargetKB(input.files[0], 800, 80, 120)
        .then(base64 => {
          ptgFotoKendalaBase64 = base64;
          const kb = Math.round(estimateDataUrlBytes(base64) / 1024);
          if (infoEl) infoEl.textContent = 'Foto kendala siap (' + kb + ' KB).';
        })
        .catch(() => { ptgFotoKendalaBase64 = ''; });
    }

    function resetFormCatatMeterPetugas() {
      document.getElementById('formCatatMeterPetugas').reset();
      resetPencarianPelangganPetugas();
      document.getElementById('ptg_periode').value = getCurrentYYYYMM();
      document.getElementById('ptg_pemakaian').value = '0 m³';
      document.getElementById('ptg_meter_awal_display').textContent = '0';
      document.getElementById('ptg_avg_3bln_info').textContent = '- m³ / bulan';
      const almEl = document.getElementById('ptg_alamat_terpilih');
      if (almEl) almEl.classList.add('d-none');
      const kNormal = document.getElementById('kondisiNormal');
      if (kNormal) kNormal.checked = true;
      onKondisiLapanganChange();
      ptgFotoMeterBase64 = '';
      ptgFotoKendalaBase64 = '';
      document.getElementById('ptg_foto_meter_info').textContent = '';
      document.getElementById('ptg_foto_kendala_info').textContent = '';
      document.getElementById('ptg_foto_meter_preview_box').classList.add('d-none');
      document.getElementById('ptg_anomali_badge').classList.add('d-none');
    }

    async function kirimCatatanMeterKeServer() {
      const btn = document.getElementById('btnSubmitCatatMeter');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Menyimpan &amp; Menghitung Tagihan...';

      let fotoBase64 = ptgFotoMeterBase64;
      const fileInput = document.getElementById('ptg_foto_meter');
      if (!fotoBase64 && fileInput.files && fileInput.files[0]) {
        try { fotoBase64 = await compressImageToTargetKB(fileInput.files[0], 800, 80, 120); } catch (err) { console.error(err); }
      }

      let fotoKendalaBase64 = ptgFotoKendalaBase64;
      const kendalaInput = document.getElementById('ptg_foto_kendala');
      if (!fotoKendalaBase64 && kendalaInput && kendalaInput.files && kendalaInput.files[0]) {
        try { fotoKendalaBase64 = await compressImageToTargetKB(kendalaInput.files[0], 800, 80, 120); } catch (err) { console.error(err); }
      }

      const payload = {
        periode: document.getElementById('ptg_periode').value,
        id_pelanggan: document.getElementById('ptg_id_pelanggan').value,
        meter_awal: document.getElementById('ptg_meter_awal').value,
        meter_akhir: document.getElementById('ptg_meter_akhir').value,
        kondisi_lapangan: getSelectedKondisiLapangan(),
        catatan_kendala: (document.getElementById('ptg_catatan_kendala')?.value || '').trim(),
        id_petugas: currentUser?.id_user || 'PTG',
        nama_petugas: currentUser?.nama_lengkap || currentUser?.username || 'Petugas',
        fotoBase64: fotoBase64,
        fotoKendalaBase64: fotoKendalaBase64
      };

      panggilServer('submitCatatMeter', [payload],
        rawRes => {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-paper-plane me-1"></i> Simpan Meter &amp; Hitung Tagihan';
          const res = parseGAS(rawRes);
          if (res.status === 'success') {
            resetFormCatatMeterPetugas();
            if (res.tagihan) {
              bukaModalKonfirmasiTagihanPetugas(res.tagihan);
            } else {
              Swal.fire('Terkirim', res.message, 'success');
            }
            loadPetugasDashboard();
          } else {
            Swal.fire('Gagal', res.message, 'error');
          }
        },
        err => {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-paper-plane me-1"></i> Simpan Meter &amp; Hitung Tagihan';
          Swal.fire('Error', err.message, 'error');
        }
      );
    }

    document.getElementById('formCatatMeterPetugas').addEventListener('submit', function (e) {
      e.preventDefault();
      const idPlg = document.getElementById('ptg_id_pelanggan').value;
      if (!idPlg) {
        Swal.fire('Pelanggan Belum Dipilih', 'Cari lalu pilih pelanggan dari daftar hasil pencarian.', 'warning');
        return;
      }

      const kondisi = getSelectedKondisiLapangan();
      const awal = Number(document.getElementById('ptg_meter_awal').value) || 0;
      const rawAkhir = document.getElementById('ptg_meter_akhir').value;
      const akhir = rawAkhir === '' ? awal : Number(rawAkhir);

      if (isNaN(akhir) || akhir < 0) {
        Swal.fire('Angka Tidak Valid', 'Masukkan angka stand meter yang valid.', 'warning');
        return;
      }
      if (kondisi === 'Normal' && akhir < awal) {
        Swal.fire('Validasi Ditolak', 'Stand meter akhir (' + akhir + ') tidak boleh lebih kecil dari meter awal (' + awal + ') untuk kondisi Normal.', 'error');
        return;
      }

      const pemakaian = Math.max(0, akhir - awal);
      if (ptgAvg3BulanCurrent > 0 && pemakaian > 10 && pemakaian > (ptgAvg3BulanCurrent * 2)) {
        Swal.fire({
          title: 'Peringatan Lonjakan Pemakaian!',
          html: '<div class="text-start small">' +
            'Pemakaian terhitung <strong>' + pemakaian + ' m³</strong>, melebihi 2x rata-rata 3 bulan terakhir (<strong>' + ptgAvg3BulanCurrent + ' m³</strong>).' +
            '<br><br>Periksa kembali angka meteran dan potensi <strong>kebocoran pipa</strong> pelanggan sebelum menyimpan.</div>',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Angka Benar, Tetap Simpan',
          cancelButtonText: 'Periksa Ulang'
        }).then(r => {
          if (r.isConfirmed) kirimCatatanMeterKeServer();
        });
        return;
      }

      kirimCatatanMeterKeServer();
    });

    function bukaModalKonfirmasiTagihanPetugas(tagihan) {
      ptgTagihanModalData = Object.assign({}, tagihan);
      document.getElementById('ptgModalNamaPlg').textContent = tagihan.nama_pelanggan || '-';
      document.getElementById('ptgModalIdAlamat').textContent = (tagihan.id_pelanggan || '-') + ' • Dusun ' + (tagihan.dusun || '-') + (tagihan.rt_rw ? ' RT/RW ' + tagihan.rt_rw : '');
      document.getElementById('ptgModalPeriode').textContent = tagihan.periode || '-';
      document.getElementById('ptgModalStand').textContent = (tagihan.meter_awal || 0) + ' → ' + (tagihan.meter_akhir || 0);
      document.getElementById('ptgModalPakai').textContent = (tagihan.total_pemakaian || 0) + ' m³';
      document.getElementById('ptgModalAir').textContent = formatRupiah(tagihan.tagihan_air || 0);
      document.getElementById('ptgModalAdmin').textContent = formatRupiah(tagihan.biaya_admin || 0);
      document.getElementById('ptgModalBulanIni').textContent = formatRupiah(tagihan.tagihan_bulan_ini || 0);
      document.getElementById('ptgModalJmlTunggakan').textContent = tagihan.jumlah_bulan_tunggakan || 0;
      document.getElementById('ptgModalTunggakan').textContent = formatRupiah(tagihan.tunggakan_sebelumnya || 0);
      document.getElementById('ptgModalRowTunggakan').classList.toggle('d-none', !(Number(tagihan.tunggakan_sebelumnya) > 0));
      document.getElementById('ptgModalTotalKeseluruhan').textContent = formatRupiah(tagihan.total_tagihan_keseluruhan || tagihan.tagihan_bulan_ini || 0);

      const isLunas = String(tagihan.status_bayar || '').toLowerCase() === 'lunas';
      const isPendingValidasi = String(tagihan.id_tagihan || '').startsWith('PENDING-') ||
        String(tagihan.status_bayar || '').toLowerCase().includes('menunggu validasi');
      const badge = document.getElementById('ptgModalStatusBayarBadge');
      badge.textContent = isLunas ? 'LUNAS' : (isPendingValidasi ? 'MENUNGGU VALIDASI' : 'BELUM LUNAS');
      badge.className = isLunas ? 'badge bg-success fs-6' : (isPendingValidasi ? 'badge bg-warning text-dark fs-6' : 'badge bg-danger fs-6');

      const btnBayar = document.getElementById('btnBayarTunaiDiTempat');
      if (btnBayar) {
        btnBayar.disabled = isLunas || isPendingValidasi;
        btnBayar.classList.toggle('d-none', isLunas || isPendingValidasi);
      }

      new bootstrap.Modal(document.getElementById('modalKonfirmasiTagihanPetugas')).show();
    }

    function bayarTunaiDariModalPetugas() {
      if (!ptgTagihanModalData) return;
      const d = ptgTagihanModalData;
      const ids = [d.id_tagihan].concat(Array.isArray(d.daftar_id_tunggakan) ? d.daftar_id_tunggakan : []).filter(Boolean);
      const total = Number(d.total_tagihan_keseluruhan || d.tagihan_bulan_ini) || 0;

      Swal.fire({
        title: 'Konfirmasi Pelunasan Tunai?',
        html: 'Terima pembayaran tunai sebesar <strong>' + formatRupiah(total) + '</strong> dari <strong>' + escapeHtml(d.nama_pelanggan) + '</strong>?<br><small class="text-muted">Dana akan dicatat ke Dompet Setoran Petugas Anda.</small>',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Lunaskan Tunai',
        cancelButtonText: 'Batal'
      }).then(r => {
        if (!r.isConfirmed) return;
        const btn = document.getElementById('btnBayarTunaiDiTempat');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Memproses Pelunasan...';

        panggilServer('bayarTagihanTunaiPetugas', [{
          id_tagihan: d.id_tagihan,
          daftar_id_tagihan: ids,
          id_petugas: currentUser?.id_user || 'PTG',
          nama_petugas: currentUser?.nama_lengkap || currentUser?.username || 'Petugas',
          tgl_bayar: getCurrentYYYYMMDD()
        }, getActorPayload()],
          rawRes => {
            btn.innerHTML = '<i class="fas fa-money-bill-wave me-2"></i>Bayar Tunai Sekarang';
            const res = parseGAS(rawRes);
            if (res.status === 'success') {
              ptgTagihanModalData.status_bayar = 'Lunas';
              ptgTagihanModalData.tgl_bayar = res.tanggal_bayar || getCurrentYYYYMMDD();
              const badge = document.getElementById('ptgModalStatusBayarBadge');
              badge.textContent = 'LUNAS';
              badge.className = 'badge bg-success fs-6';
              btn.classList.add('d-none');
              Swal.fire('Lunas di Tempat', res.message, 'success');
              loadPetugasDashboard();
              loadTagihanPetugas(true);
            } else {
              btn.disabled = false;
              Swal.fire('Gagal', res.message, 'error');
            }
          },
          err => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-money-bill-wave me-2"></i>Bayar Tunai Sekarang';
            Swal.fire('Error', err.message, 'error');
          }
        );
      });
    }

    // =========================================================================
    // 11B. DATA TAGIHAN & PELUNASAN TUNAI DI AKUN PETUGAS
    // =========================================================================
    function loadTagihanPetugas(silentBadgeOnly) {
      const tbody = document.getElementById('tbodyTagihanPetugas');
      if (!silentBadgeOnly && tbody) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin me-2"></i>Memuat daftar tagihan...</td></tr>';
      }

      panggilServer('getTagihan', [],
        rawRes => {
          const res = parseGAS(rawRes);
          if (res.status !== 'success') {
            if (!silentBadgeOnly && tbody) {
              tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">' + escapeHtml(res.message) + '</td></tr>';
            }
            return;
          }

          const rawList = Array.isArray(res.data) ? res.data : [];
          // Hanya tampilkan tagihan yang sudah dirilis (Published) atau yang sudah Lunas
          ptgTagihanCache = rawList.filter(t => {
            const isLunas = String(t.status_bayar || '').trim().toLowerCase() === 'lunas';
            const stRilisLow = String(t.status_rilis || '').trim().toLowerCase();
            if (!isLunas && (stRilisLow === 'draft' || stRilisLow === 'belum rilis')) return false;
            return true;
          });

          filterTagihanPetugas();
        },
        err => {
          if (!silentBadgeOnly && tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Gagal memuat tagihan: ' + escapeHtml(err.message) + '</td></tr>';
          }
        }
      );
    }

    function setFilterStatusTagihanPetugas(mode) {
      ptgTagihanStatusFilter = mode;
      filterTagihanPetugas();
    }

    function resetFilterTagihanPetugas() {
      const kwEl = document.getElementById('ptg_search_tagihan');
      const perEl = document.getElementById('ptg_tagihan_periode_filter');
      if (kwEl) kwEl.value = '';
      if (perEl) perEl.value = '';
      filterTagihanPetugas();
    }

    function filterTagihanPetugas() {
      ['Belum', 'Lunas', 'Semua'].forEach(k => {
        const b = document.getElementById('btnFilterTgh' + k);
        if (b) b.classList.toggle('active', ptgTagihanStatusFilter === k.toLowerCase());
      });

      const showAllWilayah = Boolean(document.getElementById('ptg_tagihan_semua_wilayah')?.checked);
      const areaTugas = String(currentUser?.area_tugas || '').trim().toLowerCase();
      const hasAreaFilter = !showAllWilayah && areaTugas && areaTugas !== 'semua area' && areaTugas !== '-';

      const wilayahList = ptgTagihanCache.filter(t => {
        if (!hasAreaFilter) return true;
        return String(t.dusun || '').toLowerCase().includes(areaTugas);
      });

      // Hitung ringkasan & badge sidebar berdasarkan wilayah aktif
      let belumCount = 0;
      let belumNominal = 0;
      let lunasCount = 0;
      let lunasNominal = 0;
      wilayahList.forEach(t => {
        const isLunas = String(t.status_bayar || '').trim().toLowerCase() === 'lunas';
        if (isLunas) {
          lunasCount++;
          lunasNominal += Number(t.total_bayar) || 0;
        } else {
          belumCount++;
          belumNominal += Number(t.total_bayar) || 0;
        }
      });

      const badgeSide = document.getElementById('badgeTagihanPetugasSidebar');
      if (badgeSide) {
        badgeSide.textContent = belumCount;
        badgeSide.classList.toggle('d-none', belumCount === 0);
      }
      const elBelumNom = document.getElementById('ptgTagihanBelumNominal');
      const elBelumCnt = document.getElementById('ptgTagihanBelumCount');
      const elLunasNom = document.getElementById('ptgTagihanLunasNominal');
      const elLunasCnt = document.getElementById('ptgTagihanLunasCount');
      if (elBelumNom) elBelumNom.textContent = formatRupiah(belumNominal);
      if (elBelumCnt) elBelumCnt.textContent = belumCount + ' tagihan belum lunas';
      if (elLunasNom) elLunasNom.textContent = formatRupiah(lunasNominal);
      if (elLunasCnt) elLunasCnt.textContent = lunasCount + ' tagihan lunas';

      const kw = String(document.getElementById('ptg_search_tagihan')?.value || '').trim().toLowerCase();
      const perFilter = String(document.getElementById('ptg_tagihan_periode_filter')?.value || '').trim();
      const btnClear = document.getElementById('btnClearSearchTagihanPetugas');
      if (btnClear) btnClear.classList.toggle('d-none', kw.length === 0 && perFilter.length === 0);

      const filtered = wilayahList.filter(t => {
        const isLunas = String(t.status_bayar || '').trim().toLowerCase() === 'lunas';
        if (ptgTagihanStatusFilter === 'belum' && isLunas) return false;
        if (ptgTagihanStatusFilter === 'lunas' && !isLunas) return false;
        if (perFilter && !String(t.periode || '').startsWith(perFilter)) return false;
        if (kw) {
          const hay = (
            String(t.nama_pelanggan || '') + ' ' +
            String(t.id_pelanggan || '') + ' ' +
            String(t.dusun || '') + ' ' +
            String(t.id_tagihan || '')
          ).toLowerCase();
          if (!hay.includes(kw)) return false;
        }
        return true;
      });

      renderTabelTagihanPetugas(filtered, wilayahList.length);
    }

    function renderTabelTagihanPetugas(list, totalWilayah) {
      const tbody = document.getElementById('tbodyTagihanPetugas');
      const infoEl = document.getElementById('ptgTagihanCountInfo');
      if (!tbody) return;

      if (infoEl) {
        infoEl.textContent = 'Menampilkan ' + list.length + ' dari ' + (totalWilayah || 0) + ' tagihan dirilis';
      }
      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Tidak ada data tagihan yang sesuai filter.</td></tr>';
        return;
      }

      tbody.innerHTML = list.map(t => {
        const stRaw = String(t.status_bayar || '').trim();
        const stLow = stRaw.toLowerCase();
        const isLunas = stLow === 'lunas';
        const isMenunggu = stLow.includes('menunggu');
        const perLabel = typeof formatPeriodeBulanTahun === 'function' ? formatPeriodeBulanTahun(t.periode) : (t.periode || '-');

        let badgeStatus = '<span class="badge bg-danger-subtle text-danger border">Belum Lunas</span>';
        if (isLunas) {
          badgeStatus = '<span class="badge bg-success-subtle text-success border">Lunas</span>' +
            '<div class="small text-muted" style="font-size:0.72rem;">' + escapeHtml(String(t.tgl_bayar || '').slice(0, 10)) +
            (t.metode_bayar ? ' • ' + escapeHtml(t.metode_bayar) : '') + '</div>';
        } else if (isMenunggu) {
          badgeStatus = '<span class="badge bg-warning text-dark">Menunggu Verifikasi</span>';
        }

        let aksiHtml = '';
        if (isLunas) {
          aksiHtml = '<div class="btn-group btn-group-sm">' +
            '<button type="button" class="btn btn-outline-dark" onclick="bukaDetailStrukTagihanPetugas(\'' + escapeHtml(t.id_tagihan) + '\')" title="Cetak Struk / Kirim WA"><i class="fas fa-receipt me-1"></i>Struk</button>' +
            '</div>';
        } else {
          aksiHtml = '<div class="d-flex justify-content-end gap-1 flex-wrap">' +
            '<button type="button" class="btn btn-sm btn-outline-secondary" onclick="bukaDetailStrukTagihanPetugas(\'' + escapeHtml(t.id_tagihan) + '\')" title="Lihat Rincian / Kirim WA"><i class="fas fa-eye"></i></button>' +
            '<button type="button" class="btn btn-sm btn-success fw-semibold" onclick="eksekusiBayarTunaiTagihanPetugas(\'' + escapeHtml(t.id_tagihan) + '\')"><i class="fas fa-money-bill-wave me-1"></i>Terima Tunai</button>' +
            '</div>';
        }

        return '<tr>' +
          '<td class="fw-bold small">' + escapeHtml(t.id_tagihan) + '</td>' +
          '<td><div class="fw-bold text-dark">' + escapeHtml(t.nama_pelanggan) + '</div><small class="text-muted">' + escapeHtml(t.id_pelanggan) + (t.dusun ? ' • ' + escapeHtml(t.dusun) : '') + '</small></td>' +
          '<td><span class="badge bg-light text-dark border">' + escapeHtml(perLabel) + '</span></td>' +
          '<td class="fw-bold">' + formatRupiah(t.total_bayar) + '</td>' +
          '<td>' + badgeStatus + '</td>' +
          '<td class="text-end text-nowrap">' + aksiHtml + '</td>' +
          '</tr>';
      }).join('');
    }

    function buildModalObjDariTagihanRow(t) {
      const plgObj = petugasPelangganCache.find(x => String(x.id_pelanggan) === String(t.id_pelanggan)) || {};
      const bulanIni = Number(t.total_bayar) || 0;
      const tunggakanLain = ptgTagihanCache.filter(x =>
        String(x.id_pelanggan) === String(t.id_pelanggan) &&
        String(x.id_tagihan) !== String(t.id_tagihan) &&
        String(x.status_bayar || '').trim().toLowerCase() !== 'lunas'
      );
      const totalTunggakan = tunggakanLain.reduce((acc, x) => acc + (Number(x.total_bayar) || 0), 0);

      return {
        id_tagihan: t.id_tagihan,
        periode: t.periode || '-',
        id_pelanggan: t.id_pelanggan,
        nama_pelanggan: t.nama_pelanggan || plgObj.nama_pelanggan || '-',
        dusun: t.dusun || plgObj.dusun || '-',
        rt_rw: t.rt_rw || plgObj.rt_rw || '',
        desa: plgObj.desa || 'PERCOBAAN',
        no_hp: t.no_hp || plgObj.no_hp || '',
        meter_awal: Number(t.meter_awal) || 0,
        meter_akhir: Number(t.meter_akhir) || 0,
        total_pemakaian: Number(t.total_pemakaian) || 0,
        tagihan_air: Number(t.tagihan_air) || 0,
        biaya_admin: Number(t.biaya_admin) || 0,
        denda: Number(t.denda) || 0,
        tagihan_bulan_ini: bulanIni,
        tunggakan_sebelumnya: totalTunggakan,
        jumlah_bulan_tunggakan: tunggakanLain.length,
        daftar_id_tunggakan: tunggakanLain.map(x => x.id_tagihan),
        total_tagihan_keseluruhan: bulanIni + totalTunggakan,
        status_bayar: t.status_bayar || 'Belum Lunas',
        tgl_bayar: t.tgl_bayar || ''
      };
    }

    function bukaDetailStrukTagihanPetugas(idTagihan) {
      const t = ptgTagihanCache.find(x => String(x.id_tagihan) === String(idTagihan));
      if (!t) return;
      bukaModalKonfirmasiTagihanPetugas(buildModalObjDariTagihanRow(t));
    }

    function eksekusiBayarTunaiTagihanPetugas(idTagihan) {
      const t = ptgTagihanCache.find(x => String(x.id_tagihan) === String(idTagihan));
      if (!t) return;

      const modalObj = buildModalObjDariTagihanRow(t);
      const hasTunggakanLain = modalObj.jumlah_bulan_tunggakan > 0;
      const perLabel = typeof formatPeriodeBulanTahun === 'function' ? formatPeriodeBulanTahun(t.periode) : (t.periode || '-');

      let htmlInfo = '<div class="text-start small">' +
        '<div class="mb-1">Pelanggan: <strong>' + escapeHtml(t.nama_pelanggan) + '</strong> (' + escapeHtml(t.id_pelanggan) + ')</div>' +
        '<div class="mb-1">No. Tagihan: <strong>' + escapeHtml(t.id_tagihan) + '</strong> • Periode <strong>' + escapeHtml(perLabel) + '</strong></div>' +
        '<div class="mb-2">Nominal Tagihan Ini: <strong class="text-success fs-6">' + formatRupiah(t.total_bayar) + '</strong></div>';

      if (hasTunggakanLain) {
        htmlInfo += '<div class="alert alert-warning py-2 px-2 mb-2">' +
          '<i class="fas fa-info-circle me-1"></i>Pelanggan ini juga memiliki <strong>' + modalObj.jumlah_bulan_tunggakan + ' tagihan belum lunas lainnya</strong> senilai <strong>' + formatRupiah(modalObj.tunggakan_sebelumnya) + '</strong>.' +
          '<div class="form-check mt-1">' +
          '<input class="form-check-input" type="checkbox" id="swal_lunasi_semua_tunggakan" checked>' +
          '<label class="form-check-label fw-bold" for="swal_lunasi_semua_tunggakan">Lunaskan semua sekaligus (' + formatRupiah(modalObj.total_tagihan_keseluruhan) + ')</label>' +
          '</div></div>';
      }

      htmlInfo += '<div class="text-muted">Dana tunai yang diterima akan otomatis masuk ke <strong>Dompet Setoran Petugas</strong> Anda untuk disetorkan ke Kasir/Bendahara.</div></div>';

      Swal.fire({
        title: 'Terima Pembayaran Tunai?',
        html: htmlInfo,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        confirmButtonText: '<i class="fas fa-check me-1"></i> Ya, Terima Tunai',
        cancelButtonText: 'Batal'
      }).then(r => {
        if (!r.isConfirmed) return;

        const lunasiSemua = hasTunggakanLain && Boolean(document.getElementById('swal_lunasi_semua_tunggakan')?.checked);
        const targetIds = lunasiSemua
          ? [t.id_tagihan].concat(modalObj.daftar_id_tunggakan)
          : [t.id_tagihan];

        Swal.fire({ title: 'Memproses Pelunasan Tunai...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        panggilServer('bayarTagihanTunaiPetugas', [{
          id_tagihan: t.id_tagihan,
          daftar_id_tagihan: targetIds,
          id_petugas: currentUser?.id_user || 'PTG',
          nama_petugas: currentUser?.nama_lengkap || currentUser?.username || 'Petugas',
          tgl_bayar: getCurrentYYYYMMDD()
        }, getActorPayload()],
          rawRes => {
            const res = parseGAS(rawRes);
            if (res.status === 'success') {
              Swal.fire({
                icon: 'success',
                title: 'Pembayaran Tunai Berhasil',
                text: res.message,
                showCancelButton: true,
                confirmButtonText: '<i class="fas fa-receipt me-1"></i> Lihat Struk / Cetak',
                cancelButtonText: 'Tutup'
              }).then(nextAct => {
                if (nextAct.isConfirmed) {
                  const updatedObj = Object.assign({}, modalObj, {
                    status_bayar: 'Lunas',
                    tgl_bayar: res.tanggal_bayar || getCurrentYYYYMMDD(),
                    total_tagihan_keseluruhan: lunasiSemua ? modalObj.total_tagihan_keseluruhan : (Number(t.total_bayar) || 0)
                  });
                  bukaModalKonfirmasiTagihanPetugas(updatedObj);
                }
              });
              loadTagihanPetugas();
              loadPetugasDashboard();
            } else {
              Swal.fire('Gagal', res.message, 'error');
            }
          },
          err => Swal.fire('Error', err.message, 'error')
        );
      });
    }

    function normalizeWaNumber(noHp) {
      let d = String(noHp || '').replace(/[^0-9]/g, '');
      if (!d) return '';
      if (d.startsWith('0')) return '62' + d.slice(1);
      if (d.startsWith('8')) return '62' + d;
      return d;
    }

    function buildPesanStrukWaPetugas(d) {
      const isLunas = String(d.status_bayar || '').toLowerCase() === 'lunas';
      const lines = [
        '*STRUK PENCATATAN & TAGIHAN AIR*',
        'Sistem Tagihan Air BUMDes',
        '--------------------------------',
        'ID Pelanggan : ' + (d.id_pelanggan || '-'),
        'Nama         : ' + (d.nama_pelanggan || '-'),
        'Periode      : ' + (d.periode || '-'),
        'Meter Awal   : ' + (d.meter_awal || 0) + ' m3',
        'Meter Akhir  : ' + (d.meter_akhir || 0) + ' m3',
        'Pemakaian    : ' + (d.total_pemakaian || 0) + ' m3',
        '--------------------------------',
        'Tagihan Air  : ' + formatRupiah(d.tagihan_air || 0),
        'Biaya Admin  : ' + formatRupiah(d.biaya_admin || 0),
        'Tagihan Bln  : ' + formatRupiah(d.tagihan_bulan_ini || 0)
      ];
      if (Number(d.tunggakan_sebelumnya) > 0) {
        lines.push('Tunggakan    : ' + formatRupiah(d.tunggakan_sebelumnya) + ' (' + (d.jumlah_bulan_tunggakan || 0) + ' bln)');
      }
      lines.push('Total Bayar  : *' + formatRupiah(d.total_tagihan_keseluruhan || d.tagihan_bulan_ini || 0) + '*');
      lines.push('Status       : *' + (isLunas ? 'LUNAS (Tunai Petugas)' : 'BELUM LUNAS') + '*');
      lines.push('--------------------------------');
      lines.push('Petugas: ' + (currentUser?.nama_lengkap || currentUser?.username || 'Petugas'));
      lines.push('Terima kasih.');
      return lines.join('\n');
    }

    function kirimStrukWaPetugas() {
      if (!ptgTagihanModalData) return;
      let wa = normalizeWaNumber(ptgTagihanModalData.no_hp);
      const kirimDenganNomor = (nomor) => {
        const textMsg = buildPesanStrukWaPetugas(ptgTagihanModalData);
        const url = 'https://wa.me/' + nomor + '?text=' + encodeURIComponent(textMsg);
        const w = window.open(url, '_blank');
        if (!w) {
          Swal.fire({
            icon: 'info',
            title: 'Kirim Struk WhatsApp',
            html: '<a href="' + escapeHtml(url) + '" target="_blank" class="btn btn-success fw-bold"><i class="fab fa-whatsapp me-1"></i>Buka Chat WhatsApp</a>',
            showConfirmButton: false,
            showCloseButton: true
          });
        }
      };

      if (!wa) {
        Swal.fire({
          title: 'Nomor WhatsApp Pelanggan Kosong',
          input: 'text',
          inputPlaceholder: 'Masukkan No. HP (contoh: 0812345678132)',
          showCancelButton: true,
          confirmButtonText: 'Lanjutkan ke WA',
          cancelButtonText: 'Batal'
        }).then(r => {
          if (r.isConfirmed && r.value) {
            const norm = normalizeWaNumber(r.value);
            if (norm) kirimDenganNomor(norm);
          }
        });
        return;
      }
      kirimDenganNomor(wa);
    }

    function padLineThermal(left, right) {
      const L = String(left || '');
      const R = String(right || '');
      const space = Math.max(1, 32 - L.length - R.length);
      return L + ' '.repeat(space) + R;
    }

    function buildEscPosText32(d) {
      const isLunas = String(d.status_bayar || '').toLowerCase() === 'lunas';
      const sep = '--------------------------------';
      const lines = [
        '   Sistem Tagihan Air BUMDes',
        '   Unit Layanan Air Bersih',
        sep,
        'ID    : ' + (d.id_pelanggan || '-'),
        'Nama  : ' + String(d.nama_pelanggan || '-').slice(0, 24),
        'Prd   : ' + (d.periode || '-'),
        'Meter : ' + (d.meter_awal || 0) + ' -> ' + (d.meter_akhir || 0),
        'Pakai : ' + (d.total_pemakaian || 0) + ' m3',
        sep,
        padLineThermal('Tagihan Air', Number(d.tagihan_air || 0).toLocaleString('id-ID')),
        padLineThermal('Biaya Admin', Number(d.biaya_admin || 0).toLocaleString('id-ID'))
      ];
      if (Number(d.tunggakan_sebelumnya) > 0) {
        lines.push(padLineThermal('Tunggakan', Number(d.tunggakan_sebelumnya).toLocaleString('id-ID')));
      }
      lines.push(sep);
      lines.push(padLineThermal('TOTAL', 'Rp ' + Number(d.total_tagihan_keseluruhan || d.tagihan_bulan_ini || 0).toLocaleString('id-ID')));
      lines.push(padLineThermal('STATUS', isLunas ? 'LUNAS' : 'BELUM LUNAS'));
      lines.push(sep);
      lines.push('Petugas: ' + String(currentUser?.nama_lengkap || 'Petugas').slice(0, 22));
      lines.push('   Terima Kasih');
      lines.push('');
      lines.push('');
      return lines.join('\n');
    }

    function cetakThermalWindowPrintFallback(d) {
      const isLunas = String(d.status_bayar || '').toLowerCase() === 'lunas';
      const area = document.getElementById('thermalPrintArea');
      if (!area) return;
      area.innerHTML =
        '<div style="text-align:center;font-weight:bold;">Sistem Tagihan Air BUMDes<br><span style="font-weight:normal;font-size:10px;">Unit Layanan Air Bersih</span></div>' +
        '<div style="border-top:1px dashed #000;margin:6px 0;"></div>' +
        '<div>No   : ' + escapeHtml(d.id_tagihan || '-') + '</div>' +
        '<div>ID   : ' + escapeHtml(d.id_pelanggan || '-') + '</div>' +
        '<div>Nama : ' + escapeHtml(d.nama_pelanggan || '-') + '</div>' +
        '<div>Prd  : ' + escapeHtml(d.periode || '-') + '</div>' +
        '<div>Meter: ' + (d.meter_awal || 0) + ' -&gt; ' + (d.meter_akhir || 0) + ' (' + (d.total_pemakaian || 0) + ' m3)</div>' +
        '<div style="border-top:1px dashed #000;margin:6px 0;"></div>' +
        '<table style="width:100%;font-size:11px;font-family:monospace;">' +
        '<tr><td>Tagihan Air</td><td style="text-align:right;">' + Number(d.tagihan_air || 0).toLocaleString('id-ID') + '</td></tr>' +
        '<tr><td>Biaya Admin</td><td style="text-align:right;">' + Number(d.biaya_admin || 0).toLocaleString('id-ID') + '</td></tr>' +
        (Number(d.tunggakan_sebelumnya) > 0 ? '<tr><td>Tunggakan</td><td style="text-align:right;">' + Number(d.tunggakan_sebelumnya).toLocaleString('id-ID') + '</td></tr>' : '') +
        '<tr><td><strong>TOTAL</strong></td><td style="text-align:right;"><strong>Rp ' + Number(d.total_tagihan_keseluruhan || d.tagihan_bulan_ini || 0).toLocaleString('id-ID') + '</strong></td></tr>' +
        '</table>' +
        '<div style="border-top:1px dashed #000;margin:6px 0;"></div>' +
        '<div style="text-align:center;">Status: <strong>' + (isLunas ? 'LUNAS' : 'BELUM LUNAS') + '</strong><br>Petugas: ' + escapeHtml(currentUser?.nama_lengkap || 'Petugas') + '<br>Terima Kasih</div>';

      document.body.classList.add('printing-thermal');
      setTimeout(() => {
        window.print();
        setTimeout(() => document.body.classList.remove('printing-thermal'), 1990);
      }, 150);
    }

    async function cetakStrukThermalPetugas() {
      if (!ptgTagihanModalData) return;
      const d = ptgTagihanModalData;
      const escText = buildEscPosText32(d);

      if (navigator.bluetooth && typeof navigator.bluetooth.requestDevice === 'function') {
        try {
          const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2']
          });
          const server = await device.gatt.connect();
          const services = await server.getPrimaryServices();
          let charTarget = null;
          for (const svc of services) {
            const chars = await svc.getCharacteristics();
            const writable = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);
            if (writable) { charTarget = writable; break; }
          }
          if (charTarget) {
            const encoder = new TextEncoder();
            const bytes = encoder.encode('\x1B\x199' + escText + '\n\n\n');
            for (let i = 0; i < bytes.length; i += 100) {
              await charTarget.writeValue(bytes.slice(i, i + 100));
            }
            Swal.fire('Tercetak', 'Struk berhasil dikirim ke printer Bluetooth 58mm.', 'success');
            return;
          }
        } catch (err) {
          console.log('Bluetooth print fallback to window.print:', err && err.message ? err.message : err);
        }
      }
      cetakThermalWindowPrintFallback(d);
    }

    function loadHistoryPetugas() {
      const tbody = document.getElementById('tbodyRiwayatPetugas');
      const periode = document.getElementById('ptg_riwayat_periode')?.value || document.getElementById('ptg_periode')?.value || getCurrentYYYYMM();
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Memuat riwayat pencatatan...</td></tr>';
      panggilServer('getHistoryCatatMeter', [periode, currentUser?.area_tugas || 'Semua Area'],
        rawRes => {
          const res = parseGAS(rawRes);
          ptgHistoryCache = (res.status === 'success' && Array.isArray(res.data)) ? res.data : [];
          renderHistoryPetugasTable();
        },
        err => { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">' + escapeHtml(err.message) + '</td></tr>'; }
      );
    }

    function setFilterHistoryPetugas(mode) {
      ptgHistoryFilter = mode;
      renderHistoryPetugasTable();
    }

    function resetSearchHistoryPetugas() {
      const inp = document.getElementById('ptg_search_riwayat');
      if (inp) inp.value = '';
      renderHistoryPetugasTable();
    }

    function renderHistoryPetugasTable() {
      const tbody = document.getElementById('tbodyRiwayatPetugas');
      const infoEl = document.getElementById('ptgHistoryCountInfo');
      if (!tbody) return;

      ['Semua', 'Belum', 'Sudah'].forEach(k => {
        const b = document.getElementById('btnFilterHist' + k);
        if (b) b.classList.toggle('active', ptgHistoryFilter === k.toLowerCase());
      });

      const q = String(document.getElementById('ptg_search_riwayat')?.value || '').trim().toLowerCase();
      const filtered = ptgHistoryCache.filter(r => {
        const isSudah = r.status_catat === 'Sudah';
        if (ptgHistoryFilter === 'belum' && isSudah) return false;
        if (ptgHistoryFilter === 'sudah' && !isSudah) return false;
        if (q) {
          const hay = (String(r.nama_pelanggan || '') + ' ' + String(r.id_pelanggan || '') + ' ' + String(r.dusun || '')).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      if (infoEl) infoEl.textContent = 'Menampilkan ' + filtered.length + ' dari ' + ptgHistoryCache.length + ' pelanggan wilayah';
      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Tidak ada data pelanggan yang sesuai filter.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(r => {
        const isSudah = r.status_catat === 'Sudah';
        const rowAttr = !isSudah
          ? ' class="clickable-row-belum" onclick="catatDariRiwayat(\'' + escapeHtml(r.id_pelanggan) + '\')" title="Klik untuk langsung mencatat meter"'
          : '';
        const kondisiBadge = (!isSudah || !r.kondisi_lapangan || r.kondisi_lapangan === 'Normal' || r.kondisi_lapangan === '-')
          ? '<span class="small text-muted">' + escapeHtml(r.kondisi_lapangan || '-') + '</span>'
          : '<span class="badge bg-warning text-dark">' + escapeHtml(r.kondisi_lapangan) + '</span>';

        return '<tr' + rowAttr + '>' +
          '<td><div class="fw-bold">' + escapeHtml(r.nama_pelanggan) + '</div><small class="text-muted">' + escapeHtml(r.id_pelanggan) + ' • ' + escapeHtml(r.alamat || r.dusun || '-') + '</small></td>' +
          '<td>' + (isSudah ? '<span class="badge bg-success">Sudah</span>' : '<span class="badge bg-warning text-dark">Belum</span>') + '</td>' +
          '<td>' + r.meter_awal + '</td>' +
          '<td>' + r.meter_akhir + '</td>' +
          '<td class="fw-bold">' + r.total_pemakaian + (isSudah ? ' m³' : '') + '</td>' +
          '<td>' + kondisiBadge + '</td>' +
          '<td class="text-end">' +
            (!isSudah
              ? '<button type="button" class="btn btn-xs btn-spark-primary fw-semibold" onclick="event.stopPropagation(); catatDariRiwayat(\'' + escapeHtml(r.id_pelanggan) + '\')"><i class="fas fa-edit me-1"></i>Catat</button>'
              : '<span class="small text-success fw-semibold"><i class="fas fa-check"></i> Tercatat</span>') +
          '</td>' +
          '</tr>';
      }).join('');
    }

    function catatDariRiwayat(idPelanggan) {
      const periodeRiwayat = document.getElementById('ptg_riwayat_periode')?.value;
      if (periodeRiwayat && document.getElementById('ptg_periode')) {
        document.getElementById('ptg_periode').value = periodeRiwayat;
      }
      showPetugasMenu('petugas-catat', document.querySelector('#petugasSidebar .menu-btn[data-ptg-menu="petugas-catat"]'));

      let p = petugasPelangganCache.find(x => String(x.id_pelanggan) === String(idPelanggan));
      if (!p) {
        const h = ptgHistoryCache.find(x => String(x.id_pelanggan) === String(idPelanggan));
        if (h) {
          p = h;
          petugasPelangganCache.push(h);
        }
      }
      if (p) {
        pilihPelangganPetugas(p.id_pelanggan);
        setTimeout(() => {
          const mAkhirEl = document.getElementById('ptg_meter_akhir');
          if (mAkhirEl) mAkhirEl.focus();
        }, 200);
      }
    }

    function loadSetoranPetugas() {
      const tgl = document.getElementById('ptg_setor_tgl_filter')?.value || '';
      const tbodyTerima = document.getElementById('tbodySetoranPenerimaan');
      const tbodyRiwayat = document.getElementById('tbodyRiwayatSetoranPetugas');
      panggilServer('getSetoranPetugasData', [
        currentUser?.id_user || '',
        currentUser?.nama_lengkap || currentUser?.username || '',
        tgl
      ], rawRes => {
        const res = parseGAS(rawRes);
        if (res.status !== 'success') return;
        const s = res.summary || {};
        document.getElementById('ptgSetorBelumNominal').textContent = formatRupiah(s.belum_disetor || 0);
        document.getElementById('ptgSetorBelumCount').textContent = (s.jumlah_belum_disetor || 0) + ' transaksi tunai';
        document.getElementById('ptgSetorMenungguNominal').textContent = formatRupiah(s.menunggu_verifikasi || 0);
        document.getElementById('ptgSetorSudahNominal').textContent = formatRupiah(s.sudah_disetor || 0);

        const btnAjukan = document.getElementById('btnAjukanSetoranBendahara');
        if (btnAjukan) btnAjukan.disabled = !(Number(s.belum_disetor) > 0);

        const listTerima = Array.isArray(res.penerimaan_list) ? res.penerimaan_list : [];
        if (tbodyTerima) {
          tbodyTerima.innerHTML = listTerima.length === 0
            ? '<tr><td colspan="6" class="text-center text-muted py-3">Belum ada transaksi penerimaan tunai.</td></tr>'
            : listTerima.map(it => {
              const stLow = String(it.status_setoran || '').toLowerCase();
              let badge = '<span class="badge bg-danger-subtle text-danger border">Belum Disetor</span>';
              if (stLow.includes('sudah') || stLow.includes('diterima')) badge = '<span class="badge bg-success-subtle text-success border">Sudah Disetor</span>';
              else if (stLow.includes('menunggu')) badge = '<span class="badge bg-warning text-dark">Menunggu Bendahara</span>';
              return '<tr class="small"><td class="fw-bold">' + escapeHtml(it.id_tagihan) + '</td>' +
                '<td><div class="fw-semibold">' + escapeHtml(it.nama_pelanggan) + '</div><small class="text-muted">' + escapeHtml(it.id_pelanggan) + '</small></td>' +
                '<td>' + escapeHtml(it.periode) + '</td><td>' + escapeHtml(it.tgl_bayar || '-') + '</td>' +
                '<td class="fw-bold">' + formatRupiah(it.total_bayar) + '</td><td>' + badge + '</td></tr>';
            }).join('');
        }

        const listRiwayat = Array.isArray(res.riwayat_setoran) ? res.riwayat_setoran : [];
        if (tbodyRiwayat) {
          tbodyRiwayat.innerHTML = listRiwayat.length === 0
            ? '<tr><td colspan="6" class="text-center text-muted py-3">Belum ada riwayat pengajuan setoran.</td></tr>'
            : listRiwayat.map(r => {
              const stLow = String(r.status_setoran || '').toLowerCase();
              let badge = '<span class="badge bg-warning text-dark">' + escapeHtml(r.status_setoran || 'Menunggu') + '</span>';
              if (stLow.includes('diterima')) badge = '<span class="badge bg-success">Diterima Bendahara</span>';
              else if (stLow.includes('tolak')) badge = '<span class="badge bg-danger">Ditolak</span>';
              return '<tr class="small"><td class="fw-bold text-primary">' + escapeHtml(r.id_setoran) + '</td>' +
                '<td>' + escapeHtml(String(r.tanggal || '').slice(0, 10)) + '</td>' +
                '<td>' + (Number(r.jumlah_nota) || 0) + ' nota</td>' +
                '<td class="fw-bold">' + formatRupiah(r.total_nominal) + '</td>' +
                '<td>' + badge + '</td><td>' + escapeHtml(r.verifikator || '-') + '</td></tr>';
            }).join('');
        }
      });
    }

    function ajukanSetoranKeBendahara() {
      const catatan = (document.getElementById('ptgSetorCatatanInput')?.value || '').trim();
      Swal.fire({
        title: 'Ajukan Serah Terima Setoran?',
        text: 'Seluruh dana tunai berstatus Belum Disetor akan diajukan untuk diverifikasi Bendahara.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Ajukan Sekarang',
        cancelButtonText: 'Batal'
      }).then(r => {
        if (!r.isConfirmed) return;
        panggilServer('ajukanSetoranPetugas', [{
          id_petugas: currentUser?.id_user || '',
          nama_petugas: currentUser?.nama_lengkap || currentUser?.username || 'Petugas',
          catatan: catatan
        }, getActorPayload()],
          rawRes => {
            const res = parseGAS(rawRes);
            if (res.status === 'success') {
              document.getElementById('ptgSetorCatatanInput').value = '';
              Swal.fire('Pengajuan Terkirim', res.message, 'success');
              loadSetoranPetugas();
              loadPetugasDashboard();
            } else {
              Swal.fire('Gagal', res.message, 'error');
            }
          },
          err => Swal.fire('Error', err.message, 'error')
        );
      });
    }

    function loadSpkPetugas() {
      const tbody = document.getElementById('tbodySpkPetugas');
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Memuat daftar tugas SPK...</td></tr>';

      panggilServer('getSPKByPetugas', [currentUser?.id_user || '', currentUser?.nama_lengkap || ''],
        function (rawRes) {
          const res = parseGAS(rawRes);
          const list = (res.status === 'success' && res.data) ? res.data : [];
          list.forEach(s => { spkCacheMap[s.id_spk] = s; });
          if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Tidak ada tugas SPK untuk akun Anda.</td></tr>';
            return;
          }
          tbody.innerHTML = list.map(s => {
            const isSelesai = String(s.status_spk || '').toLowerCase() === 'selesai';
            const buktiBtn = s.foto_bukti
              ? '<button class="btn btn-xs btn-outline-info py-1 px-2" onclick="lihatFotoBuktiSPK(\'' + escapeHtml(s.id_spk) + '\')"><i class="fas fa-image me-1"></i>Lihat</button>'
              : '<span class="text-muted small">-</span>';
            const btnCetak = '<button class="btn btn-xs btn-outline-danger py-1 px-2 me-1" onclick="cetakSuratSPK(\'' + escapeHtml(s.id_spk) + '\')" title="Cetak / PDF Surat SPK"><i class="fas fa-file-pdf me-1"></i>Surat PDF</button>';
            const btnDone = isSelesai
              ? '<span class="text-success small fw-bold"><i class="fas fa-check"></i> Selesai</span>'
              : '<button class="btn btn-xs btn-success fw-bold py-1 px-2" onclick="kerjakanSpkPetugas(\'' + escapeHtml(s.id_spk) + '\')"><i class="fas fa-camera me-1"></i>Selesaikan</button>';

            return '<tr>' +
              '<td class="fw-bold text-primary small">' + escapeHtml(s.id_spk) + '</td>' +
              '<td>' + escapeHtml(s.jenis_mutasi) + '</td>' +
              '<td><div class="fw-bold">' + escapeHtml(s.nama_pelanggan) + '</div><small class="text-muted">' + escapeHtml(s.dusun || '-') + '</small></td>' +
              '<td class="small">' + escapeHtml(s.keterangan || '-') + '</td>' +
              '<td>' + buktiBtn + '</td>' +
              '<td>' + (isSelesai ? '<span class="badge bg-success">Selesai</span>' : '<span class="badge bg-warning text-dark">Menunggu</span>') + '</td>' +
              '<td class="text-end text-nowrap">' + btnCetak + btnDone + '</td>' +
              '</tr>';
          }).join('');
        },
        err => { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">' + escapeHtml(err.message) + '</td></tr>'; }
      );
    }

    function kerjakanSpkPetugas(idSpk) {
      const s = spkCacheMap[idSpk] || {};
      ptgSpkFotoBase64 = '';
      document.getElementById('formSelesaikanSpkPetugas').reset();
      document.getElementById('ptg_spk_id_selesai').value = idSpk;
      document.getElementById('ptg_spk_info_selesai').textContent = idSpk + ' — ' + (s.nama_pelanggan || '-') + ' (' + (s.jenis_mutasi || '-') + ')';
      document.getElementById('ptg_spk_foto_preview_box').classList.add('d-none');
      document.getElementById('ptg_spk_foto_preview').src = '';
      new bootstrap.Modal(document.getElementById('modalSelesaikanSpkPetugas')).show();
    }

    function previewFotoSpkPetugas(input) {
      if (!input.files || !input.files[0]) {
        ptgSpkFotoBase64 = '';
        document.getElementById('ptg_spk_foto_preview_box').classList.add('d-none');
        return;
      }
      compressImageToTargetKB(input.files[0], 800, 80, 120)
        .then(base64 => {
          ptgSpkFotoBase64 = base64;
          document.getElementById('ptg_spk_foto_preview').src = base64;
          document.getElementById('ptg_spk_foto_preview_box').classList.remove('d-none');
        })
        .catch(() => {
          ptgSpkFotoBase64 = '';
          Swal.fire('Gagal', 'File foto tidak dapat dibaca.', 'error');
        });
    }

    document.getElementById('formSelesaikanSpkPetugas').addEventListener('submit', async function (e) {
      e.preventDefault();
      const idSpk = document.getElementById('ptg_spk_id_selesai').value;
      const fileInput = document.getElementById('ptg_spk_foto');
      if (!ptgSpkFotoBase64 && fileInput.files && fileInput.files[0]) {
        try { ptgSpkFotoBase64 = await compressImageToTargetKB(fileInput.files[0], 800, 80, 120); } catch (err) { console.error(err); }
      }
      if (!ptgSpkFotoBase64) {
        Swal.fire('Bukti Foto Wajib', 'Silakan ambil atau unggah foto bukti pekerjaan terlebih dahulu.', 'warning');
        return;
      }

      const btn = document.getElementById('btnKirimSelesaiSpk');
      btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Mengunggah &amp; Menyimpan...';

      const laporan = {
        catatan_petugas: document.getElementById('ptg_spk_catatan').value.trim() || 'Selesai dikerjakan di lapangan',
        foto_bukti: ptgSpkFotoBase64
      };

      panggilServer('selesaikanSPKTeknik', [idSpk, getActorPayload(), laporan],
        function (rawRes) {
          btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Upload Bukti &amp; Selesaikan SPK';
          const res = parseGAS(rawRes);
          if (res.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modalSelesaikanSpkPetugas'))?.hide();
            ptgSpkFotoBase64 = '';
            Swal.fire('Berhasil', res.message, 'success');
            loadSpkPetugas();
            loadPetugasDashboard();
          } else { Swal.fire('Gagal', res.message, 'error'); }
        },
        function (err) {
          btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Upload Bukti &amp; Selesaikan SPK';
          Swal.fire('Error', err.message, 'error');
        }
      );
    });

    // =========================================================================
    // 13. PANEL PETUGAS: PENCARIAN PELANGGAN
    // =========================================================================
    let petugasPelangganCache = [];
    let petugasPelangganLabelTerpilih = '';

    function labelPelangganPetugas(p) { return String(p.id_pelanggan || '') + ' - ' + String(p.nama_pelanggan || '') + ' (' + String(p.dusun || '-') + ')'; }

    function cariPelangganPetugas() {
      const input = document.getElementById('ptg_cari_pelanggan'), hidden = document.getElementById('ptg_id_pelanggan'), box = document.getElementById('ptg_hasil_pelanggan');
      if (!input || !hidden || !box) return;
      if (hidden.value && input.value !== petugasPelangganLabelTerpilih) {
        hidden.value = ''; petugasPelangganLabelTerpilih = '';
        document.getElementById('ptg_info_terpilih').classList.add('d-none');
        document.getElementById('ptg_meter_awal').value = 0;
        document.getElementById('ptg_meter_awal_display').textContent = '0';
        hitungPemakaianPetugas();
      }
      if (hidden.value) { box.classList.add('d-none'); return; }
      const q = input.value.trim().toLowerCase();
      document.getElementById('ptg_btn_hapus_pilihan').classList.toggle('d-none', !input.value);
      if (!q) { box.classList.add('d-none'); box.innerHTML = ''; return; }
      const tokens = q.split(/\s+/).filter(Boolean);
      const hasil = petugasPelangganCache.filter(p => {
        const hay = (String(p.id_pelanggan || '') + ' ' + String(p.nama_pelanggan || '') + ' ' + String(p.dusun || '')).toLowerCase();
        return tokens.every(t => hay.indexOf(t) !== -1);
      });
      box.classList.remove('d-none');
      if (hasil.length === 0) { box.innerHTML = '<div class="list-group-item small text-muted">Pelanggan tidak ditemukan.</div>'; return; }
      const MAX = 30;
      let html = hasil.slice(0, MAX).map(p => '<button type="button" class="list-group-item list-group-item-action py-2" data-id="' + escapeHtml(p.id_pelanggan) + '"><div class="fw-bold">' + escapeHtml(p.nama_pelanggan) + '</div><small class="text-muted">' + escapeHtml(p.id_pelanggan) + ' • Dusun ' + escapeHtml(p.dusun || '-') + '</small></button>').join('');
      if (hasil.length > MAX) html += '<div class="list-group-item small text-muted">Menampilkan ' + MAX + ' dari ' + hasil.length + ' hasil.</div>';
      box.innerHTML = html;
    }

    function enterCariPelangganPetugas(e) {
      if (e.key !== 'Enter') return; e.preventDefault();
      const first = document.querySelector('#ptg_hasil_pelanggan [data-id]');
      if (first) pilihPelangganPetugas(first.getAttribute('data-id'));
    }

    function pilihPelangganPetugas(id) {
      const p = petugasPelangganCache.find(x => String(x.id_pelanggan) === String(id));
      if (!p) return;
      const label = labelPelangganPetugas(p); petugasPelangganLabelTerpilih = label;
      document.getElementById('ptg_id_pelanggan').value = p.id_pelanggan;
      document.getElementById('ptg_cari_pelanggan').value = label;
      document.getElementById('ptg_hasil_pelanggan').classList.add('d-none');
      document.getElementById('ptg_btn_hapus_pilihan').classList.remove('d-none');
      const info = document.getElementById('ptg_info_terpilih');
      info.textContent = '✓ Pelanggan terpilih: ' + String(p.nama_pelanggan || ''); info.classList.remove('d-none');
      onSelectPelangganCatat();
    }

    function resetPencarianPelangganPetugas() {
      const input = document.getElementById('ptg_cari_pelanggan'); if (input) input.value = '';
      const hidden = document.getElementById('ptg_id_pelanggan'); if (hidden) hidden.value = '';
      petugasPelangganLabelTerpilih = '';
      const box = document.getElementById('ptg_hasil_pelanggan'); if (box) { box.classList.add('d-none'); box.innerHTML = ''; }
      const info = document.getElementById('ptg_info_terpilih'); if (info) info.classList.add('d-none');
      const alm = document.getElementById('ptg_alamat_terpilih'); if (alm) alm.classList.add('d-none');
      const btnX = document.getElementById('ptg_btn_hapus_pilihan'); if (btnX) btnX.classList.add('d-none');
      const awal = document.getElementById('ptg_meter_awal'); if (awal) awal.value = 0;
      const disp = document.getElementById('ptg_meter_awal_display'); if (disp) disp.textContent = '0';
      hitungPemakaianPetugas();
    }

    document.getElementById('ptg_hasil_pelanggan').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-id]');
      if (btn) pilihPelangganPetugas(btn.getAttribute('data-id'));
    });