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

function formatearHorasConSigno(seg) {
    return (seg < 0 ? '-' : '') + segundosAHorasDecimales(seg);
}

function calcularTiemposPorTipo(entradas, consumoPorMontaje, hechosIds, enCursoIds = new Set()) {
    const r = {
        prod: { total: 0, consumido: 0 },
        tqc: { total: 0, consumido: 0, cantidad: 0, hechos: 0, enCurso: 0 }
    };
    for (const [mid, m] of entradas) {
        const seg = Math.round((parseFloat(m?.tiempoHoras) || 0) * 3600);
        const bloque = m?.esTQC ? r.tqc : r.prod;
        bloque.total += seg;
        bloque.consumido += consumoPorMontaje[mid] || 0;
        if (m?.esTQC) {
            r.tqc.cantidad++;
            if (hechosIds.has(mid)) r.tqc.hechos++;
            else if (enCursoIds.has(mid)) r.tqc.enCurso++;
        }
    }
    r.prod.restante = r.prod.total - r.prod.consumido;
    r.tqc.restante = r.tqc.total - r.tqc.consumido;
    r.restanteTotal = r.prod.restante + r.tqc.restante;
    return r;
}

function describirTQC(tqc) {
    if (tqc.cantidad === 0) return '';
    const h = segundosAHorasDecimales;
    const exceso = -tqc.restante;
    const enCurso = tqc.enCurso > 0 ? ` · ${tqc.enCurso} en curso` : '';
    if (tqc.hechos === tqc.cantidad) {
        return exceso > 0
            ? `⚠️ TQC completados ${tqc.hechos}/${tqc.cantidad} · gastado ${h(tqc.consumido)} de ${h(tqc.total)} · excedido +${h(exceso)}`
            : `✅ TQC completados ${tqc.hechos}/${tqc.cantidad} · gastado ${h(tqc.consumido)} de ${h(tqc.total)}`;
    }
    if (tqc.hechos === 0 && tqc.consumido === 0) {
        return `🔍 TQC sin gastar · ${tqc.cantidad} montaje${tqc.cantidad !== 1 ? 's' : ''} · ${h(tqc.total)} reservadas`;
    }
    if (exceso > 0) {
        const faltan = tqc.cantidad - tqc.hechos;
        return `⚠️ TQC ${tqc.hechos}/${tqc.cantidad} hechos · gastado ${h(tqc.consumido)} · excedido +${h(exceso)} · faltan ${faltan}${enCurso}`;
    }
    return `🔍 TQC ${tqc.hechos}/${tqc.cantidad} hechos · gastado ${h(tqc.consumido)} · quedan ${h(tqc.restante)}${enCurso}`;
}

async function calcularTotalOperacion(operacionId) {
    const [montajes, operaciones, cronos] = await Promise.all([
        cargarFirebase('montajes'),
        cargarFirebase('operaciones'),
        cargarFirebase('cronos_operacion', true)
    ]);

    const op = operaciones[operacionId];
    if (!op) return calcularTiemposPorTipo([], {}, new Set());

    const modelo = op.modelo || 'MS3';
    const entradas = Object.entries(montajes).filter(([, m]) => m.modelo === modelo);

    const cronoOp = cronos[operacionId] || { montajesActivos: {} };
    const consumoPorMontaje = {};
    const hechosIds = new Set();
    const enCursoIds = new Set();
    for (const [mid, mActivo] of Object.entries(cronoOp.montajesActivos || {})) {
        consumoPorMontaje[mid] = calcularConsumoMontaje(mActivo);
        if (mActivo.completado) hechosIds.add(mid);
        else enCursoIds.add(mid);
    }

    return calcularTiemposPorTipo(entradas, consumoPorMontaje, hechosIds, enCursoIds);
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
        const hayTQC = datos.tqc.cantidad > 0;
        const restante = datos.restanteTotal;
        const baseSeg = datos.prod.total + datos.tqc.total;
        const consumidoBase = datos.prod.consumido + datos.tqc.consumido;
        const porcentaje = baseSeg > 0 ? (consumidoBase / baseSeg) * 100 : 0;

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
        const partesBadge = [];
        if (hayTQC) {
            partesBadge.push('🛠️ ' + formatearHorasConSigno(datos.prod.restante));
            if (datos.tqc.restante < 0) partesBadge.push('⚠️ TQC +' + segundosAHorasDecimales(datos.tqc.restante));
            else if (datos.tqc.hechos === datos.tqc.cantidad) partesBadge.push('✅ TQC');
            else partesBadge.push('🔍 ' + segundosAHorasDecimales(datos.tqc.restante));
        }
        if (operariosUnicos.size > 0) partesBadge.push('👥 ' + operariosUnicos.size);
        document.getElementById('cronoBadgeOperarios').textContent = partesBadge.join(' · ');

        const textoTQC = hayTQC ? ' · ' + describirTQC(datos.tqc) : '';
        badge.title = (miMontajeActivo
            ? 'Tiempo total de la operación · Pulsa para ver tu montaje'
            : 'Tiempo total de la operación') + textoTQC;

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
