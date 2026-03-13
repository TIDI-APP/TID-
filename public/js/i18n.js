// i18n.js — Language system for Tidi (Spanish / English)
// Uses data-i18n, data-i18n-html, and data-i18n-placeholder attributes on HTML elements.
// Call applyLanguage() to update the page. Runs automatically on load.

const TRANSLATIONS = {
  es: {
    // Sidebar navigation
    'nav.home':         'Inicio',
    'nav.chatbot':      'Chatbot',
    'nav.transactions': 'Transacciones',
    'nav.crediturbo':   'Crediturbo',
    'nav.settings':     'Configuración',
    'nav.logout':       'Cerrar Sesión',

    // Dashboard
    'dash.balance':  'Balance Total',
    'dash.income':   'Ingresos',
    'dash.expenses': 'Gastos',
    'dash.thisMonth': 'Este mes',
    'dash.recentTx': 'Transacciones recientes',
    'dash.seeAll':   'Ver todas las transacciones',
    'dash.noTx':     'Aún no hay transacciones',

    // Voice sheet
    'voice.listening':    'Escuchando...',
    'voice.transcribing': 'Transcribiendo con IA...',
    'voice.speak':        'Te escucho. Habla ahora...',
    'voice.micPerm':      'Por favor acepta los permisos del micrófono.',

    // Invoice scan
    'scan.title':     'Escanear Factura',
    'scan.camera':    'Tomar foto',
    'scan.upload':    'Subir archivo',
    'scan.analyzing': 'Analizando factura con IA...',

    // Finance modal (manual transaction)
    'finance.newIncome':    'Nuevo Ingreso',
    'finance.newExpense':   'Nuevo Gasto',
    'finance.concept':      'Concepto / Categoría',
    'finance.notePh':       'Nota opcional...',
    'finance.save':         'Guardar',
    'finance.saving':       'Guardando...',

    // Transaction categories
    'cat.salary':    'Salario',
    'cat.food':      'Comida',
    'cat.transport': 'Transporte',
    'cat.other':     'Otros',

    // Edit balance modal
    'balance.title':   'Ajustar Balance',
    'balance.desc':    'Ingresa tu nuevo balance total actualizado.',
    'balance.btn':     'Actualizar Balance',

    // Premium modal
    'premium.title':    '¡Límite alcanzado!',
    'premium.desc':     'Has usado tus <strong class="text-white">3 registros gratuitos</strong> por voz y cámara.',
    'premium.before':   'Antes: $24.900/mes',
    'premium.price':    '$19.900',
    'premium.perMonth': '/mes',
    'premium.unlimited':'Transacciones ilimitadas por voz y cámara',
    'premium.voice':    'Voz ilimitada',
    'premium.scanner':  'Escáner de facturas ilimitado',
    'premium.ai':       'Análisis con IA avanzada',
    'premium.support':  'Soporte prioritario',
    'premium.btn':      'Quiero Premium',
    'premium.notNow':   'Ahora no',

    // Settings page
    'config.title':         'Configuración',
    'config.editProfile':   'Editar Perfil',
    'config.connectGoogle': 'Conectar con Google',
    'config.linked':        'Cuenta de Google vinculada correctamente',
    'config.account':       'Cuenta',
    'config.email':         'Correo electrónico',
    'config.accessMethod':  'Método de acceso',
    'config.logoutLabel':   'Cerrar sesión',
    'config.logoutDesc':    'Salir de tu cuenta en este dispositivo',
    'config.language':      'Idioma',
    'config.languageDesc':  'Elige el idioma de la aplicación',
    'config.editProfileTitle': 'Editar Perfil',
    'config.firstName':     'Nombre',
    'config.lastName':      'Apellido',
    'config.firstNamePh':   'Tu nombre',
    'config.lastNamePh':    'Tu apellido',
    'config.saveChanges':   'Guardar cambios',

    // Profile auth types (set dynamically in renderProfile)
    'profile.googleAccount':  'Cuenta de Google',
    'profile.passwordAccount': 'Cuenta con contraseña',
    'profile.google':          'Google',
    'profile.emailPassword':   'Email y contraseña',

    // Transactions page
    'tx.title':     'Transacciones',
    'tx.type':      'Tipo',
    'tx.all':       'Todos',
    'tx.income':    'Ingresos',
    'tx.expenses':  'Gastos',
    'tx.balanceAdj':'Ajustes de balance',
    'tx.from':      'Desde',
    'tx.to':        'Hasta',
    'tx.filter':    'Filtrar',
    'tx.loading':   'Cargando...',
    'tx.noTx':      'No hay transacciones para este filtro',
    'tx.amount':    'Monto',
    'tx.date':      'Fecha',
    'tx.delete':    'Eliminar transacción',
    'tx.deleting':  'Eliminando...',
    'tx.summaryLabel': 'transacción(es)',
    'tx.incomesLabel': 'Ingresos',
    'tx.expensesLabel':'Gastos',

    // Chatbot page
    'chat.subtitle':   'Asistente financiero',
    'chat.placeholder':'Escribe un mensaje...',
    'chat.welcome':    '¡Hola, {name}! 👋 Soy Tidi, tu asistente financiero personal. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre gastos, ahorros, presupuestos o cualquier duda financiera.',
    'chat.noReply':    'No pude responder en este momento.',
    'chat.error':      'Error de conexión. Intenta de nuevo.',

    // Crediturbo page
    'crediturbo.desc':         'Analizamos tus movimientos bancarios para ofrecerte un crédito personalizado.',
    'crediturbo.connectTitle':  'Conecta tu banco',
    'crediturbo.connectDesc':   'Estás en un entorno de pruebas seguro (Sandbox). Simula la conexión de tu cuenta para calcular tu capacidad de endeudamiento real.',
    'crediturbo.connectBtn':    'Conectar cuenta de banco',
    'crediturbo.approvedLimit': 'Cupo Aprobado',
    'crediturbo.avgIncome':     'Promedio de Ingresos',
    'crediturbo.monthly':       'Cuota estimada (168 meses)',
    'crediturbo.interested':    'Me interesa (Hablar con asesor)',
    'crediturbo.premiumTitle':  'Crediturbo es Premium',
    'crediturbo.premiumDesc':   'Accede al análisis de crédito personalizado con inteligencia artificial suscribiéndote a Tidi Premium.',
    'crediturbo.whichBank':     '¿Qué banco usas?',
    'crediturbo.connectAccount':'Conectar Cuenta',
    'crediturbo.wantPremium':   'Quiero Premium',

    // Common
    'common.saving':  'Guardando...',
    'error.connection': 'Error de conexión al servidor.',
  },

  en: {
    // Sidebar navigation
    'nav.home':         'Home',
    'nav.chatbot':      'Chatbot',
    'nav.transactions': 'Transactions',
    'nav.crediturbo':   'Crediturbo',
    'nav.settings':     'Settings',
    'nav.logout':       'Log Out',

    // Dashboard
    'dash.balance':   'Total Balance',
    'dash.income':    'Income',
    'dash.expenses':  'Expenses',
    'dash.thisMonth': 'This month',
    'dash.recentTx':  'Recent transactions',
    'dash.seeAll':    'See all transactions',
    'dash.noTx':      'No transactions yet',

    // Voice sheet
    'voice.listening':    'Listening...',
    'voice.transcribing': 'Transcribing with AI...',
    'voice.speak':        'I\'m listening. Speak now...',
    'voice.micPerm':      'Please allow microphone access.',

    // Invoice scan
    'scan.title':     'Scan Invoice',
    'scan.camera':    'Take photo',
    'scan.upload':    'Upload file',
    'scan.analyzing': 'Analyzing invoice with AI...',

    // Finance modal (manual transaction)
    'finance.newIncome':    'New Income',
    'finance.newExpense':   'New Expense',
    'finance.concept':      'Concept / Category',
    'finance.notePh':       'Optional note...',
    'finance.save':         'Save',
    'finance.saving':       'Saving...',

    // Transaction categories
    'cat.salary':    'Salary',
    'cat.food':      'Food',
    'cat.transport': 'Transport',
    'cat.other':     'Other',

    // Edit balance modal
    'balance.title':   'Adjust Balance',
    'balance.desc':    'Enter your new updated total balance.',
    'balance.btn':     'Update Balance',

    // Premium modal
    'premium.title':    'Limit reached!',
    'premium.desc':     'You\'ve used your <strong class="text-white">3 free AI entries</strong> via voice and camera.',
    'premium.before':   'Before: $24,900/mo',
    'premium.price':    '$19,900',
    'premium.perMonth': '/mo',
    'premium.unlimited':'Unlimited voice & camera transactions',
    'premium.voice':    'Unlimited voice',
    'premium.scanner':  'Unlimited invoice scanner',
    'premium.ai':       'Advanced AI analysis',
    'premium.support':  'Priority support',
    'premium.btn':      'Get Premium',
    'premium.notNow':   'Not now',

    // Settings page
    'config.title':         'Settings',
    'config.editProfile':   'Edit Profile',
    'config.connectGoogle': 'Connect with Google',
    'config.linked':        'Google account linked successfully',
    'config.account':       'Account',
    'config.email':         'Email address',
    'config.accessMethod':  'Sign-in method',
    'config.logoutLabel':   'Log out',
    'config.logoutDesc':    'Sign out on this device',
    'config.language':      'Language',
    'config.languageDesc':  'Choose the app language',
    'config.editProfileTitle': 'Edit Profile',
    'config.firstName':     'First name',
    'config.lastName':      'Last name',
    'config.firstNamePh':   'Your first name',
    'config.lastNamePh':    'Your last name',
    'config.saveChanges':   'Save changes',

    // Profile auth types
    'profile.googleAccount':   'Google Account',
    'profile.passwordAccount': 'Password Account',
    'profile.google':          'Google',
    'profile.emailPassword':   'Email & Password',

    // Transactions page
    'tx.title':      'Transactions',
    'tx.type':       'Type',
    'tx.all':        'All',
    'tx.income':     'Income',
    'tx.expenses':   'Expenses',
    'tx.balanceAdj': 'Balance adjustments',
    'tx.from':       'From',
    'tx.to':         'To',
    'tx.filter':     'Filter',
    'tx.loading':    'Loading...',
    'tx.noTx':       'No transactions for this filter',
    'tx.amount':     'Amount',
    'tx.date':       'Date',
    'tx.delete':     'Delete transaction',
    'tx.deleting':   'Deleting...',
    'tx.summaryLabel': 'transaction(s)',
    'tx.incomesLabel': 'Income',
    'tx.expensesLabel':'Expenses',

    // Chatbot page
    'chat.subtitle':    'Financial assistant',
    'chat.placeholder': 'Write a message...',
    'chat.welcome':     'Hi, {name}! 👋 I\'m Tidi, your personal financial assistant. How can I help you today? You can ask me about expenses, savings, budgets or any financial question.',
    'chat.noReply':     'I couldn\'t generate a response.',
    'chat.error':       'Connection error. Please try again.',

    // Crediturbo page
    'crediturbo.desc':         'We analyze your bank movements to offer you a personalized credit.',
    'crediturbo.connectTitle':  'Connect your bank',
    'crediturbo.connectDesc':   'You are in a secure sandbox environment. Simulate your account connection to calculate your real borrowing capacity.',
    'crediturbo.connectBtn':    'Connect bank account',
    'crediturbo.approvedLimit': 'Approved Limit',
    'crediturbo.avgIncome':     'Average Income',
    'crediturbo.monthly':       'Estimated payment (168 months)',
    'crediturbo.interested':    'I\'m interested (Talk to advisor)',
    'crediturbo.premiumTitle':  'Crediturbo is Premium',
    'crediturbo.premiumDesc':   'Access personalized AI credit analysis by subscribing to Tidi Premium.',
    'crediturbo.whichBank':     'Which bank do you use?',
    'crediturbo.connectAccount':'Connect Account',
    'crediturbo.wantPremium':   'Get Premium',

    // Common
    'common.saving':    'Saving...',
    'error.connection': 'Server connection error.',
  }
};

// Returns the active language from localStorage (defaults to Spanish)
function getLang() {
  return localStorage.getItem('lang') || 'es';
}

// Returns the translated string for a given key in the active language
function t(key) {
  const lang = getLang();
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || (TRANSLATIONS.es[key]) || key;
}

// Applies translations to all elements with data-i18n / data-i18n-html / data-i18n-placeholder attributes
function applyLanguage() {
  const lang = getLang();
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.es;

  // Plain text elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = dict[key] || TRANSLATIONS.es[key] || key;
  });

  // Elements that need innerHTML (e.g. strings with <strong> tags)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    el.innerHTML = dict[key] || TRANSLATIONS.es[key] || key;
  });

  // Input/textarea placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = dict[key] || TRANSLATIONS.es[key] || key;
  });

  // Update the html lang attribute
  document.documentElement.lang = lang;
}

// Run automatically when the script loads (DOM is already parsed since script is at bottom of body)
applyLanguage();
