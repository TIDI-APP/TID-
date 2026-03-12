requireAuth();

const _user = getUser();
if (_user) {
    const name = _user.first_name || _user.email.split('@')[0];
    document.title = `Transacciones – ${name} | TIDI`;
}

// Theme toggle
document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
});

// Mobile sidebar
const sidebar  = document.getElementById('mobileSidebar');
const overlay  = document.getElementById('menuOverlay');
const closeBtn = document.getElementById('closeSidebar');
document.getElementById('menuToggle').addEventListener('click', () => {
    sidebar.classList.add('active');
    overlay.classList.add('active');
});
function closeMenu() {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
}
closeBtn.addEventListener('click', closeMenu);
overlay.addEventListener('click', closeMenu);

// Fade in
window.addEventListener('load', () => {
    document.querySelectorAll('.fade-in').forEach((el, i) => {
        setTimeout(() => el.classList.add('show'), i * 120);
    });
});

// --- Data ---
let allTransactions = [];

const txDetailModal = new bootstrap.Modal(document.getElementById('txDetailModal'));
let activeTxId = null;

function fmt(val) {
    return '$' + parseFloat(val || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


function openDetail(tx) {
    const d         = tx.data || {};
    const tipo      = (d.tipo || '').toLowerCase();
    const isIngreso = tipo === 'ingreso';
    const isBalance = tipo === 'modificacion de balance';
    const valor     = parseFloat(d.valor || 0);
    const titulo    = d.titulo || d.categoria || 'Sin título';
    const prefix    = isIngreso ? '+ ' : isBalance ? '' : '- ';
    const color     = isIngreso ? '#10b981' : isBalance ? '#6840f3' : '#f87171';
    const iconClass = isIngreso ? 'bi-arrow-down-circle-fill' : isBalance ? 'bi-wallet2' : 'bi-arrow-up-circle-fill';
    const fecha     = new Date(tx.created_at).toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    document.getElementById('detailIcon').innerHTML = `<i class="bi ${iconClass} fs-1" style="color:${color};"></i>`;
    document.getElementById('detailTitulo').textContent = titulo;
    document.getElementById('detailCategoria').textContent = d.categoria || tipo;
    document.getElementById('detailValor').innerHTML = `<span style="color:${color};">${prefix}${fmt(valor)}</span>`;
    document.getElementById('detailTipo').textContent = d.tipo || '';
    document.getElementById('detailFecha').textContent = fecha;

    activeTxId = tx.id;
    txDetailModal.show();
}

document.getElementById('btnDeleteTx').addEventListener('click', async () => {
    if (!activeTxId) return;
    const btn = document.getElementById('btnDeleteTx');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Eliminando...';

    try {
        const res = await fetch(`/api/transactions/${activeTxId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (res.ok) {
            allTransactions = allTransactions.filter(t => t.id !== activeTxId);
            txDetailModal.hide();
            applyFilters();
        }
    } catch (e) {
        console.error('Error deleting tx:', e);
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-trash3 me-1"></i> Eliminar transacción';
});

function renderList(transactions) {
    const list    = document.getElementById('txList');
    const noTx    = document.getElementById('noTx');
    const summary = document.getElementById('filterSummary');
    list.innerHTML = '';

    if (!transactions.length) {
        noTx.style.display = '';
        summary.style.display = 'none';
        return;
    }
    noTx.style.display = 'none';

    // Resumen
    let totalIngreso = 0, totalGasto = 0;
    transactions.forEach(tx => {
        const d    = tx.data || {};
        const tipo = (d.tipo || '').toLowerCase();
        const val  = parseFloat(d.valor || 0);
        if (tipo === 'ingreso') totalIngreso += val;
        else if (tipo === 'gasto') totalGasto += val;
    });
    summary.style.display = '';
    summary.textContent = `${transactions.length} transacción(es) · Ingresos: ${fmt(totalIngreso)} · Gastos: ${fmt(totalGasto)}`;

    transactions.forEach(tx => {
        const d         = tx.data || {};
        const tipo      = (d.tipo || '').toLowerCase();
        const isIngreso = tipo === 'ingreso';
        const isBalance = tipo === 'modificacion de balance';
        const titulo    = d.titulo || d.categoria || 'Sin título';
        const categoria = d.categoria || '';
        const valor     = parseFloat(d.valor || 0);

        const colorClass = isIngreso ? 'text-success' : isBalance ? 'text-primary' : 'text-danger';
        const prefix     = isIngreso ? '+ ' : isBalance ? '' : '- ';
        const iconClass  = isIngreso ? 'bi-arrow-down-circle text-success' : isBalance ? 'bi-wallet2 text-primary' : 'bi-arrow-up-circle text-danger';
        const fecha      = new Date(tx.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

        const el = document.createElement('div');
        el.className = 'card-custom mb-3 d-flex justify-content-between align-items-center';
        el.style.cursor = 'pointer';
        el.innerHTML = `
            <div class="d-flex align-items-center gap-3">
              <i class="bi ${iconClass} fs-4"></i>
              <div>
                <strong>${titulo}</strong>
                <div class="small opacity-50">${categoria ? categoria + ' · ' : ''}${fecha}</div>
              </div>
            </div>
            <span class="${colorClass} fw-bold">${prefix}${fmt(valor)}</span>`;
        el.addEventListener('click', () => openDetail(tx));
        list.appendChild(el);
    });
}

function applyFilters() {
    const tipo  = document.getElementById('filterTipo').value.toLowerCase();
    const desde = document.getElementById('filterDesde').value;
    const hasta = document.getElementById('filterHasta').value;

    const filtered = allTransactions.filter(tx => {
        const d      = tx.data || {};
        const txTipo = (d.tipo || '').toLowerCase();
        const txDate = new Date(tx.created_at);

        if (tipo && txTipo !== tipo) return false;
        if (desde && txDate < new Date(desde + 'T00:00:00')) return false;
        if (hasta && txDate > new Date(hasta + 'T23:59:59')) return false;
        return true;
    });

    renderList(filtered);
}

function clearFilters() {
    document.getElementById('filterTipo').value  = '';
    document.getElementById('filterDesde').value = '';
    document.getElementById('filterHasta').value = '';
    renderList(allTransactions);
    document.getElementById('filterSummary').style.display = 'none';
}

document.getElementById('btnFiltrar').addEventListener('click', applyFilters);
document.getElementById('btnLimpiar').addEventListener('click', clearFilters);

// Aplicar filtro también al presionar Enter en los inputs de fecha
['filterDesde', 'filterHasta'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter') applyFilters();
    });
});

async function loadTransactions() {
    try {
        const res = await fetch('/api/transactions', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) return;
        allTransactions = await res.json(); // ya vienen DESC
        renderList(allTransactions);
    } catch (e) {
        console.error('Error loading transactions:', e);
    }
}

loadTransactions();
