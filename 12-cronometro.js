function montajesActivosEnOperacion(operacionId) {
    const cronoOp = window.APP.cronosOperacion?.[operacionId];
    if (!cronoOp || !cronoOp.montajesActivos) return false;
    return Object.values(cronoOp.montajesActivos).some(m =>
        m.operariosActivos && m.operariosActivos.length > 0
    );
}

function renderCronometroActivo(mid, m, mActivo) {
    const tiempoTotal = Math.round((parseFloat(m.tiempoHoras) || 0) * 3600);
    const consumido = calcularConsumoMontaje(mActivo);
    const restante = tiempoTotal - consumido;
    const porcentaje = tiempoTotal > 0 ? (consumido / tiempoTotal) * 100 : 0;
    const porcentajeBarra = Math.min(100, porcentaje);
    const operarios = mActivo.operariosActivos;

    let barColor = '#10b981';
    let bgLight = '#ecfdf5';
    if (porcentaje >= 90) { barColor = '#ef4444'; bgLight = '#fef2f2'; }
    else if (porcentaje >= 50) { barColor = '#f59e0b'; bgLight = '#fffbeb'; }

    return `
        <div data-crono-box="${mid}"
            style="margin-top:8px;padding:10px 12px;background:${bgLight};border-radius:8px;border:1px solid ${barColor}44;transition:background 0.3s ease, border-color 0.3s ease;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:6px;">
                    <span class="pulse-dot" data-crono-dot="${mid}" style="width:8px;height:8px;border-radius:50%;background:${barColor};display:inline-block;flex-shrink:0;"></span>
                    <span data-crono-titulo="${mid}" style="font-size:0.7rem;font-weight:800;color:${barColor};letter-spacing:0.05em;text-transform:uppercase;">En curso</span>
                </div>
                <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
                    ${operarios.map(op => `
                        <span data-crono-chip="${mid}" style="background:white;border:1px solid ${barColor}44;color:${barColor};padding:2px 8px;border-radius:99px;font-size:0.68rem;font-weight:700;display:inline-flex;align-items:center;gap:3px;">👤 ${op}</span>
                    `).join('')}
                </div>
            </div>

            <div style="background:#e5e7eb;height:6px;border-radius:99px;overflow:hidden;margin-bottom:6px;">
                <div data-progreso="${mid}" style="background:${barColor};height:100%;width:${porcentajeBarra}%;border-radius:99px;transition:width 0.5s ease, background 0.3s ease;"></div>
            </div>

            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;">
                <span style="font-size:0.7rem;color:#64748b;font-weight:500;">Tiempo restante</span>
                <span id="crono_display_${mid}" style="font-size:1rem;font-weight:800;color:${barColor};font-variant-numeric:tabular-nums;line-height:1;">${restante < 0 ? '-' + segundosAHorasDecimales(-restante) : segundosAHorasDecimales(restante)}</span>
            </div>

            <div style="display:flex; gap:6px; margin-top:8px;">
                <button onclick="event.stopPropagation(); pausarMontaje('${mid}')"
                    style="flex:1;padding:8px 12px;background:white;border:1px solid ${barColor};color:${barColor};border-radius:8px;font-size:0.72rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;transition:all 0.15s ease;font-family:inherit;white-space:nowrap;"
                    onmouseover="this.style.background='${bgLight}'"
                    onmouseout="this.style.background='white'">⏸️ Pausar</button>

                <button onclick="event.stopPropagation(); terminarMontaje('${mid}')"
                    style="flex:1;padding:8px 12px;background:#10b981;border:1px solid #10b981;color:white;border-radius:8px;font-size:0.72rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;transition:all 0.15s ease;font-family:inherit;white-space:nowrap;"
                    onmouseover="this.style.background='#059669';this.style.borderColor='#059669'"
                    onmouseout="this.style.background='#10b981';this.style.borderColor='#10b981'">✅ Terminar</button>
            </div>
        </div>
    `;
}

function renderCronometroPausado(mid, m, tiempoConsumido) {
    const tiempoTotal = Math.round((parseFloat(m.tiempoHoras) || 0) * 3600);
    const restante = tiempoTotal - tiempoConsumido;
    const porcentaje = tiempoTotal > 0 ? (tiempoConsumido / tiempoTotal) * 100 : 0;
    const porcentajeBarra = Math.min(100, porcentaje);

    let barColor = '#f59e0b';
    if (porcentaje >= 90) { barColor = '#ef4444'; }

    return `
        <div data-crono-box="${mid}"
            style="margin-top:8px;padding:10px 12px;background:#fffbeb;border-radius:8px;border:1px dashed ${barColor}66;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:6px;">
                    <span style="width:8px;height:8px;border-radius:50%;background:${barColor};display:inline-block;flex-shrink:0;"></span>
                    <span style="font-size:0.7rem;font-weight:800;color:${barColor};letter-spacing:0.05em;text-transform:uppercase;">⏸️ Pausado</span>
                </div>
                <span style="font-size:0.68rem;color:#92400e;font-weight:600;">Toca para reanudar</span>
            </div>

            <div style="background:#e5e7eb;height:6px;border-radius:99px;overflow:hidden;margin-bottom:6px;">
                <div style="background:${barColor};height:100%;width:${porcentajeBarra}%;border-radius:99px;"></div>
            </div>

            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;">
                <span style="font-size:0.7rem;color:#92400e;font-weight:500;">Tiempo restante</span>
                <span style="font-size:1rem;font-weight:800;color:${barColor};font-variant-numeric:tabular-nums;line-height:1;">${restante < 0 ? '-' + segundosAHorasDecimales(-restante) : segundosAHorasDecimales(restante)}</span>
            </div>
        </div>
    `;
}

async function cargarCronoOperacion(operacionId) {
    if (!operacionId) return null;

    const data = await cargarFirebase('cronos_operacion', true);
    if (data[operacionId]) return data[operacionId];

    const operaciones = await cargarFirebase('operaciones');
    const op = operaciones[operacionId];

    return {
        operacionId: operacionId,
        numeroOperacion: op?.numero || '',
        montajesActivos: {}
    };
}

async function guardarCronoOperacion(operacionId, data) {
    data.ultimaActualizacion = new Date().toISOString();
    await guardarFirebase('cronos_operacion', operacionId, data);
    return data;
}

async function arrancarCronoMontaje(operacionId, montajeId) {
    const crono = await cargarCronoOperacion(operacionId);
    const miNombre = window.APP.operario?.nombre || 'Operario';
    const ahora = Date.now();

    if (!crono.montajesActivos) crono.montajesActivos = {};

    const montajeActual = crono.montajesActivos[montajeId] || {
        operariosActivos: [],
        tiempoConsumidoSeg: 0,
        completado: false
    };

    if (!montajeActual.operariosActivos.includes(miNombre)) {
        montajeActual.operariosActivos.push(miNombre);
    }

    montajeActual.ultimoTick = ahora;
    crono.montajesActivos[montajeId] = montajeActual;
    await guardarCronoOperacion(operacionId, crono);

    return crono;
}

async function detenerCronoMontaje(operacionId, montajeId) {
    const crono = await cargarCronoOperacion(operacionId);
    const miNombre = window.APP.operario?.nombre || 'Operario';
    const ahora = Date.now();

    if (!crono.montajesActivos || !crono.montajesActivos[montajeId]) return crono;

    const m = crono.montajesActivos[montajeId];

    if (m.ultimoTick) {
        const segundos = Math.floor((ahora - m.ultimoTick) / 1000);
        const peso = m.operariosActivos.length || 1;
        m.tiempoConsumidoSeg = (m.tiempoConsumidoSeg || 0) + (segundos * peso);
    }

    m.operariosActivos = m.operariosActivos.filter(n => n !== miNombre);

    if (m.operariosActivos.length === 0) {
        m.ultimoTick = null;
    } else {
        m.ultimoTick = ahora;
    }

    crono.montajesActivos[montajeId] = m;
    await guardarCronoOperacion(operacionId, crono);

    return crono;
}

function calcularConsumoMontaje(montajeActivo) {
    if (!montajeActivo) return 0;

    let total = montajeActivo.tiempoConsumidoSeg || 0;

    if (montajeActivo.ultimoTick && montajeActivo.operariosActivos?.length > 0) {
        const segundos = Math.floor((Date.now() - montajeActivo.ultimoTick) / 1000);
        const peso = montajeActivo.operariosActivos.length;
        total += segundos * peso;
    }

    return total;
}

function tiempoRestanteMontaje(montajeData, montajeActivo) {
    const tiempoTotal = Math.round((parseFloat(montajeData.tiempoHoras) || 0) * 3600);
    const consumido = calcularConsumoMontaje(montajeActivo);
    return Math.max(0, tiempoTotal - consumido);
}

function montajeEstaActivo(montajeActivo) {
    return montajeActivo && montajeActivo.operariosActivos && montajeActivo.operariosActivos.length > 0;
}

function obtenerMiMontajeActivo() {
    const operacionId = window.APP.operacionActiva;
    if (!operacionId) return null;

    const cronoOp = window.APP.cronosOperacion?.[operacionId];
    if (!cronoOp || !cronoOp.montajesActivos) return null;

    const miNombre = window.APP.operario?.nombre;
    if (!miNombre) return null;

    for (const [mid, mActivo] of Object.entries(cronoOp.montajesActivos)) {
        if (mActivo.operariosActivos && mActivo.operariosActivos.includes(miNombre)) {
            return { montajeId: mid, montajeActivo: mActivo };
        }
    }
    return null;
}

function iniciarTickCronos(operacionId) {
    if (window.APP.cronoTick) clearInterval(window.APP.cronoTick);

    window.APP.cronoTick = setInterval(async () => {
        const data = await cargarFirebase('cronos_operacion');
        const cronoOp = data[operacionId];
        if (!cronoOp) return;

        window.APP.cronosOperacion[operacionId] = cronoOp;

        const montajes = await cargarFirebase('montajes');

        for (const [mid, mActivo] of Object.entries(cronoOp.montajesActivos || {})) {
            if (!mActivo.operariosActivos || mActivo.operariosActivos.length === 0) continue;
            if (!montajes[mid]) continue;

            const tiempoTotal = Math.round((parseFloat(montajes[mid].tiempoHoras) || 0) * 3600);
            const consumido = calcularConsumoMontaje(mActivo);
            const restante = tiempoTotal - consumido;
            const porcentaje = tiempoTotal > 0 ? (consumido / tiempoTotal) * 100 : 0;
            const porcentajeBarra = Math.min(100, porcentaje);

            let barColor = '#10b981';
            let bgLight = '#ecfdf5';
            if (porcentaje >= 90) { barColor = '#ef4444'; bgLight = '#fef2f2'; }
            else if (porcentaje >= 50) { barColor = '#f59e0b'; bgLight = '#fffbeb'; }

            const estaExcedido = porcentaje >= 100;

            const el = document.getElementById('crono_display_' + mid);
            if (el) {
                if (restante < 0) {
                    el.textContent = '-' + segundosAHorasDecimales(-restante);
                } else {
                    el.textContent = segundosAHorasDecimales(restante);
                }
                el.style.color = barColor;

                if (estaExcedido) el.classList.add('crono-parpadea');
                else el.classList.remove('crono-parpadea');
            }

            const tarjeta = document.getElementById('card_' + mid);
            if (tarjeta) {
                const barra = tarjeta.querySelector('[data-progreso="' + mid + '"]');
                if (barra) {
                    barra.style.width = porcentajeBarra + '%';
                    barra.style.background = barColor;
                }

                const cronoBox = tarjeta.querySelector('[data-crono-box="' + mid + '"]');
                if (cronoBox) {
                    cronoBox.style.background = bgLight;
                    cronoBox.style.borderColor = barColor + '44';
                    if (estaExcedido) cronoBox.classList.add('crono-parpadea');
                    else cronoBox.classList.remove('crono-parpadea');
                }

                const dot = tarjeta.querySelector('[data-crono-dot="' + mid + '"]');
                if (dot) dot.style.background = barColor;

                const titulo = tarjeta.querySelector('[data-crono-titulo="' + mid + '"]');
                if (titulo) titulo.style.color = barColor;

                const chips = tarjeta.querySelectorAll('[data-crono-chip="' + mid + '"]');
                chips.forEach(chip => {
                    chip.style.color = barColor;
                    chip.style.borderColor = barColor + '44';
                });

                tarjeta.style.borderLeftColor = barColor;
            }
        }

        actualizarBadgeCrono();

        if (!montajesActivosEnOperacion(operacionId)) {
            clearInterval(window.APP.cronoTick);
            window.APP.cronoTick = null;
        }
    }, 1000);
}

async function pausarMontaje(montajeId) {
    const operacionId = window.APP.operacionActiva;
    if (!operacionId) return;

    try {
        await detenerCronoMontaje(operacionId, montajeId);

        const modelo = window.APP.modeloActivo || 'MS3';
        cargarMontajesOperacion(operacionId, modelo);
        setTimeout(() => actualizarBadgeCrono(), 300);

        toast('⏸️ Montaje pausado', '#f59e0b');
    } catch (e) {
        console.error('❌ Error pausando montaje:', e);
        toast('❌ Error al pausar: ' + e.message, '#ef4444');
    }
}

async function reanudarMontaje(montajeId) {
    const operacionId = window.APP.operacionActiva;
    if (!operacionId) return;

    try {
        await arrancarCronoMontaje(operacionId, montajeId);

        const modelo = window.APP.modeloActivo || 'MS3';
        cargarMontajesOperacion(operacionId, modelo);
        setTimeout(() => actualizarBadgeCrono(), 300);

        toast('▶️ Montaje reanudado', '#10b981');
    } catch (e) {
        console.error('❌ Error reanudando:', e);
        toast('❌ Error al reanudar: ' + e.message, '#ef4444');
    }
}

function mostrarModalCambioMontaje(montajeNombreActual, accion = 'cambiar', puedeTerminar = true, motivoBloqueo = '') {
    return new Promise(resolve => {
        const esSalir = accion === 'salir';

        const modal = document.createElement('div');
        modal.id = 'modalCambioMontaje';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';

        modal.innerHTML = `
            <div style="background:white;border-radius:18px;padding:24px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
                <div style="text-align:center;margin-bottom:16px;">
                    <div style="font-size:2.5rem;">⏱️</div>
                    <h3 style="color:#1e293b;margin:6px 0 4px 0;font-size:1.1rem;">Montaje en curso</h3>
                    <p style="font-size:0.88rem;color:#64748b;margin:0;"><strong>${montajeNombreActual || 'Sin nombre'}</strong></p>
                    <p style="font-size:0.8rem;color:#94a3b8;margin-top:8px;">${esSalir ? '¿Qué quieres hacer antes de cerrar sesión?' : '¿Qué quieres hacer antes de cambiar de montaje?'}</p>
                </div>

                ${!puedeTerminar && motivoBloqueo ? `
                    <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #ef4444;border-radius:10px;padding:12px 14px;margin-bottom:14px;">
                        <div style="font-size:0.72rem;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">⚠️ No se puede terminar todavía</div>
                        <div style="font-size:0.82rem;color:#7f1d1d;line-height:1.5;white-space:pre-wrap;">${motivoBloqueo}</div>
                    </div>
                ` : ''}

                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${puedeTerminar ? `
                        <button id="_mc_terminar" style="padding:14px;border:none;border-radius:10px;background:#10b981;color:white;font-weight:700;cursor:pointer;font-size:0.88rem;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;">✅ Terminar montaje ${esSalir ? 'y salir' : 'y cambiar'}</button>
                    ` : ''}
                    <button id="_mc_pausar" style="padding:14px;border:none;border-radius:10px;background:#f59e0b;color:white;font-weight:700;cursor:pointer;font-size:0.88rem;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;">⏸️ Pausar montaje ${esSalir ? 'y salir' : 'y cambiar'}</button>
                    <button id="_mc_cancelar" style="padding:10px;border:1px solid #e5e7eb;border-radius:10px;background:white;cursor:pointer;font-size:0.8rem;color:#64748b;font-family:inherit;">❌ Cancelar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        if (puedeTerminar) {
            document.getElementById('_mc_terminar').onclick = () => { modal.remove(); resolve('terminar'); };
        }
        document.getElementById('_mc_pausar').onclick = () => { modal.remove(); resolve('pausar'); };
        document.getElementById('_mc_cancelar').onclick = () => { modal.remove(); resolve('cancelar'); };

        modal.addEventListener('click', (e) => {
            if (e.target === modal) { modal.remove(); resolve('cancelar'); }
        });
    });
}

function mostrarModalMontajeOcupado(nombreMontaje, operarios) {
    return new Promise(resolve => {
        const modal = document.createElement('div');
        modal.id = 'modalMontajeOcupado';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';

        const chipsOperarios = operarios.map(op => `
            <span style="background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;padding:6px 14px;border-radius:99px;font-size:0.85rem;font-weight:700;display:inline-flex;align-items:center;gap:6px;">👤 ${op}</span>
        `).join('');

        modal.innerHTML = `
            <div style="background:white;border-radius:20px;padding:28px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
                <div style="text-align:center;margin-bottom:20px;">
                    <div style="font-size:3rem;margin-bottom:8px;">⚠️</div>
                    <h3 style="color:#1e293b;margin:0 0 8px 0;font-size:1.2rem;font-weight:700;">Montaje ocupado</h3>
                    <p style="font-size:0.9rem;color:#64748b;margin:0;line-height:1.5;">El montaje <strong style="color:#1e293b;">"${nombreMontaje}"</strong><br>ya está siendo trabajado por:</p>
                </div>

                <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:20px;padding:14px;background:#f8fafc;border-radius:12px;border:1px dashed #cbd5e1;">
                    ${chipsOperarios}
                </div>

                <p style="font-size:0.78rem;color:#94a3b8;text-align:center;margin:0 0 16px 0;">Si te unes, ambos trabajaréis en el mismo montaje y el tiempo correrá 2× más rápido.</p>

                <div style="display:flex;flex-direction:column;gap:8px;">
                    <button id="_mo_unirme" style="padding:14px;border:none;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);color:white;font-weight:700;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;">👥 Unirme al montaje</button>
                    <button id="_mo_esperar" style="padding:12px;border:1px solid #e5e7eb;border-radius:10px;background:white;color:#64748b;font-weight:600;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;">⏱️ Esperar (no hacer nada)</button>
                    <button id="_mo_cancelar" style="padding:10px;border:none;border-radius:10px;background:transparent;color:#94a3b8;cursor:pointer;font-size:0.8rem;font-family:inherit;">❌ Cancelar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('_mo_unirme').onclick = () => { modal.remove(); resolve('unirme'); };
        document.getElementById('_mo_esperar').onclick = () => { modal.remove(); resolve('esperar'); };
        document.getElementById('_mo_cancelar').onclick = () => { modal.remove(); resolve('cancelar'); };

        modal.addEventListener('click', (e) => {
            if (e.target === modal) { modal.remove(); resolve('cancelar'); }
        });
    });
}
