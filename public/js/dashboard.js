// Si viene con token en la URL (Google OAuth), guardarlo ANTES del guard
const _urlParams = new URLSearchParams(window.location.search);
const _urlToken = _urlParams.get('token');
if (_urlToken) {
    saveToken(_urlToken);
    window.history.replaceState({}, document.title, window.location.pathname);
}

// Protección de ruta
requireAuth();

// Nombre de usuario dinámico
const _user = getUser();
if (_user) {
    const name = _user.first_name || _user.email.split('@')[0];
    const welcomeMsg = document.getElementById('welcomeMsg');
    if (welcomeMsg) welcomeMsg.textContent = `Hola, ${name}`;
}

const financeModalEl = document.getElementById('financeModal');
const financeModal = financeModalEl ? new bootstrap.Modal(financeModalEl) : null;
const modalTitle = document.getElementById('modalTitle');
const modalIconContainer = document.getElementById('modalIconContainer');
const btnSaveTransaction = document.getElementById('btnSaveTransaction');
const categoryButtons = document.querySelectorAll('.category-badge');

let currentType = "";

// Income
document.getElementById('openIncome')?.addEventListener('click', () => {
    currentType = "Ingreso";
    if (modalTitle) modalTitle.innerText = "Nuevo Ingreso";
    if (modalIconContainer) modalIconContainer.innerHTML = '<i class="bi bi-arrow-down-circle-fill text-success fs-1"></i>';
    if (btnSaveTransaction) btnSaveTransaction.style.background = "var(--primary)";
    if (financeModal) financeModal.show();
});

// Expense
document.getElementById('openExpense')?.addEventListener('click', () => {
    currentType = "Gasto";
    modalTitle.innerText = "Nuevo Gasto";
    modalIconContainer.innerHTML = '<i class="bi bi-arrow-up-circle-fill text-danger fs-1"></i>';
    if (btnSaveTransaction) btnSaveTransaction.style.background = "var(--soft)";
    if (financeModal) financeModal.show();
});

const financeForm = document.getElementById('financeForm');
if (financeForm) {
    financeForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const valor = financeForm.querySelector('input[type="number"]').value;
        const titulo = financeForm.querySelector('input[type="text"]').value.trim();
        const activeCategory = financeForm.querySelector('.category-badge.active');
        const categoria = activeCategory ? activeCategory.textContent.trim() : 'Otros';
        const saveBtn = document.getElementById('btnSaveTransaction');

        if (!valor || parseFloat(valor) <= 0) return;

        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    tipo: currentType,
                    titulo: titulo || categoria,
                    valor: parseFloat(valor),
                    categoria
                })
            });
            if (res.ok) {
                const { transaction } = await res.json();
                renderTransaction(transaction, true);

                const v = parseFloat(valor);
                const tipo = currentType.toLowerCase();

                // Actualizar balance
                applyToBalance(currentType, v);

                // Actualizar totales del mes
                const now = new Date();
                const txDate = new Date(transaction.created_at);
                if (txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()) {
                    if (tipo === 'ingreso') {
                        const elI2 = document.getElementById('totalIngresos');
                        elI2.textContent = fmt((parseFloat(elI2.textContent.replace(/[^0-9.-]/g, '')) || 0) + v);
                    } else if (tipo === 'gasto') {
                        const elG2 = document.getElementById('totalGastos');
                        elG2.textContent = fmt((parseFloat(elG2.textContent.replace(/[^0-9.-]/g, '')) || 0) + v);
                    }
                }
            }
        } catch (err) {
            console.error('Error saving transaction:', err);
        }

        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar';
        financeForm.reset();
        if (financeModal) financeModal.hide();
    });
}

// Category selection logic
categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        categoryButtons.forEach(b => {
            b.classList.remove('active');
            b.style.background = 'rgba(255,255,255,0.05)';
            b.style.border = '1px solid transparent';
        });
        btn.classList.add('active');
        btn.style.background = 'rgba(255,255,255,0.1)';
        btn.style.border = '1px solid rgba(255,255,255,0.2)';
    });
});

// Edit Balance Logic
const editBalanceModalEl = document.getElementById('editBalanceModal');
const editBalanceModal = editBalanceModalEl ? new bootstrap.Modal(editBalanceModalEl) : null;
const editBalanceBtn = document.getElementById('editBalanceBtn');
const btnUpdateBalance = document.getElementById('btnUpdateBalance');
const newBalanceInput = document.getElementById('newBalanceInput');
const balanceValue = document.getElementById('balanceValue');

if (editBalanceBtn && editBalanceModal) {
    editBalanceBtn.addEventListener('click', () => {
        newBalanceInput.value = '';
        editBalanceModal.show();
    });
}
if (btnUpdateBalance) {
    btnUpdateBalance.addEventListener('click', async () => {
        const val = parseFloat(newBalanceInput.value);
        if (isNaN(val)) return;

        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    tipo: 'Modificacion de balance',
                    titulo: 'Ajuste de balance',
                    valor: val,
                    categoria: 'Balance'
                })
            });
            if (res.ok) {
                const { transaction } = await res.json();
                renderTransaction(transaction, true);
                currentBalance = val;
                updateBalanceDisplay();
            }
        } catch (e) {
            console.error('Error updating balance:', e);
        }

        editBalanceModal.hide();
    });
}




// 🌗 Modo oscuro/claro
document.getElementById("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
});


// ✨ Fade in progresivo
window.addEventListener("load", () => {
    document.querySelectorAll(".fade-in").forEach((el, i) => {
        setTimeout(() => el.classList.add("show"), i * 180);
    });
});

// Formato de moneda
function fmt(val) {
    return '$' + parseFloat(val || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


// Renderiza una transacción en la lista
function renderTransaction(tx, prepend = false) {
    const d = tx.data || {};
    const tipo = (d.tipo || '').toLowerCase();
    const isIngreso = tipo === 'ingreso';
    const isBalance = tipo === 'modificacion de balance';
    const titulo = d.titulo || d.categoria || 'Sin título';
    const categoria = d.categoria || '';
    const valor = parseFloat(d.valor || 0);

    const colorClass = isIngreso ? 'text-success' : isBalance ? 'text-primary' : 'text-danger';
    const prefix = isIngreso ? '+ ' : isBalance ? '' : '- ';

    const fecha = new Date(tx.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

    const el = document.createElement('div');
    el.className = 'card-custom mb-3 d-flex justify-content-between align-items-center';
    el.innerHTML = `
        <div>
          <strong>${titulo}</strong>
          <div class="small opacity-50">${categoria} · ${fecha}</div>
        </div>
        <span class="${colorClass} fw-bold">${prefix}${fmt(valor)}</span>`;

    const list = document.getElementById('transactionsList');
    const empty = document.getElementById('noTransactions');
    if (empty) empty.remove();

    if (prepend) {
        list.insertBefore(el, list.firstChild);
    } else {
        list.appendChild(el);
    }
}

// Balance global
let currentBalance = 0;

function updateBalanceDisplay() {
    const el = document.getElementById('balanceValue');
    if (!el) return;
    const isNeg = currentBalance < 0;
    el.textContent = (isNeg ? '-' : '') + fmt(Math.abs(currentBalance));
    el.style.color = isNeg ? '#f87171' : 'white';
}

function applyToBalance(tipo, valor) {
    const t = (tipo || '').toLowerCase();
    if (t === 'ingreso') currentBalance += valor;
    else if (t === 'gasto') currentBalance -= valor;
    else if (t === 'modificacion de balance') currentBalance = valor;
    updateBalanceDisplay();
}


// Carga transacciones y calcula totales + balance
async function loadTransactions() {
    try {
        const res = await fetch('/api/transactions', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) return;
        // La API devuelve ordenadas DESC, invertimos para procesar balance cronológicamente
        const transactions = (await res.json()).slice().reverse();

        let ingresos = 0, gastos = 0;
        const now = new Date();
        currentBalance = 0;

        transactions.forEach(tx => {
            const d = tx.data || {};
            const tipo = (d.tipo || '').toLowerCase();
            const valor = parseFloat(d.valor || 0);
            const txDate = new Date(tx.created_at);

            // Calcular balance acumulado
            if (tipo === 'ingreso') currentBalance += valor;
            else if (tipo === 'gasto') currentBalance -= valor;
            else if (tipo === 'modificacion de balance') currentBalance = valor;

            // Totales del mes actual
            if (txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()) {
                if (tipo === 'ingreso') ingresos += valor;
                else if (tipo === 'gasto') gastos += valor;
            }
        });

        // Renderizar las 4 más recientes en orden DESC
        transactions.slice().reverse().slice(0, 4).forEach(tx => renderTransaction(tx));
        document.getElementById('seeAllBtn').style.display = transactions.length > 4 ? '' : 'none';

        updateBalanceDisplay();
        const elI = document.getElementById('totalIngresos');
        const elG = document.getElementById('totalGastos');
        elI.textContent = fmt(ingresos);
        elG.textContent = fmt(gastos);

    } catch (e) {
        console.error('Error loading transactions:', e);
    }
}

loadTransactions();

// 🎤 Voice Bottom Sheet & Speech Recognition API
const voiceSheet = document.getElementById("voiceSheet");
const voiceTextDisplay = document.getElementById("voiceTextDisplay"); // Make sure this element exists in HTML
const waveAnimation = document.getElementById("waveAnimation");

const showVoiceSheet = () => {
    voiceSheet.classList.add("active");
    if (voiceTextDisplay) voiceTextDisplay.innerText = "Escuchando...";
    if (waveAnimation) waveAnimation.style.display = "flex";
};

const hideVoiceSheet = () => {
    voiceSheet.classList.remove("active");
    if (waveAnimation) waveAnimation.style.display = "none";
};

// Web Audio API Setup
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

const sendAudioToBackend = async (audioBlob) => {
    try {
        if (voiceTextDisplay) voiceTextDisplay.innerText = "Transcribiendo con IA...";

        const formData = new FormData();
        // Le pasamos un nombre de archivo temporal para que Multer lo intercepte bien
        formData.append('audio', audioBlob, 'grabacion.webm');

        // Usamos una ruta absoluta por si abres el HTML desde Live Server o directamente desde archivos locales
        const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            if (voiceTextDisplay) voiceTextDisplay.innerText = `✓ ${data.transcript || '¡Guardado!'}`;
            // Renderizar en dashboard y actualizar balance inmediatamente
            if (data.record) {
                renderTransaction(data.record, true);
                const d = data.record.data || {};
                applyToBalance(d.tipo, parseFloat(d.valor || 0));
                const now = new Date();
                const txDate = new Date(data.record.created_at);
                if (txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()) {
                    const tipo = (d.tipo || '').toLowerCase();
                    if (tipo === 'ingreso') {
                        const elVI = document.getElementById('totalIngresos');
                        elVI.textContent = fmt((parseFloat(elVI.textContent.replace(/[^0-9.-]/g, '')) || 0) + parseFloat(d.valor || 0));
                    } else if (tipo === 'gasto') {
                        const elVG = document.getElementById('totalGastos');
                        elVG.textContent = fmt((parseFloat(elVG.textContent.replace(/[^0-9.-]/g, '')) || 0) + parseFloat(d.valor || 0));
                    }
                }
            }
        } else {
            if (voiceTextDisplay) {
                voiceTextDisplay.innerText = data.error || "No se pudo procesar el audio.";
            }
        }
    } catch (e) {
        console.error("Failed to send audio", e);
        if (voiceTextDisplay) {
            voiceTextDisplay.innerText = "Error de conexión al servidor.";
        }
    }
};

const setupMicBtn = (btn) => {
    if (!btn) return;

    // Iniciar el Grabador
    const startRecording = async (e) => {
        if (e) e.preventDefault();
        if (isRecording) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioChunks = [];
                sendAudioToBackend(audioBlob);

                // Detener los hilos del micrófono para la privacidad
                stream.getTracks().forEach(track => track.stop());
            };

            audioChunks = [];
            mediaRecorder.start();
            isRecording = true;

            showVoiceSheet();
            if (voiceTextDisplay) voiceTextDisplay.innerText = "Te escucho. Habla ahora...";

        } catch (err) {
            console.error("Microphone access denied or error:", err);
            if (voiceTextDisplay) voiceTextDisplay.innerText = "Por favor acepta los permisos del micrófono.";
        }
    };

    // Detener el Grabador
    const stopRecording = (e) => {
        if (e) e.preventDefault();
        if (!isRecording) return;

        isRecording = false;
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }

        setTimeout(() => {
            hideVoiceSheet();
        }, 3000); // 3 seconds delay para que el usuario pueda leer la respuesta de la IA antes de que se esconda y ver que todo estä bien
    };

    // Desktop triggers
    btn.addEventListener("mousedown", startRecording);
    btn.addEventListener("mouseup", stopRecording);
    btn.addEventListener("mouseleave", stopRecording); // Added safety catch if mouse leaves button

    // Mobile touch triggers
    btn.addEventListener("touchstart", startRecording, { passive: false });
    btn.addEventListener("touchend", stopRecording, { passive: false });
    btn.addEventListener("touchcancel", stopRecording, { passive: false });
};

setupMicBtn(document.getElementById("iaButton"));
setupMicBtn(document.getElementById("iaButtonDesktop"));

// 📷 Escanear factura
const scanModal = new bootstrap.Modal(document.getElementById('scanModal'));
const invoiceCameraInput = document.getElementById('invoiceCameraInput');
const invoiceGalleryInput = document.getElementById('invoiceGalleryInput');

const setupScanBtn = (btn) => {
    if (!btn) return;
    btn.addEventListener('click', () => scanModal.show());
};

setupScanBtn(document.getElementById('scanButton'));
setupScanBtn(document.getElementById('scanButtonDesktop'));

const scanModalEl = document.getElementById('scanModal');

document.getElementById('btnUseCamera').addEventListener('click', () => {
    scanModal.hide();
    scanModalEl.addEventListener('hidden.bs.modal', () => invoiceCameraInput.click(), { once: true });
});
document.getElementById('btnUploadFile').addEventListener('click', () => {
    scanModal.hide();
    scanModalEl.addEventListener('hidden.bs.modal', () => invoiceGalleryInput.click(), { once: true });
});

const handleInvoiceFile = async (file) => {
    if (!file) return;

    showVoiceSheet();
    if (voiceTextDisplay) voiceTextDisplay.innerText = 'Analizando factura con IA...';
    if (waveAnimation) waveAnimation.style.display = 'flex';

    try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/scan-invoice', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.record) {
            const d = data.analysis;
            if (voiceTextDisplay) voiceTextDisplay.innerText = `✓ ${d.titulo || 'Factura'} — $${d.valor}`;
            renderTransaction(data.record, true);
            applyToBalance(d.tipo, parseFloat(d.valor || 0));
            const now = new Date();
            const txDate = new Date(data.record.created_at);
            if (txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()) {
                const tipo = (d.tipo || '').toLowerCase();
                if (tipo === 'ingreso') {
                    const el = document.getElementById('totalIngresos');
                    el.textContent = fmt((parseFloat(el.textContent.replace(/[^0-9.-]/g, '')) || 0) + parseFloat(d.valor));
                } else if (tipo === 'gasto') {
                    const el = document.getElementById('totalGastos');
                    el.textContent = fmt((parseFloat(el.textContent.replace(/[^0-9.-]/g, '')) || 0) + parseFloat(d.valor));
                }
            }
        } else {
            if (voiceTextDisplay) voiceTextDisplay.innerText = data.error || 'No se pudo leer la factura.';
        }
    } catch (e) {
        console.error('Scan invoice error:', e);
        if (voiceTextDisplay) voiceTextDisplay.innerText = 'Error de conexión.';
    }

    setTimeout(() => hideVoiceSheet(), 3500);
};

invoiceCameraInput.addEventListener('change', () => {
    handleInvoiceFile(invoiceCameraInput.files[0]);
    invoiceCameraInput.value = '';
});
invoiceGalleryInput.addEventListener('change', () => {
    handleInvoiceFile(invoiceGalleryInput.files[0]);
    invoiceGalleryInput.value = '';
});

// 🌊 Ripple effect
document.querySelectorAll("button, .card-custom").forEach(el => {
    el.addEventListener("click", function (e) {
        const circle = document.createElement("span");
        circle.classList.add("ripple");
        const rect = this.getBoundingClientRect();
        circle.style.left = e.clientX - rect.left + "px";
        circle.style.top = e.clientY - rect.top + "px";
        this.appendChild(circle);
        setTimeout(() => circle.remove(), 600);
    });
});

const sidebar = document.getElementById("mobileSidebar");
const overlay = document.getElementById("menuOverlay");
const closeSidebar = document.getElementById("closeSidebar");

/* Abre desde botón del header */
document.getElementById("menuToggle").addEventListener("click", () => {
    sidebar.classList.add("active");
    overlay.classList.add("active");
});

/* Cerrar */
closeSidebar.addEventListener("click", closeMenu);
overlay.addEventListener("click", closeMenu);

function closeMenu() {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
}

// --------- Modals & Sidebar Actions --------- //
const addSidebarListeners = (prefix) => {
    const chatbotBtn = document.getElementById(prefix + 'Chatbot');
    const crediturboBtn = document.getElementById(prefix + 'Crediturbo');

    if (chatbotBtn) chatbotBtn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'chatbot.html'; });
    if (crediturboBtn) crediturboBtn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'crediturbo.html'; });
};

addSidebarListeners('desktop');
addSidebarListeners('mobile');
addSidebarListeners('bottom');

