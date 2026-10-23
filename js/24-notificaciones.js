window.APP._alertasQCMostradas = new Set();

async function cargarNotificaciones() {
    const cont = document.getElementById('notificacionesContainer');
    if (!cont) return;

    cont.innerHTML = '<div class="empty-state">⏳ Cargando...</div>';

    const miNombre = window.APP.operario?.nombre;
    if (!miNombre) {
        cont.innerHTML = '<div class="empty-state">⚠️ Sin sesión activa</div>';
        return;
    }

    const [historial, operaciones, estaciones] = await Promise.all([
        cargarFirebase('historial_montajes', true),
        cargarFirebase('operaciones'),
        cargarFirebase('estaciones')
    ]);

    const misMontajes = Object.entries(historial)
        .filter(([id, h]) => 
            h.operario === miNombre && 
            (h.qcEstado === 'aprobado' || h.qcEstado === 'rechazado')
        )
        .sort((a, b) => {
            const fechaA = a[1].qcFecha || a[1].fechaRechazo || a[1].fecha;
            const fechaB = b[1].qcFecha || b[1].fechaRechazo || b[1].fecha;
            return new Date(fechaB) - new Date(fechaA);
        });

    if (!misMontajes.length) {
        cont.innerHTML = `
            <div class="empty-state">
                <div style="font-size:2.5rem;margin-bottom:12px;">🔔</div>
                <div style="font-weight:600;color:#1e293b;margin-bottom:4px;">Sin notificaciones</div>
                <div style="font-size:0.85rem;color:#94a3b8;">
                    Aquí aparecerán los resultados de calidad de tus montajes
                </div>
            </div>
        `;
        return;
    }

    const rechazados = misMontajes.filter(([id, h]) => h.qcEstado === 'rechazado');

    let html = '';

    if (rechazados.length > 0) {
        html += `
            <div style="
                background:linear-gradient(135deg,#fef2f2,#fee2e2);
                border:2px solid #fecaca;
                border-left:5px solid #ef4444;
                border-radius:14px;
                padding:14px 18px;
                margin-bottom:1rem;
            ">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:1.8rem;">❌</span>
                    <div>
                        <div style="font-weight:800;color:#b91c1c;font-size:1rem;">
                            Tienes ${rechazados.length} montaje${rechazados.length > 1 ? 's' : ''} rechazado${rechazados.length > 1 ? 's' : ''}
                        </div>
                        <div style="font-size:0.78rem;color:#991b1b;margin-top:2px;">
                            Corrige los problemas para que se aprueben
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    html += '<div style="display:flex;flex-direction:column;gap:10px;">';

    misMontajes.forEach(([id, h]) => {
        const esAprobado = h.qcEstado === 'aprobado';
        const esRechazado = h.qcEstado === 'rechazado';

        const op = operaciones[h.operacionId];
        const est = estaciones[h.estacionId];

        const colorBorde = esAprobado ? '#10b981' : '#ef4444';
        const colorFondo = esAprobado ? '#f0fdf4' : '#fef2f2';
        const colorTexto = esAprobado ? '#047857' : '#b91c1c';
        const icono = esAprobado ? '✅' : '❌';
        const estadoTexto = esAprobado ? 'Aprobado' : 'Rechazado';

        const fecha = h.qcFecha || h.fechaRechazo || h.fecha;
        const fechaTexto = fecha 
            ? new Date(fecha).toLocaleString('es-ES', { 
                day: '2-digit', month: '2-digit', year: '2-digit',
                hour: '2-digit', minute: '2-digit'
            })
            : '';

        html += `
            <div style="
                background:${colorFondo};
                border:1px solid ${colorBorde}44;
                border-left:4px solid ${colorBorde};
                border-radius:12px;
                padding:14px 16px;
            ">
                <!-- CABECERA -->
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
                    <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                        <span style="font-size:1.4rem;">${icono}</span>
                        <div style="min-width:0;">
                            <div style="font-weight:700;font-size:0.92rem;color:#1e293b;">
                                ${h.montajeNombre || 'Sin nombre'}
                            </div>
                            <div style="font-size:0.72rem;color:#64748b;margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                                <span>📍 ${est?.nombre || '—'}</span>
                                <span style="color:#cbd5e1;">·</span>
                                <span>Op. ${op?.numero || '—'}</span>
                            </div>
                        </div>
                    </div>
                    <span style="
                        background:${colorBorde}18;
                        color:${colorTexto};
                        padding:4px 12px;
                        border-radius:99px;
                        font-size:0.72rem;
                        font-weight:700;
                        white-space:nowrap;
                        flex-shrink:0;
                    ">${icono} ${estadoTexto}</span>
                </div>

                <!-- FECHA -->
                <div style="font-size:0.7rem;color:#94a3b8;font-weight:600;margin-bottom:8px;">
                    📅 ${fechaTexto}
                </div>

         <!-- MOTIVO (si rechazado) -->
${esRechazado && h.qcComentario ? `
    <div style="background:white;border-radius:8px;padding:10px 12px;border-left:3px solid #ef4444;margin-bottom:10px;">
        <div style="font-size:0.72rem;color:#b91c1c;font-weight:700;margin-bottom:4px;">
            📝 Motivo del rechazo:
        </div>
        <div style="font-size:0.82rem;color:#1e293b;line-height:1.4;margin-bottom:${h.qcFotos && h.qcFotos.length ? '10px' : '0'};">
            ${h.qcComentario}
        </div>

        ${h.qcFotos && h.qcFotos.length ? `
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                ${h.qcFotos.map(url => `
                    <img src="${url}" 
                        onclick="verFotoGrande('${url}')"
                        style="
                            width:70px;height:70px;
                            object-fit:cover;
                            border-radius:6px;
                            cursor:pointer;
                            border:1px solid #e5e7eb;
                        ">
                `).join('')}
            </div>
        ` : ''}
    </div>
` : ''}

                <!-- REVISOR -->
                ${h.qcRevisor ? `
                    <div style="font-size:0.72rem;color:#64748b;font-weight:600;margin-bottom:8px;">
                        👤 Revisado por ${h.qcRevisor}
                        ${h.qcReenvios > 0 ? ` · 🔄 Reenviado ${h.qcReenvios}×` : ''}
                    </div>
                ` : ''}

        <!-- BOTÓN CORREGIDO -->
${esRechazado ? `
    <button onclick="marcarComoCorregido('${h.montajeId}', '${h.operacionId}')" style="
        width:100%;
        padding:12px;
        border:none;
        border-radius:8px;
        background:linear-gradient(135deg,#10b981,#059669);
        color:white;
        font-weight:700;
        font-size:0.85rem;
        cursor:pointer;
        font-family:inherit;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:6px;
        box-shadow:0 4px 12px rgba(16,185,129,0.25);
    ">✅ Ya está corregido</button>
` : ''}
            </div>
        `;
    });

        html += '</div>';
    cont.innerHTML = html;

    setTimeout(async () => {
        try {
            const historialActualizado = await cargarFirebase('historial_montajes', true);

            for (const [id, h] of Object.entries(historialActualizado)) {
                if (h.operario === miNombre && 
                    h.qcEstado === 'rechazado' && 
                    !h.notificacionVista) {
                    await guardarFirebase('historial_montajes', id, {
                        notificacionVista: true
                    });
                }
            }

            actualizarBadgeNotificaciones();
        } catch (e) {
            console.error('❌ Error marcando notificaciones como vistas:', e);
        }
    }, 500);
}

function mostrarAlertaQC(datos) {
    document.getElementById('alertaQC')?.remove();

    const esRechazo = datos.tipo === 'rechazado';

    const alerta = document.createElement('div');
    alerta.id = 'alertaQC';
    alerta.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        border-radius: 16px;
        max-width: 420px;
        width: calc(100% - 40px);
        max-height: calc(100vh - 100px);
        box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 4px ${esRechazo ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'};
        z-index: 2147483647;
        overflow: hidden;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
    `;

    const colorCabecera = esRechazo
        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
        : 'linear-gradient(135deg, #10b981, #059669)';

    const icono = esRechazo ? '❌' : '✅';
    const titulo = esRechazo ? 'Montaje RECHAZADO' : 'Montaje APROBADO';
    const subtitulo = esRechazo
        ? 'Corrige el problema y marca como corregido'
        : 'Tu montaje ha pasado la revisión';

    alerta.innerHTML = `
        <div style="
            background: ${colorCabecera};
            color: white;
            padding: 14px 18px;
            display: flex;
            align-items: center;
            gap: 12px;
        ">
            <div style="font-size: 2rem;">${icono}</div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight: 800; font-size: 1rem;">
                    ${titulo}
                </div>
                <div style="font-size: 0.75rem; opacity: 0.9; margin-top: 2px;">
                    ${subtitulo}
                </div>
            </div>
        </div>

  <div style="padding: 14px 18px; background: white; overflow-y: auto; max-height: 50vh;">
    <div style="
        font-weight: 700;
        font-size: 0.9rem;
        color: #1e293b;
        margin-bottom: 10px;
    ">
        📦 ${datos.montajeNombre || 'Sin nombre'}
    </div>

    ${datos.numeroOperacion ? `
        <div style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #eef2ff;
            color: #4338ca;
            padding: 4px 10px;
            border-radius: 99px;
            font-size: 0.72rem;
            font-weight: 700;
            margin-bottom: 10px;
        ">
            🔢 Op. ${datos.numeroOperacion}
            ${datos.estacionNombre ? ` · 📍 ${datos.estacionNombre}` : ''}
        </div>
    ` : ''}

            ${esRechazo && datos.motivo ? `
                <div style="
                    background: #fef2f2;
                    border-left: 3px solid #ef4444;
                    border-radius: 8px;
                    padding: 10px 12px;
                    margin-bottom: 10px;
                ">
                    <div style="font-size: 0.7rem; color: #b91c1c; font-weight: 700; margin-bottom: 4px;">
                        📝 Motivo:
                    </div>
                    <div style="font-size: 0.85rem; color: #1e293b; line-height: 1.4;">
                        ${datos.motivo}
                    </div>
                </div>
            ` : ''}

            ${esRechazo && datos.fotos && datos.fotos.length ? `
                <div style="
                    font-size: 0.7rem;
                    color: #64748b;
                    font-weight: 700;
                    margin-bottom: 6px;
                ">📷 Fotos del problema:</div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    ${datos.fotos.map(url => `
                        <img src="${url}"
                            onclick="event.stopPropagation(); verFotoGrande('${url}')"
                            style="
                                width: 70px;
                                height: 70px;
                                object-fit: cover;
                                border-radius: 6px;
                                cursor: pointer;
                                border: 1px solid #e5e7eb;
                            ">
                    `).join('')}
                </div>
            ` : ''}

            ${datos.revisor ? `
                <div style="
                    font-size: 0.72rem;
                    color: #64748b;
                    margin-top: 10px;
                    font-weight: 600;
                ">👤 Revisado por ${datos.revisor}</div>
            ` : ''}
        </div>

   <div style="display: flex; gap: 8px; padding: 0 14px 14px; background: white;">
    <button onclick="event.stopPropagation(); cerrarAlertaQC();"
        style="
            flex: 1;
            padding: 10px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: white;
            color: #64748b;
            font-weight: 600;
            cursor: pointer;
            font-size: 0.8rem;
            font-family: inherit;
        ">
        Cerrar
    </button>
<button onclick="event.stopPropagation(); cerrarAlertaQC(); setTimeout(abrirNotificaciones, 150);"
    style="
        flex: 2;
        padding: 10px;
        border: none;
        border-radius: 8px;
        background: ${esRechazo ? '#ef4444' : '#10b981'};
        color: white;
        font-weight: 700;
        cursor: pointer;
        font-size: 0.85rem;
        font-family: inherit;
    ">
    📋 Ver notificación
</button>
</div>
    `;

    document.body.appendChild(alerta);

    requestAnimationFrame(() => {
        alerta.style.opacity = '1';
    });

    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            const audioCtx = new AudioCtx();
            const frecuencias = esRechazo ? [500, 400, 500] : [600, 800, 1000];
            frecuencias.forEach((freq, i) => {
                setTimeout(() => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.15);
                }, i * 150);
            });
        }
    } catch (e) {}

alerta.addEventListener('click', () => {
    cerrarAlertaQC();
    setTimeout(abrirNotificaciones, 150);
});

    alerta._timeout = setTimeout(() => {
        cerrarAlertaQC();
    }, 30000);

    window.APP._cerrarAlertaQC = cerrarAlertaQC;
}

function cerrarAlertaQC() {
    const alerta = document.getElementById('alertaQC');
    if (!alerta) return;

    if (alerta._timeout) {
        clearTimeout(alerta._timeout);
    }

    alerta.style.opacity = '0';
    alerta.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => alerta.remove(), 300);

    window.APP._cerrarAlertaQC = null;
}

function irAlMontajeDesdeAlertaQC(montajeId, operacionId) {
    cerrarAlertaQC();

    if (window.APP.operacionActiva !== operacionId) {
        showPage('operaciones');
        setTimeout(() => {
            seleccionarOperacion(operacionId);
            setTimeout(() => {
                const tarjeta = document.getElementById('card_' + montajeId);
                if (tarjeta) {
                    tarjeta.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    tarjeta.style.transition = 'all 0.3s ease';
                    tarjeta.style.boxShadow = '0 0 30px rgba(239,68,68,0.8)';
                    tarjeta.style.borderColor = '#ef4444';
                    setTimeout(() => {
                        tarjeta.style.boxShadow = '';
                        tarjeta.style.borderColor = '';
                    }, 3000);
                }
            }, 900);
        }, 300);
    } else {
        showPage('montajes-operacion');
        setTimeout(() => {
            const tarjeta = document.getElementById('card_' + montajeId);
            if (tarjeta) {
                tarjeta.scrollIntoView({ behavior: 'smooth', block: 'center' });
                tarjeta.style.transition = 'all 0.3s ease';
                tarjeta.style.boxShadow = '0 0 30px rgba(239,68,68,0.8)';
                tarjeta.style.borderColor = '#ef4444';
                setTimeout(() => {
                    tarjeta.style.boxShadow = '';
                    tarjeta.style.borderColor = '';
                }, 3000);
            }
        }, 500);
    }
}

function abrirNotificaciones() {
    showPage('notificaciones');
}

async function contarNotificacionesOperario() {
    const miNombre = window.APP.operario?.nombre;
    if (!miNombre) return 0;

    const historial = await cargarFirebase('historial_montajes');

    return Object.values(historial).filter(h => 
        h.operario === miNombre && 
        h.qcEstado === 'rechazado' &&
        !h.notificacionVista
    ).length;
}

async function actualizarBadgeNotificaciones() {
    const badge = document.getElementById('badgeNotif');
    if (!badge) return;

    const num = await contarNotificacionesOperario();

    if (num > 0) {
        badge.textContent = num > 99 ? '99+' : num;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

function mostrarAlertaCorreccionAdmin(datos) {
    document.getElementById('alertaCorreccionAdmin')?.remove();

    const alerta = document.createElement('div');
    alerta.id = 'alertaCorreccionAdmin';
    alerta.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        border-radius: 16px;
        max-width: 420px;
        width: calc(100% - 40px);
        max-height: calc(100vh - 100px);
        box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 4px rgba(245,158,11,0.15);
        z-index: 2147483647;
        overflow: hidden;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
    `;

    alerta.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            padding: 14px 18px;
            display: flex;
            align-items: center;
            gap: 12px;
        ">
            <div style="font-size: 2rem;">🔧</div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight: 800; font-size: 1rem;">
                    MONTAJE CORREGIDO
                </div>
                <div style="font-size: 0.75rem; opacity: 0.9; margin-top: 2px;">
                    Listo para revisar de nuevo
                </div>
            </div>
        </div>

      <div style="padding: 14px 18px; background: white;">
    <div style="
        font-weight: 700;
        font-size: 0.9rem;
        color: #1e293b;
        margin-bottom: 10px;
    ">
        📦 ${datos.montajeNombre || 'Sin nombre'}
    </div>

    ${datos.numeroOperacion ? `
        <div style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #eef2ff;
            color: #4338ca;
            padding: 4px 10px;
            border-radius: 99px;
            font-size: 0.72rem;
            font-weight: 700;
            margin-bottom: 10px;
        ">
            🔢 Op. ${datos.numeroOperacion}
            ${datos.estacionNombre ? ` · 📍 ${datos.estacionNombre}` : ''}
        </div>
    ` : ''}

            <div style="
                background: #fffbeb;
                border-left: 3px solid #f59e0b;
                border-radius: 8px;
                padding: 10px 12px;
                font-size: 0.82rem;
                color: #1e293b;
                line-height: 1.5;
            ">
                <div>👤 <strong>${datos.operario}</strong> ha corregido el montaje</div>
                ${datos.qcReenvios > 0 ? `
                    <div style="font-size:0.75rem;color:#92400e;margin-top:4px;">
                        🔄 Reenviado ${datos.qcReenvios}×
                    </div>
                ` : ''}
            </div>
        </div>

        <div style="display: flex; gap: 8px; padding: 0 14px 14px; background: white;">
            <button onclick="event.stopPropagation(); cerrarAlertaCorreccionAdmin();"
                style="
                    flex: 1;
                    padding: 10px;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    background: white;
                    color: #64748b;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-family: inherit;
                ">
                Cerrar
            </button>
            <button onclick="event.stopPropagation(); cerrarAlertaCorreccionAdmin(); setTimeout(() => { switchAdminTab('tqc'); }, 150);"
                style="
                    flex: 2;
                    padding: 10px;
                    border: none;
                    border-radius: 8px;
                    background: #f59e0b;
                    color: white;
                    font-weight: 700;
                    cursor: pointer;
                    font-size: 0.85rem;
                    font-family: inherit;
                ">
                🔍 Ir a revisar
            </button>
        </div>
    `;

    document.body.appendChild(alerta);

    requestAnimationFrame(() => {
        alerta.style.opacity = '1';
    });

    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            const audioCtx = new AudioCtx();
            [600, 800].forEach((freq, i) => {
                setTimeout(() => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.15);
                }, i * 200);
            });
        }
    } catch (e) {}

    alerta.addEventListener('click', () => {
        cerrarAlertaCorreccionAdmin();
        setTimeout(() => {
            if (typeof switchAdminTab === 'function') {
                switchAdminTab('tqc');
            }
        }, 150);
    });

    alerta._timeout = setTimeout(() => {
        cerrarAlertaCorreccionAdmin();
    }, 30000);

    window.APP._cerrarAlertaCorreccionAdmin = cerrarAlertaCorreccionAdmin;
}

function cerrarAlertaCorreccionAdmin() {
    const alerta = document.getElementById('alertaCorreccionAdmin');
    if (!alerta) return;

    if (alerta._timeout) {
        clearTimeout(alerta._timeout);
    }

    alerta.style.opacity = '0';
    alerta.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => alerta.remove(), 300);

    window.APP._cerrarAlertaCorreccionAdmin = null;
}

async function marcarComoCorregido(montajeId, operacionId) {
    const miNombre = window.APP.operario?.nombre;
    if (!miNombre) {
        toast('❌ Sin sesión activa', '#ef4444');
        return;
    }

    const ok = await confirmar(
        '⚠️ Confirma que has corregido todo lo que estaba mal.\n\nEl supervisor lo revisará de nuevo.',
        {
            titulo: '✅ Ya está corregido',
            tipo: 'success',
            okTexto: '✅ Sí, corregido'
        }
    );
    if (!ok) return;

    mostrarLoading('Marcando como corregido...');

    try {
        const historial = await cargarFirebase('historial_montajes', true);

        const registro = Object.entries(historial).find(([id, h]) =>
            h.montajeId === montajeId &&
            h.operacionId === operacionId &&
            h.operario === miNombre &&
            h.qcEstado === 'rechazado'
        );

        if (!registro) {
            ocultarLoading();
            toast('❌ No se encontró el registro', '#ef4444');
            return;
        }

        const [regId, reg] = registro;

        await guardarFirebase('historial_montajes', regId, {
            qcEstado: 'pendiente',
            qcComentario: '',
            qcRevisor: '',
            qcFecha: null,
            qcFotos: [],
            qcReenvios: (reg.qcReenvios || 0) + 1,
            corregido: true,
            fechaCorreccion: new Date().toISOString(),
            corregidoPor: miNombre,
            notificacionVista: true
        });

        const claveQC = operacionId + '_' + reg.estacionId;
        const qcs = await cargarFirebase('estaciones_qc', true);
        const qc = qcs[claveQC];

        if (qc) {
            const idx = (qc.montajesQC || []).findIndex(m => m.montajeId === montajeId);

            if (idx >= 0) {
                qc.montajesQC[idx] = {
                    ...qc.montajesQC[idx],
                    estado: 'pendiente',
                    motivoRechazo: '',
                    fotosRechazo: [],
                    revisadoPor: '',
                    fechaRevision: null
                };

                const total = qc.montajesQC.length;
                const aprobados = qc.montajesQC.filter(m => m.estado === 'aprobado').length;
                const rechazados = qc.montajesQC.filter(m => m.estado === 'rechazado').length;

                let estadoGlobal = 'pendiente';
                if (rechazados === 0 && aprobados === total) {
                    estadoGlobal = 'aprobado';
                } else if (rechazados > 0) {
                    estadoGlobal = 'parcial';
                }

                qc.estado = estadoGlobal;
                qc.montajesAprobados = aprobados;
                qc.montajesRechazados = rechazados;

                await guardarFirebase('estaciones_qc', claveQC, qc);
            }
        }

        ocultarLoading();
        toast('✅ Montaje marcado como corregido · Vuelve a QC', '#10b981', 3000);

        setTimeout(() => {
            actualizarBadgeNotificaciones();
        }, 500);

        if (document.getElementById('notificaciones')?.classList.contains('active')) {
            setTimeout(() => cargarNotificaciones(), 500);
        }

    } catch (e) {
        ocultarLoading();
        console.error('❌ Error:', e);
        toast('❌ Error al procesar', '#ef4444');
    }
}
