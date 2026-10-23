function iniciarBadgeTick() {
    if (window.APP.badgeTick) clearInterval(window.APP.badgeTick);
    window.APP.badgeTick = setInterval(() => {
        if (window.APP.operacionActiva) {
            actualizarBadgeCrono();
        } else {
            clearInterval(window.APP.badgeTick);
            window.APP.badgeTick = null;
        }
    }, 3000);
}

function toggleBadgeCrono() {
    window.APP.badgeModo = window.APP.badgeModo === 'total' ? 'montaje' : 'total';
    actualizarBadgeCrono();
}

async function calcularTotalOperacion(operacionId) {
    const [montajes, operaciones, cronos] = await Promise.all([
        cargarFirebase('montajes'),
        cargarFirebase('operaciones'),
        cargarFirebase('cronos_operacion', true)
    ]);

    const op = operaciones[operacionId];
    if (!op) return { total: 0, consumido: 0, restante: 0 };

    const modelo = op.modelo || 'MS3';
    const montajesModelo = Object.values(montajes).filter(m => m.modelo === modelo);

    const totalSeg = montajesModelo.reduce((a, m) =>
        a + Math.round((parseFloat(m.tiempoHoras) || 0) * 3600), 0
    );

    const cronoOp = cronos[operacionId] || { montajesActivos: {} };
    let consumidoSeg = 0;

    for (const [mid, mActivo] of Object.entries(cronoOp.montajesActivos || {})) {
        consumidoSeg += calcularConsumoMontaje(mActivo);
    }

    return {
        total: totalSeg,
        consumido: consumidoSeg,
        restante: totalSeg - consumidoSeg
    };
}

async function actualizarBadgeCrono() {
    const badge = document.getElementById('cronoBadgeFlotante');
    const badgeIr = document.getElementById('cronoBadgeIr');
    if (!badge) return;

    const operacionId = window.APP.operacionActiva;
    const miNombre = window.APP.operario?.nombre;

    if (!operacionId || !miNombre) {
        badge.style.display = 'none';
        if (badgeIr) badgeIr.style.display = 'none';
        return;
    }

    const cronoOp = window.APP.cronosOperacion?.[operacionId] || { montajesActivos: {} };

    let miMontajeId = null;
    let miMontajeActivo = null;
    if (cronoOp?.montajesActivos) {
        for (const [mid, mActivo] of Object.entries(cronoOp.montajesActivos)) {
            if (mActivo.operariosActivos && mActivo.operariosActivos.includes(miNombre)) {
                miMontajeId = mid;
                miMontajeActivo = mActivo;
                break;
            }
        }
    }

    if (badgeIr) {
        if (miMontajeActivo) badgeIr.style.display = 'flex';
        else badgeIr.style.display = 'none';
    }

    let mostrarModo = window.APP.badgeModo;
    if (mostrarModo === 'montaje' && !miMontajeActivo) {
        mostrarModo = 'total';
        window.APP.badgeModo = 'total';
    }

    if (mostrarModo === 'total') {
        const datos = await calcularTotalOperacion(operacionId);
        const restante = datos.restante;
        const porcentaje = datos.total > 0 ? (datos.consumido / datos.total) * 100 : 0;

        let bgGrad = 'linear-gradient(135deg,#2e7d32,#1b5e20)';
        if (porcentaje >= 100) bgGrad = 'linear-gradient(135deg,#ef4444,#b91c1c)';
        else if (porcentaje >= 75) bgGrad = 'linear-gradient(135deg,#f97316,#ea580c)';

        badge.style.background = bgGrad;
        badge.classList.toggle('negativo', restante < 0);

        const operariosUnicos = new Set();
        for (const m of Object.values(cronoOp.montajesActivos || {})) {
            (m.operariosActivos || []).forEach(n => operariosUnicos.add(n));
        }

        document.getElementById('cronoBadgeIcono').textContent = '⏱️';
        document.getElementById('cronoBadgeTiempo').textContent =
            restante < 0 ? '-' + segundosAHorasDecimales(-restante) : segundosAHorasDecimales(restante);

        const op = (await cargarFirebase('operaciones'))[operacionId];
        document.getElementById('cronoBadgeMontaje').textContent = op ? 'Op. ' + (op.numero || '') : 'Operación';
        document.getElementById('cronoBadgeOperarios').textContent = operariosUnicos.size > 0 ? '👥 ' + operariosUnicos.size : '';

        badge.title = miMontajeActivo
            ? 'Tiempo total de la operación · Pulsa para ver tu montaje'
            : 'Tiempo total de la operación';

    } else {
        const montajes = await cargarFirebase('montajes');
        const m = montajes[miMontajeId];
        if (!m) return;

        const tiempoTotal = Math.round((parseFloat(m.tiempoHoras) || 0) * 3600);
        const consumido = calcularConsumoMontaje(miMontajeActivo);
        const restante = tiempoTotal - consumido;
        const porcentaje = tiempoTotal > 0 ? (consumido / tiempoTotal) * 100 : 0;

        let bgGrad = 'linear-gradient(135deg,#2e7d32,#1b5e20)';
        if (porcentaje >= 100) bgGrad = 'linear-gradient(135deg,#ef4444,#b91c1c)';
        else if (porcentaje >= 75) bgGrad = 'linear-gradient(135deg,#f97316,#ea580c)';

        badge.style.background = bgGrad;
        badge.classList.toggle('negativo', restante < 0);

        document.getElementById('cronoBadgeIcono').textContent = '⏱️';
        document.getElementById('cronoBadgeTiempo').textContent =
            restante < 0 ? '-' + segundosAHorasDecimales(-restante) : segundosAHorasDecimales(restante);
        document.getElementById('cronoBadgeMontaje').textContent = m.nombre || 'Montaje';
        document.getElementById('cronoBadgeOperarios').textContent = '👤 ' + miNombre;

        badge.title = 'Tiempo del montaje · Pulsa para ver el total de la operación';
    }

    badge.style.display = 'flex';
}

async function irAlMontajePropio() {
    const operacionId = window.APP.operacionActiva;
    const miNombre = window.APP.operario?.nombre;
    if (!operacionId || !miNombre) return;

    const cronoOp = window.APP.cronosOperacion?.[operacionId];
    let miMontajeId = null;

    if (cronoOp?.montajesActivos) {
        for (const [mid, mActivo] of Object.entries(cronoOp.montajesActivos)) {
            if (mActivo.operariosActivos && mActivo.operariosActivos.includes(miNombre)) {
                miMontajeId = mid;
                break;
            }
        }
    }

    if (!miMontajeId) {
        toast('⏱️ No tienes ningún montaje activo', '#f59e0b');
        return;
    }

    showPage('montajes-operacion');

    setTimeout(() => {
        const tarjeta = document.getElementById('card_' + miMontajeId);
        if (tarjeta) {
            tarjeta.scrollIntoView({ behavior: 'smooth', block: 'center' });
            tarjeta.style.transition = 'all 0.3s ease';
            tarjeta.style.boxShadow = '0 0 30px rgba(99,102,241,0.8)';
            tarjeta.style.borderColor = '#6366f1';

            setTimeout(() => {
                tarjeta.style.boxShadow = '';
                tarjeta.style.borderColor = '';
            }, 2000);
        }
    }, 500);
}
