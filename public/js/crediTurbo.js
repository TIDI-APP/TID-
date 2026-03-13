// Route guard — redirect to login if not authenticated
requireAuth();

// Display the user's name in the welcome message
const user = getUser();
const welcomeMsg = document.getElementById('welcomeMsg');
if (welcomeMsg && user) {
    welcomeMsg.textContent = `Hola, ${user.first_name || user.email}`;
}

// Theme toggle — persists preference in localStorage
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    const saved = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', saved);
    themeToggle.innerHTML = saved === 'dark' ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon"></i>';
    themeToggle.addEventListener('click', () => {
        const current = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', current);
        localStorage.setItem('theme', current);
        themeToggle.innerHTML = current === 'dark' ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon"></i>';
    });
}

// Mobile sidebar toggle
const menuToggle = document.getElementById('menuToggle');
const mobileSidebar = document.getElementById('mobileSidebar');
const menuOverlay = document.getElementById('menuOverlay');
const closeSidebar = document.getElementById('closeSidebar');

if (menuToggle) menuToggle.addEventListener('click', () => {
    mobileSidebar.classList.add('active');
    menuOverlay.classList.add('active');
});
if (closeSidebar) closeSidebar.addEventListener('click', () => {
    mobileSidebar.classList.remove('active');
    menuOverlay.classList.remove('active');
});
if (menuOverlay) menuOverlay.addEventListener('click', () => {
    mobileSidebar.classList.remove('active');
    menuOverlay.classList.remove('active');
});

// Premium whitelist — emails that have access to Crediturbo
const PREMIUM_EMAILS = ['santigovanegas11@gmail.com'];

// Returns true if the current user is in the premium whitelist
const isPremium = () => {
    const u = getUser();
    return u && PREMIUM_EMAILS.includes((u.email || '').toLowerCase());
};

// Premium upgrade modal — opens a WhatsApp chat to subscribe
const premiumModal = new bootstrap.Modal(document.getElementById('premiumModal'));
document.getElementById('btnGoToPremium').addEventListener('click', () => {
    const phoneNumber = '573054671608';
    const message = 'Hola, quiero suscribirme a Tidi Premium por $19.900/mes para acceder a Crediturbo y transacciones ilimitadas.';
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
});

// Bank connection modal elements
const btnConnectBank = document.getElementById('btnConnectBank');
const bankModalElement = document.getElementById('bankModal');
const bankModal = new bootstrap.Modal(bankModalElement);
const bankOptions = document.querySelectorAll('.bank-option');
const btnConfirmBank = document.getElementById('btnConfirmBank');

// Step views — switch between the connection form and the result display
const stepConnect = document.getElementById('stepConnect');
const stepResult = document.getElementById('stepResult');

let selectedBank = null;

// Open the bank selection modal — gated behind the premium check
btnConnectBank.addEventListener('click', () => {
    if (!isPremium()) {
        premiumModal.show();
        return;
    }
    bankModal.show();
});

// Highlight the selected bank option
bankOptions.forEach(button => {
    button.addEventListener('click', (e) => {

        bankOptions.forEach(btn => {
            btn.style.background = 'transparent';
            btn.style.color = '#fff';
            btn.style.borderColor = 'rgba(255,255,255,0.2)';
        });

        const clickedBtn = e.target;
        clickedBtn.style.background = 'var(--primary)';
        clickedBtn.style.color = '#fff';
        clickedBtn.style.borderColor = 'var(--primary)';

        selectedBank = clickedBtn.getAttribute('data-bank');
        btnConfirmBank.disabled = false;
    });
});

// Connect to the selected bank: call the Prometeo API, calculate credit, and show the result
btnConfirmBank.addEventListener('click', async () => {
    bankModal.hide();

    Swal.fire({
        title: `${t('crediturbo.connectBtn')}... (${selectedBank})`,
        text: t('crediturbo.connectDesc'),
        background: '#12131c',
        color: '#fff',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const response = await fetch('/api/calcular-credito');
        const data = await response.json();

        if (data.status === 'success') {
            Swal.fire({
                icon: 'success',
                title: t('crediturbo.connectAccount'),
                text: `${selectedBank}`,
                background: '#12131c',
                color: '#fff',
                showConfirmButton: false,
                timer: 2000
            }).then(() => {

                // Switch to the results view
                stepConnect.classList.add('d-none');
                stepResult.classList.remove('d-none');

                const monthlyPayment = data.cuota_mensual;

                // Formatter for Colombian Peso amounts
                const copFormatter = new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0
                });

                document.getElementById('cupoDisplay').textContent = copFormatter.format(data.cupo_aprobado);
                document.getElementById('ingresosDisplay').textContent = copFormatter.format(data.promedio_ingresos_cop);

                document.getElementById('cuotaContainer').innerHTML = `
                    <small class="text-white-50 d-block mb-1">${t('crediturbo.monthly')}</small>
                    <strong class="fs-4 text-warning">${copFormatter.format(monthlyPayment)} / ${t('premium.perMonth').replace('/', '')}</strong>
                `;

                // WhatsApp button to contact an advisor with the pre-approved credit amount
                const btnWhatsApp = document.getElementById('btnWhatsApp');
                btnWhatsApp.onclick = () => {
                    const formattedAmount = copFormatter.format(data.cupo_aprobado);
                    const message = `Hola, acabo de simular mi crédito en la app Tidi y me salió un cupo pre-aprobado de ${formattedAmount}. Me gustaría hablar con un asesor para continuar el proceso.`;

                    const advisorNumber = '573054671608';
                    const whatsappUrl = `https://wa.me/${advisorNumber}?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                };
            });
        } else {
            throw new Error("El servidor no devolvió status success");
        }

    } catch (error) {
        console.error("Error in bank connection request:", error);
        Swal.fire({
            icon: 'error',
            title: t('error.connection'),
            text: t('error.connection'),
            background: '#12131c',
            color: '#fff',
            confirmButtonColor: '#6840f3'
        });
    }
});
