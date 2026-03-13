// If a token is passed in the URL (Google OAuth redirect), save it before the auth guard runs
const _urlParams = new URLSearchParams(window.location.search);
const _urlToken = _urlParams.get('token');
if (_urlToken) {
    saveToken(_urlToken);
    window.history.replaceState({}, document.title, window.location.pathname);
}

// Route guard — redirect to login if not authenticated
requireAuth();

// Display the user's first name in the welcome message
const _user = getUser();
if (_user) {
    const name = _user.first_name || _user.email.split('@')[0];
    const welcomeMsg = document.getElementById('welcomeMsg');
    if (welcomeMsg) welcomeMsg.textContent = `Hola, ${name}`; // greeting stays in Spanish (proper noun pattern)
}

const financeModalEl = document.getElementById('financeModal');
const financeModal = financeModalEl ? new bootstrap.Modal(financeModalEl) : null;
const modalTitle = document.getElementById('modalTitle');
const modalIconContainer = document.getElementById('modalIconContainer');
const btnSaveTransaction = document.getElementById('btnSaveTransaction');
const categoryButtons = document.querySelectorAll('.category-badge');

let currentType = "";

// Open the modal pre-configured for a new income entry
document.getElementById('openIncome')?.addEventListener('click', () => {
    currentType = "Ingreso";
    if (modalTitle) modalTitle.innerText = t('finance.newIncome');
    if (modalIconContainer) modalIconContainer.innerHTML = '<i class="bi bi-arrow-down-circle-fill text-success fs-1"></i>';
    if (btnSaveTransaction) btnSaveTransaction.style.background = "var(--primary)";
    if (financeModal) financeModal.show();
});

// Open the modal pre-configured for a new expense entry
document.getElementById('openExpense')?.addEventListener('click', () => {
    currentType = "Gasto";
    modalTitle.innerText = t('finance.newExpense');
    modalIconContainer.innerHTML = '<i class="bi bi-arrow-up-circle-fill text-danger fs-1"></i>';
    if (btnSaveTransaction) btnSaveTransaction.style.background = "var(--soft)";
    if (financeModal) financeModal.show();
});

const financeForm = document.getElementById('financeForm');
if (financeForm) {
    // Handle manual transaction form submission
    financeForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const amount = financeForm.querySelector('input[type="number"]').value;
        const title = financeForm.querySelector('input[type="text"]').value.trim();
        const activeCategory = financeForm.querySelector('.category-badge.active');
        const category = activeCategory ? activeCategory.textContent.trim() : 'Otros';
        const saveBtn = document.getElementById('btnSaveTransaction');

        if (!amount || parseFloat(amount) <= 0) return;

        saveBtn.disabled = true;
        saveBtn.textContent = t('finance.saving');

        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    tipo: currentType,
                    titulo: title || category,
                    valor: parseFloat(amount),
                    categoria: category
                })
            });
            if (res.ok) {
                const { transaction } = await res.json();
                renderTransaction(transaction, true);

                const v = parseFloat(amount);
                const type = currentType.toLowerCase();

                // Update the running balance
                applyToBalance(currentType, v);

                // Update the month totals if the transaction falls in the current month
                const now = new Date();
                const txDate = new Date(transaction.created_at);
                if (txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()) {
                    if (type === 'ingreso') {
                        const elI2 = document.getElementById('totalIngresos');
                        elI2.textContent = fmt((parseFloat(elI2.textContent.replace(/[^0-9.-]/g, '')) || 0) + v);
                    } else if (type === 'gasto') {
                        const elG2 = document.getElementById('totalGastos');
                        elG2.textContent = fmt((parseFloat(elG2.textContent.replace(/[^0-9.-]/g, '')) || 0) + v);
                    }
                }
            }
        } catch (err) {
            console.error('Error saving transaction:', err);
        }

        saveBtn.disabled = false;
        saveBtn.textContent = t('finance.save');
        financeForm.reset();
        if (financeModal) financeModal.hide();
    });
}

// Category selection — highlights the active badge and clears others
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

// Edit Balance modal — allows the user to manually set the current balance
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

// Theme toggle — switches between dark and light mode
document.getElementById("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
});

// Progressive fade-in animation for elements with the .fade-in class
window.addEventListener("load", () => {
    document.querySelectorAll(".fade-in").forEach((el, i) => {
        setTimeout(() => el.classList.add("show"), i * 180);
    });
});

// Formats a number as a currency string (e.g. $1,234.56)
function fmt(val) {
    return '$' + parseFloat(val || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Renders a single transaction card and appends or prepends it to the list
function renderTransaction(tx, prepend = false) {
    const d = tx.data || {};
    const type = (d.tipo || '').toLowerCase();
    const isIncome = type === 'ingreso';
    const isBalance = type === 'modificacion de balance';
    const title = d.titulo || d.categoria || 'Sin título';
    const category = d.categoria || '';
    const amount = parseFloat(d.valor || 0);

    const colorClass = isIncome ? 'text-success' : isBalance ? 'text-primary' : 'text-danger';
    const prefix = isIncome ? '+ ' : isBalance ? '' : '- ';

    const date = new Date(tx.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

    const el = document.createElement('div');
    el.className = 'card-custom mb-3 d-flex justify-content-between align-items-center';
    el.innerHTML = `
        <div>
          <strong>${title}</strong>
          <div class="small opacity-50">${category} · ${date}</div>
        </div>
        <span class="${colorClass} fw-bold">${prefix}${fmt(amount)}</span>`;

    const list = document.getElementById('transactionsList');
    const empty = document.getElementById('noTransactions');
    if (empty) empty.remove();

    if (prepend) {
        list.insertBefore(el, list.firstChild);
    } else {
        list.appendChild(el);
    }
}

// Global running balance for the current month
let currentBalance = 0;

// Updates the balance display element with the current value, coloring it red if negative
function updateBalanceDisplay() {
    const el = document.getElementById('balanceValue');
    if (!el) return;
    const isNeg = currentBalance < 0;
    el.textContent = (isNeg ? '-' : '') + fmt(Math.abs(currentBalance));
    el.style.color = isNeg ? '#f87171' : 'white';
}

// Applies a transaction to the running balance based on its type
function applyToBalance(type, amount) {
    const t = (type || '').toLowerCase();
    if (t === 'ingreso') currentBalance += amount;
    else if (t === 'gasto') currentBalance -= amount;
    else if (t === 'modificacion de balance') currentBalance = amount;
    updateBalanceDisplay();
}

// Fetches all transactions from the API, computes the current-month balance and totals, and renders the 4 most recent
async function loadTransactions() {
    try {
        const res = await fetch('/api/transactions', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) return;
        // API returns DESC order; reverse to process balance chronologically
        const transactions = (await res.json()).slice().reverse();

        let incomes = 0, expenses = 0;
        const now = new Date();
        currentBalance = 0;

        transactions.forEach(tx => {
            const d = tx.data || {};
            const type = (d.tipo || '').toLowerCase();
            const amount = parseFloat(d.valor || 0);
            const txDate = new Date(tx.created_at);
            const isCurrentMonth = txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();

            // Only include current-month transactions in balance and totals
            if (isCurrentMonth) {
                if (type === 'ingreso') { currentBalance += amount; incomes += amount; }
                else if (type === 'gasto') { currentBalance -= amount; expenses += amount; }
                else if (type === 'modificacion de balance') currentBalance = amount;
            }
        });

        // Render the 4 most recent transactions in DESC order
        transactions.slice().reverse().slice(0, 4).forEach(tx => renderTransaction(tx));
        document.getElementById('seeAllBtn').style.display = transactions.length > 4 ? '' : 'none';

        updateBalanceDisplay();
        const elI = document.getElementById('totalIngresos');
        const elG = document.getElementById('totalGastos');
        elI.textContent = fmt(incomes);
        elG.textContent = fmt(expenses);

    } catch (e) {
        console.error('Error loading transactions:', e);
    }
}

loadTransactions();

// Voice Bottom Sheet & MediaRecorder setup
const voiceSheet = document.getElementById("voiceSheet");
const voiceTextDisplay = document.getElementById("voiceTextDisplay");
const waveAnimation = document.getElementById("waveAnimation");

const showVoiceSheet = () => {
    voiceSheet.classList.add("active");
    if (voiceTextDisplay) voiceTextDisplay.innerText = t('voice.listening');
    if (waveAnimation) waveAnimation.style.display = "flex";
};

const hideVoiceSheet = () => {
    voiceSheet.classList.remove("active");
    if (waveAnimation) waveAnimation.style.display = "none";
};

// MediaRecorder state
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// Sends the recorded audio blob to the backend for transcription and saves the resulting transaction
const sendAudioToBackend = async (audioBlob) => {
    try {
        if (voiceTextDisplay) voiceTextDisplay.innerText = t('voice.transcribing');

        const formData = new FormData();
        // Provide a filename so Multer can detect the file type correctly
        formData.append('audio', audioBlob, 'grabacion.webm');

        const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData
        });

        const data = await response.json();

        if (response.status === 402) {
            // Free plan AI limit reached — show the premium upgrade modal
            hideVoiceSheet();
            premiumModal.show();
            return;
        }

        if (response.ok) {
            if (voiceTextDisplay) voiceTextDisplay.innerText = `✓ ${data.transcript || '¡Guardado!'}`;
            // Immediately update the dashboard without a full reload
            if (data.record) {
                renderTransaction(data.record, true);
                const d = data.record.data || {};
                applyToBalance(d.tipo, parseFloat(d.valor || 0));
                const now = new Date();
                const txDate = new Date(data.record.created_at);
                if (txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()) {
                    const type = (d.tipo || '').toLowerCase();
                    if (type === 'ingreso') {
                        const elVI = document.getElementById('totalIngresos');
                        elVI.textContent = fmt((parseFloat(elVI.textContent.replace(/[^0-9.-]/g, '')) || 0) + parseFloat(d.valor || 0));
                    } else if (type === 'gasto') {
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
            voiceTextDisplay.innerText = t('error.connection');
        }
    }
};

// Attaches press-and-hold recording behavior to a microphone button
const setupMicBtn = (btn) => {
    if (!btn) return;

    // Start recording on button press
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

                // Release the microphone track for privacy
                stream.getTracks().forEach(track => track.stop());
            };

            audioChunks = [];
            mediaRecorder.start();
            isRecording = true;

            showVoiceSheet();
            if (voiceTextDisplay) voiceTextDisplay.innerText = t('voice.speak');

        } catch (err) {
            console.error("Microphone access denied or error:", err);
            if (voiceTextDisplay) voiceTextDisplay.innerText = t('voice.micPerm');
        }
    };

    // Stop recording on button release
    const stopRecording = (e) => {
        if (e) e.preventDefault();
        if (!isRecording) return;

        isRecording = false;
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }

        // Keep the sheet visible for 3 seconds so the user can read the AI response
        setTimeout(() => {
            hideVoiceSheet();
        }, 3000);
    };

    // Desktop triggers (mouse)
    btn.addEventListener("mousedown", startRecording);
    btn.addEventListener("mouseup", stopRecording);
    btn.addEventListener("mouseleave", stopRecording);

    // Mobile triggers (touch)
    btn.addEventListener("touchstart", startRecording, { passive: false });
    btn.addEventListener("touchend", stopRecording, { passive: false });
    btn.addEventListener("touchcancel", stopRecording, { passive: false });
};

setupMicBtn(document.getElementById("iaButton"));
setupMicBtn(document.getElementById("iaButtonDesktop"));

// Invoice scanner — opens a modal to choose camera or gallery
const scanModal = new bootstrap.Modal(document.getElementById('scanModal'));
const premiumModal = new bootstrap.Modal(document.getElementById('premiumModal'));

document.getElementById('btnGoToPremium').addEventListener('click', () => {
    const phoneNumber = '573054671608';
    const message = 'Hola, quiero suscribirme a Tidi Premium por $19.900/mes para tener transacciones ilimitadas por voz y cámara.';
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
});
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

// Sends an invoice image to the backend, renders the resulting transaction, and updates the balance
const handleInvoiceFile = async (file) => {
    if (!file) return;

    showVoiceSheet();
    if (voiceTextDisplay) voiceTextDisplay.innerText = t('scan.analyzing');
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

        if (response.status === 402) {
            // Free plan AI limit reached — show the premium upgrade modal
            hideVoiceSheet();
            premiumModal.show();
            return;
        }

        if (response.ok && data.record) {
            const d = data.analysis;
            if (voiceTextDisplay) voiceTextDisplay.innerText = `✓ ${d.titulo || 'Factura'} — $${d.valor}`;
            renderTransaction(data.record, true);
            applyToBalance(d.tipo, parseFloat(d.valor || 0));
            const now = new Date();
            const txDate = new Date(data.record.created_at);
            if (txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()) {
                const type = (d.tipo || '').toLowerCase();
                if (type === 'ingreso') {
                    const el = document.getElementById('totalIngresos');
                    el.textContent = fmt((parseFloat(el.textContent.replace(/[^0-9.-]/g, '')) || 0) + parseFloat(d.valor));
                } else if (type === 'gasto') {
                    const el = document.getElementById('totalGastos');
                    el.textContent = fmt((parseFloat(el.textContent.replace(/[^0-9.-]/g, '')) || 0) + parseFloat(d.valor));
                }
            }
        } else {
            if (voiceTextDisplay) voiceTextDisplay.innerText = data.error || 'No se pudo leer la factura.';
        }
    } catch (e) {
        console.error('Scan invoice error:', e);
        if (voiceTextDisplay) voiceTextDisplay.innerText = t('error.connection');
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

// Ripple click effect on buttons and cards
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

// Open mobile sidebar
document.getElementById("menuToggle").addEventListener("click", () => {
    sidebar.classList.add("active");
    overlay.classList.add("active");
});

// Close mobile sidebar
closeSidebar.addEventListener("click", closeMenu);
overlay.addEventListener("click", closeMenu);

function closeMenu() {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
}

// Attach navigation listeners to sidebar links for a given prefix (desktop/mobile/bottom)
const addSidebarListeners = (prefix) => {
    const chatbotBtn = document.getElementById(prefix + 'Chatbot');
    const crediturboBtn = document.getElementById(prefix + 'Crediturbo');

    if (chatbotBtn) chatbotBtn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'chatbot.html'; });
    if (crediturboBtn) crediturboBtn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'crediturbo.html'; });
};

addSidebarListeners('desktop');
addSidebarListeners('mobile');
addSidebarListeners('bottom');
