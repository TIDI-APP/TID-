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
    financeForm.addEventListener('submit', (e) => {
        e.preventDefault();
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
    btnUpdateBalance.addEventListener('click', () => {
        const val = parseFloat(newBalanceInput.value);
        if (!isNaN(val)) {
            balanceValue.innerText = "$" + val.toFixed(2);
            editBalanceModal.hide();
        }
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

// 💰 Contador animado balance
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = "$" + (progress * (end - start) + start).toFixed(2);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

window.addEventListener("load", () => {
    const balance = document.querySelector(".balance h2");
    animateValue(balance, 0, 6741.60, 1500);
});

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
        const response = await fetch('http://localhost:3000/api/transcribe', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            console.log("IA Transcripción completada:", data);
            if (voiceTextDisplay) {
                voiceTextDisplay.innerText = data.transcript || "¡Mensaje guardado!";
            }
        } else {
            console.error("Transcription error frontend:", data);
            if (voiceTextDisplay) {
                voiceTextDisplay.innerText = "Error: " + (data.error || "No se pudo transcribir.");
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
const crediturboModalEl = document.getElementById('crediturboModal');
const crediturboModal = crediturboModalEl ? new bootstrap.Modal(crediturboModalEl) : null;

const addSidebarListeners = (prefix) => {
    const chatbotBtn = document.getElementById(prefix + 'Chatbot');
    const crediturboBtn = document.getElementById(prefix + 'Crediturbo');

    if (chatbotBtn) chatbotBtn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'chatbot.html'; });
    if (crediturboBtn) crediturboBtn.addEventListener('click', (e) => { e.preventDefault(); closeMenu(); if (crediturboModal) crediturboModal.show(); });
};

addSidebarListeners('desktop');
addSidebarListeners('mobile');
addSidebarListeners('bottom');

