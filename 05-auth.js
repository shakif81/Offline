async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(String(pin) + '_traxx_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function cargarOperariosLogin() {
    const lista = document.getElementById('listaOperariosLogin');
    if (!lista) return;
    const ops = await cargarFirebase('operarios');
    const arr = Object.entries(ops);
    if (!arr.length) {
        lista.innerHTML = '<div style="color:var(--gray-600);font-size:0.85rem;">No hay operarios registrados</div>';
        return;
    }
    lista.innerHTML = arr.map(([id, op]) => `
        <button class="login-op-btn" onclick="seleccionarOperarioLogin('${id}')">
            <div class="login-op-avatar" style="background:${op.color || '#607d8b'};">${op.icono || '👤'}</div>
            <div>
                <div class="login-op-name">${op.nombre}</div>
                <div class="login-op-role">${op.puesto || 'Operario'}</div>
            </div>
        </button>
    `).join('');
}

function seleccionarOperarioLogin(id) {
    cargarFirebase('operarios').then(ops => {
        const op = ops[id];
        if (!op) return;
        window.APP.operarioSeleccionado = { id, ...op };
        document.getElementById('listaOperariosLogin').style.display = 'none';
        document.getElementById('pinSection').style.display = 'block';
        document.getElementById('operarioSeleccionadoNombre').textContent = (op.icono || '👤') + ' ' + op.nombre;
        document.getElementById('pinInput').value = '';
        document.getElementById('pinError').style.display = 'none';
        document.getElementById('pinInput').focus();
    });
}

function volverSeleccionOperario() {
    window.APP.operarioSeleccionado = null;
    document.getElementById('pinSection').style.display = 'none';
    document.getElementById('listaOperariosLogin').style.display = 'flex';
}

async function confirmarLogin() {
    const op = window.APP.operarioSeleccionado;
    if (!op) return;
    const pin = document.getElementById('pinInput').value;
    let pinValido = false;
    if (op.pinHash) {
        pinValido = (await hashPin(pin)) === op.pinHash;
    } else if (op.pin) {
        pinValido = pin === String(op.pin);
    } else {
        pinValido = true;
    }
    if (!pinValido) {
        document.getElementById('pinError').style.display = 'block';
        return;
    }

    window.APP.operario = op;
    window.operarioActual = op;

    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('appContainer').style.display = 'grid';

    const rol = (op.puesto || '').toLowerCase().trim();
    let avatar = 'OP';
    if (rol.includes('admin')) avatar = 'AD';
    else if (rol.includes('supervisor')) avatar = 'SU';

    document.getElementById('userAvatar').textContent = avatar;
    document.getElementById('userName').textContent = op.nombre;
    document.getElementById('userRole').textContent = op.puesto || 'Taller TRAXX';

    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('sidebarAdmin').style.display = 'none';

if (rol.includes('admin') || rol.includes('supervisor')) {
    document.getElementById('sidebarAdmin').style.display = 'flex';
    showPage('admin');
    if (typeof switchAdminTab === 'function') {
        switchAdminTab('operarios');
    }
    setTimeout(() => {
        if (typeof comprobarAlertasAdmin === 'function') {
            comprobarAlertasAdmin();
        }
    }, 800);

setTimeout(() => {
    if (typeof comprobarAlertasKanban === 'function') {
        comprobarAlertasKanban();
    }
}, 1100);
}else {
        document.getElementById('sidebar').style.display = 'flex';
        showPage('operaciones');
        if (typeof cargarOperaciones === 'function') cargarOperaciones();
    }

    document.getElementById('chatFab').style.display = 'flex';

    setTimeout(async () => {
        if (typeof refrescarBadgeChatFab === 'function') {
            await refrescarBadgeChatFab();
        }
    }, 500);

    setTimeout(async () => {
        if (typeof actualizarBadgeNotificaciones === 'function') {
            await actualizarBadgeNotificaciones();
        }
    }, 700);
}

function accederSinOperario() {
    window.APP.operario = { id: 'visitante', nombre: 'Visitante', puesto: 'Invitado' };
    window.operarioActual = window.APP.operario;
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('appContainer').style.display = 'grid';
    document.getElementById('userAvatar').textContent = 'VI';
    document.getElementById('userName').textContent = 'Visitante';
    document.getElementById('userRole').textContent = 'Invitado';
    document.getElementById('sidebar').style.display = 'flex';
    document.getElementById('sidebarAdmin').style.display = 'none';
    showPage('operaciones');
    if (typeof cargarOperaciones === 'function') cargarOperaciones();
}

async function cerrarSesion() {
    const montajeActivoMio = obtenerMiMontajeActivo();
    let yaConfirmoCerrar = false;

if (montajeActivoMio) {
    const montajes = await cargarFirebase('montajes');
    const nombreActual = montajes[montajeActivoMio.montajeId]?.nombre || 'Sin nombre';

    mostrarLoading('Comprobando montaje...');
    const validacion = await validarParaTerminar(montajeActivoMio.montajeId, window.APP.operacionActiva);
    ocultarLoading();

    const resp = await mostrarModalCambioMontaje(
        nombreActual,
        'salir',
        validacion.ok,
        validacion.motivo || ''
    );

    if (resp === 'cancelar') return;
    yaConfirmoCerrar = true;

    if (resp === 'terminar') {
        const terminado = await terminarMontaje(montajeActivoMio.montajeId);

        if (!terminado) {
            toast('⚠️ Cierre de sesión cancelado · Completa el montaje', '#f59e0b', 3500);
            return;
        }

        await new Promise(r => setTimeout(r, 800));
        await confirmarHerramientasLiberadas();
    } else if (resp === 'pausar') {
        await detenerCronoMontaje(window.APP.operacionActiva, montajeActivoMio.montajeId);
        toast('⏸️ Montaje pausado', '#f59e0b');

        await liberarMisHerramientas();
        await new Promise(r => setTimeout(r, 400));
    }
}

    const miNombre = window.APP.operario?.nombre;
    if (miNombre) {
        const herramientas = await cargarFirebase('herramientas', true);
        const mias = Object.entries(herramientas).filter(([id, h]) =>
            h.reservadaPor === miNombre &&
            (h.estado === 'reservada' || h.estado === 'en_uso')
        );

        if (mias.length > 0) {
            const respHerr = await mostrarModalHerramientasSinDevolver(mias);

            if (respHerr === 'cancelar') return;
            yaConfirmoCerrar = true;

            if (respHerr === 'devolver') {
                await liberarMisHerramientas();
                await new Promise(r => setTimeout(r, 400));
            }
        }
    }

    if (!yaConfirmoCerrar) {
        const ok = await confirmar('¿Cerrar sesión?', { titulo: '👋 Cerrar sesión', okTexto: 'Cerrar' });
        if (!ok) return;
    }

    if (window.APP.cronoTick) { clearInterval(window.APP.cronoTick); window.APP.cronoTick = null; }
    if (window.APP.badgeTick) { clearInterval(window.APP.badgeTick); window.APP.badgeTick = null; }
    if (window.APP.dashTick) { clearInterval(window.APP.dashTick); window.APP.dashTick = null; }

    window.APP.intervals.forEach(id => clearInterval(id));
    window.APP.intervals = [];

    window.APP.operario = null;
    window.APP.operacionActiva = null;
    window.APP.cronosOperacion = {};
    window.APP.badgeModo = 'total';
    window.operarioActual = null;
    window.operacionActiva = null;

    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('pinSection').style.display = 'none';
    document.getElementById('listaOperariosLogin').style.display = 'flex';
    document.getElementById('chatFab').style.display = 'none';
if (window.APP._alertasQCMostradas) {
    window.APP._alertasQCMostradas.clear();
}
if (typeof actualizarBadgeChatFab === 'function') actualizarBadgeChatFab(0);
if (typeof actualizarBadgeChatSidebar === 'function') actualizarBadgeChatSidebar(0);
if (typeof actualizarBadgeNotificaciones === 'function') actualizarBadgeNotificaciones();
document.title = 'Linea TRAXX - Sistema de Operaciones';

    const badgeIr = document.getElementById('cronoBadgeIr');
    if (badgeIr) badgeIr.style.display = 'none';
    const badge = document.getElementById('cronoBadgeFlotante');
    if (badge) badge.style.display = 'none';

    cargarOperariosLogin();
    toast('👋 Sesión cerrada');
}
