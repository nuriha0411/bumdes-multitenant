/**
 * ============================================================================
 * SUPABASE ADAPTER FOR GOOGLE APPS SCRIPT (google.script.run Polyfill)
 * 100% Sinkron dengan Skema RPC Database PDAM BUMDes
 * ============================================================================
 */
(function () {
  const SUPABASE_URL = 'https://scqfzyewmulwekvnpeyu.supabase.co'; // <-- ISI DENGAN URL SUPABASE ANDA!
  const SUPABASE_KEY = 'sb_publishable_Vow8RBhcaNkPgQz-vWShDQ_IxxlOTjF';
  const STORAGE_BUCKET = 'pdam-files';

  if (!window.supabase) {
    console.error('[Supabase Adapter] SDK @supabase/supabase-js belum dimuat!');
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window.sbClient = sb;

  // Pemetaan 100% sesuai nama & parameter fungsi RPC di Supabase Anda
  const RPC_PARAM_MAP = {
    // Autentikasi & Dashboard Admin
    loginUser: ['p_role', 'p_username', 'p_password'],
    prosesLogin: ['p_role', 'p_username', 'p_password'],
    getDashboardStats: ['p_periode_input', 'p_dusun_input'],
    getLaporanKeuangan: ['p_periode_input', 'p_wilayah_input', 'p_jumlah_bulan_grafik'],

    // Pelanggan
    getPelanggan: [],
    addPelanggan: ['p_form', 'p_actor'],
    updatePelanggan: ['p_form', 'p_actor'],
    getDataPelangganSP: [],
    resetPasswordPelanggan: ['p_id_pelanggan', 'p_password_baru', 'p_actor'],

    // Tagihan & Pembayaran
    getTagihan: [],
    getDataStruk: ['p_id_tagihan'],
    prosesRilisTagihanBatch: ['p_periode'],
    prosesTerapkanDenda: ['p_periode', 'p_nominal_denda'],
    terapkanDendaOtomatis: ['p_periode_input', 'p_actor'],
    prosesBayarTagihan: ['p_id_tagihan', 'p_tgl_bayar_custom', 'p_metode_bayar_custom', 'p_actor'],
    sinkronTarifTagihanOtomatis: [],

    // Catat Meter & Validasi
    getLastMeter: ['p_id_pelanggan'],
    submitCatatMeter: ['p_form'],
    getCatatMeterPending: [],
    getHistoryCatatMeter: ['p_periode', 'p_area_tugas'],
    getValidasiMeter: [],
    prosesApprovalMeter: ['p_id_catat', 'p_aksi', 'p_meter_akhir_revisi', 'p_catatan'],
    prosesValidasiMeterMassal: ['p_id_list', 'p_status_baru', 'p_catatan', 'p_actor'],
    validasiCatatanMeter: ['p_payload', 'p_actor'],

    // Petugas & Setoran
    getPetugasDashboardData: ['p_id_petugas', 'p_nama_petugas', 'p_area_tugas', 'p_periode_input'],
    bayarTagihanTunaiPetugas: ['p_payload', 'p_actor'],
    ajukanSetoranPetugas: ['p_payload', 'p_actor'],
    getSetoranPetugasData: ['p_id_petugas', 'p_nama_petugas', 'p_tanggal_filter'],
    getSetoranPetugasAdmin: [],
    verifikasiSetoranPetugas: ['p_id_setoran', 'p_aksi', 'p_actor'],

    // Portal Pelanggan
    getPortalPelangganDashboard: ['p_id_pelanggan', 'p_session_info'],
    getPortalPelangganData: ['p_id_pelanggan', 'p_session_info'],
    getRiwayatPemakaianPelanggan: ['p_id_pelanggan', 'p_limit'],
    submitMeterMandiriPelanggan: ['p_payload', 'p_session_info'],
    getLayananGangguanPelanggan: ['p_id_pelanggan', 'p_session_info'],
    submitLayananGangguanPelanggan: ['p_payload', 'p_session_info'],
    updateProfilPelanggan: ['p_payload', 'p_session_info'],
    gantiPasswordPelanggan: ['p_payload', 'p_session_info'],
    getInfoPembayaran: [],
    submitKonfirmasiPembayaran: ['p_payload', 'p_session_info'],
    tolakBuktiTransferTagihan: ['p_id_tagihan', 'p_alasan', 'p_actor'],
    getKonfirmasiPembayaranPelanggan: ['p_id_pelanggan'],

    // Pengaduan
    getPengaduan: [],
    getPengaduanByPelanggan: ['p_id_pelanggan'],
    submitPengaduan: ['p_form'],
    updateStatusPengaduan: ['p_id_tiket', 'p_status_baru'],

    // Pengeluaran, Produksi, Tarif & Denda
    simpanPengeluaran: ['p_form', 'p_actor'],
    hapusPengeluaran: ['p_id_pengeluaran', 'p_actor'],
    simpanProduksiAir: ['p_form'],
    getTarifDanDenda: [],
    getGolonganTarifAktif: [],
    simpanTarifGolongan: ['p_payload', 'p_actor'],
    hapusTarifGolongan: ['p_id_golongan', 'p_actor'],
    simpanAturanDenda: ['p_payload', 'p_actor'],

    // SPK Teknik, Stok, Aset, User & Sistem
    getDataSPKTeknik: [],
    getSPKByPetugas: ['p_id_petugas', 'p_nama_petugas'],
    getDetailSPKTeknik: ['p_id_spk'],
    simpanSPKTeknik: ['p_payload', 'p_actor'],
    selesaikanSPKTeknik: ['p_id_spk', 'p_actor', 'p_laporan_petugas'],
    getDataManajemenUser: [],
    simpanUserSistem: ['p_payload', 'p_actor'],
    updateStatusAtauAreaUser: ['p_payload', 'p_actor'],
    getDataStokDanAset: [],
    simpanMaterialBaru: ['p_payload', 'p_actor'],
    catatMutasiStok: ['p_payload', 'p_actor'],
    simpanPerawatanAset: ['p_payload', 'p_actor'],
    getAuditLogs: [],
    checkSystemLockStatus: [],
    setSystemLockOverride: ['p_status_bool'],
    toggleSystemOverride: ['p_enable_override', 'p_actor']
  };

  // Alias jika ada perbedaan penamaan lama vs baru
  const RPC_NAME_ALIAS = {
    getAllPelanggan: 'getPelanggan',
    tambahPelanggan: 'addPelanggan',
    getDashboardAdmin: 'getDashboardStats'
  };

  // Field foto base64 yang otomatis diunggah ke Supabase Storage sebelum memanggil RPC
  const FILE_UPLOAD_RULES = {
    addPelanggan: [{ keys: ['foto_ktp', 'fotoKtpBase64', 'fotoBase64'], target: 'foto_ktp', folder: 'pelanggan' }],
    tambahPelanggan: [{ keys: ['foto_ktp', 'fotoKtpBase64', 'fotoBase64'], target: 'foto_ktp', folder: 'pelanggan' }],
    updatePelanggan: [{ keys: ['foto_ktp', 'fotoKtpBase64', 'fotoBase64'], target: 'foto_ktp', folder: 'pelanggan' }],
    submitCatatMeter: [
      { keys: ['foto_meter', 'fotoBase64'], target: 'foto_meter', folder: 'meter' },
      { keys: ['foto_kendala', 'fotoKendalaBase64'], target: 'foto_kendala', folder: 'kendala' }
    ],
    submitMeterMandiriPelanggan: [{ keys: ['foto_meter', 'fotoBase64'], target: 'foto_meter', folder: 'meter-mandiri' }],
    submitLayananGangguanPelanggan: [{ keys: ['foto_keluhan', 'fotoBase64'], target: 'foto_keluhan', folder: 'gangguan' }],
    submitPengaduan: [{ keys: ['foto_keluhan', 'fotoBase64'], target: 'foto_keluhan', folder: 'gangguan' }],
    selesaikanSPKTeknik: [{ keys: ['foto_bukti', 'fotoBase64'], target: 'foto_bukti', folder: 'spk', argIndex: 2 }],
    submitKonfirmasiPembayaran: [{ keys: ['fotoBase64', 'bukti_transfer'], target: 'bukti_transfer', folder: 'bukti-transfer' }]
  };

  async function uploadBase64ToStorage(dataUrl, folder) {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return dataUrl;
    }

    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) throw new Error('Format gambar base64 tidak valid.');

    const mimeType = matches[1];
    const base64Data = matches[2];
    const ext = (mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');

    const byteCharacters = atob(base64Data);
    const byteArrays = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteArrays], { type: mimeType });

    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadErr } = await sb.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, blob, { contentType: mimeType, upsert: false });

    if (uploadErr) {
      throw new Error('Gagal mengunggah foto ke Storage: ' + uploadErr.message);
    }

    const { data: pubData } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    return pubData.publicUrl;
  }

  async function preprocessFileUploads(fnName, args) {
    const rules = FILE_UPLOAD_RULES[fnName];
    if (!rules) return args;

    const clonedArgs = [...args];
    for (const rule of rules) {
      const idx = rule.argIndex !== undefined ? rule.argIndex : 0;
      const obj = clonedArgs[idx];
      if (!obj || typeof obj !== 'object') continue;

      const copyObj = { ...obj };
      for (const k of rule.keys) {
        if (copyObj[k] && typeof copyObj[k] === 'string' && copyObj[k].startsWith('data:')) {
          const url = await uploadBase64ToStorage(copyObj[k], rule.folder);
          copyObj[rule.target] = url;
          if (k !== rule.target) delete copyObj[k];
          break;
        }
      }
      clonedArgs[idx] = copyObj;
    }
    return clonedArgs;
  }

  function createRunner(successHandler, failureHandler) {
    const proxy = new Proxy(
      {},
      {
        get(_, prop) {
          if (prop === 'withSuccessHandler') {
            return (fn) => createRunner(fn, failureHandler);
          }
          if (prop === 'withFailureHandler') {
            return (fn) => createRunner(successHandler, fn);
          }

          return async function (...rawArgs) {
            const fnName = String(prop);
            const paramNames = RPC_PARAM_MAP[fnName];

            if (!paramNames) {
              const err = new Error(`Fungsi RPC "${fnName}" belum terdaftar di supabase-adapter.js`);
              if (failureHandler) failureHandler(err);
              else console.error(err);
              return;
            }

            try {
              const processedArgs = await preprocessFileUploads(fnName, rawArgs);
              const rpcParams = {};
              paramNames.forEach((paramKey, i) => {
                if (processedArgs[i] !== undefined) {
                  rpcParams[paramKey] = processedArgs[i];
                }
              });

              const actualRpcName = RPC_NAME_ALIAS[fnName] || fnName;
              const { data, error } = await sb.rpc(actualRpcName, rpcParams);
              if (error) throw new Error(error.message);

              const resultPayload = typeof data === 'string' ? data : JSON.stringify(data);
              if (successHandler) successHandler(resultPayload);
            } catch (err) {
              if (failureHandler) failureHandler(err);
              else console.error(`[RPC ${fnName}] Error:`, err);
            }
          };
        }
      }
    );
    return proxy;
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = createRunner(null, null);
})();