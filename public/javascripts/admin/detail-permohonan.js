function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = 'toast toast-' + (type === 'error' ? 'destructive' : type);
  
  const iconClass = type === 'error' ? 'ph-bold ph-x-circle' : 'ph-bold ph-check-circle';
  el.innerHTML = `
    <i class="${iconClass} text-lg"></i>
    <p class="toast-title">${msg}</p>
  `;
  
  document.getElementById('toaster').appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

const MODAL_CONFIG = {
  '1': {
    title: 'Setujui Permohonan',
    desc: 'Permohonan akan diteruskan ke WD 2 untuk verifikasi Tahap 2.',
    note: '(opsional)',
    btnLabel: 'Ya, Setujui',
    btnClass: 'btn btn-success',
  },
  '2': {
    title: 'Tolak Permohonan',
    desc: 'Permohonan akan ditolak. Tindakan ini tidak dapat dibatalkan jika WD 2 sudah bertindak.',
    note: '(wajib)',
    btnLabel: 'Ya, Tolak',
    btnClass: 'btn btn-destructive',
  },
  '3': {
    title: 'Minta Revisi Berkas',
    desc: 'Mahasiswa akan diminta melengkapi atau memperbaiki berkas yang diunggah.',
    note: '(wajib)',
    btnLabel: 'Kirim Permintaan Revisi',
    btnClass: 'btn',
  },
};

function openModal(status) {
  const cfg = MODAL_CONFIG[String(status)];
  if (!cfg) return;

  document.getElementById('inp-status').value = status;
  document.getElementById('modal-title').textContent = cfg.title;
  document.getElementById('modal-desc').textContent = cfg.desc;
  document.getElementById('catatan-note').textContent = cfg.note;
  document.getElementById('inp-catatan').value = '';
  document.getElementById('inp-nominal').value = '';

  document.getElementById('nominal-field').hidden = status !== '1';

  const btn = document.getElementById('btn-konfirmasi');
  btn.textContent = cfg.btnLabel;
  btn.className = cfg.btnClass;

  document.getElementById('err-catatan').hidden = true;
  document.getElementById('err-nominal').hidden = true;
  document.getElementById('modal-error').hidden = true;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

async function submitVerifikasi() {
  const status = document.getElementById('inp-status').value;
  const catatan = document.getElementById('inp-catatan').value.trim();
  const nominal = document.getElementById('inp-nominal').value.trim();
  const errCat = document.getElementById('err-catatan');
  const errNominal = document.getElementById('err-nominal');
  const errEl = document.getElementById('modal-error');

  errCat.hidden = true;
  errNominal.hidden = true;
  errEl.hidden = true;

  if (status === '1' && !nominal) {
    errNominal.textContent = 'Nominal wajib diisi saat menyetujui permohonan.';
    errNominal.hidden = false;
    return;
  }

  if (['2', '3'].includes(status) && !catatan) {
    errCat.textContent = status === '2'
      ? 'Catatan wajib diisi saat menolak permohonan.'
      : 'Catatan wajib diisi untuk instruksi revisi berkas.';
    errCat.hidden = false;
    return;
  }

  const btn = document.getElementById('btn-konfirmasi');
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Memproses...';

  try {
    const res = await fetch(`/api/admin/permohonan/${PERMOHONAN_ID}/verifikasi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status_verifikasi: status, catatan, nominal }),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      closeModal();
      showToast(data.message, 'success');
      setTimeout(() => location.reload(), 1000);
    } else {
      errEl.textContent = data.message || 'Terjadi kesalahan.';
      errEl.hidden = false;
    }
  } catch {
    errEl.textContent = 'Gagal terhubung ke server.';
    errEl.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function batalkanVerifikasi() {
  if (!confirm('Batalkan verifikasi Admin Tahap 1? Status akan kembali ke "Menunggu".')) return;
  try {
    const res = await fetch(`/api/admin/permohonan/${PERMOHONAN_ID}/verifikasi`, { method: 'DELETE' });
    const data = await res.json();
    if (data?.success) {
      showToast(data.message, 'success');
      setTimeout(() => location.reload(), 1000);
    } else {
      showToast(data?.message || 'Gagal membatalkan.', 'error');
    }
  } catch {
    showToast('Gagal terhubung ke server.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });
  }
});