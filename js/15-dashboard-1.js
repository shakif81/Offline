async function actualizarDashboard() {
    const operacionId = window.APP.operacionActiva;

    await rellenarFiltroOperarios();

    const filtroFecha = document.getElementById('dashFiltroFecha')?.value || 'todo';
    const filtroOperario = document.getElementById('dashFiltroOperario')?.value || 'todos';

    const infoEl = document.getElementById('dashFiltrosInfo');
    if (infoEl) {
        const txtFecha = { 'hoy': 'Hoy', 'semana': '7 días', 'mes': '30 días', 'todo': 'Todo' }[filtroFecha] || 'Todo';
        const txtOp = filtroOperario === 'todos' ? 'Todos' : filtroOperario;
        infoEl.textContent = `📅 ${txtFecha} · 👤 ${txtOp}`;
    }

    if (!operacionId) {
        document.getElementById('dashMontajesHoy').textContent = '0';
        document.getElementById('dashTiempoTotal').textContent = '0.00h';
        document.getElementById('dashPendientes').textContent = '0';
        document.getElementById('dashTiempoRestante').textContent = '0.00h';
        cargarHistorialReciente();
        return;
    }

    const [historial, montajes, operaciones] = await Promise.all([
        cargarFirebase('historial_montajes', true),
        cargarFirebase('montajes'),
        cargarFirebase('operaciones')
    ]);

    const op = operaciones[operacionId];
    const modelo = op?.modelo || 'MS3';

    const idsMontajesFiltrados = new Set();
    Object.entries(montajes).forEach(([mid, m]) => {
        if (m.modelo !== modelo) return;
        if (filtroOperario !== 'todos' && m.operarioAsignado !== filtroOperario) return;
        idsMontajesFiltrados.add(mid);
    });

    const totalMontajes = idsMontajesFiltrados.size;

    let tiempoTotalSeg = 0;
    idsMontajesFiltrados.forEach(mid => {
        const m = montajes[mid];
        tiempoTotalSeg += Math.round((parseFloat(m?.tiempoHoras) || 0) * 3600);
    });

    let completados = Object.values(historial).filter(h =>
        h.completado && h.operacionId === operacionId && idsMontajesFiltrados.has(h.montajeId)
    );
    completados = completados.filter(h => filtrarPorFecha(h.fecha, filtroFecha));

    document.getElementById('dashMontajesHoy').textContent = completados.length;
    document.getElementById('dashTiempoTotal').textContent = (tiempoTotalSeg / 3600).toFixed(2) + 'h';
    document.getElementById('dashPendientes').textContent = Math.max(0, totalMontajes - completados.length);

    await actualizarTiempoRestanteDashboard();

    cargarHistorialReciente();
}

function mostrarTiemposDashboard(t) {
    const elTiempo = document.getElementById('dashTiempoRestante');
    if (!elTiempo) return;

    const hayTQC = t.tqc.cantidad > 0;
    const restante = t.restanteTotal;
    const baseSeg = t.prod.total + t.tqc.total;

    const etiqueta = elTiempo.parentElement.querySelector('.stat-label');
    if (etiqueta) etiqueta.textContent = 'Tiempo restante';

    elTiempo.textContent = formatearHorasConSigno(restante);
    if (restante < 0) elTiempo.style.color = '#ef4444';
    else elTiempo.style.color = baseSeg > 0 && (restante / baseSeg) * 100 > 25 ? '#10b981' : '#f97316';

    let extra = document.getElementById('dashTiempoTQC');
    if (!extra) {
        extra = document.createElement('div');
        extra.id = 'dashTiempoTQC';
        extra.style.cssText = 'font-size:0.68rem;font-weight:700;margin-top:6px;line-height:1.4;opacity:0.9;';
        elTiempo.parentElement.appendChild(extra);
    }
    if (!hayTQC) {
        extra.style.display = 'none';
        return;
    }
    extra.style.display = 'block';
    const rojo = '#ef4444';
    extra.innerHTML = `<span style="color:${t.prod.restante < 0 ? rojo : 'inherit'}">🛠️ Producción: ${formatearHorasConSigno(t.prod.restante)}</span><br>`
        + `<span style="color:${t.tqc.restante < 0 ? rojo : 'inherit'}">${describirTQC(t.tqc)}</span>`;
}

function filtrarPorFecha(fechaISO, filtro) {
    if (filtro === 'todo') return true;
    if (!fechaISO) return false;

    const fecha = new Date(fechaISO);
    const ahora = new Date();
    const diffDias = (ahora - fecha) / (1000 * 60 * 60 * 24);

    if (filtro === 'hoy') {
        const hoyStr = ahora.toISOString().split('T')[0];
        const fechaStr = fecha.toISOString().split('T')[0];
        return hoyStr === fechaStr;
    }
    if (filtro === 'semana') return diffDias <= 7;
    if (filtro === 'mes') return diffDias <= 30;
    return true;
}

async function rellenarFiltroOperarios() {
    const sel = document.getElementById('dashFiltroOperario');
    if (!sel) return;

    const valoresFijos = [
        { value: 'operario1', label: 'Operario 1' },
        { value: 'operario2', label: 'Operario 2' }
    ];

    if (sel.options.length > 1 && sel.options[1].value === 'operario1') return;

    sel.innerHTML = '<option value="todos">Todos los operarios</option>';
    valoresFijos.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.value;
        opt.textContent = v.label;
        sel.appendChild(opt);
    });
}

async function cargarHistorialReciente() {
    const contenedor = document.getElementById('dashHistorialList');
    const contador = document.getElementById('dashHistorialCount');
    if (!contenedor) return;

    const historial = await cargarFirebase('historial_montajes', true);
    const operacionId = window.APP.operacionActiva;

    const filtroFecha = document.getElementById('dashFiltroFecha')?.value || 'todo';
    const filtroOperario = document.getElementById('dashFiltroOperario')?.value || 'todos';

    let registros = Object.values(historial).filter(h => h.completado);

    if (operacionId) {
        registros = registros.filter(h => h.operacionId === operacionId);
    }
    if (filtroOperario !== 'todos') {
        registros = registros.filter(h => h.operario === filtroOperario);
    }
    registros = registros.filter(h => filtrarPorFecha(h.fecha, filtroFecha));

    registros.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const ultimos = registros.slice(0, 10);
    if (contador) contador.textContent = registros.length;

    const hoy = new Date().toISOString().split('T')[0];
    const registrosHoy = registros.filter(h => new Date(h.fecha).toISOString().split('T')[0] === hoy);

    const elHoy = document.getElementById('dashStatHoy');
    if (elHoy) elHoy.textContent = registrosHoy.length;

    const elMedio = document.getElementById('dashStatTiempoMedio');
    if (registrosHoy.length > 0) {
        const tiempoTotal = registrosHoy.reduce((a, h) => a + (h.tiempoRealSeg || 0), 0);
        const tiempoMedio = tiempoTotal / registrosHoy.length;
        if (elMedio) elMedio.textContent = (tiempoMedio / 3600).toFixed(2) + 'h';
    } else {
        if (elMedio) elMedio.textContent = '0.00h';
    }

    if (ultimos.length === 0) {
        contenedor.innerHTML = `
            <div style="text-align:center;padding:1.5rem;color:#94a3b8;font-size:0.85rem;">
                Sin montajes completados con estos filtros
            </div>
        `;
        return;
    }

    contenedor.innerHTML = ultimos.map(h => {
        const tiempoRealSeg = h.tiempoRealSeg || 0;
        const tiempoRealHoras = (tiempoRealSeg / 3600).toFixed(2);

        const fecha = new Date(h.fecha);
        const ahora = new Date();
        const diffMin = Math.floor((ahora - fecha) / 60000);
        let fechaTexto = '';
        if (diffMin < 1) fechaTexto = 'Ahora mismo';
        else if (diffMin < 60) fechaTexto = `Hace ${diffMin} min`;
        else if (diffMin < 1440) fechaTexto = `Hace ${Math.floor(diffMin / 60)}h`;
        else fechaTexto = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

        return `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f8fafc;border-radius:8px;border-left:3px solid #10b981;">
                <div style="font-size:1.2rem;flex-shrink:0;">✅</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:0.85rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${h.montajeNombre || 'Sin nombre'}</div>
                    <div style="font-size:0.72rem;color:#64748b;margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span>👤 ${h.operario || '—'}</span>
                        <span style="color:#cbd5e1;">·</span>
                        <span>${fechaTexto}</span>
                    </div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                    <div style="font-weight:800;font-size:1rem;color:#047857;font-variant-numeric:tabular-nums;line-height:1;">${tiempoRealHoras}h</div>
                </div>
            </div>
        `;
    }).join('');
}

function iniciarTickDashboard() {
    if (window.APP.dashTick) clearInterval(window.APP.dashTick);

    window.APP.dashTick = setInterval(async () => {
        const dashActivo = document.getElementById('dashboard')?.classList.contains('active');
        if (!dashActivo) {
            clearInterval(window.APP.dashTick);
            window.APP.dashTick = null;
            return;
        }
        if (!window.APP.operacionActiva) return;
        actualizarTiempoRestanteDashboard();
    }, 1000);
}

async function actualizarTiempoRestanteDashboard() {
    const operacionId = window.APP.operacionActiva;
    if (!operacionId) return;

    const filtroOperario = document.getElementById('dashFiltroOperario')?.value || 'todos';

    const [montajes, cronosData, historial, operaciones] = await Promise.all([
        cargarFirebase('montajes'),
        cargarFirebase('cronos_operacion', true),
        cargarFirebase('historial_montajes'),
        cargarFirebase('operaciones')
    ]);

    const op = operaciones[operacionId];
    if (!op) return;
    const modelo = op.modelo || 'MS3';

    const idsFiltrados = new Set();
    Object.entries(montajes).forEach(([mid, m]) => {
        if (m.modelo !== modelo) return;
        if (filtroOperario !== 'todos' && m.operarioAsignado !== filtroOperario) return;
        idsFiltrados.add(mid);
    });

    const consumoPorMontaje = {};
    const hechosIds = new Set();
    const enCursoIds = new Set();
    for (const h of Object.values(historial)) {
        if (!h.completado || h.operacionId !== operacionId || !idsFiltrados.has(h.montajeId)) continue;
        consumoPorMontaje[h.montajeId] = (consumoPorMontaje[h.montajeId] || 0) + (h.tiempoRealSeg || 0);
        hechosIds.add(h.montajeId);
    }

    const cronoOp = cronosData[operacionId];
    for (const [mid, mActivo] of Object.entries(cronoOp?.montajesActivos || {})) {
        if (!idsFiltrados.has(mid)) continue;
        if (mActivo.completado) {
            hechosIds.add(mid);
        } else if (!hechosIds.has(mid)) {
            consumoPorMontaje[mid] = calcularConsumoMontaje(mActivo);
            enCursoIds.add(mid);
        }
    }

    const entradas = [...idsFiltrados].map(mid => [mid, montajes[mid]]);
    mostrarTiemposDashboard(calcularTiemposPorTipo(entradas, consumoPorMontaje, hechosIds, enCursoIds));
}
