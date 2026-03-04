const modal = new bootstrap.Modal(document.getElementById('financeModal'));
const modalTitle = document.getElementById('modalTitle');
const addButton = document.getElementById('addButton');
const form = document.getElementById('financeForm');

let currentType = "";

// Ingresos
document.getElementById('openIncome').addEventListener('click', () => {
    currentType = "Ingreso";
    modalTitle.innerText = "Ver Ingresos";
    addButton.innerText = "Agregar Ingreso";
    form.classList.remove("active");
    modal.show();
});

// Gastos
document.getElementById('openExpense')?.addEventListener('click', () => {
    currentType = "Gasto";
    modalTitle.innerText = "Ver Gastos";
    addButton.innerText = "Agregar Gasto";
    form.classList.remove("active");
    modal.show();
});

// Mostrar formulario con animación
addButton.addEventListener('click', () => {
    form.classList.toggle("active");
});




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

// 🎤 Voice Bottom Sheet
const iaBtn = document.getElementById("iaButton");
const voiceSheet = document.getElementById("voiceSheet");

iaBtn.addEventListener("click", () => {
    voiceSheet.classList.toggle("active");
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
