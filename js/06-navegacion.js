function showPage(page) {
    if (page !== 'chat' && window.APP.chatActual?.mensajesListener) {
        window.APP.chatActual.mensajesListener();
        window.APP.chatActual.mensajesListener = null;
        window.APP.chatActual.conversacionId = null;
    }
    if (page !== 'montajes-operacion') {
        const badge = document.getElementById('cronoBadgeFlotante');
        if (badge) badge.style.display = 'none';
        const badgeIr = document.getElementById('cronoBadgeIr');
        if (badgeIr) badgeIr.style.display = 'none';
        if (window.APP.badgeTick) {
            clearInterval(window.APP.badgeTick);
            window.APP.badgeTick = null;
        }
    } else {
        if (typeof actualizarBadgeCrono === 'function') {
            setTimeout(() => actualizarBadgeCrono(), 300);
        }
        if (typeof iniciarBadgeTick === 'function') {
            setTimeout(() => iniciarBadgeTick(), 300);
        }
    }

    if (page !== 'dashboard' && window.APP.dashTick) {
        clearInterval(window.APP.dashTick);
        window.APP.dashTick = null;
    }

    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(page);
    if (!target) return;
    target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (nav) nav.classList.add('active');

    if (window.innerWidth <= 1024) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarAdmin').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('show');
        document.getElementById('menuToggle').textContent = '☰';
    }

    if (page === 'operaciones' && typeof cargarOperaciones === 'function') {
        cargarOperaciones();
    }

    if (page === 'estaciones' && typeof cargarEstaciones === 'function') {
        cargarEstaciones();
    }

    if (page === 'dashboard' && typeof actualizarDashboard === 'function') {
        actualizarDashboard();
        if (typeof iniciarTickDashboard === 'function') {
            setTimeout(() => iniciarTickDashboard(), 500);
        }
    }

    if (page === 'herramientas' && typeof cargarHerramientasOperario === 'function') {
    cargarHerramientasOperario();
}

    if (page === 'kanban' && typeof cargarKanbanOperario === 'function') {
        cargarKanbanOperario();
    }

if (page === 'materiales' && typeof cargarMaterialesOperario === 'function') {
    cargarMaterialesOperario();
}

if (page === 'verificar-materiales' && typeof cargarVerificarMateriales === 'function') {
    cargarVerificarMateriales();
}

if (page === 'chat' && typeof cargarChat === 'function') {
    cargarChat();
}

if (page === 'notificaciones' && typeof cargarNotificaciones === 'function') {
    cargarNotificaciones();
}
}

function setupNavegacion() {
    document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
        btn.addEventListener('click', () => showPage(btn.dataset.page));
    });

    document.querySelectorAll('.nav-item[data-admin-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.adminTab;
            if (tab && typeof switchAdminTab === 'function') switchAdminTab(tab);
        });
    });

    document.getElementById('menuToggle')?.addEventListener('click', function() {
        const sidebarNormal = document.getElementById('sidebar');
        const sidebarAdmin = document.getElementById('sidebarAdmin');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebarAdmin.style.display === 'flex') {
            sidebarAdmin.classList.toggle('open');
            overlay.classList.toggle('show');
            this.textContent = sidebarAdmin.classList.contains('open') ? '✕' : '☰';
        } else {
            sidebarNormal.classList.toggle('open');
            overlay.classList.toggle('show');
            this.textContent = sidebarNormal.classList.contains('open') ? '✕' : '☰';
        }
    });

    document.getElementById('sidebarOverlay')?.addEventListener('click', function() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarAdmin').classList.remove('open');
        this.classList.remove('show');
        document.getElementById('menuToggle').textContent = '☰';
    });
}

function switchAdminTab(tab) {
    const adminSection = document.getElementById('admin');
    if (!adminSection?.classList.contains('active')) {
        showPage('admin');
    }

    const titulos = {
        'operarios': '👥 Operarios',
        'estaciones': '📍 Estaciones',
        'operaciones': '🔢 Operaciones',
        'montajes': '📦 Montajes',
        'kanban': '📦 Kanban',
        'materiales': '🧪 Materiales',
        'herramientas': '🔧 Herramientas',

        'entregarMateriales': '📥 Entregar Materiales',

        'registroVerificaciones': '📋 Registro de Verificaciones',
        'registros': '📋 Registros de Materiales',
        'registroHerramientas': '📜 Registro de Herramientas',
        'movimientosKanban': '📊 Movimientos Kanban',

        'tornilleria': '🔩 Tornillería',
        'inspeccion': '🔍 Inspección',
        'tqc': '🔍 Control de Calidad (TQC)',

        'configEscaner': '⚙️ Config. Escáner',

    };

    const panelMap = {
        'operarios': 'adminPanelOperarios',
        'estaciones': 'adminPanelEstaciones',
        'operaciones': 'adminPanelOperaciones',
        'montajes': 'adminPanelMontajes',
        'kanban': 'adminPanelKanban',
        'materiales': 'adminPanelMateriales',
        'herramientas': 'adminPanelHerramientas',

        'entregarMateriales': 'adminPanelEntregarMateriales',

        'registroVerificaciones': 'adminPanelRegistroVerificaciones',
        'registros': 'adminPanelRegistros',
        'registroHerramientas': 'adminPanelRegistroHerramientas',
        'movimientosKanban': 'adminPanelMovimientosKanban',

        'tornilleria': 'adminPanelTornilleria',
        'inspeccion': 'adminPanelInspeccion',
        'tqc': 'adminPanelTqc',

        'configEscaner': 'adminPanelConfigEscaner',

    };

    const titulo = document.getElementById('adminPageTitle');
    if (titulo) titulo.textContent = titulos[tab] || 'Administración';

    document.querySelectorAll('.nav-item[data-admin-tab]').forEach(b => {
        if (b.dataset.adminTab === tab) b.classList.add('active');
        else b.classList.remove('active');
    });

    document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');

    const panelId = panelMap[tab];
    if (panelId) {
        const panel = document.getElementById(panelId);
        if (panel) panel.style.display = 'block';
    }

if (tab === 'operarios') cargarAdminOperarios();
if (tab === 'estaciones') cargarAdminEstaciones();
if (tab === 'operaciones') cargarAdminOperaciones();
if (tab === 'materiales') cargarAdminMateriales();
if (tab === 'montajes') cargarAdminMontajes();
if (tab === 'tornilleria') cargarAdminTornilleria();
if (tab === 'kanban') {
    cargarAdminPiezas();
    setTimeout(() => {
        if (typeof marcarAlertasKanbanComoLeidas === 'function') {
            marcarAlertasKanbanComoLeidas();
        }
    }, 1500);
}
if (tab === 'herramientas') cargarAdminHerramientas();
if (tab === 'configEscaner') cargarConfigEscaner();
if (tab === 'movimientosKanban') {
    cargarMovimientosKanban();
    setTimeout(() => {
        if (typeof marcarAlertasKanbanComoLeidas === 'function') {
            marcarAlertasKanbanComoLeidas();
        }
    }, 1500);
}
if (tab === 'registroVerificaciones') cargarRegistroVerificaciones();
if (tab === 'registroHerramientas') cargarRegistroHerramientas();
if (tab === 'registros') cambiarTabRegistros('resistencias');
if (tab === 'tqc') cargarTQC();
if (tab === 'inspeccion') {
    iniciarInspeccion();
}
if (tab === 'entregarMateriales') {
    iniciarEntregaMateriales().then(() => {
        const selOp = document.getElementById('entregaOperacionSelect');
        const selEst = document.getElementById('entregaEstacionSelect');
        if (selOp && selOp.value) {
            onCambioOperacionEntrega();
        } else if (selEst) {
            selEst.disabled = true;
        }
    });

    setTimeout(() => {
        if (typeof marcarAlertasComoLeidas === 'function') {
            marcarAlertasComoLeidas();
        }
    }, 2000);
}

    if (window.innerWidth <= 1024) {
        const sidebarAdmin = document.getElementById('sidebarAdmin');
        const sidebarNormal = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const menuToggle = document.getElementById('menuToggle');

        if (sidebarAdmin) sidebarAdmin.classList.remove('open');
        if (sidebarNormal) sidebarNormal.classList.remove('open');
        if (overlay) overlay.classList.remove('show');
        if (menuToggle) menuToggle.textContent = '☰';
    }
}
