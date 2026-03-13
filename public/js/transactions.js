requireAuth();

// Set page title with the user's name
const _user = getUser();
if (_user) {
    const name = _user.first_name || _user.email.split('@')[0];
    document.title = `Transacciones – ${name} | TIDI`;
}

// Theme toggle
document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
});

// Mobile sidebar toggle
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

// Progressive fade-in animation for elements with the .fade-in class
window.addEventListener('load', () => {
    document.querySelectorAll('.fade-in').forEach((el, i) => {
        setTimeout(() => el.classList.add('show'), i * 120);
    });
});

// Full list of transactions loaded from the API
let allTransactions = [];

const txDetailModal = new bootstrap.Modal(document.getElementById('txDetailModal'));
let activeTxId = null;

// Formats a number as a currency string (e.g. $1,234.56)
function fmt(val) {
    return '$' + parseFloat(val || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Opens the transaction detail modal for the given transaction
function openDetail(tx) {
    const d         = tx.data || {};
    const type      = (d.tipo || '').toLowerCase();
    const isIncome  = type === 'ingreso';
    const isBalance = type === 'modificacion de balance';
    const amount    = parseFloat(d.valor || 0);
    const title     = d.titulo || d.categoria || 'Sin título';
    const prefix    = isIncome ? '+ ' : isBalance ? '' : '- ';
    const color     = isIncome ? '#10b981' : isBalance ? '#6840f3' : '#f87171';
    const iconClass = isIncome ? 'bi-arrow-down-circle-fill' : isBalance ? 'bi-wallet2' : 'bi-arrow-up-circle-fill';
    const date      = new Date(tx.created_at).toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    document.getElementById('detailIcon').innerHTML = `<i class="bi ${iconClass} fs-1" style="color:${color};"></i>`;
    document.getElementById('detailTitulo').textContent = title;
    document.getElementById('detailCategoria').textContent = d.categoria || type;
    document.getElementById('detailValor').innerHTML = `<span style="color:${color};">${prefix}${fmt(amount)}</span>`;
    document.getElementById('detailTipo').textContent = d.tipo || '';
    document.getElementById('detailFecha').textContent = date;

    activeTxId = tx.id;
    txDetailModal.show();
}

// Deletes the currently open transaction and refreshes the list
document.getElementById('btnDeleteTx').addEventListener('click', async () => {
    if (!activeTxId) return;
    const btn = document.getElementById('btnDeleteTx');
    btn.disabled = true;
    btn.innerHTML = `<i class="bi bi-hourglass-split me-1"></i> ${t('tx.deleting')}`;

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
    btn.innerHTML = `<i class="bi bi-trash3 me-1"></i> ${t('tx.delete')}`;
});

// Renders the given list of transactions and shows a summary of income vs. expense totals
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

    // Compute totals for the summary bar
    let totalIncome = 0, totalExpense = 0;
    transactions.forEach(tx => {
        const d    = tx.data || {};
        const type = (d.tipo || '').toLowerCase();
        const val  = parseFloat(d.valor || 0);
        if (type === 'ingreso') totalIncome += val;
        else if (type === 'gasto') totalExpense += val;
    });
    summary.style.display = '';
    summary.textContent = `${transactions.length} ${t('tx.summaryLabel')} · ${t('tx.incomesLabel')}: ${fmt(totalIncome)} · ${t('tx.expensesLabel')}: ${fmt(totalExpense)}`;

    transactions.forEach(tx => {
        const d         = tx.data || {};
        const type      = (d.tipo || '').toLowerCase();
        const isIncome  = type === 'ingreso';
        const isBalance = type === 'modificacion de balance';
        const title     = d.titulo || d.categoria || 'Sin título';
        const category  = d.categoria || '';
        const amount    = parseFloat(d.valor || 0);

        const colorClass = isIncome ? 'text-success' : isBalance ? 'text-primary' : 'text-danger';
        const prefix     = isIncome ? '+ ' : isBalance ? '' : '- ';
        const iconClass  = isIncome ? 'bi-arrow-down-circle text-success' : isBalance ? 'bi-wallet2 text-primary' : 'bi-arrow-up-circle text-danger';
        const date       = new Date(tx.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

        const el = document.createElement('div');
        el.className = 'card-custom mb-3 d-flex justify-content-between align-items-center';
        el.style.cursor = 'pointer';
        el.innerHTML = `
            <div class="d-flex align-items-center gap-3">
              <i class="bi ${iconClass} fs-4"></i>
              <div>
                <strong>${title}</strong>
                <div class="small opacity-50">${category ? category + ' · ' : ''}${date}</div>
              </div>
            </div>
            <span class="${colorClass} fw-bold">${prefix}${fmt(amount)}</span>`;
        el.addEventListener('click', () => openDetail(tx));
        list.appendChild(el);
    });
}

// Applies the active filters (type, date range) to allTransactions and re-renders the list
function applyFilters() {
    const type = document.getElementById('filterTipo').value.toLowerCase();
    const from = document.getElementById('filterDesde').value;
    const to   = document.getElementById('filterHasta').value;

    const filtered = allTransactions.filter(tx => {
        const d      = tx.data || {};
        const txType = (d.tipo || '').toLowerCase();
        const txDate = new Date(tx.created_at);

        if (type && txType !== type) return false;
        if (from && txDate < new Date(from + 'T00:00:00')) return false;
        if (to && txDate > new Date(to + 'T23:59:59')) return false;
        return true;
    });

    renderList(filtered);
}

// Resets all filters and shows the full transaction list
function clearFilters() {
    document.getElementById('filterTipo').value  = '';
    document.getElementById('filterDesde').value = '';
    document.getElementById('filterHasta').value = '';
    renderList(allTransactions);
    document.getElementById('filterSummary').style.display = 'none';
}

document.getElementById('btnFiltrar').addEventListener('click', applyFilters);
document.getElementById('btnLimpiar').addEventListener('click', clearFilters);

// Also apply filters when the user presses Enter in a date input
['filterDesde', 'filterHasta'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter') applyFilters();
    });
});

// Fetches all transactions from the API and renders them
async function loadTransactions() {
    try {
        const res = await fetch('/api/transactions', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) return;
        allTransactions = await res.json(); // already returned in DESC order
        renderList(allTransactions);
    } catch (e) {
        console.error('Error loading transactions:', e);
    }
}

loadTransactions();
