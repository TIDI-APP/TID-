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
    bankModal.show();
});

// seleccion de banco
bankOptions.forEach(button => {
    button.addEventListener('click', (e) => {
        
        bankOptions.forEach(btn => {
            btn.style.background = 'transparent';
            btn.style.color = '#fff';
            btn.style.borderColor = 'rgba(255,255,255,0.2)';
        });

        // Luego, le ponemos el color morado de Tidi al que seleccionaste
        const clickedBtn = e.target;
        clickedBtn.style.background = 'var(--primary)';
        clickedBtn.style.color = '#fff';
        clickedBtn.style.borderColor = 'var(--primary)';
        
        // Guardamos el banco elegido y habilitamos el botón de confirmar
        selectedBank = clickedBtn.getAttribute('data-bank');
        btnConfirmBank.disabled = false;
    });
});

// 3. Secuencia de carga, FETCH real al servidor y éxito
btnConfirmBank.addEventListener('click', async () => {
    // Cerramos el modal HTML de selección de banco
    bankModal.hide();

    // Lanzamos el loader dinámico de SweetAlert
    Swal.fire({
        title: `Conectando con ${selectedBank}...`,
        text: 'Analizando tus movimientos con Prometeo...',
        background: '#12131c',
        color: '#fff',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading(); // Aquí está el loader dando vueltas
        }
    });

    try {
        // Pequeña pausa visual de 1.5s para que se alcance a ver la animación de carga
        await new Promise(resolve => setTimeout(resolve, 1500));

        // HACEMOS LA PETICIÓN REAL AL SERVIDOR
        const response = await fetch('http://localhost:3007/api/calcular-credito');
        const data = await response.json();

        if (data.status === 'success') {
            // Cambiamos la alerta a ÉXITO automáticamente
            Swal.fire({
                icon: 'success',
                title: '¡Conexión exitosa!',
                text: `Tu cuenta de ${selectedBank} está vinculada.`,
                background: '#12131c',
                color: '#fff',
                showConfirmButton: false,
                timer: 2000
            }).then(() => {
                
                // MOSTRAMOS LOS DATOS EN PANTALLA
                stepConnect.classList.add('d-none');
                stepResult.classList.remove('d-none');

                // Cálculos
                const cuotaMensual = data.cuota_mensual;

                // Formateador de moneda colombiana
                const formateadorCOP = new Intl.NumberFormat('es-CO', { 
                    style: 'currency', 
                    currency: 'COP', 
                    maximumFractionDigits: 0 
                });

                // Pintamos los valores calculados en el HTML
                document.getElementById('cupoDisplay').textContent = formateadorCOP.format(data.cupo_aprobado);
                document.getElementById('ingresosDisplay').textContent = formateadorCOP.format(data.promedio_ingresos_cop);
                
                document.getElementById('cuotaContainer').innerHTML = `
                    <small class="text-white-50 d-block mb-1">Cuota estimada (168 meses)</small>
                    <strong class="fs-4 text-warning">${formateadorCOP.format(cuotaMensual)} / mes</strong>
                `;

                // Activamos el botón de WhatsApp
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
            // Si el servidor responde pero dice que hubo error
            throw new Error("El servidor no devolvió status success");
        }

    } catch (error) {
        // Si el servidor está apagado o falla la conexión
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