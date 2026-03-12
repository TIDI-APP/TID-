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
    mobileSidebar.classList.add('open');
    menuOverlay.classList.add('active');
});
if (closeSidebar) closeSidebar.addEventListener('click', () => {
    mobileSidebar.classList.remove('open');
    menuOverlay.classList.remove('active');
});
if (menuOverlay) menuOverlay.addEventListener('click', () => {
    mobileSidebar.classList.remove('open');
    menuOverlay.classList.remove('active');
});

// Elementos de pantalla
const stepConnect = document.getElementById('stepConnect');
const stepResult = document.getElementById('stepResult');
const btnConnectBank = document.getElementById('btnConnectBank');
const btnRecalculate = document.getElementById('btnRecalculate');

const formateadorCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
});

const calcularCredito = async () => {
    Swal.fire({
        title: 'Analizando tus ingresos...',
        text: 'Calculando tu capacidad de crédito...',
        background: '#12131c',
        color: '#fff',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        await new Promise(resolve => setTimeout(resolve, 1200));

        const response = await fetch('/api/calcular-credito', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await response.json();

        if (response.ok && data.status === 'success') {
            Swal.fire({
                icon: 'success',
                title: '¡Análisis completo!',
                text: 'Hemos calculado tu cupo estimado.',
                background: '#12131c',
                color: '#fff',
                showConfirmButton: false,
                timer: 1800
            }).then(() => {
                stepConnect.classList.add('d-none');
                stepResult.classList.remove('d-none');

                document.getElementById('cupoDisplay').textContent = formateadorCOP.format(data.cupo_aprobado);
                document.getElementById('ingresosDisplay').textContent = formateadorCOP.format(data.promedio_ingresos);

                document.getElementById('cuotaContainer').innerHTML = `
                    <small class="text-white-50 d-block mb-1">Cuota estimada (168 meses)</small>
                    <strong class="fs-4 text-warning">${formateadorCOP.format(data.cuota_mensual)} / mes</strong>
                `;

                document.getElementById('btnWhatsApp').onclick = () => {
                    const montoFormat = formateadorCOP.format(data.cupo_aprobado);
                    const mensaje = `Hola, acabo de simular mi crédito en la app Tidi y me salió un cupo pre-aprobado de ${montoFormat}. Me gustaría hablar con un asesor para continuar el proceso.`;
                    const numero = '573054671608';
                    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, '_blank');
                };
            });
        } else {
            throw new Error(data.error || 'No se pudo calcular');
        }
    } catch (error) {
        console.error('Error calcular credito:', error);
        Swal.fire({
            icon: 'error',
            title: 'Sin datos suficientes',
            text: error.message || 'Registra al menos un ingreso en el dashboard para calcular tu crédito.',
            background: '#12131c',
            color: '#fff',
            confirmButtonColor: '#6840f3'
        });
    }
};

btnConnectBank.addEventListener('click', calcularCredito);

if (btnRecalculate) {
    btnRecalculate.addEventListener('click', () => {
        stepResult.classList.add('d-none');
        stepConnect.classList.remove('d-none');
    });
}
