let _pwaInstallEvent = null;
let _pwaSwReg = null;
let _pwaEstuvoOffline = false;
const _pwaNotificadas = new Set();

function pwaRegistrarServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js', { scope: './' })
        .then(reg => { _pwaSwReg = reg; })
        .catch(e => console.warn('⚠️ No se pudo registrar el service worker:', e));
}

function pwaCrearIndicador() {
    let el = document.getElementById('pwaIndicadorConexion');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'pwaIndicadorConexion';
    el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom, 0px) + 12px);z-index:99990;padding:8px 16px;border-radius:99px;font-size:0.8rem;font-weight:700;color:white;box-shadow:0 6px 20px rgba(0,0,0,0.25);pointer-events:none;display:none;max-width:calc(100% - 110px);text-align:center;font-family:inherit;';
    document.body.appendChild(el);
    return el;
}

function actualizarIndicadorConexion() {
    if (navigator.onLine) return;
    const el = pwaCrearIndicador();
    const n = window.APP.escriturasPendientes || 0;
    el.style.background = '#b91c1c';
    el.textContent = n > 0
        ? `📴 Sin conexión · ${n} cambio${n !== 1 ? 's' : ''} por enviar`
        : '📴 Sin conexión · puedes seguir trabajando';
    el.style.display = 'block';
}

async function pwaAlVolverConexion() {
    const el = pwaCrearIndicador();
    if (!_pwaEstuvoOffline && !(window.APP.escriturasPendientes > 0)) {
        el.style.display = 'none';
        return;
    }
    el.style.background = '#d97706';
    el.textContent = '🔄 Sincronizando cambios…';
    el.style.display = 'block';

    let sincronizado = true;
    try {
        const db = window.APP.db;
        if (db && typeof db.waitForPendingWrites === 'function') {
            sincronizado = await Promise.race([
                db.waitForPendingWrites().then(() => true),
                new Promise(resolve => setTimeout(() => resolve(false), 20000))
            ]);
        }
    } catch (e) {
        sincronizado = false;
    }

    _pwaEstuvoOffline = false;
    if (sincronizado) {
        window.APP.escriturasPendientes = 0;
        el.style.background = '#15803d';
        el.textContent = '✅ Conexión restaurada · todo sincronizado';
    } else {
        el.style.background = '#d97706';
        el.textContent = '⚠️ Conexión restaurada · hay cambios aún pendientes';
    }
    setTimeout(() => { if (navigator.onLine) el.style.display = 'none'; }, 3500);
}

function pwaEsStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function pwaEsIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function pwaOcultoRecientemente() {
    try {
        const t = parseInt(localStorage.getItem('traxx_pwa_oculto')) || 0;
        return Date.now() - t < 7 * 86400000;
    } catch (e) {
        return false;
    }
}

function pwaPosponerTarjeta() {
    try { localStorage.setItem('traxx_pwa_oculto', String(Date.now())); } catch (e) {}
    document.getElementById('pwaTarjeta')?.remove();
}

function pwaMostrarTarjeta() {
    if (document.getElementById('pwaTarjeta') || pwaOcultoRecientemente()) return;

    const seguro = window.isSecureContext && location.protocol !== 'file:';
    const puedeInstalar = !!_pwaInstallEvent && !pwaEsStandalone();
    const pistaIOS = pwaEsIOS() && !pwaEsStandalone() && seguro;
    const puedeNotificar = seguro && 'Notification' in window && Notification.permission === 'default'
        && (!pwaEsIOS() || pwaEsStandalone());
    if (!puedeInstalar && !pistaIOS && !puedeNotificar) return;

    const boton = (texto, accion, principal) => `
        <button onclick="${accion}" style="flex:1;min-width:120px;padding:11px 12px;border-radius:10px;font-size:0.82rem;font-weight:700;cursor:pointer;font-family:inherit;border:${principal ? 'none' : '1px solid #cbd5e1'};background:${principal ? '#2d74da' : 'white'};color:${principal ? 'white' : '#334155'};">${texto}</button>`;

    const tarjeta = document.createElement('div');
    tarjeta.id = 'pwaTarjeta';
    tarjeta.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom, 0px) + 64px);max-width:460px;margin:0 auto;background:white;border:1px solid #e5e7eb;border-radius:16px;padding:14px 16px;box-shadow:0 12px 40px rgba(0,0,0,0.25);z-index:99989;';
    tarjeta.innerHTML = `
        <div style="font-weight:800;color:#1a365d;font-size:0.95rem;margin-bottom:4px;">📲 TRAXX en tu móvil</div>
        <div style="font-size:0.8rem;color:#475569;line-height:1.4;margin-bottom:12px;">
            ${puedeInstalar ? 'Instálala para abrirla como una app y seguir trabajando aunque se corte la señal.' : ''}
            ${pistaIOS && !puedeInstalar ? 'Para instalarla toca Compartir ⬆️ y elige «Añadir a pantalla de inicio».' : ''}
            ${puedeNotificar ? (puedeInstalar || pistaIOS ? '<br>' : '') + 'Activa los avisos para enterarte de rechazos de QC, faltas de material y mensajes.' : ''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${puedeInstalar ? boton('Instalar', 'pwaInstalar()', true) : ''}
            ${puedeNotificar ? boton('🔔 Activar avisos', 'pwaActivarAvisos()', !puedeInstalar) : ''}
            ${boton('Ahora no', 'pwaPosponerTarjeta()', false)}
        </div>
    `;
    document.body.appendChild(tarjeta);
}

async function pwaInstalar() {
    if (!_pwaInstallEvent) return;
    document.getElementById('pwaTarjeta')?.remove();
    _pwaInstallEvent.prompt();
    try { await _pwaInstallEvent.userChoice; } catch (e) {}
    _pwaInstallEvent = null;
}

async function pwaActivarAvisos() {
    document.getElementById('pwaTarjeta')?.remove();
    if (!('Notification' in window)) return;
    const permiso = await Notification.requestPermission();
    if (permiso === 'granted') toast('🔔 Avisos activados', '#10b981');
    else toast('🔕 Avisos desactivados', '#64748b');
}

async function notificarLocal(titulo, cuerpo, tag) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!document.hidden) return;
    const opciones = {
        body: cuerpo || '',
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        tag: tag || 'traxx',
        renotify: true,
        vibrate: [200, 100, 200]
    };
    try {
        const reg = _pwaSwReg || (navigator.serviceWorker && await navigator.serviceWorker.getRegistration());
        if (reg && reg.showNotification) {
            await reg.showNotification(titulo, opciones);
            return;
        }
        new Notification(titulo, opciones);
    } catch (e) {}
}

function pwaEnvolver(nombre, notificar) {
    const original = window[nombre];
    if (typeof original !== 'function') return;
    window[nombre] = function () {
        try { notificar.apply(null, arguments); } catch (e) {}
        return original.apply(this, arguments);
    };
}

function pwaInstalarAvisos() {
    pwaEnvolver('mostrarAlertaQC', datos => {
        const op = datos.numeroOperacion ? ` · Op. ${datos.numeroOperacion}` : '';
        if (datos.tipo === 'rechazado') {
            notificarLocal('🔴 Montaje rechazado en QC', `${datos.montajeNombre || 'Montaje'}${op}${datos.motivo ? ' — ' + datos.motivo : ''}`, 'qc');
        } else {
            notificarLocal('✅ Montaje aprobado en QC', `${datos.montajeNombre || 'Montaje'}${op}`, 'qc');
        }
    });

    pwaEnvolver('mostrarAlertaCorreccionAdmin', datos => {
        const op = datos.numeroOperacion ? ` (Op. ${datos.numeroOperacion})` : '';
        notificarLocal('🔧 Montaje corregido', `${datos.montajeNombre || 'Montaje'}${op} · ${datos.operario || ''}`, 'correccion');
    });

    pwaEnvolver('mostrarAlertaMensaje', msg => {
        notificarLocal(`💬 ${msg.emisor || 'Mensaje nuevo'}`, msg.texto || '📷 Foto', 'chat');
    });

    pwaEnvolver('mostrarBannerAlertasKanban', pendientes => {
        const nuevas = pendientes.filter(([id]) => !_pwaNotificadas.has('kan_' + id));
        nuevas.forEach(([id]) => _pwaNotificadas.add('kan_' + id));
        if (!nuevas.length) return;
        const hayAgotadas = nuevas.some(([, a]) => a.tipo === 'agotado');
        notificarLocal(
            hayAgotadas ? '🚫 Pieza Kanban agotada' : '⚠️ Stock Kanban crítico',
            nuevas.length > 1 ? `${nuevas.length} piezas requieren atención` : (nuevas[0][1].piezaNombre || 'Pieza'),
            'kanban'
        );
    });

    pwaEnvolver('mostrarBannerAlertasAdmin', pendientes => {
        const nuevas = pendientes.filter(([id]) => !_pwaNotificadas.has('adm_' + id));
        nuevas.forEach(([id]) => _pwaNotificadas.add('adm_' + id));
        if (!nuevas.length) return;
        const a = nuevas[0][1];
        notificarLocal(
            '📦 Falta de material',
            nuevas.length > 1
                ? `${nuevas.length} nuevas solicitudes`
                : `${a.materialNombre || 'Material'}${a.numeroOperacion ? ' · Op. ' + a.numeroOperacion : ''}${a.reportadoPor ? ' · ' + a.reportadoPor : ''}`,
            'faltas'
        );
    });
}

window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _pwaInstallEvent = e;
    setTimeout(pwaMostrarTarjeta, 4000);
});

window.addEventListener('appinstalled', () => {
    _pwaInstallEvent = null;
    document.getElementById('pwaTarjeta')?.remove();
});

window.addEventListener('offline', () => {
    _pwaEstuvoOffline = true;
    actualizarIndicadorConexion();
});

window.addEventListener('online', pwaAlVolverConexion);

window.addEventListener('load', () => {
    pwaRegistrarServiceWorker();
    if (!navigator.onLine) {
        _pwaEstuvoOffline = true;
        actualizarIndicadorConexion();
    }
    setTimeout(pwaMostrarTarjeta, 6000);
});

pwaInstalarAvisos();
