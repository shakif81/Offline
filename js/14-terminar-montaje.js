async function validarParaTerminar(montajeId, operacionId) {
    const montajes = await cargarFirebase('montajes');
    const m = montajes[montajeId];
    if (!m) return { ok: false, motivo: 'Montaje no encontrado' };

if (typeof tieneResistencias === 'function' && tieneResistencias(m)) {
    const data = await cargarFirebase('resistencias_montajes', true);
    const clave = operacionId + '_' + montajeId;
    const guardado = data[clave];

    const materialesCat = await cargarFirebase('materiales_catalogo');
    let totalEsperadas = 0;
    if (m.materialesNecesarios) {
        m.materialesNecesarios.split('||').forEach(item => {
            const partes = item.trim().split('=');
            const matId = partes[0];
            const cantidad = parseInt(partes[1]) || 1;
            if (!matId) return;

            let cat = materialesCat[matId];
            if (!cat) {
                cat = Object.values(materialesCat).find(mm =>
                    mm.codigo === matId || mm.nombre === matId
                );
            }

            if (cat?.esResistencia === true) {
                totalEsperadas += cantidad;
            }
        });
    }

    if (!guardado || !guardado.registros) {
        return {
            ok: false,
            motivo: `⚡ Este montaje tiene ${totalEsperadas} resistencia(s).\n\nRellena el formulario de resistencias antes de terminar.`
        };
    }

    const registros = guardado.registros;
    const conLote = registros.filter(r => r.lote && r.lote.trim()).length;

    if (conLote < totalEsperadas) {
        return {
            ok: false,
            motivo: `⚡ Faltan lotes de resistencias.\n\nCompletados: ${conLote}/${totalEsperadas}`
        };
    }
}

if (typeof tieneComponentesAEscanear === 'function' && tieneComponentesAEscanear(m)) {
    const data = await cargarFirebase('componentes_escaneados', true);
    const clave = operacionId + '_' + montajeId;
    const guardado = data[clave];

    const totalEsperados = contarComponentesAEscanear(m);

    if (!guardado || !guardado.componentes) {
        return {
            ok: false,
            motivo: `📷 Este montaje tiene ${totalEsperados} componente(s) por escanear.\n\nAbre el botón "📷 Escanear" y escanea todos antes de terminar.`
        };
    }

    const componentes = guardado.componentes;
    const conCodigo = componentes.filter(c => c.codigoEscaneado && c.codigoEscaneado.trim()).length;

    if (conCodigo < totalEsperados) {
        return {
            ok: false,
            motivo: `📷 Faltan componentes por escanear.\n\nEscaneados: ${conCodigo}/${totalEsperados}\n\nAbre el botón "📷 Escanear" para completarlos.`
        };
    }
}
    return { ok: true };
}

async function terminarMontaje(montajeId) {
    const operacionId = window.APP.operacionActiva;
    if (!operacionId) {
        toast('❌ No hay operación activa', '#ef4444');
        return false;
    }

    const miNombre = window.APP.operario?.nombre;
    if (!miNombre) {
        toast('❌ Sin sesión activa', '#ef4444');
        return false;
    }

    const validacion = await validarParaTerminar(montajeId, operacionId);
    if (!validacion.ok) {
        await alertar(validacion.motivo, { titulo: '⚠️ No se puede terminar', tipo: 'danger' });
        return false;
    }

    const [montajes, operaciones, estaciones] = await Promise.all([
        cargarFirebase('montajes'),
        cargarFirebase('operaciones'),
        cargarFirebase('estaciones')
    ]);

    const m = montajes[montajeId];
    const nombreMontaje = m?.nombre || 'Sin nombre';
    const op = operaciones[operacionId];
    const est = estaciones[m?.puntoId];

    let herramientasUsadas = [];

    if (m?.paresRequeridos && String(m.paresRequeridos).trim()) {
        mostrarLoading('Buscando herramientas...');
        const candidatasPorPar = await calcularCandidatasHerramientas(m.paresRequeridos);
        ocultarLoading();

        const pares = Object.keys(candidatasPorPar);
        if (pares.length > 0) {
            const resultado = await mostrarModalRegistroHerramientas(
                nombreMontaje,
                m.paresRequeridos,
                candidatasPorPar
            );

            if (!resultado) {
                toast('⚠️ Terminación cancelada · Asigna las herramientas', '#f59e0b', 3000);
                return false;
            }

            herramientasUsadas = resultado;
        }
    }

    const pasos = m?.pasos || [];
    let pasosCompletados = [];

    if (pasos.length > 0) {
        const resultado = await mostrarModalConfirmarPasos(nombreMontaje, pasos);
        if (!resultado) {
            toast('⚠️ Cancelado · Debes confirmar todos los pasos', '#f59e0b');
            return false;
        }
        pasosCompletados = resultado;
    }

    const ok = await confirmar(
        `¿Terminar el montaje "${nombreMontaje}"?`,
        { titulo: '✅ Terminar montaje', tipo: 'success', okTexto: '✅ Sí, terminar' }
    );
    if (!ok) return false;

    const crono = await cargarCronoOperacion(operacionId);
    const mActivo = crono.montajesActivos?.[montajeId];

    if (!mActivo) {
        toast('❌ Este montaje no está activo', '#ef4444');
        return false;
    }

    if (!mActivo.operariosActivos || !mActivo.operariosActivos.includes(miNombre)) {
        toast('❌ Solo el operario que lo tiene activo puede terminarlo', '#ef4444');
        return false;
    }

    const tiempoRealSeg = calcularConsumoMontaje(mActivo);
    await detenerCronoMontaje(operacionId, montajeId);

    const idHistorial = 'hist_' + montajeId + '_' + Date.now();
    const fechaTerminado = new Date().toISOString();

    const historial = await cargarFirebase('historial_montajes', true);
    const historialPrevio = Object.entries(historial).find(([hid, h]) =>
        h.montajeId === montajeId && h.operacionId === operacionId && h.completado
    );
    const qcReenviosPrevios = historialPrevio ? (historialPrevio[1].qcReenvios || 0) : 0;

    await guardarFirebase('historial_montajes', idHistorial, {
        montajeId: montajeId,
        montajeNombre: nombreMontaje,
        estacionId: m?.puntoId || '',
        operacionId: operacionId,
        operario: miNombre,
        tiempoEstimadoSeg: Math.round((parseFloat(m?.tiempoHoras) || 0) * 3600),
        tiempoRealSeg: tiempoRealSeg,
        completado: true,
        pasosCompletados: pasosCompletados,
        fecha: fechaTerminado,

        herramientasUsadas: herramientasUsadas,

        qcEstado: 'pendiente',
        qcComentario: '',
        qcRevisor: '',
        qcFecha: null,
        qcReenvios: qcReenviosPrevios,
        qcFotos: []
    });

if (m?.piezasKanban) {
    const resKanban = await descontarPiezasKanbanMontaje(m, operacionId, idHistorial, {
        numeroOperacion: op?.numero || '',
        montajeId: montajeId
    });

    if (resKanban.movimientos > 0) {
        toast(`📦 ${resKanban.movimientos} pieza${resKanban.movimientos > 1 ? 's' : ''} descontada${resKanban.movimientos > 1 ? 's' : ''} del stock`, '#10b981', 2500);
    }

    if (resKanban.agotados.length > 0) {
        setTimeout(() => {
            toast(`🚫 Agotado: ${resKanban.agotados.join(', ')}`, '#ef4444', 4500);
        }, 800);
    }

    if (resKanban.faltantes.length > 0) {
        console.warn('⚠️ Piezas no encontradas en el catálogo:', resKanban.faltantes);
    }
}

    if (herramientasUsadas.length > 0) {
        for (const h of herramientasUsadas) {
            const regId = 'reg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

            await guardarFirebase('registros_herramientas', regId, {
                herramientaId: h.herramientaId,
                herramientaNombre: h.herramientaNombre,
                herramientaNumero: h.herramientaNumero || '',
                herramientaCodigo: h.herramientaCodigo || '',
                par: h.par,
                tipo: 'Llave Dinamométrica',
                auto: h.auto || false,

                operario: miNombre,
                operacionId: operacionId,
                numeroOperacion: op?.numero || '',
                montajeId: montajeId,
                montajeNombre: nombreMontaje,
                estacionId: m?.puntoId || '',
                estacionNombre: est?.nombre || '',

                historialId: idHistorial,
                fecha: fechaTerminado,
                duracionMontajeSeg: tiempoRealSeg
            });
        }
    }

    toast('✅ Montaje terminado', '#10b981');

    setTimeout(() => liberarMisHerramientas(), 500);
    setTimeout(() => comprobarYCrearQC(m?.puntoId, operacionId), 800);

    if (document.getElementById('dashboard')?.classList.contains('active')) {
        actualizarDashboard();
    }

    setTimeout(() => actualizarBadgeCrono(), 500);

    setTimeout(() => {
        const modelo = window.APP.modeloActivo || 'MS3';
        cargarMontajesOperacion(operacionId, modelo);
    }, 300);

    return true;
}

function mostrarModalConfirmarPasos(nombreMontaje, pasos) {
    return new Promise(resolve => {
        const pasosEstado = pasos.map(p => ({
            id: p.id,
            texto: p.texto,
            completado: false,
            fecha: null
        }));

        const modal = document.createElement('div');
        modal.id = 'modalConfirmarPasos';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;';

        function renderModal() {
            const completados = pasosEstado.filter(p => p.completado).length;
            const total = pasosEstado.length;
            const todoOk = completados === total;
            const pct = Math.round((completados / total) * 100);

            modal.innerHTML = `
                <div style="background:white;border-radius:18px;max-width:520px;width:100%;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">

                    <!-- CABECERA -->
                    <div style="
                        background: linear-gradient(135deg, #6366f1, #4f46e5);
                        color: white;
                        padding: 16px 20px;
                    ">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                            <span style="font-size:1.5rem;">📋</span>
                            <div style="font-weight:800;font-size:1.05rem;">
                                CONFIRMA LOS PASOS
                            </div>
                        </div>
                        <div style="font-size:0.8rem;opacity:0.9;">
                            ${nombreMontaje}
                        </div>
                    </div>

                    <!-- AVISO -->
                    <div style="
                        background: #fef3c7;
                        border-bottom: 1px solid #fde68a;
                        padding: 10px 16px;
                        font-size: 0.8rem;
                        color: #92400e;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-weight: 600;
                    ">
                        <span style="font-size:1rem;">⚠️</span>
                        <span>Debes confirmar todos los pasos antes de terminar.</span>
                    </div>

                    <!-- PROGRESO -->
                    <div style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9;">
                        <div style="display:flex;justify-content:space-between;font-size:0.75rem;font-weight:700;color:#4338ca;margin-bottom:6px;">
                            <span>Progreso</span>
                            <span>${completados} / ${total}</span>
                        </div>
                        <div style="background:#e5e7eb;height:8px;border-radius:99px;overflow:hidden;">
                            <div style="background:${todoOk ? '#10b981' : '#6366f1'};height:100%;width:${pct}%;border-radius:99px;transition:width 0.3s ease;"></div>
                        </div>
                    </div>

                    <!-- LISTA DE PASOS -->
                    <div style="flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:8px;">
                        ${pasosEstado.map((p, idx) => `
                            <label style="
                                display:flex;align-items:center;gap:12px;
                                padding:12px 14px;
                                background:${p.completado ? '#ecfdf5' : '#f8fafc'};
                                border:1px solid ${p.completado ? '#a7f3d0' : '#e5e7eb'};
                                border-radius:10px;
                                cursor:pointer;
                                transition:all 0.15s ease;
                            ">
                                <input type="checkbox"
                                    ${p.completado ? 'checked' : ''}
                                    onchange="togglePasoTemp(${idx}, this.checked)"
                                    style="width:22px;height:22px;cursor:pointer;flex-shrink:0;">
                                <span style="
                                    background:${p.completado ? '#10b981' : '#94a3b8'};
                                    color:white;
                                    width:24px;height:24px;
                                    border-radius:50%;
                                    display:flex;align-items:center;justify-content:center;
                                    font-size:0.7rem;
                                    font-weight:800;
                                    flex-shrink:0;
                                ">${idx + 1}</span>
                                <span style="
                                    flex:1;
                                    font-size:0.85rem;
                                    color:${p.completado ? '#047857' : '#1e293b'};
                                    font-weight:600;
                                    text-decoration:${p.completado ? 'line-through' : 'none'};
                                    line-height:1.4;
                                ">${p.texto}</span>
                            </label>
                        `).join('')}
                    </div>

                    <!-- BOTONES -->
                    <div style="padding: 14px 20px; border-top: 1px solid #f1f5f9; display: flex; gap: 8px;">
                        <button
                            onclick="cancelarModalPasos()"
                            style="
                                padding: 12px 16px;
                                border: 1px solid #e5e7eb;
                                border-radius: 10px;
                                background: white;
                                color: #64748b;
                                font-weight: 700;
                                cursor: pointer;
                                font-size: 0.85rem;
                                font-family: inherit;
                            ">
                            Cancelar
                        </button>
                        <button
                            ${!todoOk ? 'disabled' : ''}
                            onclick="confirmarModalPasos()"
                            style="
                                flex: 1;
                                padding: 12px;
                                border: none;
                                border-radius: 10px;
                                background: ${todoOk ? '#10b981' : '#cbd5e1'};
                                color: white;
                                font-weight: 700;
                                cursor: ${todoOk ? 'pointer' : 'not-allowed'};
                                font-size: 0.85rem;
                                font-family: inherit;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 8px;
                            ">
                            ${todoOk
                                ? '✅ Terminar montaje'
                                : '🚫 Faltan ' + (total - completados) + ' pasos'}
                        </button>
                    </div>
                </div>
            `;
        }

        window.togglePasoTemp = function(idx, val) {
            pasosEstado[idx].completado = val;
            pasosEstado[idx].fecha = val ? new Date().toISOString() : null;
            renderModal();
        };

        window.cancelarModalPasos = function() {
            modal.remove();
            delete window.togglePasoTemp;
            delete window.cancelarModalPasos;
            delete window.confirmarModalPasos;
            resolve(null);
        };

        window.confirmarModalPasos = function() {
            modal.remove();
            delete window.togglePasoTemp;
            delete window.cancelarModalPasos;
            delete window.confirmarModalPasos;
            resolve(pasosEstado);
        };

        renderModal();
        document.body.appendChild(modal);
    });
}
