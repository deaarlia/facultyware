function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = 'toast toast-' + (type === 'error' ? 'destructive' : type);
  
  const iconClass = type === 'error' ? 'ph-bold ph-x-circle' : 'ph-bold ph-check-circle';
  el.innerHTML = `
    <i class="${iconClass} text-lg"></i>
    <p class="toast-title">${msg}</p>
  `;
  
  document.getElementById('toaster').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function download() {
  const samplePeriode = document.getElementById('sel-periode');
  const periode = samplePeriode ? samplePeriode.value : 'all';
  const format = document.querySelector('input[name="format"]:checked')?.value || 'xlsx';
  const btn = document.getElementById('btn-download');

  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Mengunduh...';

  const url = `/api/admin/ekspor?format=${format}&periode_id=${encodeURIComponent(periode)}`;

  if (format === 'pdf') {
    window.open(url, '_blank');
  } else {
    const a = document.createElement('a');
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('File XLSX berhasil diunduh.', 'success');
  }

  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }, 1500);
}

async function hapusDraft() {
  if (!confirm('Hapus semua draf pengajuan kadaluarsa?\nData yang sudah dihapus tidak dapat dipulihkan.')) return;

  const btn = document.getElementById('btn-cleanup');
  const resultEl = document.getElementById('cleanup-result');

  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Memproses...';

  try {
    const res = await fetch('/api/admin/permohonan/draft/cleanup', { method: 'DELETE' });
    const data = await res.json();

    if (res.ok && data.success) {
      showToast(data.message, 'success');
      resultEl.innerHTML = `<i class="ph-bold ph-check-circle"></i> <span>${data.message}</span>`;
      resultEl.className = 'text-sm text-success flex items-center gap-1.5';
    } else {
      showToast(data?.message || 'Gagal.', 'error');
      resultEl.innerHTML = `<i class="ph-bold ph-x-circle"></i> <span>${data?.message || 'Gagal.'}</span>`;
      resultEl.className = 'text-sm text-destructive flex items-center gap-1.5';
    }
    resultEl.hidden = false;
  } catch {
    showToast('Gagal terhubung ke server.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}