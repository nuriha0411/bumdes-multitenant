/**
 * ============================================================================
 * SUPABASE ADAPTER FOR GOOGLE APPS SCRIPT (google.script.run Polyfill)
 * Multi-Tenant, Auto-Subdomain/URL Branding, Favicon & Letter Template Engine
 * ============================================================================
 */
(function () {
  const SUPABASE_URL = 'https://qbbihcseqjrtwijyvdrl.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_wU4HyrXrTYhKXZdtLOmiCg_mQHB82OT';
  const STORAGE_BUCKET = 'pdam-files';
  const DEFAULT_ID_DESA = 'DESA-001';

  if (!window.supabase) {
    console.error('[Supabase Adapter] SDK @supabase/supabase-js belum dimuat!');
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window.sbClient = sb;

  let isApplyingBranding = false;
  let isExplicitHostOrParam = false;

  // ==========================================================================
  // 1. MANAJEMEN TENANT AKTIF & BRANDING (LOGO, FAVICON, KOP & TEMPLATE SURAT)
  // ==========================================================================
  function getActiveTenant() {
    if (window.currentTenant && typeof window.currentTenant === 'object' && window.currentTenant.id_desa) {
      return window.currentTenant;
    }
    try {
      const saved = localStorage.getItem('bumdes_active_tenant');
      if (saved && saved.startsWith('{')) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id_desa) {
          window.currentTenant = parsed;
          return parsed;
        }
      }
    } catch (_) {}
    return null;
  }

  function getActiveIdDesa() {
    const t = getActiveTenant();
    if (t && t.id_desa) return String(t.id_desa).trim();

    if (window.currentUser && window.currentUser.id_desa) {
      return String(window.currentUser.id_desa).trim();
    }
    if (window.currentPelanggan && window.currentPelanggan.id_desa) {
      return String(window.currentPelanggan.id_desa).trim();
    }

    const explicitDesa = localStorage.getItem('bumdes_active_id_desa');
    if (explicitDesa && explicitDesa.trim() !== '') {
      return explicitDesa.trim();
    }

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key);
        if (val && val.startsWith('{') && val.includes('"id_desa"')) {
          const parsed = JSON.parse(val);
          if (parsed && parsed.id_desa) {
            return String(parsed.id_desa).trim();
          }
        }
      }
    } catch (_) {}

    return DEFAULT_ID_DESA;
  }

  function setActiveIdDesa(idDesa) {
    if (!idDesa) return;
    localStorage.setItem('bumdes_active_id_desa', String(idDesa).trim());
  }

  function setActiveTenant(tenantObj, applyVisual = true) {
    if (!tenantObj || !tenantObj.id_desa) return;
    window.currentTenant = tenantObj;
    setActiveIdDesa(tenantObj.id_desa);
    try {
      localStorage.setItem('bumdes_active_tenant', JSON.stringify(tenantObj));
    } catch (_) {}

    if (applyVisual) {
      applyTenantBranding(tenantObj);
    }
  }

  function applyTenantBranding(tenant) {
    if (isApplyingBranding) return;
    const t = tenant || getActiveTenant();
    if (!t || typeof t !== 'object') return;

    isApplyingBranding = true;
    try {
      // 1. Ganti Ikon Tab Browser (Favicon) jika logo_url tersedia
      if (t.logo_url && String(t.logo_url).trim() !== '') {
        const logoUrl = String(t.logo_url).trim();
        let iconLinks = document.querySelectorAll("link[rel*='icon']");
        if (iconLinks.length === 0) {
          const link = document.createElement('link');
          link.rel = 'icon';
          link.href = logoUrl;
          document.head.appendChild(link);
        } else {
          iconLinks.forEach((lnk) => {
            if (lnk.getAttribute('href') !== logoUrl) {
              lnk.href = logoUrl;
            }
          });
        }
      }

      // 2. Perbarui Judul Tab Browser
      if (t.nama_bumdes || t.nama_desa) {
        const unitLabel = t.nama_unit || 'Unit Air Bersih';
        const instansiLabel = t.nama_bumdes || t.nama_desa;
        const nextTitle = `${unitLabel} — ${instansiLabel}`;
        if (document.title !== nextTitle) {
          document.title = nextTitle;
        }
      }

      // 3. Perbarui elemen gambar/teks yang memiliki atribut data-tenant-*
      document.querySelectorAll('[data-tenant-logo]').forEach((img) => {
        if (t.logo_url) {
          if (img.getAttribute('src') !== t.logo_url) {
            img.src = t.logo_url;
          }
          img.classList.remove('hidden', 'd-none');
        }
      });

      document.querySelectorAll('[data-tenant-name]').forEach((el) => {
        if (t.nama_bumdes && el.textContent !== t.nama_bumdes) {
          el.textContent = t.nama_bumdes;
        }
      });

      document.querySelectorAll('[data-tenant-desa]').forEach((el) => {
        if (t.nama_desa && el.textContent !== t.nama_desa) {
          el.textContent = t.nama_desa;
        }
      });

      document.querySelectorAll('[data-tenant-unit]').forEach((el) => {
        if (t.nama_unit && el.textContent !== t.nama_unit) {
          el.textContent = t.nama_unit;
        }
      });

      document.querySelectorAll('[data-tenant-alamat]').forEach((el) => {
        if (t.alamat_kop && el.textContent !== t.alamat_kop) {
          el.textContent = t.alamat_kop;
        }
      });

      // 4. Kunci otomatis semua input form nama desa (termasuk setelah form.reset() / buka modal)
      if (t.nama_desa) {
        document.querySelectorAll('input').forEach((inp) => {
          const key = ((inp.id || '') + ' ' + (inp.name || '')).toLowerCase();
          const isDesaField =
            inp.hasAttribute('data-tenant-desa-input') ||
            (/\b(desa|nama_desa|plgdesa|editplgdesa|inputdesa|profildesa)\b/.test(key) &&
              !/\b(id_desa|iddesa|kode_desa|kodedesa)\b/.test(key));

          if (isDesaField) {
            if (inp.value !== t.nama_desa) {
              inp.value = t.nama_desa;
              inp.defaultValue = t.nama_desa;
              inp.setAttribute('value', t.nama_desa);
            }
            if (!inp.readOnly) {
              inp.readOnly = true;
              inp.style.backgroundColor = '#f1f5f9';
              inp.style.cursor = 'not-allowed';
            }
          }
        });
      }
    } catch (err) {
      console.warn('[Tenant Branding] Peringatan saat menerapkan tampilan:', err);
    } finally {
      isApplyingBranding = false;
    }
  }

  function renderSuratTemplate(rawTemplate, vars = {}) {
    const t = getActiveTenant() || {};
    const now = new Date();
    const bulanRomawi = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][now.getMonth()];
    const mergedVars = {
      nama_bumdes: t.nama_bumdes || 'BUMDes Pengelola Air',
      nama_desa: t.nama_desa || '',
      nama_unit: t.nama_unit || 'Unit Air Bersih',
      alamat_kop: t.alamat_kop || '-',
      prefix: t.kode_prefix || 'DS1',
      bulan: bulanRomawi,
      tahun: String(now.getFullYear()),
      tanggal_cetak: now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
      ...vars
    };

    return String(rawTemplate || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      return mergedVars[key] !== undefined && mergedVars[key] !== null ? String(mergedVars[key]) : '';
    });
  }

  window.buildKopSuratHTML = function (overrideObj = {}) {
    const t = { ...(getActiveTenant() || {}), ...(overrideObj || {}) };
    const namaBumdes = String(t.nama_bumdes || 'BUMDes Pengelola Air').toUpperCase();
    const namaUnit = String(t.nama_unit || 'Unit Pengelolaan Air Bersih').toUpperCase();
    const namaDesa = t.nama_desa ? ` (${String(t.nama_desa).toUpperCase()})` : '';
    const alamatKop = t.alamat_kop && t.alamat_kop !== '-' ? t.alamat_kop : (t.nama_desa || '-');
    const logoHtml = t.logo_url
      ? `<img src="${t.logo_url}" alt="Logo" style="width:62px;height:62px;object-fit:contain;margin-right:14px;">`
      : '';

    return `
      <div style="border-bottom:3px double #111;padding-bottom:10px;margin-bottom:16px;display:flex;align-items:center;justify-content:center;text-align:center;">
        ${logoHtml}
        <div>
          <div style="font-size:16px;font-weight:bold;letter-spacing:0.5px;">${namaBumdes}</div>
          <div style="font-size:12px;font-weight:bold;margin-top:2px;">${namaUnit}${namaDesa}</div>
          <div style="font-size:11px;color:#333;margin-top:2px;">${alamatKop}</div>
        </div>
      </div>
    `;
  };

  window.getActiveTenant = getActiveTenant;
  window.getActiveIdDesa = getActiveIdDesa;
  window.setActiveIdDesa = setActiveIdDesa;
  window.setActiveTenant = setActiveTenant;
  window.applyTenantBranding = applyTenantBranding;
  window.renderSuratTemplate = renderSuratTemplate;

  // ==========================================================================
  // 2. RESOLUSI OTOMATIS SAAT HALAMAN DIBUKA (SUBDOMAIN, ?desa= ATAU SESI AKTIF)
  // ==========================================================================
  async function initTenantFromUrlOrDomain() {
    try {
      const params = new URLSearchParams(window.location.search);
      const desaParam = (params.get('desa') || params.get('tenant') || '').trim();
      const host = (window.location.hostname || '').trim().toLowerCase();
      const isGenericHost =
        host === '' ||
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.endsWith('.github.io');

      const cachedTenant = getActiveTenant();
      if (cachedTenant) {
        applyTenantBranding(cachedTenant);
      }

      if (desaParam !== '' || !isGenericHost) {
        isExplicitHostOrParam = true;
      }

      const lookupCode = desaParam || (cachedTenant && cachedTenant.id_desa) || '';
      if (lookupCode !== '' || !isGenericHost) {
        const { data, error } = await sb.rpc('getPublicTenantBranding', {
          p_hostname: isGenericHost ? '' : host,
          p_desa_code: lookupCode
        });

        if (!error && data && data.status === 'success' && data.found && data.tenant) {
          setActiveTenant(data.tenant, true);
          window.dispatchEvent(new CustomEvent('tenant-branding-ready', { detail: data.tenant }));
        }
      }
    } catch (err) {
      console.warn('[Tenant Branding] Gagal memuat profil awal:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTenantFromUrlOrDomain);
  } else {
    initTenantFromUrlOrDomain();
  }

  // ==========================================================================
  // 3. DAFTAR RPC & PENYISIPAN OTOMATIS id_desa
  // ==========================================================================
  const RPC_WITH_FIRST_PARAM_ID_DESA = new Set([
    'getDashboardStats',
    'getDashboardAdmin',
    'getLaporanKeuangan',
    'getTarifDanDenda',
    'getDataManajemenUser',
    'getGolonganTarifAktif',
    'getPelanggan',
    'getDataPelangganSP',
    'resetPasswordPelanggan',
    'getLastMeter',
    'getCatatMeterPending',
    'getHistoryCatatMeter',
    'getValidasiMeter',
    'prosesApprovalMeter',
    'prosesValidasiMeterMassal',
    'checkSystemLockStatus',
    'setSystemLockOverride',
    'toggleSystemOverride',
    'getTagihan',
    'getDataStruk',
    'prosesRilisTagihanBatch',
    'prosesTerapkanDenda',
    'terapkanDendaOtomatis',
    'prosesBayarTagihan',
    'sinkronTarifTagihanOtomatis',
    'hapusPengeluaran',
    'hapusTarifGolongan',
    'getDataSPKTeknik',
    'getSPKByPetugas',
    'getDetailSPKTeknik',
    'selesaikanSPKTeknik',
    'getPengaduan',
    'getPengaduanByPelanggan',
    'updateStatusPengaduan',
    'getDataStokDanAset',
    'getAuditLogs',
    'getSetoranPetugasData',
    'getPetugasDashboardData',
    'getPortalPelangganDashboard',
    'getPortalPelangganData',
    'getRiwayatPemakaianPelanggan',
    'getLayananGangguanPelanggan',
    'getInfoPembayaran',
    'tolakBuktiTransferTagihan',
    'getKonfirmasiPembayaranPelanggan',
    'getSetoranPetugasAdmin',
    'verifikasiSetoranPetugas'
  ]);

  const RPC_PARAM_MAP = {
    getPublicTenantBranding: ['p_hostname', 'p_desa_code'],

    // Autentikasi
    loginUser: ['p_role', 'p_username', 'p_password', 'p_id_desa'],
    prosesLogin: ['p_role', 'p_username', 'p_password', 'p_id_desa'],
    proseslogin: ['p_role', 'p_username', 'p_password', 'p_id_desa'],
    loginPelanggan: ['p_id_pelanggan', 'p_password', 'p_id_desa'],

    // Dashboard & Keuangan
    getDashboardStats: ['p_id_desa', 'p_periode_input', 'p_dusun_input'],
    getLaporanKeuangan: ['p_id_desa', 'p_periode_input', 'p_wilayah_input', 'p_jumlah_bulan_grafik'],

    // Pelanggan
    getPelanggan: ['p_id_desa'],
    addPelanggan: ['p_form', 'p_actor'],
    updatePelanggan: ['p_form', 'p_actor'],
    getDataPelangganSP: ['p_id_desa'],
    resetPasswordPelanggan: ['p_id_desa', 'p_id_pelanggan', 'p_password_baru', 'p_actor'],

    // Tagihan & Pembayaran
    getTagihan: ['p_id_desa'],
    getDataStruk: ['p_id_desa', 'p_id_tagihan'],
    prosesRilisTagihanBatch: ['p_id_desa', 'p_periode'],
    prosesTerapkanDenda: ['p_id_desa', 'p_periode', 'p_nominal_denda'],
    terapkanDendaOtomatis: ['p_id_desa', 'p_periode_input', 'p_actor'],
    prosesBayarTagihan: ['p_id_desa', 'p_id_tagihan', 'p_tgl_bayar_custom', 'p_metode_bayar_custom', 'p_actor'],
    sinkronTarifTagihanOtomatis: ['p_id_desa'],

    // Catat Meter & Validasi
    getLastMeter: ['p_id_desa', 'p_id_pelanggan'],
    submitCatatMeter: ['p_form'],
    getCatatMeterPending: ['p_id_desa'],
    getHistoryCatatMeter: ['p_id_desa', 'p_periode', 'p_area_tugas'],
    getValidasiMeter: ['p_id_desa'],
    prosesApprovalMeter: ['p_id_desa', 'p_id_catat', 'p_aksi', 'p_meter_akhir_revisi', 'p_catatan'],
    prosesValidasiMeterMassal: ['p_id_desa', 'p_id_list', 'p_status_baru', 'p_catatan', 'p_actor'],
    validasiCatatanMeter: ['p_payload', 'p_actor'],

    // Petugas & Setoran
    getPetugasDashboardData: ['p_id_desa', 'p_id_petugas', 'p_nama_petugas', 'p_area_tugas', 'p_periode_input'],
    bayarTagihanTunaiPetugas: ['p_payload', 'p_actor'],
    ajukanSetoranPetugas: ['p_payload', 'p_actor'],
    getSetoranPetugasData: ['p_id_desa', 'p_id_petugas', 'p_nama_petugas', 'p_tanggal_filter'],
    getSetoranPetugasAdmin: ['p_id_desa'],
    verifikasiSetoranPetugas: ['p_id_desa', 'p_id_setoran', 'p_aksi', 'p_actor'],

    // Portal Pelanggan
    getPortalPelangganDashboard: ['p_id_desa', 'p_id_pelanggan', 'p_session_info'],
    getPortalPelangganData: ['p_id_desa', 'p_id_pelanggan', 'p_session_info'],
    getRiwayatPemakaianPelanggan: ['p_id_desa', 'p_id_pelanggan', 'p_limit'],
    submitMeterMandiriPelanggan: ['p_payload', 'p_session_info'],
    getLayananGangguanPelanggan: ['p_id_desa', 'p_id_pelanggan', 'p_session_info'],
    submitLayananGangguanPelanggan: ['p_payload', 'p_session_info'],
    updateProfilPelanggan: ['p_payload', 'p_session_info'],
    gantiPasswordPelanggan: ['p_payload', 'p_session_info'],
    getInfoPembayaran: ['p_id_desa'],
    submitKonfirmasiPembayaran: ['p_payload', 'p_session_info'],
    tolakBuktiTransferTagihan: ['p_id_desa', 'p_id_tagihan', 'p_alasan', 'p_actor'],
    getKonfirmasiPembayaranPelanggan: ['p_id_desa', 'p_id_pelanggan'],

    // Pengaduan
    getPengaduan: ['p_id_desa'],
    getPengaduanByPelanggan: ['p_id_desa', 'p_id_pelanggan'],
    submitPengaduan: ['p_form'],
    updateStatusPengaduan: ['p_id_desa', 'p_id_tiket', 'p_status_baru'],

    // Pengeluaran, Produksi, Tarif & Denda
    simpanPengeluaran: ['p_form', 'p_actor'],
    hapusPengeluaran: ['p_id_desa', 'p_id_pengeluaran', 'p_actor'],
    simpanProduksiAir: ['p_form'],
    getTarifDanDenda: ['p_id_desa'],
    getGolonganTarifAktif: ['p_id_desa'],
    simpanTarifGolongan: ['p_payload', 'p_actor'],
    hapusTarifGolongan: ['p_id_desa', 'p_id_golongan', 'p_actor'],
    simpanAturanDenda: ['p_payload', 'p_actor'],

    // SPK Teknik, Stok, Aset, User & Sistem
    getDataSPKTeknik: ['p_id_desa'],
    getSPKByPetugas: ['p_id_desa', 'p_id_petugas', 'p_nama_petugas'],
    getDetailSPKTeknik: ['p_id_desa', 'p_id_spk'],
    simpanSPKTeknik: ['p_payload', 'p_actor'],
    selesaikanSPKTeknik: ['p_id_desa', 'p_id_spk', 'p_actor', 'p_laporan_petugas'],
    getDataManajemenUser: ['p_id_desa'],
    simpanUserSistem: ['p_payload', 'p_actor'],
    updateStatusAtauAreaUser: ['p_payload', 'p_actor'],
    getDataStokDanAset: ['p_id_desa'],
    simpanMaterialBaru: ['p_payload', 'p_actor'],
    catatMutasiStok: ['p_payload', 'p_actor'],
    simpanPerawatanAset: ['p_payload', 'p_actor'],
    getAuditLogs: ['p_id_desa', 'p_filter'],
    checkSystemLockStatus: ['p_id_desa'],
    setSystemLockOverride: ['p_id_desa', 'p_status_bool'],
    toggleSystemOverride: ['p_id_desa', 'p_enable_override', 'p_actor']
  };

  const RPC_NAME_ALIAS = {
    getAllPelanggan: 'getPelanggan',
    tambahPelanggan: 'addPelanggan',
    getDashboardAdmin: 'getDashboardStats',
    prosesLogin: 'loginUser',
    proseslogin: 'loginUser'
  };

  const FILE_UPLOAD_RULES = {
    addPelanggan: [{ keys: ['foto_ktp', 'fotoKtpBase64', 'fotoBase64'], target: 'foto_ktp', folder: 'pelanggan' }],
    tambahPelanggan: [{ keys: ['foto_ktp', 'fotoKtpBase64', 'fotoBase64'], target: 'foto_ktp', folder: 'pelanggan' }],
    updatePelanggan: [{ keys: ['foto_ktp', 'fotoKtpBase64', 'fotoBase64'], target: 'foto_ktp', folder: 'pelanggan' }],
    submitCatatMeter: [
      { keys: ['foto_meter', 'fotoBase64'], target: 'foto_meter', folder: 'meter' },
      { keys: ['foto_kendala', 'fotoKendalaBase64'], target: 'foto_kendala', folder: 'kendala' }
    ],
    submitMeterMandiriPelanggan: [{ keys: ['foto_meter', 'fotoBase64'], target: 'foto_meter', folder: 'meter-mandiri' }],
    submitLayananGangguanPelanggan: [{ keys: ['foto_keluhan', 'foto_kejadian', 'fotoBase64'], target: 'foto_keluhan', folder: 'gangguan' }],
    submitPengaduan: [{ keys: ['foto_kejadian', 'foto_keluhan', 'fotoBase64'], target: 'foto_kejadian', folder: 'gangguan' }],
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

    const activeDesa = getActiveIdDesa().toLowerCase();
    const fileName = `${activeDesa}/${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
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

  function injectTenantContext(fnName, paramNames, args) {
    const activeIdDesa = getActiveIdDesa();
    let finalArgs = [...args];

    if (['loginUser', 'prosesLogin', 'proseslogin'].includes(fnName) && finalArgs.length < 4) {
      finalArgs[3] = isExplicitHostOrParam ? activeIdDesa : '';
    } else if (fnName === 'loginPelanggan' && finalArgs.length < 3) {
      finalArgs[2] = isExplicitHostOrParam ? activeIdDesa : '';
    } else if (RPC_WITH_FIRST_PARAM_ID_DESA.has(fnName) && finalArgs.length < paramNames.length) {
      finalArgs = [activeIdDesa, ...finalArgs];
    }

    finalArgs = finalArgs.map((arg, idx) => {
      const pKey = paramNames[idx];
      if (
        arg &&
        typeof arg === 'object' &&
        !Array.isArray(arg) &&
        ['p_form', 'p_payload', 'p_actor', 'p_session_info', 'p_laporan_petugas'].includes(pKey)
      ) {
        const resolvedDesa =
          arg.id_desa && String(arg.id_desa).trim() !== ''
            ? String(arg.id_desa).trim()
            : activeIdDesa;
        return {
          ...arg,
          id_desa: resolvedDesa
        };
      }
      return arg;
    });

    return finalArgs;
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
              const uploadedArgs = await preprocessFileUploads(fnName, rawArgs);
              const processedArgs = injectTenantContext(fnName, paramNames, uploadedArgs);

              const rpcParams = {};
              paramNames.forEach((paramKey, i) => {
                if (processedArgs[i] !== undefined) {
                  rpcParams[paramKey] = processedArgs[i];
                }
              });

              const actualRpcName = RPC_NAME_ALIAS[fnName] || fnName;
              const { data, error } = await sb.rpc(actualRpcName, rpcParams);
              if (error) throw new Error(error.message);

              if (
                data &&
                typeof data === 'object' &&
                data.status === 'success' &&
                (data.tenant?.id_desa || data.user?.id_desa || data.pelanggan?.id_desa)
              ) {
                const tenantData = data.tenant || {
                  id_desa: data.user?.id_desa || data.pelanggan?.id_desa,
                  nama_bumdes: data.user?.nama_bumdes || data.pelanggan?.nama_bumdes || '',
                  nama_desa: data.user?.nama_desa || data.pelanggan?.nama_desa || '',
                  nama_unit: data.user?.nama_unit || data.pelanggan?.nama_unit || 'Unit Air Bersih',
                  alamat_kop: data.user?.alamat_kop || data.pelanggan?.alamat_kop || '-',
                  logo_url: data.user?.logo_url || data.pelanggan?.logo_url || '',
                  template_surat: data.user?.template_surat || data.pelanggan?.template_surat || {}
                };
                setActiveTenant(tenantData, true);
              }

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

  // ==========================================================================
  // 4. AUTO-REPLACE SISA TEKS "DESA PERCOBAAN" & KUNCI FORM OTOMATIS
  // ==========================================================================
  function replaceTenantPlaceholders(str, tenant) {
    const t = tenant || getActiveTenant();
    if (!t || typeof str !== 'string' || !/percobaan/i.test(str)) return str;

    const bumdes = (t.nama_bumdes || '').trim() || 'BUMDes Pengelola Air';
    const rawDesa = (t.nama_desa || '').trim();
    const desaLabel = rawDesa
      ? (/^desa\b/i.test(rawDesa) ? rawDesa : 'Desa ' + rawDesa)
      : bumdes;
    const unit = (t.nama_unit || 'Unit Pengelolaan Air Bersih').trim();
    const alamat = (t.alamat_kop && t.alamat_kop !== '-' ? t.alamat_kop : desaLabel).trim();

    const matchCase = (orig, replacement) =>
      orig === orig.toUpperCase() ? replacement.toUpperCase() : replacement;

    return str
      .replace(/PDAM\s+BUMDes\s+PERCOBAAN/gi, (m) => matchCase(m, bumdes))
      .replace(/BUMDES\s+PERCOBAAN/gi, (m) => matchCase(m, bumdes))
      .replace(/PDAM\s+DESA\s+PERCOBAAN/gi, (m) => matchCase(m, `${unit} (${desaLabel})`))
      .replace(/Desa\s+Percobaan,\s*Kecamatan\s+Palang,\s*Kabupaten\s+Tuban/gi, alamat)
      .replace(/DESA\s+PERCOBAAN/gi, (m) => matchCase(m, desaLabel));
  }

  function sweepDomDummyText(rootNode) {
    const t = getActiveTenant();
    if (!t || !rootNode) return;

    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && /percobaan/i.test(node.nodeValue)) {
        node.nodeValue = replaceTenantPlaceholders(node.nodeValue, t);
      }
    }

    if (rootNode.querySelectorAll) {
      rootNode.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
        if (/percobaan/i.test(el.placeholder)) {
          el.placeholder = replaceTenantPlaceholders(el.placeholder, t);
        }
      });
    }
  }

  const domObserver = new MutationObserver((mutations) => {
    if (isApplyingBranding) return;
    const t = getActiveTenant();
    if (!t) return;
    try {
      let hasAdded = false;
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1) {
            hasAdded = true;
            sweepDomDummyText(n);
          }
        });
      }
      if (hasAdded) applyTenantBranding(t);
    } catch (_) {}
  });

  document.addEventListener('click', () => {
    setTimeout(() => applyTenantBranding(), 60);
  }, true);

  window.addEventListener('DOMContentLoaded', () => {
    if (document.body) {
      sweepDomDummyText(document.body);
      domObserver.observe(document.body, { childList: true, subtree: true });
    }
  });
  window.addEventListener('tenant-branding-ready', () => {
    if (document.body) sweepDomDummyText(document.body);
  });

  const _origWindowOpen = window.open;
  window.open = function (...args) {
    const win = _origWindowOpen.apply(this, args);
    if (win && win.document && typeof win.document.write === 'function') {
      const _origWrite = win.document.write.bind(win.document);
      win.document.write = function (html) {
        const t = getActiveTenant();
        if (t && typeof html === 'string') {
          html = replaceTenantPlaceholders(html, t);
          if (t.logo_url && !html.includes(t.logo_url)) {
            html = html.replace(
              /(<div\s+class=["']kop["'][^>]*>)/i,
              `$1<img src="${t.logo_url}" alt="Logo" style="width:56px;height:56px;object-fit:contain;margin-right:12px;">`
            );
          }
        }
        return _origWrite(html);
      };
    }
    return win;
  };

  // ==========================================================================
  // 5. GLOBAL SEARCH / SHORTCUT EXPLORER (KLIK ICON CARI ATAU CTRL + K)
  // ==========================================================================
  let globalSearchTimer = null;
  let globalSearchTab = 'all';
  let lastGlobalResults = { pelanggan: [], wilayah: [], users: [], tagihan: [] };

  const MENU_SHORTCUTS = [
    { label: 'Dashboard Utama', desc: 'Ringkasan kas, kubikasi air & reminder', keywords: ['dashboard', 'beranda', 'ringkasan'], navMatch: ['dashboard'] },
    { label: 'Data Pelanggan', desc: 'Daftar sambungan, tambah & edit pelanggan', keywords: ['pelanggan', 'warga', 'sambungan', 'ktp'], navMatch: ['pelanggan'] },
    { label: 'Catat Meter Lapangan', desc: 'Input angka meter bulanan pelanggan', keywords: ['catat', 'meter', 'kubikasi', 'angka'], navMatch: ['catat', 'meter'] },
    { label: 'Validasi Catatan Meter', desc: 'Approval hasil foto & bacaan petugas', keywords: ['validasi', 'approval', 'verifikasi'], navMatch: ['validasi'] },
    { label: 'Tagihan & Pembayaran', desc: 'Rilis tagihan, kasir bayar & cetak nota', keywords: ['tagihan', 'invoice', 'bayar', 'nota', 'struk', 'tunggakan'], navMatch: ['tagihan'] },
    { label: 'Mutasi Sambungan & SPK Teknik', desc: 'Pasang baru (PSB), ganti meter & segel', keywords: ['spk', 'mutasi', 'pasang baru', 'psb', 'segel', 'teknik'], navMatch: ['spk', 'mutasi'] },
    { label: 'Tiket Pengaduan & Gangguan', desc: 'Keluhan pipa bocor & air mati', keywords: ['pengaduan', 'keluhan', 'gangguan', 'tiket', 'bocor'], navMatch: ['pengaduan', 'gangguan'] },
    { label: 'Laporan Keuangan & Kas', desc: 'Pemasukan, pengeluaran & arus kas unit', keywords: ['laporan', 'keuangan', 'kas', 'pengeluaran'], navMatch: ['laporan', 'keuangan'] },
    { label: 'Manajemen User (Admin & Petugas)', desc: 'Kelola akun admin, petugas & area tugas', keywords: ['user', 'admin', 'petugas', 'akun', 'operator'], navMatch: ['user', 'pengguna'] },
    { label: 'Tarif Golongan & Denda', desc: 'Aturan tarif per m³ & denda keterlambatan', keywords: ['tarif', 'golongan', 'denda', 'harga'], navMatch: ['tarif', 'denda'] },
    { label: 'Log Aktivitas Sistem', desc: 'Riwayat aktivitas seluruh pengguna', keywords: ['log', 'aktivitas', 'riwayat', 'audit'], navMatch: ['log', 'aktivitas'] }
  ];

  function escapeSearchHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function highlightKeyword(text, kw) {
    const safe = escapeSearchHtml(text);
    const cleanKw = String(kw || '').trim();
    if (cleanKw.length < 2) return safe;
    const escapedKw = cleanKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(new RegExp(`(${escapedKw})`, 'gi'), '<mark style="background:#bae6fd;color:#0c4a6e;padding:0 2px;border-radius:3px;font-weight:700;">$1</mark>');
  }

  function ensureGlobalSearchModal() {
    if (document.getElementById('bumdesGlobalSearchOverlay')) return;

    const style = document.createElement('style');
    style.textContent = `
      #bumdesGlobalSearchOverlay {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(3px);
        display: none; align-items: flex-start; justify-content: center;
        padding: 64px 16px 24px;
      }
      #bumdesGlobalSearchOverlay.open { display: flex; animation: gsFadeIn 0.14s ease; }
      @keyframes gsFadeIn { from { opacity: 0; } to { opacity: 1; } }
      .gs-box {
        width: 100%; max-width: 680px; background: #ffffff;
        border: 1px solid #cbd5e1; border-radius: 14px;
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.22);
        overflow: hidden; display: flex; flex-direction: column; max-height: 82vh;
      }
      .gs-head {
        display: flex; align-items: center; gap: 12px;
        padding: 14px 18px; border-bottom: 1px solid #e2e8f0; background: #f8fafc;
      }
      .gs-head input {
        flex: 1; border: none; background: transparent; outline: none;
        font-size: 1rem; font-weight: 500; color: #0f172a;
      }
      .gs-tabs {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        padding: 10px 16px !important;
        border-bottom: 1px solid #e2e8f0 !important;
        background: #ffffff !important;
        overflow-x: auto !important;
        flex-shrink: 0 !important;
      }
      .gs-tab {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 28px !important;
        min-height: 28px !important;
        padding: 0 13px !important;
        margin: 0 !important;
        border: 1px solid #cbd5e1 !important;
        background: #f8fafc !important;
        color: #475569 !important;
        border-radius: 999px !important;
        font-size: 0.76rem !important;
        font-weight: 600 !important;
        line-height: 1 !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        box-sizing: border-box !important;
      }
      .gs-tab:hover {
        background: #e0f2fe !important;
        border-color: #7dd3fc !important;
        color: #0369a1 !important;
      }
      .gs-tab.active {
        background: #0284c7 !important;
        border-color: #0284c7 !important;
        color: #ffffff !important;
      }
      .gs-body {
        padding: 10px 14px 16px; overflow-y: auto; flex: 1;
      }
      .gs-group-title {
        font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.05em; color: #64748b; padding: 10px 6px 5px;
      }
      .gs-item {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        padding: 9px 12px; border-radius: 9px; cursor: pointer;
        border: 1px solid transparent; transition: all 0.12s;
      }
      .gs-item:hover, .gs-item.selected {
        background: #f0f9ff; border-color: #bae6fd;
      }
      .gs-badge {
        font-size: 0.68rem; font-weight: 700; padding: 2px 8px;
        border-radius: 6px; white-space: nowrap;
      }
      .gs-foot {
        padding: 8px 16px; border-top: 1px solid #e2e8f0; background: #f8fafc;
        display: flex; justify-content: space-between; align-items: center;
        font-size: 0.72rem; color: #64748b;
      }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'bumdesGlobalSearchOverlay';
    overlay.innerHTML = `
      <div class="gs-box" role="dialog" aria-modal="true">
        <div class="gs-head">
          <i class="fas fa-search" style="color:#0284c7;font-size:1.05rem;"></i>
          <input id="bumdesGlobalSearchInput" type="text" autocomplete="off"
            placeholder="Ketik minimal 3 huruf (Nama Pelanggan, Petugas, Admin, Dusun, RT/RW, ID)..." />
          <button type="button" id="bumdesGlobalSearchClear" title="Hapus"
            style="display:none;border:none;background:#e2e8f0;color:#334155;width:24px;height:24px;border-radius:50%;cursor:pointer;font-weight:bold;">&times;</button>
          <button type="button" id="bumdesGlobalSearchClose"
            style="border:1px solid #cbd5e1;background:#fff;color:#475569;border-radius:6px;padding:3px 8px;font-size:0.72rem;font-weight:600;cursor:pointer;">ESC</button>
        </div>
        <div class="gs-tabs" id="bumdesGlobalSearchTabs">
          <button type="button" class="gs-tab active" data-tab="all">Semua</button>
          <button type="button" class="gs-tab" data-tab="pelanggan">Pelanggan</button>
          <button type="button" class="gs-tab" data-tab="wilayah">Dusun & RT/RW</button>
          <button type="button" class="gs-tab" data-tab="users">Admin & Petugas</button>
          <button type="button" class="gs-tab" data-tab="tagihan">Tagihan</button>
          <button type="button" class="gs-tab" data-tab="menu">Menu Pintasan</button>
        </div>
        <div class="gs-body" id="bumdesGlobalSearchResults"></div>
        <div class="gs-foot">
          <span>Klik hasil untuk langsung membuka data & panel terkait</span>
          <span>Shortcut: <strong>Ctrl + K</strong></span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeGlobalSearch();
    });
    document.getElementById('bumdesGlobalSearchClose').addEventListener('click', closeGlobalSearch);

    const inputEl = document.getElementById('bumdesGlobalSearchInput');
    const clearBtn = document.getElementById('bumdesGlobalSearchClear');

    clearBtn.addEventListener('click', () => {
      inputEl.value = '';
      clearBtn.style.display = 'none';
      lastGlobalResults = { pelanggan: [], wilayah: [], users: [], tagihan: [] };
      renderGlobalSearchResults('');
      inputEl.focus();
    });

    inputEl.addEventListener('input', (e) => {
      const kw = e.target.value;
      clearBtn.style.display = kw.length > 0 ? 'inline-block' : 'none';
      clearTimeout(globalSearchTimer);

      const trimmed = kw.trim();
      if (trimmed.length < 3) {
        lastGlobalResults = { pelanggan: [], wilayah: [], users: [], tagihan: [] };
        renderGlobalSearchResults(trimmed);
        return;
      }

      document.getElementById('bumdesGlobalSearchResults').innerHTML =
        `<div style="padding:28px;text-align:center;color:#64748b;font-size:0.85rem;">
          <i class="fas fa-spinner fa-spin" style="color:#0284c7;margin-right:6px;"></i> Mencari "<strong>${escapeSearchHtml(trimmed)}</strong>" di seluruh data...
        </div>`;

      globalSearchTimer = setTimeout(() => executeGlobalSearch(trimmed), 240);
    });

    document.getElementById('bumdesGlobalSearchTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('.gs-tab');
      if (!btn) return;
      globalSearchTab = btn.getAttribute('data-tab') || 'all';
      document.querySelectorAll('#bumdesGlobalSearchTabs .gs-tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      renderGlobalSearchResults(inputEl.value.trim());
    });
  }

  async function executeGlobalSearch(keyword) {
    try {
      const idDesa = getActiveIdDesa();
      const { data, error } = await sb.rpc('globalSearchBumdes', {
        p_id_desa: idDesa,
        p_keyword: keyword
      });
      if (error) throw new Error(error.message);
      if (data && data.status === 'success' && data.results) {
        lastGlobalResults = data.results;
        renderGlobalSearchResults(keyword);
      }
    } catch (err) {
      document.getElementById('bumdesGlobalSearchResults').innerHTML =
        `<div style="padding:20px;text-align:center;color:#dc2626;font-size:0.84rem;">Gagal mencari data: ${escapeSearchHtml(err.message)}</div>`;
    }
  }

  function jumpToPanelAndFilter(navKeywords, filterText) {
    closeGlobalSearch();

    // 1. Cari & klik menu navigasi di sidebar aktif (Admin / Petugas / Pelanggan)
    const activePanel = document.querySelector('.panel-view.panel-active') || document;
    const menuBtns = Array.from(activePanel.querySelectorAll('.menu-btn, [data-section], [data-target]'));
    const targetBtn = menuBtns.find((btn) => {
      const hay = (
        (btn.getAttribute('onclick') || '') + ' ' +
        (btn.getAttribute('data-section') || '') + ' ' +
        (btn.getAttribute('data-target') || '') + ' ' +
        (btn.textContent || '')
      ).toLowerCase();
      return navKeywords.some((k) => hay.includes(k));
    });

    if (targetBtn) {
      targetBtn.click();
    }

    // 2. Isi otomatis kolom pencarian pada panel tujuan agar data langsung tersaring
    if (filterText) {
      setTimeout(() => {
        const container =
          document.querySelector('.admin-section-active, .petugas-section-active, .pelanggan-section-active') ||
          activePanel;
        const searchInputs = Array.from(
          container.querySelectorAll('input[type="text"], input[type="search"], input:not([type])')
        ).filter((inp) => {
          if (inp.readOnly || inp.disabled || inp.offsetParent === null) return false;
          const ph = ((inp.placeholder || '') + ' ' + (inp.id || '')).toLowerCase();
          return ph.includes('cari') || ph.includes('search') || ph.includes('filter') || ph.includes('nama');
        });

        if (searchInputs.length > 0) {
          const targetInput = searchInputs[0];
          targetInput.value = filterText;
          targetInput.dispatchEvent(new Event('input', { bubbles: true }));
          targetInput.dispatchEvent(new Event('keyup', { bubbles: true }));
          targetInput.focus();
        }
      }, 180);
    }
  }

  function renderGlobalSearchResults(kw) {
    const box = document.getElementById('bumdesGlobalSearchResults');
    if (!box) return;

    const matchedMenus = MENU_SHORTCUTS.filter((m) => {
      if (!kw) return true;
      const low = kw.toLowerCase();
      return m.label.toLowerCase().includes(low) || m.keywords.some((k) => k.includes(low));
    });

    if (kw.length < 3) {
      const hintHtml = kw.length === 0
        ? `<div style="padding:8px 8px 4px;font-size:0.78rem;color:#64748b;">Ketik <strong>minimal 3 huruf</strong> untuk mencari seluruh data pelanggan, petugas, admin, dusun, RT/RW, atau tagihan.</div>`
        : `<div style="padding:10px 12px;margin-bottom:8px;border-radius:8px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-size:0.8rem;">
            Ketik <strong>${3 - kw.length} huruf lagi</strong> (minimal 3 huruf) untuk memunculkan hasil pencarian database...
           </div>`;

      const menuItemsHtml = matchedMenus.map((m) => `
        <div class="gs-item" data-nav='${JSON.stringify(m.navMatch)}' data-filter="">
          <div>
            <div style="font-size:0.86rem;font-weight:600;color:#0f172a;">
              <i class="fas fa-arrow-right" style="color:#0284c7;margin-right:7px;font-size:0.75rem;"></i>${highlightKeyword(m.label, kw)}
            </div>
            <div style="font-size:0.74rem;color:#64748b;margin-left:20px;">${escapeSearchHtml(m.desc)}</div>
          </div>
          <span class="gs-badge" style="background:#e0f2fe;color:#0369a1;">MENU</span>
        </div>
      `).join('');

      box.innerHTML = hintHtml + `<div class="gs-group-title">Pintasan Halaman Cepat</div>` + (menuItemsHtml || `<div style="padding:14px;text-align:center;color:#94a3b8;font-size:0.82rem;">Tidak ada menu yang cocok.</div>`);
      bindResultClicks();
      return;
    }

    const r = lastGlobalResults || { pelanggan: [], wilayah: [], users: [], tagihan: [] };
    let html = '';

    // 1. Pelanggan
    if ((globalSearchTab === 'all' || globalSearchTab === 'pelanggan') && r.pelanggan.length > 0) {
      html += `<div class="gs-group-title">Pelanggan (${r.pelanggan.length})</div>`;
      html += r.pelanggan.map((p) => `
        <div class="gs-item" data-nav='["pelanggan"]' data-filter="${escapeSearchHtml(p.id_pelanggan || p.nama_pelanggan)}">
          <div>
            <div style="font-size:0.88rem;font-weight:700;color:#0f172a;">
              ${highlightKeyword(p.nama_pelanggan, kw)}
              <span style="font-weight:600;color:#0284c7;font-size:0.78rem;">(${highlightKeyword(p.id_pelanggan, kw)})</span>
            </div>
            <div style="font-size:0.75rem;color:#475569;margin-top:2px;">
              Dusun ${highlightKeyword(p.dusun, kw)} • RT/RW ${highlightKeyword(p.rt_rw, kw)} • HP: ${highlightKeyword(p.no_hp, kw)}
            </div>
          </div>
          <span class="gs-badge" style="background:#dcfce7;color:#166534;">${escapeSearchHtml(p.status_sambungan)}</span>
        </div>
      `).join('');
    }

    // 2. Wilayah (Dusun & RT/RW)
    if ((globalSearchTab === 'all' || globalSearchTab === 'wilayah') && r.wilayah.length > 0) {
      html += `<div class="gs-group-title">Wilayah Dusun & RT/RW (${r.wilayah.length})</div>`;
      html += r.wilayah.map((w) => {
        const filterVal = w.dusun && w.dusun !== '-' ? w.dusun : w.rt_rw;
        return `
          <div class="gs-item" data-nav='["pelanggan"]' data-filter="${escapeSearchHtml(filterVal)}">
            <div>
              <div style="font-size:0.86rem;font-weight:700;color:#0f172a;">
                <i class="fas fa-map-marker-alt" style="color:#0284c7;margin-right:6px;"></i>
                Dusun ${highlightKeyword(w.dusun, kw)} — RT/RW ${highlightKeyword(w.rt_rw, kw)}
              </div>
              <div style="font-size:0.74rem;color:#64748b;margin-top:2px;">
                Terdapat <strong>${w.jumlah_pelanggan} pelanggan</strong> terdaftar di wilayah ini
              </div>
            </div>
            <span class="gs-badge" style="background:#e0f2fe;color:#0369a1;">WILAYAH</span>
          </div>
        `;
      }).join('');
    }

    // 3. Admin & Petugas
    if ((globalSearchTab === 'all' || globalSearchTab === 'users') && r.users.length > 0) {
      html += `<div class="gs-group-title">Admin & Petugas (${r.users.length})</div>`;
      html += r.users.map((u) => {
        const isAdm = u.role === 'admin';
        return `
          <div class="gs-item" data-nav='["user","pengguna"]' data-filter="${escapeSearchHtml(u.nama_lengkap)}">
            <div>
              <div style="font-size:0.86rem;font-weight:700;color:#0f172a;">
                ${highlightKeyword(u.nama_lengkap, kw)}
                <span style="font-weight:500;color:#64748b;font-size:0.76rem;">(@${highlightKeyword(u.username, kw)})</span>
              </div>
              <div style="font-size:0.74rem;color:#475569;margin-top:2px;">
                Area Tugas: ${highlightKeyword(u.area_tugas, kw)} • HP: ${highlightKeyword(u.no_hp, kw)}
              </div>
            </div>
            <span class="gs-badge" style="background:${isAdm ? '#fef3c7' : '#e0e7ff'};color:${isAdm ? '#92400e' : '#3730a3'};">
              ${isAdm ? 'ADMIN' : 'PETUGAS'}
            </span>
          </div>
        `;
      }).join('');
    }

    // 4. Tagihan / Invoice
    if ((globalSearchTab === 'all' || globalSearchTab === 'tagihan') && r.tagihan.length > 0) {
      html += `<div class="gs-group-title">Tagihan & Invoice (${r.tagihan.length})</div>`;
      html += r.tagihan.map((t) => {
        const isLunas = String(t.status_bayar).toLowerCase() === 'lunas';
        return `
          <div class="gs-item" data-nav='["tagihan"]' data-filter="${escapeSearchHtml(t.invoice_no || t.nama_pelanggan)}">
            <div>
              <div style="font-size:0.86rem;font-weight:700;color:#0f172a;">
                ${highlightKeyword(t.invoice_no, kw)} — ${highlightKeyword(t.nama_pelanggan, kw)}
              </div>
              <div style="font-size:0.74rem;color:#475569;margin-top:2px;">
                Periode: ${highlightKeyword(t.periode_bulan, kw)} • Total: Rp ${Number(t.total_tagihan || 0).toLocaleString('id-ID')}
              </div>
            </div>
            <span class="gs-badge" style="background:${isLunas ? '#dcfce7' : '#fee2e2'};color:${isLunas ? '#166534' : '#991b1b'};">
              ${escapeSearchHtml(t.status_bayar)}
            </span>
          </div>
        `;
      }).join('');
    }

    // 5. Menu Pintasan yang cocok
    if ((globalSearchTab === 'all' || globalSearchTab === 'menu') && matchedMenus.length > 0) {
      html += `<div class="gs-group-title">Menu Pintasan (${matchedMenus.length})</div>`;
      html += matchedMenus.map((m) => `
        <div class="gs-item" data-nav='${JSON.stringify(m.navMatch)}' data-filter="">
          <div>
            <div style="font-size:0.85rem;font-weight:600;color:#0f172a;">${highlightKeyword(m.label, kw)}</div>
            <div style="font-size:0.73rem;color:#64748b;">${escapeSearchHtml(m.desc)}</div>
          </div>
          <span class="gs-badge" style="background:#f1f5f9;color:#475569;">MENU</span>
        </div>
      `).join('');
    }

    if (!html) {
      html = `
        <div style="padding:36px 16px;text-align:center;color:#64748b;">
          <i class="fas fa-folder-open" style="font-size:1.8rem;color:#cbd5e1;margin-bottom:8px;display:block;"></i>
          Tidak ditemukan data dengan kata kunci "<strong>${escapeSearchHtml(kw)}</strong>".
        </div>`;
    }

    box.innerHTML = html;
    bindResultClicks();
  }

  function bindResultClicks() {
    document.querySelectorAll('#bumdesGlobalSearchResults .gs-item').forEach((item) => {
      item.addEventListener('click', () => {
        const nav = JSON.parse(item.getAttribute('data-nav') || '[]');
        const filter = item.getAttribute('data-filter') || '';
        jumpToPanelAndFilter(nav, filter);
      });
    });
  }

  function openGlobalSearch() {
    ensureGlobalSearchModal();
    const overlay = document.getElementById('bumdesGlobalSearchOverlay');
    const inputEl = document.getElementById('bumdesGlobalSearchInput');
    overlay.classList.add('open');
    renderGlobalSearchResults(inputEl.value.trim());
    setTimeout(() => inputEl.focus(), 50);
  }

  function closeGlobalSearch() {
    const overlay = document.getElementById('bumdesGlobalSearchOverlay');
    if (overlay) overlay.classList.remove('open');
  }

  window.openGlobalSearch = openGlobalSearch;
  window.closeGlobalSearch = closeGlobalSearch;

  // Otomatis aktif saat ikon kaca pembesar di topbar diklik
  document.addEventListener('click', (e) => {
    const searchBtn = e.target.closest('.topbar-icon-btn, [data-global-search], #btnGlobalSearch');
    if (searchBtn && (searchBtn.querySelector('.fa-search') || searchBtn.hasAttribute('data-global-search') || searchBtn.id === 'btnGlobalSearch')) {
      e.preventDefault();
      openGlobalSearch();
    }
  });

  // Shortcut Keyboard: Ctrl + K untuk membuka & ESC untuk menutup
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openGlobalSearch();
    } else if (e.key === 'Escape') {
      closeGlobalSearch();
    }
  });

  // ==========================================================================
  // 6. NOTIFICATION CENTER POPOVER (ANCHORED DI TOMBOL LONCENG TOPBAR)
  // ==========================================================================
  let allNotifications = [];
  let activeNotifFilter = 'all';
  let activeBellButton = null;

  function getReadNotifStorageKey() {
    return 'bumdes_read_notifs_' + getActiveIdDesa().toLowerCase();
  }

  function getReadNotifSet() {
    try {
      const raw = localStorage.getItem(getReadNotifStorageKey());
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (_) {
      return new Set();
    }
  }

  function saveReadNotifSet(idSet) {
    try {
      const trimmed = Array.from(idSet).slice(-200);
      localStorage.setItem(getReadNotifStorageKey(), JSON.stringify(trimmed));
    } catch (_) {}
  }

  function getNotifVisualMeta(kategori) {
    switch (kategori) {
      case 'pembayaran':
        return { icon: 'fa-money-bill-wave', bg: '#dcfce7', color: '#15803d', nav: ['tagihan'] };
      case 'meter':
        return { icon: 'fa-tachometer-alt', bg: '#e0f2fe', color: '#0369a1', nav: ['validasi', 'catat', 'meter'] };
      case 'spk':
        return { icon: 'fa-tools', bg: '#fef3c7', color: '#b45309', nav: ['spk', 'mutasi'] };
      case 'pengaduan':
        return { icon: 'fa-exclamation-circle', bg: '#fee2e2', color: '#b91c1c', nav: ['pengaduan', 'gangguan'] };
      default:
        return { icon: 'fa-bell', bg: '#f1f5f9', color: '#334155', nav: ['log', 'aktivitas'] };
    }
  }

  function updateBellBadges() {
    const readSet = getReadNotifSet();
    const unreadCount = allNotifications.filter((n) => !readSet.has(n.id)).length;

    document.querySelectorAll('.topbar-icon-btn').forEach((btn) => {
      if (!btn.querySelector('.fa-bell')) return;
      btn.style.position = 'relative';

      let badge = btn.querySelector('.bumdes-notif-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'bumdes-notif-badge';
        badge.style.cssText =
          'position:absolute;top:-4px;right:-4px;min-width:17px;height:17px;padding:0 4px;' +
          'border-radius:999px;background:#ef4444;color:#ffffff;font-size:0.64rem;font-weight:700;' +
          'line-height:1;display:none;align-items:center;justify-content:center;border:2px solid #ffffff;' +
          'pointer-events:none;box-sizing:border-box;';
        btn.appendChild(badge);
      }

      if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    });

    const headerCounter = document.getElementById('bumdesNotifUnreadPill');
    if (headerCounter) {
      headerCounter.textContent = unreadCount > 0 ? `${unreadCount} Baru` : 'Semua Dibaca';
      headerCounter.style.background = unreadCount > 0 ? '#fee2e2' : '#e2e8f0';
      headerCounter.style.color = unreadCount > 0 ? '#b91c1c' : '#475569';
    }
  }

  function ensureNotificationPopover() {
    if (document.getElementById('bumdesNotifPopover')) return;

    const style = document.createElement('style');
    style.textContent = `
      #bumdesNotifPopover {
        position: fixed;
        z-index: 9998;
        width: 380px;
        max-width: calc(100vw - 24px);
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
        display: none;
        flex-direction: column;
        overflow: hidden;
      }
      #bumdesNotifPopover.open {
        display: flex;
        animation: notifDropIn 0.14s ease-out;
      }
      @keyframes notifDropIn {
        from { opacity: 0; transform: translateY(-6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .bn-head {
        padding: 12px 15px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .bn-filters {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 8px 12px;
        background: #ffffff;
        border-bottom: 1px solid #e2e8f0;
        overflow-x: auto;
      }
      .bn-filter-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 25px !important;
        padding: 0 10px !important;
        margin: 0 !important;
        border-radius: 999px !important;
        border: 1px solid #cbd5e1 !important;
        background: #f8fafc !important;
        color: #475569 !important;
        font-size: 0.72rem !important;
        font-weight: 600 !important;
        line-height: 1 !important;
        cursor: pointer !important;
        white-space: nowrap !important;
      }
      .bn-filter-btn.active {
        background: #0284c7 !important;
        border-color: #0284c7 !important;
        color: #ffffff !important;
      }
      .bn-list {
        max-height: 360px;
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      .bn-item {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        padding: 11px 14px;
        border-bottom: 1px solid #f1f5f9;
        cursor: pointer;
        transition: background 0.12s;
        position: relative;
      }
      .bn-item:hover {
        background: #f8fafc;
      }
      .bn-item.unread {
        background: #f0f9ff;
      }
      .bn-item.unread:hover {
        background: #e0f2fe;
      }
      .bn-icon {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .bn-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #0284c7;
        flex-shrink: 0;
        margin-top: 6px;
      }
      .bn-foot {
        padding: 9px 14px;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        text-align: center;
      }
    `;
    document.head.appendChild(style);

    const pop = document.createElement('div');
    pop.id = 'bumdesNotifPopover';
    pop.innerHTML = `
      <div class="bn-head">
        <div style="display:flex;align-items:center;gap:8px;">
          <strong style="font-size:0.88rem;color:#0f172a;">Notifikasi</strong>
          <span id="bumdesNotifUnreadPill" style="font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:999px;background:#e2e8f0;color:#475569;">0 Baru</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button type="button" id="btnNotifRefresh" title="Muat Ulang"
            style="border:1px solid #cbd5e1;background:#fff;color:#475569;width:26px;height:26px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.74rem;">
            <i class="fas fa-sync-alt"></i>
          </button>
          <button type="button" id="btnNotifMarkAllRead"
            style="border:none;background:transparent;color:#0284c7;font-size:0.74rem;font-weight:700;cursor:pointer;padding:2px 4px;">
            Tandai dibaca
          </button>
        </div>
      </div>
      <div class="bn-filters" id="bumdesNotifFilters">
        <button type="button" class="bn-filter-btn active" data-cat="all">Semua</button>
        <button type="button" class="bn-filter-btn" data-cat="unread">Belum Dibaca</button>
        <button type="button" class="bn-filter-btn" data-cat="pembayaran">Pembayaran</button>
        <button type="button" class="bn-filter-btn" data-cat="meter">Meter</button>
        <button type="button" class="bn-filter-btn" data-cat="spk">SPK & Aduan</button>
      </div>
      <div class="bn-list" id="bumdesNotifList"></div>
      <div class="bn-foot">
        <button type="button" id="btnNotifOpenLog"
          style="border:none;background:transparent;color:#0284c7;font-size:0.76rem;font-weight:700;cursor:pointer;">
          Lihat Semua di Log Aktivitas <i class="fas fa-arrow-right" style="margin-left:4px;font-size:0.7rem;"></i>
        </button>
      </div>
    `;
    document.body.appendChild(pop);

    document.getElementById('btnNotifRefresh').addEventListener('click', () => {
      fetchNotifications(true);
    });

    document.getElementById('btnNotifMarkAllRead').addEventListener('click', () => {
      const readSet = getReadNotifSet();
      allNotifications.forEach((n) => readSet.add(n.id));
      saveReadNotifSet(readSet);
      updateBellBadges();
      renderNotificationList();
    });

    document.getElementById('bumdesNotifFilters').addEventListener('click', (e) => {
      const btn = e.target.closest('.bn-filter-btn');
      if (!btn) return;
      activeNotifFilter = btn.getAttribute('data-cat') || 'all';
      document.querySelectorAll('#bumdesNotifFilters .bn-filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderNotificationList();
    });

    document.getElementById('btnNotifOpenLog').addEventListener('click', () => {
      closeNotificationPopover();
      if (typeof jumpToPanelAndFilter === 'function') {
        jumpToPanelAndFilter(['log', 'aktivitas'], '');
      }
    });
  }

  function positionNotificationPopover(bellBtn) {
    const pop = document.getElementById('bumdesNotifPopover');
    if (!pop || !bellBtn) return;

    const rect = bellBtn.getBoundingClientRect();
    const popWidth = Math.min(380, window.innerWidth - 24);
    let rightOffset = window.innerWidth - rect.right;
    if (rightOffset + popWidth > window.innerWidth - 12) {
      rightOffset = 12;
    }

    pop.style.width = popWidth + 'px';
    pop.style.top = Math.round(rect.bottom + 8) + 'px';
    pop.style.right = Math.max(12, Math.round(rightOffset)) + 'px';
  }

  function renderNotificationList() {
    const listEl = document.getElementById('bumdesNotifList');
    if (!listEl) return;

    const readSet = getReadNotifSet();
    const filtered = allNotifications.filter((n) => {
      if (activeNotifFilter === 'unread') return !readSet.has(n.id);
      if (activeNotifFilter === 'spk') return n.kategori === 'spk' || n.kategori === 'pengaduan';
      if (activeNotifFilter !== 'all') return n.kategori === activeNotifFilter;
      return true;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="padding:36px 16px;text-align:center;color:#64748b;">
          <i class="far fa-bell-slash" style="font-size:1.7rem;color:#cbd5e1;margin-bottom:8px;display:block;"></i>
          <div style="font-size:0.82rem;font-weight:600;">Belum ada notifikasi pada kategori ini</div>
          <div style="font-size:0.74rem;margin-top:2px;">Pemberitahuan transaksi, catat meter & SPK akan muncul otomatis di sini.</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map((n) => {
      const isUnread = !readSet.has(n.id);
      const meta = getNotifVisualMeta(n.kategori);
      return `
        <div class="bn-item ${isUnread ? 'unread' : ''}" data-notif-id="${escapeSearchHtml(n.id)}" data-notif-kat="${escapeSearchHtml(n.kategori)}">
          <div class="bn-icon" style="background:${meta.bg};color:${meta.color};">
            <i class="fas ${meta.icon}"></i>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px;">
              <span style="font-size:0.82rem;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${escapeSearchHtml(n.judul)}
              </span>
              <span style="font-size:0.68rem;color:#64748b;white-space:nowrap;flex-shrink:0;">
                ${escapeSearchHtml(n.waktu_relatif)}
              </span>
            </div>
            <div style="font-size:0.76rem;color:#334155;margin-top:2px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
              ${escapeSearchHtml(n.pesan)}
            </div>
            <div style="font-size:0.69rem;color:#64748b;margin-top:3px;">
              Oleh: <strong>${escapeSearchHtml(n.aktor)}</strong> • ${escapeSearchHtml(n.modul)}
            </div>
          </div>
          ${isUnread ? '<span class="bn-dot" title="Belum dibaca"></span>' : ''}
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.bn-item').forEach((row) => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-notif-id');
        const kat = row.getAttribute('data-notif-kat');
        if (id) {
          const updated = getReadNotifSet();
          updated.add(id);
          saveReadNotifSet(updated);
          updateBellBadges();
        }
        closeNotificationPopover();
        const meta = getNotifVisualMeta(kat);
        if (typeof jumpToPanelAndFilter === 'function') {
          jumpToPanelAndFilter(meta.nav, '');
        }
      });
    });
  }

  async function fetchNotifications(showLoading = false) {
    const idDesa = getActiveIdDesa();
    if (!idDesa) return;

    if (showLoading) {
      const listEl = document.getElementById('bumdesNotifList');
      if (listEl) {
        listEl.innerHTML = `<div style="padding:28px;text-align:center;color:#64748b;font-size:0.8rem;"><i class="fas fa-spinner fa-spin" style="color:#0284c7;margin-right:6px;"></i>Memuat pemberitahuan terbaru...</div>`;
      }
    }

    try {
      const { data, error } = await sb.rpc('getNotifikasiBumdes', {
        p_id_desa: idDesa,
        p_limit: 30
      });
      if (error) throw new Error(error.message);
      if (data && data.status === 'success' && Array.isArray(data.notifications)) {
        allNotifications = data.notifications;
        updateBellBadges();
        const pop = document.getElementById('bumdesNotifPopover');
        if (pop && pop.classList.contains('open')) {
          renderNotificationList();
        }
      }
    } catch (err) {
      console.warn('[Notifikasi] Gagal memuat:', err.message);
    }
  }

  function toggleNotificationPopover(bellBtn) {
    ensureNotificationPopover();
    const pop = document.getElementById('bumdesNotifPopover');

    if (pop.classList.contains('open') && activeBellButton === bellBtn) {
      closeNotificationPopover();
      return;
    }

    activeBellButton = bellBtn;
    positionNotificationPopover(bellBtn);
    pop.classList.add('open');
    renderNotificationList();
    fetchNotifications(allNotifications.length === 0);
  }

  function closeNotificationPopover() {
    const pop = document.getElementById('bumdesNotifPopover');
    if (pop) pop.classList.remove('open');
    activeBellButton = null;
  }

  // Hapus aksi bawaan (lompat ke panel validasi) pada semua tombol lonceng
  function neutralizeBellButtons() {
    document.querySelectorAll('.topbar-icon-btn').forEach((btn) => {
      if (btn.querySelector('.fa-bell') && btn.hasAttribute('onclick')) {
        btn.removeAttribute('onclick');
      }
    });
  }

  // Klik tombol lonceng -> murni hanya buka/tutup popup tanpa berpindah panel/halaman
  document.addEventListener('click', (e) => {
    const bellBtn = e.target.closest('.topbar-icon-btn');
    if (bellBtn && bellBtn.querySelector('.fa-bell')) {
      if (bellBtn.hasAttribute('onclick')) {
        bellBtn.removeAttribute('onclick');
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      toggleNotificationPopover(bellBtn);
      return;
    }

    const pop = document.getElementById('bumdesNotifPopover');
    if (pop && pop.classList.contains('open') && !pop.contains(e.target)) {
      closeNotificationPopover();
    }
  }, true);

  window.addEventListener('resize', () => {
    if (activeBellButton) positionNotificationPopover(activeBellButton);
  });

  // Muat notifikasi otomatis saat halaman siap & perbarui setiap 30 detik
  window.addEventListener('DOMContentLoaded', () => {
    neutralizeBellButtons();
    setTimeout(() => fetchNotifications(false), 600);
    setInterval(() => fetchNotifications(false), 30000);
  });
  window.addEventListener('tenant-branding-ready', () => {
    neutralizeBellButtons();
    fetchNotifications(false);
  });

  // ==========================================================================
  // 7. FOOTER DEVELOPER (TUNGGAL & IKUT SCROLL DI SEMUA PERAN)
  // ==========================================================================
  function injectDeveloperFooter() {
    if (!document.getElementById('bumdesDevFooterStyle')) {
      const style = document.createElement('style');
      style.id = 'bumdesDevFooterStyle';
      style.textContent = `
        .admin-main-content {
          display: flex;
          flex-direction: column;
        }
        .bumdes-dev-footer {
          margin-top: auto;
          padding: 12px 18px 14px 14px;
          border-top: 1px solid #cfd6e0;
          text-align: left;
          font-size: 10.5px;
          line-height: 1.4;
          color: #64748b;
          letter-spacing: 0.1px;
          user-select: none;
          flex-shrink: 0;
        }
        .bumdes-dev-footer .footer-italic {
          font-style: italic;
          font-weight: 400;
        }
        .bumdes-dev-footer .footer-brand {
          font-style: normal;
          font-weight: 700;
          color: #334155;
        }
        @media print {
          .bumdes-dev-footer {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Bersihkan footer ganda di wadah luar (.content-area) jika sudah ada .admin-main-content
    document.querySelectorAll('.content-area').forEach((area) => {
      if (area.querySelector('.admin-main-content')) {
        Array.from(area.children).forEach((child) => {
          if (child.classList && child.classList.contains('bumdes-dev-footer')) {
            child.remove();
          }
        });
      }
    });

    // Pasang hanya 1 footer di dalam area scroll utama (.admin-main-content)
    document.querySelectorAll('.admin-main-content').forEach((container) => {
      if (container.querySelector('.bumdes-dev-footer')) return;

      const footer = document.createElement('footer');
      footer.className = 'bumdes-dev-footer';
      footer.innerHTML =
        '<span class="footer-italic">sistem ini dikembangkan oleh </span>' +
        '<strong class="footer-brand">TitiWeb Lab</strong>' +
        '<span class="footer-italic">, By Nuri Hartanto</span>';

      container.appendChild(footer);
    });
  }

  window.addEventListener('DOMContentLoaded', injectDeveloperFooter);
  window.addEventListener('tenant-branding-ready', injectDeveloperFooter);

  // ==========================================================================
  // 8. TOGGLE MINIMIZE / TAMPILKAN PANEL KIRI (DESKTOP & HP)
  // ==========================================================================
  function initSidebarCollapseToggle() {
    if (!document.getElementById('bumdesSidebarToggleStyle')) {
      const style = document.createElement('style');
      style.id = 'bumdesSidebarToggleStyle';
      style.textContent = `
        @media (min-width: 769px) {
          .sidebar,
          #panel-admin .sidebar,
          #panel-petugas .sidebar,
          #panel-pelanggan .sidebar {
            transition: transform 0.22s ease, left 0.22s ease !important;
          }
          .content-area,
          #panel-admin .content-area,
          #panel-petugas .content-area,
          #panel-pelanggan .content-area,
          .spark-topbar,
          #panel-admin .spark-topbar,
          #panel-petugas .spark-topbar,
          #panel-pelanggan .spark-topbar {
            transition: margin-left 0.22s ease, left 0.22s ease !important;
          }

          body.bumdes-sidebar-collapsed .sidebar,
          body.bumdes-sidebar-collapsed #panel-admin .sidebar,
          body.bumdes-sidebar-collapsed #panel-petugas .sidebar,
          body.bumdes-sidebar-collapsed #panel-pelanggan .sidebar {
            transform: translateX(-100%) !important;
            left: -240px !important;
          }

          body.bumdes-sidebar-collapsed .content-area,
          body.bumdes-sidebar-collapsed #panel-admin .content-area,
          body.bumdes-sidebar-collapsed #panel-petugas .content-area,
          body.bumdes-sidebar-collapsed #panel-pelanggan .content-area {
            margin-left: 0 !important;
            width: 100% !important;
          }

          body.bumdes-sidebar-collapsed .spark-topbar,
          body.bumdes-sidebar-collapsed #panel-admin .spark-topbar,
          body.bumdes-sidebar-collapsed #panel-petugas .spark-topbar,
          body.bumdes-sidebar-collapsed #panel-pelanggan .spark-topbar {
            left: 0 !important;
          }
        }

        /* Perbaikan posisi tumpukan & lebar menu kiri khusus layar HP */
        @media (max-width: 768px) {
          .sidebar,
          #panel-admin .sidebar,
          #panel-petugas .sidebar,
          #panel-pelanggan .sidebar {
            width: 240px !important;
            z-index: 1055 !important;
          }
          .overlay {
            z-index: 1040 !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.querySelectorAll('.spark-topbar button').forEach((btn) => {
      const isToggleBtn =
        btn.querySelector('.fa-bars, .fa-outdent, .fa-indent, .bi-list') ||
        /sidebar|menu/i.test(btn.getAttribute('onclick') || '') ||
        (btn.nextElementSibling && btn.nextElementSibling.classList.contains('spark-breadcrumb'));

      if (isToggleBtn) {
        btn.setAttribute('data-sidebar-toggle-btn', 'true');
        btn.setAttribute('title', 'Sembunyikan / Tampilkan Menu Kiri');
        btn.style.cursor = 'pointer';
      }
    });
  }

  function closeMobileSidebar() {
    document.querySelectorAll('.sidebar.show').forEach((el) => el.classList.remove('show'));
    document.querySelectorAll('.overlay.show').forEach((el) => el.classList.remove('show'));
  }

  function toggleLeftPanel() {
    if (window.innerWidth <= 768) {
      const activePanel = document.querySelector('.panel-view.panel-active') || document;
      const sidebar = activePanel.querySelector('.sidebar');
      const overlay = activePanel.querySelector('.overlay') || document.querySelector('.overlay');
      const willOpen = sidebar && !sidebar.classList.contains('show');
      closeMobileSidebar();
      if (willOpen && sidebar) {
        sidebar.classList.add('show');
        if (overlay) overlay.classList.add('show');
      }
    } else {
      document.body.classList.toggle('bumdes-sidebar-collapsed');
    }
  }

  window.toggleLeftPanel = toggleLeftPanel;

  document.addEventListener('click', (e) => {
    // 1. Klik area gelap luar sidebar di HP -> tutup sidebar
    if (e.target.classList && e.target.classList.contains('overlay')) {
      closeMobileSidebar();
      return;
    }

    // 2. Klik salah satu item menu di sidebar saat mode HP -> jalankan menu lalu tutup sidebar
    if (window.innerWidth <= 768 && e.target.closest('.sidebar .menu-btn')) {
      setTimeout(closeMobileSidebar, 60);
      return;
    }

    // 3. Klik tombol garis tiga di topbar -> buka/tutup panel kiri
    const btn = e.target.closest('button, [data-sidebar-toggle-btn]');
    if (!btn) return;

    const inTopbar = btn.closest('.spark-topbar');
    if (!inTopbar) return;

    const isToggleBtn =
      btn.hasAttribute('data-sidebar-toggle-btn') ||
      btn.querySelector('.fa-bars, .fa-outdent, .fa-indent, .bi-list') ||
      /sidebar|menu/i.test(btn.getAttribute('onclick') || '') ||
      (btn.nextElementSibling && btn.nextElementSibling.classList.contains('spark-breadcrumb'));

    if (isToggleBtn) {
      if (btn.hasAttribute('onclick')) btn.removeAttribute('onclick');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      toggleLeftPanel();
    }
  }, true);

  window.addEventListener('DOMContentLoaded', initSidebarCollapseToggle);
  window.addEventListener('tenant-branding-ready', initSidebarCollapseToggle);
  
  // ==========================================================================
  // 8. TOGGLE MINIMIZE / TAMPILKAN PANEL KIRI (TOMBOL GARIS TIGA TOPBAR)
  // ==========================================================================
  function initSidebarCollapseToggle() {
    if (!document.getElementById('bumdesSidebarToggleStyle')) {
      const style = document.createElement('style');
      style.id = 'bumdesSidebarToggleStyle';
      style.textContent = `
        @media (min-width: 769px) {
          .sidebar,
          #panel-admin .sidebar,
          #panel-petugas .sidebar,
          #panel-pelanggan .sidebar {
            transition: transform 0.22s ease, left 0.22s ease !important;
          }
          .content-area,
          #panel-admin .content-area,
          #panel-petugas .content-area,
          #panel-pelanggan .content-area,
          .spark-topbar,
          #panel-admin .spark-topbar,
          #panel-petugas .spark-topbar,
          #panel-pelanggan .spark-topbar {
            transition: margin-left 0.22s ease, left 0.22s ease !important;
          }

          body.bumdes-sidebar-collapsed .sidebar,
          body.bumdes-sidebar-collapsed #panel-admin .sidebar,
          body.bumdes-sidebar-collapsed #panel-petugas .sidebar,
          body.bumdes-sidebar-collapsed #panel-pelanggan .sidebar {
            transform: translateX(-100%) !important;
            left: -240px !important;
          }

          body.bumdes-sidebar-collapsed .content-area,
          body.bumdes-sidebar-collapsed #panel-admin .content-area,
          body.bumdes-sidebar-collapsed #panel-petugas .content-area,
          body.bumdes-sidebar-collapsed #panel-pelanggan .content-area {
            margin-left: 0 !important;
            width: 100% !important;
          }

          body.bumdes-sidebar-collapsed .spark-topbar,
          body.bumdes-sidebar-collapsed #panel-admin .spark-topbar,
          body.bumdes-sidebar-collapsed #panel-petugas .spark-topbar,
          body.bumdes-sidebar-collapsed #panel-pelanggan .spark-topbar {
            left: 0 !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.querySelectorAll('.spark-topbar button').forEach((btn) => {
      const isToggleBtn =
        btn.querySelector('.fa-bars, .fa-outdent, .fa-indent, .bi-list') ||
        /sidebar|menu/i.test(btn.getAttribute('onclick') || '') ||
        (btn.nextElementSibling && btn.nextElementSibling.classList.contains('spark-breadcrumb'));

      if (isToggleBtn) {
        btn.setAttribute('data-sidebar-toggle-btn', 'true');
        btn.setAttribute('title', 'Sembunyikan / Tampilkan Menu Kiri');
        btn.style.cursor = 'pointer';
      }
    });
  }

  function toggleLeftPanel() {
    if (window.innerWidth <= 768) {
      const activePanel = document.querySelector('.panel-view.panel-active') || document;
      const sidebar = activePanel.querySelector('.sidebar');
      const overlay = activePanel.querySelector('.overlay') || document.querySelector('.overlay');
      if (sidebar) sidebar.classList.toggle('show');
      if (overlay) overlay.classList.toggle('show');
    } else {
      document.body.classList.toggle('bumdes-sidebar-collapsed');
    }
  }

  window.toggleLeftPanel = toggleLeftPanel;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, [data-sidebar-toggle-btn]');
    if (!btn) return;

    const inTopbar = btn.closest('.spark-topbar');
    if (!inTopbar) return;

    const isToggleBtn =
      btn.hasAttribute('data-sidebar-toggle-btn') ||
      btn.querySelector('.fa-bars, .fa-outdent, .fa-indent, .bi-list') ||
      /sidebar|menu/i.test(btn.getAttribute('onclick') || '') ||
      (btn.nextElementSibling && btn.nextElementSibling.classList.contains('spark-breadcrumb'));

    if (isToggleBtn) {
      if (btn.hasAttribute('onclick')) btn.removeAttribute('onclick');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      toggleLeftPanel();
    }
  }, true);

  window.addEventListener('DOMContentLoaded', initSidebarCollapseToggle);
  window.addEventListener('tenant-branding-ready', initSidebarCollapseToggle);
})();