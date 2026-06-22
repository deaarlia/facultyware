const tbody = document.getElementById('tbody-periode');

if (tbody && typeof PERIODES !== 'undefined') {
  renderRows(PERIODES);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

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

function renderRows(periodes) {
  if (periodes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="p-12 text-center text-muted">
          <p class="font-medium">Belum ada periode</p>
          <p class="text-sm mt-1">Klik "Tambah Periode" untuk membuat periode baru.</p>
        </td>
      </tr>
    `;
    return;
  }

  const now = new Date();

  tbody.innerHTML = periodes.map(p => {
    const start = new Date(p.start_date);
    const end = new Date(p.end_date);
    
    let statusBadge = '<span class="badge badge-danger">Nonaktif</span>';
    if (p.is_active) {
      if (now >= start && now <= end) {
        statusBadge = '<span class="badge badge-success">Aktif</span>';
      } else if (now < start) {
        statusBadge = '<span class="badge badge-warning">Mendatang</span>';
      } else {
        statusBadge = '<span class="badge badge-danger">Berakhir</span>';
      }
    }

    return `
    <tr id="row-${p.id}">
      <td class="font-medium">${p.name}</td>
      <td class="text-muted">${fmtDate(p.start_date)}</td>
      <td class="text-muted">${fmtDate(p.end_date)}</td>
      <td>${statusBadge}</td>
      <td class="text-right">
        <div class="flex items-center justify-end gap-2">
          <button class="btn-sm-outline flex items-center gap-1" onclick='openEditModal(${JSON.stringify(p)})'>
            <i class="ph-bold ph-pencil-simple"></i> Edit
          </button>
          <button class="btn-sm-outline flex items-center gap-1" onclick="togglePeriode(${p.id}, this)">
            <i class="ph-bold ${p.is_active ? 'ph-lock' : 'ph-lock-open'}"></i> ${p.is_active ? 'Tutup' : 'Buka'}
          </button>
          <button class="btn-sm-outline btn-destructive-outline flex items-center gap-1" onclick="hapusPeriode(${p.id})">
            <i class="ph-bold ph-trash"></i> Hapus
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

let editId = null;

window.openModal = function() {
  editId = null;
  document.getElementById('modal-title').textContent = 'Tambah Periode';
  document.getElementById('btn-submit').textContent = 'Simpan';
  document.getElementById('inp-name').value = '';
  document.getElementById('inp-start').value = '';
  document.getElementById('inp-end').value = '';
  clearErrors();
  showModal();
}

window.openEditModal = function(p) {
  editId = p.id;
  document.getElementById('modal-title').textContent = 'Edit Periode';
  document.getElementById('btn-submit').textContent = 'Perbarui';
  document.getElementById('inp-name').value = p.name;
  document.getElementById('inp-start').value = (p.start_date || '').substring(0, 10);
  document.getElementById('inp-end').value = (p.end_date || '').substring(0, 10);
  clearErrors();
  showModal();
}

window.closeModal = function() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function showModal() {
  document.getElementById('modal-overlay').style.display = 'flex';
}

function clearErrors() {
  ['name', 'start', 'end'].forEach(f => {
    const el = document.getElementById('err-' + f);
    if (el) { el.textContent = ''; el.hidden = true; }
  });
  const errEl = document.getElementById('modal-error');
  if (errEl) errEl.hidden = true;
}

function showFieldError(field, msg) {
  const el = document.getElementById('err-' + field);
  if (el) { el.textContent = msg; el.hidden = false; }
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) window.closeModal();
    });
  }

  const form = document.getElementById('form-periode');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();

      const name = document.getElementById('inp-name').value.trim();
      const start = document.getElementById('inp-start').value;
      const end = document.getElementById('inp-end').value;

      let valid = true;
      if (!name) { showFieldError('name', 'Nama periode wajib diisi.'); valid = false; }
      if (!start) { showFieldError('start', 'Tanggal mulai wajib diisi.'); valid = false; }
      if (!end) { showFieldError('end', 'Deadline wajib diisi.'); valid = false; }
      if (start && end && new Date(start) >= new Date(end)) {
        showFieldError('end', 'Deadline harus setelah tanggal mulai.');
        valid = false;
      }
      if (!valid) return;

      const btn = document.getElementById('btn-submit');
      btn.disabled = true;
      const originalText = btn.textContent;
      btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Menyimpan...';

      try {
        const res = await fetch(editId ? `/api/admin/periode/${editId}` : '/api/admin/periode', {
          method: editId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, start_date: start, end_date: end }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          const errEl = document.getElementById('modal-error');
          errEl.textContent = Array.isArray(data.errors) ? data.errors.join(' ') : (data.message || 'Terjadi kesalahan.');
          errEl.hidden = false;
        } else {
          window.closeModal();
          showToast(data.message, 'success');
          setTimeout(() => location.reload(), 800);
        }
      } catch {
        const errEl = document.getElementById('modal-error');
        errEl.textContent = 'Gagal terhubung ke server.';
        errEl.hidden = false;
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  }
});

window.togglePeriode = async function(id, btn) {
  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i>';
  try {
    const res = await fetch(`/api/admin/periode/${id}/toggle`, { method: 'PATCH' });
    const data = await res.json();
    if (data?.success) {
      showToast(data.message, 'success');
      setTimeout(() => location.reload(), 600);
    } else {
      showToast(data?.message || 'Gagal.', 'error');
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  } catch {
    showToast('Gagal terhubung.', 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

window.hapusPeriode = async function(id) {
  if (!confirm('Yakin ingin menghapus periode ini?')) return;
  try {
    const res = await fetch(`/api/admin/periode/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data?.success) {
      showToast(data.message, 'success');
      document.getElementById(`row-${id}`)?.remove();
    } else {
      showToast(data?.message || 'Gagal menghapus.', 'error');
    }
  } catch {
    showToast('Gagal terhubung.', 'error');
  }
}