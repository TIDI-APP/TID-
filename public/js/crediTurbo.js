// Verificar autenticación
requireAuth();

// Saludo
const user = getUser();
const welcomeMsg = document.getElementById('welcomeMsg');
if (welcomeMsg && user) {
    welcomeMsg.textContent = `Hola, ${user.first_name || user.email}`;
}

// Theme toggle
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

// Sidebar móvil
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

// Usuarios premium (whitelist)
const PREMIUM_EMAILS = ['santigovanegas11@gmail.com'];

const isPremium = () => {
    const u = getUser();
    return u && PREMIUM_EMAILS.includes((u.email || '').toLowerCase());
};

// Modal premium
const premiumModal = new bootstrap.Modal(document.getElementById('premiumModal'));
document.getElementById('btnGoToPremium').addEventListener('click', () => {
    const numero = '573054671608';
    const mensaje = 'Hola, quiero suscribirme a Tidi Premium por $19.900/mes para acceder a Crediturbo y transacciones ilimitadas.';
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, '_blank');
});

// Capturamos los elementos de la interfaz
const btnConnectBank = document.getElementById('btnConnectBank');
const bankModalElement = document.getElementById('bankModal');
const bankModal = new bootstrap.Modal(bankModalElement);
const bankOptions = document.querySelectorAll('.bank-option');
const btnConfirmBank = document.getElementById('btnConfirmBank');

// Capturamos las pantallas para el cambio de vista
const stepConnect = document.getElementById('stepConnect');
const stepResult = document.getElementById('stepResult');

let selectedBank = null;

// 1. Abrir el modal personalizado al hacer clic en el botón principal
btnConnectBank.addEventListener('click', () => {
    if (!isPremium()) {
        premiumModal.show();
        return;
    }
    bankModal.show();
});

// Selección de banco
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

// 3. Secuencia de carga, FETCH real al servidor y éxito
btnConfirmBank.addEventListener('click', async () => {
    bankModal.hide();

    Swal.fire({
        title: `Conectando con ${selectedBank}...`,
        text: 'Analizando tus movimientos con Prometeo...',
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
                title: '¡Conexión exitosa!',
                text: `Tu cuenta de ${selectedBank} está vinculada.`,
                background: '#12131c',
                color: '#fff',
                showConfirmButton: false,
                timer: 2000
            }).then(() => {

                stepConnect.classList.add('d-none');
                stepResult.classList.remove('d-none');

                const cuotaMensual = data.cuota_mensual;

                const formateadorCOP = new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0
                });

                document.getElementById('cupoDisplay').textContent = formateadorCOP.format(data.cupo_aprobado);
                document.getElementById('ingresosDisplay').textContent = formateadorCOP.format(data.promedio_ingresos_cop);

                document.getElementById('cuotaContainer').innerHTML = `
                    <small class="text-white-50 d-block mb-1">Cuota estimada (168 meses)</small>
                    <strong class="fs-4 text-warning">${formateadorCOP.format(cuotaMensual)} / mes</strong>
                `;

                const btnWhatsApp = document.getElementById('btnWhatsApp');
                btnWhatsApp.onclick = () => {
                    const montoFormat = formateadorCOP.format(data.cupo_aprobado);
                    const mensaje = `Hola, acabo de simular mi crédito en la app Tidi y me salió un cupo pre-aprobado de ${montoFormat}. Me gustaría hablar con un asesor para continuar el proceso.`;

                    const numeroAsesor = '573054671608';
                    const urlWA = `https://wa.me/${numeroAsesor}?text=${encodeURIComponent(mensaje)}`;
                    window.open(urlWA, '_blank');
                };
            });
        } else {
            throw new Error("El servidor no devolvió status success");
        }

    } catch (error) {
        console.error("Error en la petición:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'Fallo al conectarse con el servidor. Revisa si está encendido.',
            background: '#12131c',
            color: '#fff',
            confirmButtonColor: '#6840f3'
        });
    }
});
