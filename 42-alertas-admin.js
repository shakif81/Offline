async function marcarFaltaResuelta(operacionId, estacionId, montajeId, matId) {
    const ok = await confirmar(
        '¿Marcar esta falta como resuelta?\n\nEl material volverá a estado pendiente para que puedas entregarlo de nuevo.',
        { titulo: '✅ Resolver falta', tipo: 'success', okTexto: '✅ Sí, resolver' }
    );
    if (!ok) return;

    const clave = operacionId + '_' + estacionId;
    const claveItem = montajeId + '__' + matId;

    try {
        const data = await cargarFirebase('materiales_verificados', true);
        const doc = data[clave];
        if (!doc || !doc.materiales?.[claveItem]) return;

        doc.materiales[claveItem].estado = 'pendiente';
        doc.materiales[claveItem].cantidadFaltante = 0;
        doc.materiales[claveItem].comentario = '';
        doc.materiales[claveItem].reportadoPor = '';
        doc.materiales[claveItem].fechaReporte = null;
        doc.materiales[claveItem].respuestaAdmin = 'Falta resuelta. Pendiente de entrega.';
        doc.materiales[claveItem].fechaRespuestaAdmin = new Date().toISOString();
        doc.ultimaActualizacion = new Date().toISOString();

        await guardarFirebase('materiales_verificados', clave, doc);

        toast('✅ Falta resuelta', '#10b981');
        cargarEntregaMateriales();
    } catch (e) {
        console.error('❌ Error resolviendo falta:', e);
        toast('❌ Error al resolver', '#ef4444');
    }
}

async function responderFalta(operacionId, estacionId, montajeId, matId) {
    const respuesta = await preguntar(
        'Responde al operario sobre esta falta:',
        'Ej: Pedido al almacén, llega mañana'
    );
    if (!respuesta) return;

    const clave = operacionId + '_' + estacionId;
    const claveItem = montajeId + '__' + matId;

    try {
        const data = await cargarFirebase('materiales_verificados', true);
        const doc = data[clave];
        if (!doc || !doc.materiales?.[claveItem]) return;

        doc.materiales[claveItem].respuestaAdmin = respuesta;
        doc.materiales[claveItem].fechaRespuestaAdmin = new Date().toISOString();
        doc.ultimaActualizacion = new Date().toISOString();

        await guardarFirebase('materiales_verificados', clave, doc);

        toast('💬 Respuesta enviada', '#10b981');
        cargarEntregaMateriales();
    } catch (e) {
        console.error('❌ Error respondiendo:', e);
        toast('❌ Error al responder', '#ef4444');
    }
}

function irAlMaterialFaltanteDesdeAlerta(operacionId, estacionId, montajeId, matId) {
    cerrarBannerAlertasAdmin();

    if (typeof switchAdminTab === 'function') {
        switchAdminTab('entregarMateriales');
    }

    if (operacionId && estacionId) {
        setTimeout(async () => {
            await irAlMaterialFaltante(operacionId, estacionId, montajeId, matId);
        }, 500);
    }
}

async function comprobarAlertasAdmin() {
    const rol = (window.APP.operario?.puesto || '').toLowerCase();
    if (!rol.includes('admin') && !rol.includes('supervisor')) return;

    try {
        const alertas = await cargarFirebase('alertas_admin', true);

        const pendientes = Object.entries(alertas).filter(([id, a]) => !a.leida);

        if (!pendientes.length) {
            document.getElementById('bannerAlertaAdmin')?.remove();
            actualizarBadgeSolicitudes(0);
            return;
        }

        actualizarBadgeSolicitudes(pendientes.length);

        mostrarBannerAlertasAdmin(pendientes);

    } catch (e) {
        console.error('❌ Error comprobando alertas:', e);
    }
}

function mostrarBannerAlertasAdmin(alertasPendientes) {
    document.getElementById('bannerAlertaAdmin')?.remove();

    const n = alertasPendientes.length;
    const primeras = alertasPendientes.slice(0, 3);

    const primeraAlerta = alertasPendientes[0]?.[1];
    if (primeraAlerta) {
        window.APP._alertaOperacionId = primeraAlerta.operacionId || null;
        window.APP._alertaEstacionId = primeraAlerta.estacionId || null;
        window.APP._alertaMontajeId = primeraAlerta.montajeId || null;
        window.APP._alertaMatId = primeraAlerta.materialId || null;
    }

    const banner = document.createElement('div');
    banner.id = 'bannerAlertaAdmin';
    banner.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        background: white;
        border-radius: 16px;
        max-width: 420px;
        width: calc(100% - 40px);
        box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 4px rgba(239,68,68,0.2);
        z-index: 2147483647;
        overflow: hidden;
        animation: slideDownBanner 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        transition: transform 0.3s ease, opacity 0.3s ease;
    `;

    banner.innerHTML = `
        <style>
            @keyframes slideDownBanner {
                to { transform: translateX(-50%) translateY(0); }
            }
            @keyframes pulseBanner {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            /* ═══════════════════════════════════════════════════════════
   CHAT - Animaciones
   ═══════════════════════════════════════════════════════════ */
@keyframes slideUpPanel {
    from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes slideInMensaje {
    to { transform: translateX(-50%) translateY(0); }
}

@keyframes shrinkMensaje {
    from { width: 100%; }
    to { width: 0%; }
}

/* Botón flotante con su badge */
.chat-fab {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--secondary);
    color: white;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(45,116,218,0.4);
    z-index: 9000;
    display: none;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}
.chat-fab:hover { transform: scale(1.1); }
.chat-fab i { font-size: 1.5rem; line-height: 1; }

.chat-fab .chat-fab-badge {
    position: absolute;
    top: -4px;
    right: -4px;
}

/* Panel en móvil (pantalla completa) */
@media (max-width: 480px) {
    #panelChatFlotante {
        bottom: 0 !important;
        right: 0 !important;
        width: 100vw !important;
        max-width: 100vw !important;
        height: 100vh !important;
        max-height: 100vh !important;
        border-radius: 0 !important;
    }
}

        </style>

        <!-- CABECERA -->
        <div style="
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            padding: 14px 18px;
            display: flex;
            align-items: center;
            gap: 10px;
        ">
            <span style="font-size: 1.5rem;">🚨</span>
            <div style="flex:1;">
                <div style="font-weight: 800; font-size: 0.95rem; letter-spacing: 0.02em;">
                    FALTA DE MATERIAL
                </div>
                <div style="font-size: 0.75rem; opacity: 0.9;">
                    ${n} alerta${n !== 1 ? 's' : ''} sin revisar
                </div>
            </div>
        </div>

        <!-- LISTA -->
        <div style="padding: 14px 18px; max-height: 300px; overflow-y: auto;">
            ${primeras.map(([id, a]) => `
    <div
        onclick="irAlMaterialFaltanteDesdeAlerta('${a.operacionId || ''}', '${a.estacionId || ''}', '${a.montajeId || ''}', '${a.materialId || ''}')"
        style="
            background: #fef2f2;
            border-radius: 10px;
            padding: 12px;
            margin-bottom: 8px;
            border-left: 4px solid #ef4444;
            cursor: pointer;
            transition: all 0.15s ease;
        "
        onmouseover="this.style.background='#fee2e2'"
        onmouseout="this.style.background='#fef2f2'"
    >
        <div style="
            font-weight: 700;
            font-size: 0.88rem;
            color: #991b1b;
            margin-bottom: 4px;
        ">
            ⚠️ ${a.materialNombre || 'Material'}
            ${a.materialCodigo ? `<span style="font-family:'SF Mono',Monaco,monospace;font-size:0.72rem;font-weight:400;color:#7f1d1d;">(${a.materialCodigo})</span>` : ''}
        </div>
        <div style="font-size: 0.75rem; color: #64748b; line-height: 1.5;">
            <div><strong>Falta:</strong> ${a.cantidadFaltante || '?'} uds</div>
            <div>📍 ${a.montajeNombre || '—'} · Op. ${a.numeroOperacion || '—'}</div>
            <div>👤 ${a.reportadoPor || '—'}</div>
            ${a.comentario ? `<div style="margin-top:4px;padding:6px 8px;background:white;border-radius:6px;color:#b91c1c;font-style:italic;">"${a.comentario}"</div>` : ''}
        </div>
        <div style="text-align:right;font-size:0.7rem;color:#b91c1c;font-weight:700;margin-top:6px;">
            🎯 Ver material →
        </div>
    </div>
`).join('')}
            ${n > 3 ? `
                <div style="text-align:center;font-size:0.75rem;color:#94a3b8;padding:6px;">
                    ... y ${n - 3} más
                </div>
            ` : ''}
        </div>

        <!-- BOTONES -->
        <div style="padding: 0 18px 14px; display: flex; gap: 8px;">
            <button
                onclick="irAEntregarMaterialesDesdeAlerta()"
                style="
                    flex: 1;
                    padding: 12px;
                    border: none;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                    font-weight: 700;
                    cursor: pointer;
                    font-size: 0.85rem;
                    font-family: inherit;
                "
            >
                🔍 Ir a Entregar Materiales
            </button>
            <button
                onclick="cerrarBannerAlertasAdmin()"
                style="
                    padding: 12px 16px;
                    border: 1px solid #e5e7eb;
                    border-radius: 10px;
                    background: white;
                    color: #64748b;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-family: inherit;
                "
            >
                ✕
            </button>
        </div>

        <!-- BARRA ANIMADA -->
        <div style="height: 4px; background: #fee2e2; overflow: hidden;">
            <div style="
                height: 100%;
                background: linear-gradient(90deg, #ef4444, #dc2626, #ef4444);
                animation: pulseBanner 1.5s ease-in-out infinite;
                background-size: 200% 100%;
            "></div>
        </div>
    `;

    document.body.appendChild(banner);

    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            const audioCtx = new AudioCtx();
            [0, 0.15, 0.3].forEach(delay => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.frequency.value = 800;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.12, audioCtx.currentTime + delay);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.12);
                osc.start(audioCtx.currentTime + delay);
                osc.stop(audioCtx.currentTime + delay + 0.12);
            });
        }
    } catch (e) {
    }
}

function cerrarBannerAlertasAdmin() {
    const banner = document.getElementById('bannerAlertaAdmin');
    if (banner) {
        banner.style.transform = 'translateX(-50%) translateY(-100px)';
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 300);
    }
}

function irAEntregarMaterialesDesdeAlerta() {
    const alertas = document.querySelectorAll('[data-alerta-id]');
    const operacionId = window.APP._alertaOperacionId;
    const estacionId = window.APP._alertaEstacionId;
    const montajeId = window.APP._alertaMontajeId;
    const matId = window.APP._alertaMatId;

    cerrarBannerAlertasAdmin();

    if (typeof switchAdminTab === 'function') {
        switchAdminTab('entregarMateriales');
    }

    if (operacionId && estacionId) {
        setTimeout(async () => {
            await irAlMaterialFaltante(operacionId, estacionId, montajeId, matId);
        }, 500);
    }
}

async function irAlMaterialFaltante(operacionId, estacionId, montajeId, matId) {
    try {
        const selOp = document.getElementById('entregaOperacionSelect');
        if (selOp) {
            selOp.value = operacionId;
            if (typeof onCambioOperacionEntrega === 'function') {
                await onCambioOperacionEntrega();
            }
        }

        await new Promise(r => setTimeout(r, 300));

        const selEst = document.getElementById('entregaEstacionSelect');
        if (selEst) {
            selEst.value = estacionId;
            if (typeof cargarEntregaMateriales === 'function') {
                await cargarEntregaMateriales();
            }
        }

        await new Promise(r => setTimeout(r, 500));

        const claveItem = montajeId + '__' + matId;
        const selector = `[data-clave-item="${claveItem.replace(/"/g, '\\"')}"]`;
        const elemento = document.querySelector(selector);

        if (elemento) {
            elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });

            elemento.style.transition = 'all 0.3s ease';
            elemento.style.boxShadow = '0 0 0 4px rgba(239,68,68,0.5)';
            elemento.style.transform = 'scale(1.02)';

            let pulsos = 0;
            const pulsoInterval = setInterval(() => {
                elemento.style.boxShadow = pulsos % 2 === 0
                    ? '0 0 0 4px rgba(239,68,68,0.5)'
                    : '0 0 0 8px rgba(239,68,68,0.15)';
                pulsos++;
                if (pulsos >= 6) {
                    clearInterval(pulsoInterval);
                    setTimeout(() => {
                        elemento.style.boxShadow = '';
                        elemento.style.transform = '';
                    }, 300);
                }
            }, 500);

            toast('🎯 Material faltante encontrado', '#ef4444', 2000);
        } else {
            toast('⚠️ No se encontró el material (revisa manualmente)', '#f59e0b');
        }
    } catch (e) {
        console.error('❌ Error navegando al material:', e);
    }
}

function actualizarBadgeSolicitudes(n) {
    const badge = document.getElementById('badgeSolicitudes');
    if (!badge) return;
    if (n > 0) {
        badge.textContent = n;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

async function marcarAlertasComoLeidas() {
    try {
        const alertas = await cargarFirebase('alertas_admin', true);
        const pendientes = Object.entries(alertas).filter(([id, a]) => !a.leida);

        if (!pendientes.length) return;

        for (const [id, a] of pendientes) {
            await guardarFirebase('alertas_admin', id, {
                leida: true,
                fechaLeida: new Date().toISOString(),
                leidaPor: window.APP.operario?.nombre || 'Admin'
            });
        }

        actualizarBadgeSolicitudes(0);
        cerrarBannerAlertasAdmin();

        console.log(`✅ ${pendientes.length} alertas marcadas como leídas`);
    } catch (e) {
        console.error('❌ Error marcando alertas:', e);
    }
}
