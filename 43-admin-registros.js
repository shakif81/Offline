window.APP._regTabActual = 'resistencias';

async function cargarRegistroVerificaciones() {
    const container = document.getElementById('regVerifLista');
    if (!container) return;

    container.innerHTML = '<div class="empty-state">⏳ Cargando...</div>';

    const [historial, operarios, estaciones, operaciones] = await Promise.all([
        cargarFirebase('historial_montajes', true),
        cargarFirebase('operarios'),
        cargarFirebase('estaciones'),
        cargarFirebase('operaciones')
    ]);

    const selOp = document.getElementById('regVerifFiltroOperario');
    if (selOp && selOp.options.length <= 1) {
        const nombresUnicos = [...new Set(
            Object.values(historial)
                .filter(h => h.completado && h.operario)
                .map(h => h.operario)
        )].sort();

        nombresUnicos.forEach(nombre => {
            const opt = document.createElement('option');
            opt.value = nombre;
            opt.textContent = `👤 ${nombre}`;
            selOp.appendChild(opt);
        });
    }

    const busqueda = (document.getElementById('regVerifBusqueda')?.value || '').toLowerCase().trim();
    const filtroOperario = document.getElementById('regVerifFiltroOperario')?.value || 'todos';
    const filtroFecha = document.getElementById('regVerifFiltroFecha')?.value || 'todo';

    let registros = Object.entries(historial).filter(([id, h]) => {
        if (!h.completado) return false;
        if (!h.pasosCompletados || h.pasosCompletados.length === 0) return false;

        if (filtroOperario !== 'todos' && h.operario !== filtroOperario) return false;

        if (filtroFecha !== 'todo') {
            const fecha = new Date(h.fecha);
            const ahora = new Date();
            const diffDias = (ahora - fecha) / (1000 * 60 * 60 * 24);

            if (filtroFecha === 'hoy') {
                const hoyStr = ahora.toISOString().split('T')[0];
                const fechaStr = fecha.toISOString().split('T')[0];
                if (hoyStr !== fechaStr) return false;
            } else if (filtroFecha === 'semana' && diffDias > 7) return false;
            else if (filtroFecha === 'mes' && diffDias > 30) return false;
        }

        if (busqueda) {
            const match = (h.montajeNombre || '').toLowerCase().includes(busqueda) ||
                          (h.operario || '').toLowerCase().includes(busqueda);
            if (!match) return false;
        }

        return true;
    });

    registros.sort((a, b) => new Date(b[1].fecha) - new Date(a[1].fecha));

    const contador = document.getElementById('regVerifContador');
    if (contador) contador.textContent = `${registros.length} registro${registros.length !== 1 ? 's' : ''}`;

    if (!registros.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size:2rem;margin-bottom:8px;">📭</div>
                <div style="font-weight:600;color:#1e293b;margin-bottom:4px;">Sin registros</div>
                <div style="font-size:0.85rem;color:#94a3b8;">
                    ${busqueda || filtroOperario !== 'todos' || filtroFecha !== 'todo'
                        ? 'Prueba otros filtros'
                        : 'Los montajes terminados con pasos aparecerán aquí'}
                </div>
            </div>
        `;
        return;
    }

    const total = registros.length;
    const totalPasos = registros.reduce((a, [id, h]) => a + (h.pasosCompletados?.length || 0), 0);
    const operariosUnicos = new Set(registros.map(([id, h]) => h.operario)).size;

    let html = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:1rem;">
            <div style="background:linear-gradient(135deg,#eef2ff,white);border:1px solid #c7d2fe;border-radius:14px;padding:1rem;text-align:center;">
                <div style="font-size:1.5rem;margin-bottom:4px;">📋</div>
                <div style="font-size:1.6rem;font-weight:800;color:#4338ca;line-height:1;">${total}</div>
                <div style="font-size:0.72rem;color:#4338ca;font-weight:600;margin-top:4px;">Montajes verificados</div>
            </div>
            <div style="background:linear-gradient(135deg,#ecfdf5,white);border:1px solid #a7f3d0;border-radius:14px;padding:1rem;text-align:center;">
                <div style="font-size:1.5rem;margin-bottom:4px;">✅</div>
                <div style="font-size:1.6rem;font-weight:800;color:#047857;line-height:1;">${totalPasos}</div>
                <div style="font-size:0.72rem;color:#047857;font-weight:600;margin-top:4px;">Pasos completados</div>
            </div>
            <div style="background:linear-gradient(135deg,#fef3c7,white);border:1px solid #fde68a;border-radius:14px;padding:1rem;text-align:center;">
                <div style="font-size:1.5rem;margin-bottom:4px;">👤</div>
                <div style="font-size:1.6rem;font-weight:800;color:#92400e;line-height:1;">${operariosUnicos}</div>
                <div style="font-size:0.72rem;color:#92400e;font-weight:600;margin-top:4px;">Operarios</div>
            </div>
        </div>
    `;

    registros.forEach(([id, h]) => {
        const numPasos = h.pasosCompletados?.length || 0;
        const est = estaciones[h.estacionId];
        const op = operaciones[h.operacionId];
        const fecha = new Date(h.fecha);

        const fechaTexto = fecha.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        const tiempoRealHoras = ((h.tiempoRealSeg || 0) / 3600).toFixed(2);

        html += `
            <div style="background:white;border:1px solid #e5e7eb;border-left:4px solid #6366f1;border-radius:12px;padding:12px 16px;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">
                        <div style="
                            width:44px;
                            height:44px;
                            background:#eef2ff;
                            border-radius:10px;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            font-size:1.3rem;
                            flex-shrink:0;
                        ">📋</div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:700;font-size:0.92rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                ${h.montajeNombre || 'Sin nombre'}
                            </div>
                            <div style="font-size:0.72rem;color:#64748b;margin-top:3px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                <span>👤 ${h.operario || '—'}</span>
                                <span style="color:#cbd5e1;">·</span>
                                <span>📍 ${est?.nombre || '—'}</span>
                                <span style="color:#cbd5e1;">·</span>
                                <span>🔢 Op. ${op?.numero || '—'}</span>
                            </div>
                            <div style="font-size:0.72rem;color:#94a3b8;margin-top:3px;">
                                📅 ${fechaTexto} · ⏱️ ${tiempoRealHoras}h
                            </div>
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
                        <span style="
                            background:#eef2ff;
                            color:#4338ca;
                            padding:4px 12px;
                            border-radius:99px;
                            font-size:0.72rem;
                            font-weight:700;
                            white-space:nowrap;
                        ">✅ ${numPasos} paso${numPasos !== 1 ? 's' : ''}</span>
                        <button onclick="verDetallePasos('${id}')"
                            style="
                                background:#6366f1;
                                color:white;
                                border:none;
                                padding:6px 14px;
                                border-radius:8px;
                                font-size:0.72rem;
                                font-weight:700;
                                cursor:pointer;
                                font-family:inherit;
                                white-space:nowrap;
                            ">
                            👁️ Ver pasos
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

async function cargarRegistroHerramientas() {
    const cont = document.getElementById('regHerrLista');
    if (!cont) return;

    cont.innerHTML = '<div class="empty-state">⏳ Cargando...</div>';

    const registros = await cargarFirebase('registros_herramientas', true);
    const arr = Object.entries(registros);

    const selOp = document.getElementById('regHerrFiltroOperario');
    if (selOp && selOp.options.length <= 1) {
        const operarios = [...new Set(arr.map(([id, r]) => r.operario).filter(Boolean))].sort();
        operarios.forEach(nombre => {
            const opt = document.createElement('option');
            opt.value = nombre;
            opt.textContent = `👤 ${nombre}`;
            selOp.appendChild(opt);
        });
    }
const selOpNum = document.getElementById('regHerrFiltroOperacion');
if (selOpNum && selOpNum.options.length <= 1) {
    const operaciones = [...new Set(
        arr.map(([id, r]) => r.numeroOperacion).filter(Boolean)
    )].sort((a, b) => String(b).localeCompare(String(a), undefined, { numeric: true }));

    operaciones.forEach(num => {
        const opt = document.createElement('option');
        opt.value = num;
        opt.textContent = `🔢 Op. ${num}`;
        selOpNum.appendChild(opt);
    });
}

    const busqueda = (document.getElementById('regHerrBusqueda')?.value || '').toLowerCase().trim();
const filtroOperario = document.getElementById('regHerrFiltroOperario')?.value || 'todos';
const filtroOperacion = document.getElementById('regHerrFiltroOperacion')?.value || 'todas';
const filtroFecha = document.getElementById('regHerrFiltroFecha')?.value || 'todo';
    let lista = arr.slice();

    if (filtroOperario !== 'todos') {
        lista = lista.filter(([id, r]) => r.operario === filtroOperario);
    }

if (filtroOperacion !== 'todas') {
    lista = lista.filter(([id, r]) => String(r.numeroOperacion || '') === String(filtroOperacion));
}

    if (filtroFecha !== 'todo') {
        const ahora = new Date();
        lista = lista.filter(([id, r]) => {
            if (!r.fecha) return false;
            const f = new Date(r.fecha);
            const diffDias = (ahora - f) / (1000 * 60 * 60 * 24);

            if (filtroFecha === 'hoy') {
                return f.toISOString().split('T')[0] === ahora.toISOString().split('T')[0];
            }
            if (filtroFecha === 'semana') return diffDias <= 7;
            if (filtroFecha === 'mes') return diffDias <= 30;
            return true;
        });
    }

    if (busqueda) {
        lista = lista.filter(([id, r]) => {
            return (r.operario || '').toLowerCase().includes(busqueda) ||
                   (r.herramientaNombre || '').toLowerCase().includes(busqueda) ||
                   (r.herramientaCodigo || '').toLowerCase().includes(busqueda) ||
                   (r.montajeNombre || '').toLowerCase().includes(busqueda) ||
                   (r.numeroOperacion || '').toLowerCase().includes(busqueda) ||
                   (r.estacionNombre || '').toLowerCase().includes(busqueda);
        });
    }

    lista.sort((a, b) => new Date(b[1].fecha || 0) - new Date(a[1].fecha || 0));

    const ahora = new Date();
    const ultimaSemana = arr.filter(([id, r]) => {
        if (!r.fecha) return false;
        const diffDias = (ahora - new Date(r.fecha)) / (1000 * 60 * 60 * 24);
        return diffDias <= 7;
    }).length;

    const operariosUnicos = new Set(arr.map(([id, r]) => r.operario).filter(Boolean)).size;
    const herramientasUnicas = new Set(arr.map(([id, r]) => r.herramientaId).filter(Boolean)).size;

    document.getElementById('regHerrStatTotal').textContent = arr.length;
    document.getElementById('regHerrStatOperarios').textContent = operariosUnicos;
    document.getElementById('regHerrStatHerramientas').textContent = herramientasUnicas;
    document.getElementById('regHerrStatSemana').textContent = ultimaSemana;

    const contador = document.getElementById('regHerrContador');
    if (contador) {
        contador.textContent = `${lista.length} registro${lista.length !== 1 ? 's' : ''}`;
    }

    if (!lista.length) {
        cont.innerHTML = `
            <div class="empty-state">
                <div style="font-size:2rem;margin-bottom:8px;">📭</div>
                <div style="font-weight:600;color:#1e293b;margin-bottom:4px;">Sin registros</div>
                <div style="font-size:0.85rem;color:#94a3b8;">
                    ${busqueda || filtroOperario !== 'todos' || filtroFecha !== 'todo'
                        ? 'Prueba otros filtros'
                        : 'Aparecerán aquí cuando se terminen montajes con pares requeridos'}
                </div>
            </div>
        `;
        return;
    }

    const grupos = {};
    lista.forEach(([id, r]) => {
        const clave = r.historialId || r.montajeId || id;
        if (!grupos[clave]) {
            grupos[clave] = {
                operario: r.operario,
                operacionId: r.operacionId,
                numeroOperacion: r.numeroOperacion,
                montajeId: r.montajeId,
                montajeNombre: r.montajeNombre,
                estacionNombre: r.estacionNombre,
                fecha: r.fecha,
                duracionMontajeSeg: r.duracionMontajeSeg,
                herramientas: []
            };
        }
        grupos[clave].herramientas.push(r);
    });

    const gruposArr = Object.values(grupos).sort((a, b) =>
        new Date(b.fecha || 0) - new Date(a.fecha || 0)
    );

    cont.innerHTML = gruposArr.map(g => {
        g.herramientas.sort((a, b) => (b.par || 0) - (a.par || 0));

        const fecha = g.fecha ? new Date(g.fecha) : null;
        const fechaTexto = fecha ? fecha.toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        }) : '—';

        const durHoras = g.duracionMontajeSeg ? (g.duracionMontajeSeg / 3600).toFixed(2) + 'h' : '—';

        return `
            <div style="background:white;border:1px solid #e5e7eb;border-left:4px solid #6366f1;border-radius:12px;padding:14px 16px;">

                <!-- CABECERA -->
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:12px;min-width:0;">
                        <div style="width:44px;height:44px;background:#eef2ff;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">🔧</div>
                        <div style="min-width:0;">
                            <div style="font-weight:700;font-size:0.92rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                ${g.montajeNombre || 'Sin nombre'}
                            </div>
                            <div style="font-size:0.72rem;color:#64748b;margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                                <span>👤 ${g.operario || '—'}</span>
                                <span style="color:#cbd5e1;">·</span>
                                <span>📍 ${g.estacionNombre || '—'}</span>
                                <span style="color:#cbd5e1;">·</span>
                                <span>Op. ${g.numeroOperacion || '—'}</span>
                            </div>
                            <div style="font-size:0.72rem;color:#94a3b8;margin-top:3px;">
                                📅 ${fechaTexto} · ⏱️ ${durHoras}
                            </div>
                        </div>
                    </div>
                    <span style="background:#eef2ff;color:#4338ca;padding:4px 12px;border-radius:99px;font-size:0.72rem;font-weight:700;white-space:nowrap;">
                        🔧 ${g.herramientas.length} herramienta${g.herramientas.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <!-- HERRAMIENTAS USADAS -->
                <div style="display:flex;flex-direction:column;gap:6px;">
                    ${g.herramientas.map(h => `
                        <div style="background:#f8fafc;border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                            <span style="background:#1e293b;color:white;padding:3px 10px;border-radius:8px;font-size:0.72rem;font-weight:800;font-family:'SF Mono',Monaco,monospace;flex-shrink:0;">
                                💪 ${h.par || '—'} Nm
                            </span>
            <div style="flex:1;min-width:0;">
    <div style="font-weight:600;font-size:0.82rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        ${h.herramientaNombre || 'Sin nombre'}
    </div>
    ${h.herramientaCodigo ? `<div style="font-size:0.72rem;font-family:'SF Mono',Monaco,monospace;font-weight:700;color:#4338ca;background:#eef2ff;padding:1px 8px;border-radius:6px;display:inline-block;margin-top:2px;">${h.herramientaCodigo}</div>` : ''}
</div>
                            ${h.herramientaNumero ? `<span style="background:#64748b18;color:#475569;padding:2px 8px;border-radius:99px;font-size:0.68rem;font-weight:700;">#${h.herramientaNumero}</span>` : ''}
                            ${h.auto
                                ? `<span style="background:#ecfdf5;color:#047857;padding:2px 8px;border-radius:99px;font-size:0.65rem;font-weight:700;">AUTO</span>`
                                : `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px;font-size:0.65rem;font-weight:700;">MANUAL</span>`}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

async function verDetallePasos(historialId) {
    const historial = await cargarFirebase('historial_montajes', true);
    const h = historial[historialId];

    if (!h) {
        toast('❌ Registro no encontrado', '#ef4444');
        return;
    }

    const pasos = h.pasosCompletados || [];

    if (!pasos.length) {
        alertar('Este montaje no tiene pasos registrados', { tipo: 'info' });
        return;
    }

    const fecha = new Date(h.fecha);
    const fechaTexto = fecha.toLocaleString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const primeros = pasos.filter(p => p.fecha);
    let duracionTexto = '—';
    if (primeros.length >= 2) {
        const t1 = new Date(primeros[0].fecha).getTime();
        const t2 = new Date(primeros[primeros.length - 1].fecha).getTime();
        const segundos = Math.floor((t2 - t1) / 1000);
        const min = Math.floor(segundos / 60);
        const s = segundos % 60;
        duracionTexto = min > 0 ? `${min} min ${s}s` : `${s}s`;
    }

    const modal = document.createElement('div');
    modal.id = 'modalDetallePasos';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;';

    modal.innerHTML = `
        <div style="background:white;border-radius:18px;max-width:560px;width:100%;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">

            <!-- CABECERA -->
            <div style="
                background: linear-gradient(135deg, #6366f1, #4f46e5);
                color: white;
                padding: 16px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
            ">
                <div style="display:flex;align-items:center;gap:12px;min-width:0;">
                    <span style="font-size:1.6rem;">📋</span>
                    <div style="min-width:0;">
                        <div style="font-weight:800;font-size:1rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            ${h.montajeNombre || 'Sin nombre'}
                        </div>
                        <div style="font-size:0.75rem;opacity:0.9;margin-top:2px;">
                            Pasos completados
                        </div>
                    </div>
                </div>
                <button onclick="cerrarModal('modalDetallePasos')"
                    style="
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        width: 36px;
                        height: 36px;
                        border-radius: 10px;
                        font-size: 1.2rem;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    ">✕</button>
            </div>

            <!-- INFO GENERAL -->
            <div style="
                padding: 14px 20px;
                background: #f8fafc;
                border-bottom: 1px solid #e5e7eb;
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                font-size: 0.78rem;
            ">
                <div>
                    <div style="color:#64748b;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">👤 Operario</div>
                    <div style="color:#1e293b;font-weight:700;">${h.operario || '—'}</div>
                </div>
                <div>
                    <div style="color:#64748b;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">📅 Terminado</div>
                    <div style="color:#1e293b;font-weight:700;">${fechaTexto}</div>
                </div>
                <div>
                    <div style="color:#64748b;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">⏱️ Duración pasos</div>
                    <div style="color:#1e293b;font-weight:700;">${duracionTexto}</div>
                </div>
                <div>
                    <div style="color:#64748b;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">📋 Total pasos</div>
                    <div style="color:#1e293b;font-weight:700;">${pasos.length}</div>
                </div>
            </div>

            <!-- LISTA DE PASOS -->
            <div style="flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:8px;">
                ${pasos.map((p, idx) => {
                    const hora = p.fecha ? new Date(p.fecha).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    }) : '';

                    return `
                        <div style="
                            background: #ecfdf5;
                            border: 1px solid #a7f3d0;
                            border-radius: 10px;
                            padding: 10px 14px;
                            display: flex;
                            align-items: center;
                            gap: 12px;
                        ">
                            <span style="
                                background: #10b981;
                                color: white;
                                width: 26px;
                                height: 26px;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 0.75rem;
                                font-weight: 800;
                                flex-shrink: 0;
                            ">${idx + 1}</span>
                            <div style="flex:1;min-width:0;">
                                <div style="
                                    font-weight:600;
                                    font-size:0.85rem;
                                    color:#047857;
                                    line-height:1.3;
                                ">${p.texto || '(sin texto)'}</div>
                                ${hora ? `
                                    <div style="
                                        font-size:0.7rem;
                                        color:#059669;
                                        margin-top:3px;
                                        font-family:'SF Mono',Monaco,monospace;
                                    ">✅ ${hora}</div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- PIE -->
            <div style="padding: 14px 20px; border-top: 1px solid #e5e7eb; display:flex; justify-content:flex-end;">
                <button onclick="cerrarModal('modalDetallePasos')"
                    style="
                        padding: 10px 20px;
                        border: 1px solid #e5e7eb;
                        border-radius: 10px;
                        background: white;
                        color: #64748b;
                        font-weight: 700;
                        cursor: pointer;
                        font-size: 0.85rem;
                        font-family: inherit;
                    ">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModal('modalDetallePasos');
    });
}

async function cambiarTabRegistros(tab) {
    window.APP._regTabActual = tab;

    const btnRes = document.getElementById('regTabResistencias');
    const btnEsc = document.getElementById('regTabEscaneos');

    if (tab === 'resistencias') {
        if (btnRes) { btnRes.style.color = '#b45309'; btnRes.style.borderBottomColor = '#f59e0b'; }
        if (btnEsc) { btnEsc.style.color = '#64748b'; btnEsc.style.borderBottomColor = 'transparent'; }
    } else {
        if (btnEsc) { btnEsc.style.color = '#1d4ed8'; btnEsc.style.borderBottomColor = '#1d4ed8'; }
        if (btnRes) { btnRes.style.color = '#64748b'; btnRes.style.borderBottomColor = 'transparent'; }
    }

    if (tab === 'resistencias') {
        await cargarRegistrosResistencias();
    } else {
        await cargarRegistrosEscaneos();
    }
}

async function cargarRegistrosResistencias() {
    const cont = document.getElementById('regListaContenido');
    if (!cont) return;

    cont.innerHTML = '<div class="empty-state">⏳ Cargando...</div>';

    const [registros, operarios] = await Promise.all([
        cargarFirebase('resistencias_montajes', true),
        cargarFirebase('operarios')
    ]);

    _rellenarFiltroOperariosRegistros(registros, operarios, 'resistencias');

    const busqueda = (document.getElementById('regBusquedaGeneral')?.value || '').toLowerCase().trim();
    const filtroOperario = document.getElementById('regFiltroOperario')?.value || 'todos';
    const filtroFecha = document.getElementById('regFiltroFecha')?.value || 'todo';

    let items = [];
    Object.entries(registros).forEach(([clave, doc]) => {
        (doc.registros || []).forEach(r => {
            items.push({
                operacionId: doc.operacionId,
                numeroOperacion: doc.numeroOperacion,
                montajeId: doc.montajeId,
                montajeNombre: doc.montajeNombre,
                matId: r.matId,
                nombreCorto: r.nombreCorto,
                numeroSerie: r.numeroSerie,
                lote: r.lote,
                registradoPor: r.registradoPor,
                fecha: r.fecha
            });
        });
    });

    if (filtroOperario !== 'todos') {
        items = items.filter(i => i.registradoPor === filtroOperario);
    }

    if (filtroFecha !== 'todo') {
        items = items.filter(i => {
            if (!i.fecha) return false;
            const fecha = new Date(i.fecha);
            const ahora = new Date();
            const diffDias = (ahora - fecha) / (1000 * 60 * 60 * 24);

            if (filtroFecha === 'hoy') {
                return fecha.toISOString().split('T')[0] === ahora.toISOString().split('T')[0];
            }
            if (filtroFecha === 'semana') return diffDias <= 7;
            if (filtroFecha === 'mes') return diffDias <= 30;
            return true;
        });
    }

    if (busqueda) {
        items = items.filter(i =>
            (i.montajeNombre || '').toLowerCase().includes(busqueda) ||
            (i.numeroSerie || '').toLowerCase().includes(busqueda) ||
            (i.lote || '').toLowerCase().includes(busqueda) ||
            (i.numeroOperacion || '').toLowerCase().includes(busqueda) ||
            (i.registradoPor || '').toLowerCase().includes(busqueda)
        );
    }

    items.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

    const contador = document.getElementById('regContador');
    if (contador) contador.textContent = `${items.length} registro${items.length !== 1 ? 's' : ''}`;

    if (!items.length) {
        cont.innerHTML = `
            <div class="empty-state">
                <div style="font-size:2rem;margin-bottom:8px;">📭</div>
                <div style="font-weight:600;color:#1e293b;">Sin registros de resistencias</div>
                <div style="font-size:0.85rem;color:#94a3b8;margin-top:4px;">Aparecerán aquí cuando los operarios rellenen los lotes</div>
            </div>
        `;
        return;
    }

    cont.innerHTML = `
        <div style="overflow-x:auto;background:white;border-radius:12px;border:1px solid #e5e7eb;">
            <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
                <thead>
                    <tr style="background:#f8fafc;">
                        <th style="padding:10px 12px;text-align:left;font-weight:700;color:#64748b;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Nº Serie</th>
                        <th style="padding:10px 12px;text-align:left;font-weight:700;color:#64748b;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Lote</th>
                        <th style="padding:10px 12px;text-align:left;font-weight:700;color:#64748b;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Montaje</th>
                        <th style="padding:10px 12px;text-align:left;font-weight:700;color:#64748b;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Op.</th>
                        <th style="padding:10px 12px;text-align:left;font-weight:700;color:#64748b;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Operario</th>
                        <th style="padding:10px 12px;text-align:left;font-weight:700;color:#64748b;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Fecha</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(i => `
                        <tr style="border-bottom:1px solid #f1f5f9;">
                            <td style="padding:10px 12px;font-family:'SF Mono',Monaco,monospace;font-weight:700;color:#1e293b;">${i.numeroSerie}</td>
                            <td style="padding:10px 12px;">
                                ${i.lote ? `<span style="background:#fffbeb;color:#b45309;padding:3px 10px;border-radius:99px;font-size:0.75rem;font-weight:700;">📝 ${i.lote}</span>` : `<span style="color:#cbd5e1;font-style:italic;">Sin lote</span>`}
                            </td>
                            <td style="padding:10px 12px;color:#475569;">${i.montajeNombre || '—'}</td>
                            <td style="padding:10px 12px;">
                                <span style="background:#eef2ff;color:#4338ca;padding:3px 10px;border-radius:99px;font-size:0.7rem;font-weight:700;">${i.numeroOperacion || '—'}</span>
                            </td>
                            <td style="padding:10px 12px;color:#475569;">👤 ${i.registradoPor || '—'}</td>
                            <td style="padding:10px 12px;color:#94a3b8;font-size:0.72rem;white-space:nowrap;">
                                ${i.fecha ? new Date(i.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function cargarRegistrosEscaneos() {
    const cont = document.getElementById('regListaContenido');
    if (!cont) return;

    cont.innerHTML = '<div class="empty-state">⏳ Cargando...</div>';

    const [escaneos, operarios] = await Promise.all([
        cargarFirebase('componentes_escaneados', true),
        cargarFirebase('operarios')
    ]);

    _rellenarFiltroOperariosRegistros(escaneos, operarios, 'escaneos');

    const busqueda = (document.getElementById('regBusquedaGeneral')?.value || '').toLowerCase().trim();
    const filtroOperario = document.getElementById('regFiltroOperario')?.value || 'todos';
    const filtroFecha = document.getElementById('regFiltroFecha')?.value || 'todo';

    let items = [];
    Object.entries(escaneos).forEach(([clave, doc]) => {
        (doc.componentes || []).forEach(c => {
            if (!c.codigoEscaneado) return;

            items.push({
                clave,
                operacionId: doc.operacionId,
                numeroOperacion: doc.numeroOperacion,
                montajeId: doc.montajeId,
                montajeNombre: doc.montajeNombre,
                materialNombre: c.materialNombre || '—',
                codigoEscaneado: c.codigoEscaneado || '',
                codigoOriginal: c.codigoOriginal || '',
                revision: c.revision || '',
                escaneadoPor: c.escaneadoPor || doc.operario || '',
                fecha: c.fechaEscaneo || doc.fecha,
                manual: c.manual || false
            });
        });
    });

    if (filtroOperario !== 'todos') {
        items = items.filter(i => i.escaneadoPor === filtroOperario);
    }

    if (filtroFecha !== 'todo') {
        items = items.filter(i => {
            if (!i.fecha) return false;
            const fecha = new Date(i.fecha);
            const ahora = new Date();
            const diffDias = (ahora - fecha) / (1000 * 60 * 60 * 24);
            if (filtroFecha === 'hoy') return fecha.toISOString().split('T')[0] === ahora.toISOString().split('T')[0];
            if (filtroFecha === 'semana') return diffDias <= 7;
            if (filtroFecha === 'mes') return diffDias <= 30;
            return true;
        });
    }

    if (busqueda) {
        items = items.filter(i =>
            (i.materialNombre || '').toLowerCase().includes(busqueda) ||
            (i.codigoEscaneado || '').toLowerCase().includes(busqueda) ||
            (i.revision || '').toLowerCase().includes(busqueda) ||
            (i.montajeNombre || '').toLowerCase().includes(busqueda) ||
            (i.numeroOperacion || '').toLowerCase().includes(busqueda) ||
            (i.escaneadoPor || '').toLowerCase().includes(busqueda)
        );
    }

    items.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

    const contador = document.getElementById('regContador');
    if (contador) contador.textContent = `${items.length} registro${items.length !== 1 ? 's' : ''}`;

    if (!items.length) {
        cont.innerHTML = `
            <div class="empty-state">
                <div style="font-size:2rem;margin-bottom:8px;">📭</div>
                <div style="font-weight:600;color:#1e293b;">Sin componentes escaneados</div>
                <div style="font-size:0.85rem;color:#94a3b8;margin-top:4px;">Aparecerán aquí cuando los operarios escaneen componentes</div>
            </div>
        `;
        return;
    }

    cont.innerHTML = `
        <div style="overflow-x:auto;background:white;border-radius:12px;border:1px solid #e5e7eb;">
            <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
                <thead>
                    <tr style="background:#f8fafc;">
                        <th style="padding:10px 12px;text-align:left;font-weight:700;color:#64748b;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Componente</th>
                        <th style="padding:10px 12px;text-align:left;font-weight:700;color:#64748b;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Nº Serie</th>
                        <th style="padding:10px 12px;text-align:center;font-weight:700;color:#64748b;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Revisión</th>
                        <th style="padding:10px 12px;text-align:left;font-weight:700;color:#64748b;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Montaje</th>
                        <th style="padding:10px 12px;text-align:left;font-weight:700;color:#64748b;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Op.</th>
                        <th style="padding:10px 12px;text-align:left;font-weight:700;color:#64748b;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Operario</th>
                        <th style="padding:10px 12px;text-align:left;font-weight:700;color:#64748b;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Fecha</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(i => `
                        <tr style="border-bottom:1px solid #f1f5f9;">
                            <td style="padding:10px 12px;font-weight:600;color:#1e293b;">
                                ${i.materialNombre}
                                ${i.manual ? '<span style="font-size:0.65rem;color:#f59e0b;font-weight:700;margin-left:4px;">✍️</span>' : ''}
                            </td>
                            <td style="padding:10px 12px;font-family:'SF Mono',Monaco,monospace;font-weight:700;color:#047857;">${i.codigoEscaneado}</td>
                            <td style="padding:10px 12px;text-align:center;">
                                ${i.revision
                                    ? `<span style="background:#eef2ff;color:#4338ca;padding:3px 10px;border-radius:99px;font-size:0.75rem;font-weight:700;">${i.revision}</span>`
                                    : `<span style="color:#cbd5e1;font-style:italic;">—</span>`}
                            </td>
                            <td style="padding:10px 12px;color:#475569;">${i.montajeNombre || '—'}</td>
                            <td style="padding:10px 12px;">
                                <span style="background:#eef2ff;color:#4338ca;padding:3px 10px;border-radius:99px;font-size:0.7rem;font-weight:700;">${i.numeroOperacion || '—'}</span>
                            </td>
                            <td style="padding:10px 12px;color:#475569;">👤 ${i.escaneadoPor || '—'}</td>
                            <td style="padding:10px 12px;color:#94a3b8;font-size:0.72rem;white-space:nowrap;">
                                ${i.fecha ? new Date(i.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function _rellenarFiltroOperariosRegistros(data, operarios, tipo) {
    const sel = document.getElementById('regFiltroOperario');
    if (!sel) return;

    if (sel.options.length > 1) return;

    const nombres = new Set();

    if (tipo === 'resistencias') {
        Object.values(data).forEach(doc => {
            (doc.registros || []).forEach(r => {
                if (r.registradoPor) nombres.add(r.registradoPor);
            });
        });
    } else {
        Object.values(data).forEach(doc => {
            (doc.componentes || []).forEach(c => {
                if (c.escaneadoPor) nombres.add(c.escaneadoPor);
            });
        });
    }

    [...nombres].sort().forEach(nombre => {
        const opt = document.createElement('option');
        opt.value = nombre;
        opt.textContent = `👤 ${nombre}`;
        sel.appendChild(opt);
    });
}
