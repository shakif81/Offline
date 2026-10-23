async function comprobarAlertasKanban() {
    const rol = (window.APP.operario?.puesto || '').toLowerCase();
    if (!rol.includes('admin') && !rol.includes('supervisor')) return;

    try {
        const alertas = await cargarFirebase('alertas_kanban', true);
        const pendientes = Object.entries(alertas).filter(([id, a]) => !a.leida);

        actualizarBadgeKanbanSidebar(pendientes.length);

        if (!pendientes.length) {
            document.getElementById('bannerAlertaKanban')?.remove();
            return;
        }

        const adminActivo = document.getElementById('admin')?.classList.contains('active');
        const panelKanban = document.getElementById('adminPanelKanban');
        const panelMov = document.getElementById('adminPanelMovimientosKanban');
        const viendoKanban = adminActivo && (
            (panelKanban && panelKanban.style.display !== 'none') ||
            (panelMov && panelMov.style.display !== 'none')
        );

        if (viendoKanban) {
            await marcarAlertasKanbanComoLeidas();
            return;
        }

        mostrarBannerAlertasKanban(pendientes);
    } catch (e) {
        console.error('❌ Error comprobando alertas kanban:', e);
    }
}

function actualizarBadgeKanbanSidebar(n) {
    const badge = document.getElementById('badgeKanbanSidebar');
    if (!badge) return;
    if (n > 0) {
        badge.textContent = n > 99 ? '99+' : n;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

function mostrarBannerAlertasKanban(alertasPendientes) {
    document.getElementById('bannerAlertaKanban')?.remove();

    const n = alertasPendientes.length;
    const esMovilPequeno = window.innerWidth < 500 || window.innerHeight < 750;
    const maxMostrar = esMovilPequeno ? 1 : 3;
    const primeras = alertasPendientes.slice(0, maxMostrar);

    const agotados = alertasPendientes.filter(([id, a]) => a.tipo === 'agotado').length;
    const criticos = n - agotados;

    const colorPrincipal = agotados > 0 ? '#ef4444' : '#f59e0b';
    const colorFondo = agotados > 0 ? '#dc2626' : '#d97706';
    const icono = agotados > 0 ? '🚫' : '⚠️';
    const titulo = agotados > 0 ? 'PIEZAS AGOTADAS' : 'STOCK CRÍTICO';
    const subtitulo = agotados > 0
        ? (agotados + ' agotada' + (agotados > 1 ? 's' : '') + (criticos > 0 ? ' · ' + criticos + ' crítica' + (criticos > 1 ? 's' : '') : ''))
        : (criticos + ' crítica' + (criticos > 1 ? 's' : ''));

    const banner = document.createElement('div');
    banner.id = 'bannerAlertaKanban';
    banner.style.position = 'fixed';
    banner.style.top = '12px';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%) translateY(-100px)';
    banner.style.background = 'white';
    banner.style.borderRadius = '14px';
    banner.style.maxWidth = '400px';
    banner.style.width = 'calc(100% - 24px)';
    banner.style.maxHeight = 'calc(100dvh - 24px)';
    banner.style.boxShadow = '0 20px 60px rgba(0,0,0,0.4), 0 0 0 4px ' + colorPrincipal + '22';
    banner.style.zIndex = '2147483646';
    banner.style.overflow = 'hidden';
    banner.style.display = 'flex';
    banner.style.flexDirection = 'column';
    banner.style.transition = 'transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity 0.3s ease';

    let html = '';

    html += '<div style="background:linear-gradient(135deg,' + colorPrincipal + ',' + colorFondo + ');color:white;padding:10px 16px;display:flex;align-items:center;gap:8px;flex-shrink:0;">';
    html += '<span style="font-size:1.3rem;">' + icono + '</span>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="font-weight:800;font-size:0.88rem;letter-spacing:0.02em;">' + titulo + '</div>';
    html += '<div style="font-size:0.72rem;opacity:0.9;">' + subtitulo + '</div>';
    html += '</div>';
    html += '</div>';

    html += '<div style="padding:10px 12px;flex:1;min-height:0;overflow-y:auto;background:white;">';

    primeras.forEach(function(entry) {
        const a = entry[1];
        const esAgotado = a.tipo === 'agotado';
        const cAlert = esAgotado ? '#ef4444' : '#f59e0b';
        const bgAlert = esAgotado ? '#fef2f2' : '#fffbeb';
        const nom = a.piezaNombre || 'Sin nombre';
        const cod = a.piezaCodigo || '';
        const stockAntes = a.stockAntes != null ? a.stockAntes : 0;
        const stockDespues = a.stockDespues != null ? a.stockDespues : 0;
        const minStock = a.stockCritico || 5;
        const operario = a.operario || '';
        const motivo = a.motivo || '';
        const montaje = a.montajeNombre || '';
        const numOp = a.numeroOperacion || '';

        html += '<div onclick="irAPiezaKanbanDesdeAlerta(\'' + a.piezaId + '\')" style="background:' + bgAlert + ';border-radius:8px;padding:10px 12px;margin-bottom:6px;border-left:3px solid ' + cAlert + ';cursor:pointer;">';
        html += '<div style="font-weight:700;font-size:0.82rem;color:' + cAlert + ';margin-bottom:3px;">';
        html += (esAgotado ? '🚫' : '⚠️') + ' ' + nom;
        html += '</div>';
        html += '<div style="font-size:0.7rem;color:#64748b;line-height:1.4;">';
        html += '<div>Stock: <strong>' + stockAntes + ' → ' + stockDespues + '</strong> (mín: ' + minStock + ')</div>';
        if (operario) html += '<div>👤 ' + operario + (motivo ? ' · ' + motivo : '') + '</div>';
        if (montaje) html += '<div>📦 ' + montaje + (numOp ? ' · Op. ' + numOp : '') + '</div>';
        html += '</div>';
        html += '</div>';
    });

    if (n > maxMostrar) {
        html += '<div style="text-align:center;font-size:0.75rem;color:#94a3b8;padding:6px;">... y ' + (n - maxMostrar) + ' más</div>';
    }

    html += '</div>';

    html += '<div style="padding:0 12px 10px;display:flex;gap:6px;background:white;flex-shrink:0;">';
    html += '<button onclick="irAKanbanDesdeAlerta()" style="flex:1;padding:10px;border:none;border-radius:8px;background:linear-gradient(135deg,' + colorPrincipal + ',' + colorFondo + ');color:white;font-weight:700;cursor:pointer;font-size:0.82rem;font-family:inherit;">📦 Ir al Kanban</button>';
    html += '<button onclick="cerrarBannerAlertasKanban()" style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;background:white;color:#64748b;font-weight:600;cursor:pointer;font-size:0.8rem;font-family:inherit;">✕</button>';
    html += '</div>';

    html += '<div style="height:4px;background:' + colorFondo + '22;overflow:hidden;flex-shrink:0;">';
    html += '<div style="height:100%;background:' + colorPrincipal + ';"></div>';
    html += '</div>';

    banner.innerHTML = html;
    document.body.appendChild(banner);

    requestAnimationFrame(function() {
        banner.style.transform = 'translateX(-50%) translateY(0)';
    });

    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            const audioCtx = new AudioCtx();
            [0, 0.15].forEach(function(delay) {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.frequency.value = agotados > 0 ? 700 : 550;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime + delay);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.12);
                osc.start(audioCtx.currentTime + delay);
                osc.stop(audioCtx.currentTime + delay + 0.12);
            });
        }
    } catch (e) {}

    setTimeout(function() {
        const b = document.getElementById('bannerAlertaKanban');
        if (b) {
            b.style.transform = 'translateX(-50%) translateY(-100px)';
            b.style.opacity = '0';
            setTimeout(function() { b.remove(); }, 300);
        }
    }, 25000);
}

function cerrarBannerAlertasKanban() {
    const banner = document.getElementById('bannerAlertaKanban');
    if (banner) {
        banner.style.transform = 'translateX(-50%) translateY(-100px)';
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 300);
    }
}

function irAPiezaKanbanDesdeAlerta(piezaId) {
    cerrarBannerAlertasKanban();

    if (typeof switchAdminTab === 'function') {
        switchAdminTab('kanban');
    }

    setTimeout(() => {
        const tarjeta = document.querySelector(`[data-pieza-id="${piezaId}"]`);
        if (tarjeta) {
            tarjeta.scrollIntoView({ behavior: 'smooth', block: 'center' });
            tarjeta.style.transition = 'all 0.3s ease';
            tarjeta.style.boxShadow = '0 0 0 4px rgba(239,68,68,0.5)';

            let pulsos = 0;
            const int = setInterval(() => {
                tarjeta.style.boxShadow = pulsos % 2 === 0
                    ? '0 0 0 4px rgba(239,68,68,0.5)'
                    : '0 0 0 8px rgba(239,68,68,0.15)';
                pulsos++;
                if (pulsos >= 6) {
                    clearInterval(int);
                    setTimeout(() => {
                        tarjeta.style.boxShadow = '';
                    }, 300);
                }
            }, 500);
        }
    }, 700);
}

function irAKanbanDesdeAlerta() {
    cerrarBannerAlertasKanban();
    if (typeof switchAdminTab === 'function') {
        switchAdminTab('kanban');
    }
}

async function marcarAlertasKanbanComoLeidas() {
    try {
        const alertas = await cargarFirebase('alertas_kanban', true);
        const pendientes = Object.entries(alertas).filter(([id, a]) => !a.leida);
        if (!pendientes.length) return;

        for (const [id, a] of pendientes) {
            await guardarFirebase('alertas_kanban', id, {
                leida: true,
                fechaLeida: new Date().toISOString(),
                leidaPor: window.APP.operario?.nombre || 'Admin'
            });
        }

        actualizarBadgeKanbanSidebar(0);
        cerrarBannerAlertasKanban();
        console.log(`✅ ${pendientes.length} alertas kanban marcadas como leídas`);
    } catch (e) {
        console.error('❌ Error marcando alertas kanban:', e);
    }
}
