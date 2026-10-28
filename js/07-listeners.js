function setupListeners() {
    const db = window.APP.db;
    if (!db) return;

let timerAlertasKanban = null;
let ultimaAlertaKanban = 0;

db.collection('alertas_kanban').onSnapshot(snap => {
    if (!window.APP.operario) return;

    const rol = (window.APP.operario.puesto || '').toLowerCase();
    if (!rol.includes('admin') && !rol.includes('supervisor')) return;

    if (timerAlertasKanban) clearTimeout(timerAlertasKanban);
    timerAlertasKanban = setTimeout(() => {
        const ahora = Date.now();
        if (ahora - ultimaAlertaKanban < 800) return;
        ultimaAlertaKanban = ahora;

        if (typeof comprobarAlertasKanban === 'function') {
            comprobarAlertasKanban();
        }
    }, 800);
});

let timerKanban = null;
let ultimoKanban = 0;

db.collection('piezas_kanban').onSnapshot(snap => {
    if (!window.APP.operario) return;

    if (timerKanban) clearTimeout(timerKanban);
    timerKanban = setTimeout(() => {
        const ahora = Date.now();
        if (ahora - ultimoKanban < 500) return;
        ultimoKanban = ahora;

        const rol = (window.APP.operario.puesto || '').toLowerCase();

        if (rol.includes('admin') || rol.includes('supervisor')) {
            const adminActivo = document.getElementById('admin')?.classList.contains('active');
            const panelKanban = document.getElementById('adminPanelKanban');

            if (adminActivo && panelKanban && panelKanban.style.display !== 'none') {
                if (typeof cargarAdminPiezas === 'function') {
                    cargarAdminPiezas();
                }
            }
        }

        if (!rol.includes('admin') && !rol.includes('supervisor')) {
            const enKanban = document.getElementById('kanban')?.classList.contains('active');
            if (enKanban && typeof cargarKanbanOperario === 'function') {
                cargarKanbanOperario();
            }
        }
    }, 500);
});

let timerHerramientas = null;
let ultimaActualizacionHerramientas = 0;

db.collection('herramientas').onSnapshot(snap => {
    snap.forEach(doc => {
        window.APP.herramientasCache[doc.id] = doc.data();
    });

    const cambiosExternos = [];
    snap.docChanges().forEach(change => {
        if (change.type === 'modified') {
            const h = change.doc.data();
            const estado = h.estado || 'disponible';
            if (h.reservadaPor && h.reservadaPor !== window.APP.operario?.nombre) {
                cambiosExternos.push({ nombre: h.nombre, estado, por: h.reservadaPor });
            }
        }
    });

    if (timerHerramientas) clearTimeout(timerHerramientas);
    timerHerramientas = setTimeout(() => {
        const ahora = Date.now();
        if (ahora - ultimaActualizacionHerramientas < 400) return;
        ultimaActualizacionHerramientas = ahora;

        if (cambiosExternos.length > 0 && window.APP.operario) {
            const c = cambiosExternos[0];
            if (c.estado === 'reservada') {
                toast(`🔵 ${c.por} ha reservado "${c.nombre}"`, '#3b82f6', 2500);
            } else if (c.estado === 'disponible') {
                toast(`🟢 "${c.nombre}" disponible`, '#10b981', 2500);
            } else if (c.estado === 'en_uso') {
                toast(`🟡 ${c.por} usa "${c.nombre}"`, '#f59e0b', 2500);
            }
        }

        const enHerramientas = document.getElementById('herramientas')?.classList.contains('active');
if (enHerramientas && typeof renderHerramientasOperario === 'function') {
    cargarFirebase('herramientas', true).then(herr => {
        window.APP._herramientasCache = herr;
        actualizarContadoresHerramientas();
        renderHerramientasOperario();
    });
}

        const adminHerramientas = document.getElementById('adminPanelHerramientas');
        const adminActivo = document.getElementById('admin')?.classList.contains('active');
        const formCerrado = document.getElementById('adminHerramientasForm')?.style.display === 'none' ||
                            !document.getElementById('adminHerramientasForm')?.style.display;

        if (adminActivo && adminHerramientas && adminHerramientas.style.display !== 'none' && formCerrado) {
            if (typeof cargarAdminHerramientas === 'function') {
                cargarAdminHerramientas();
            }
        }
    }, 400);
});

    let timerRecargaCronos = null;
    let ultimaRecargaCronos = 0;
    let recargaEnCurso = false;

    db.collection('cronos_operacion').onSnapshot(snap => {
        if (!window.APP.operacionActiva) return;

        const datos = {};
        snap.forEach(doc => { datos[doc.id] = doc.data(); });

        if (!window.APP.cronosOperacion) window.APP.cronosOperacion = {};
        window.APP.cronosOperacion = datos;

        if (typeof actualizarBadgeCrono === 'function') actualizarBadgeCrono();

        if (recargaEnCurso) return;

        if (timerRecargaCronos) clearTimeout(timerRecargaCronos);
        timerRecargaCronos = setTimeout(() => {
            const ahora = Date.now();
            if (ahora - ultimaRecargaCronos < 600) return;
            ultimaRecargaCronos = ahora;
            recargaEnCurso = true;

            const enMontajes = document.getElementById('montajes-operacion')?.classList.contains('active');
            if (enMontajes && window.APP.operacionActiva) {
                const modelo = window.APP.modeloActivo || 'MS3';
                cargarMontajesOperacionSilencioso(window.APP.operacionActiva, modelo)
                    .finally(() => { recargaEnCurso = false; });
            } else {
                recargaEnCurso = false;
            }
        }, 600);

        const cronoOp = datos[window.APP.operacionActiva];
        const hayActivos = cronoOp?.montajesActivos && Object.values(cronoOp.montajesActivos).some(m =>
            m.operariosActivos && m.operariosActivos.length > 0
        );

        if (hayActivos && !window.APP.cronoTick && typeof iniciarTickCronos === 'function') {
            iniciarTickCronos(window.APP.operacionActiva);
        }
    });

    let timerHistorial = null;
    let ultimoHistorial = 0;

    db.collection('historial_montajes').onSnapshot(() => {
        if (timerHistorial) clearTimeout(timerHistorial);
        timerHistorial = setTimeout(() => {
            const ahora = Date.now();
            if (ahora - ultimoHistorial < 800) return;
            ultimoHistorial = ahora;

            const enMontajes = document.getElementById('montajes-operacion')?.classList.contains('active');
            if (enMontajes && window.APP.operacionActiva) {
                const modelo = window.APP.modeloActivo || 'MS3';
                cargarMontajesOperacionSilencioso(window.APP.operacionActiva, modelo);
            }

            if (document.getElementById('dashboard')?.classList.contains('active')) {
                if (typeof actualizarDashboard === 'function') actualizarDashboard();
            }
        }, 800);
    });

    let timerOperaciones = null;
    let ultimoOperaciones = 0;

    db.collection('operaciones').onSnapshot(() => {
        if (timerOperaciones) clearTimeout(timerOperaciones);
        timerOperaciones = setTimeout(() => {
            const ahora = Date.now();
            if (ahora - ultimoOperaciones < 800) return;
            ultimoOperaciones = ahora;

            if (document.getElementById('operaciones')?.classList.contains('active')) {
                if (typeof cargarOperaciones === 'function') cargarOperaciones();
            }
        }, 800);
    });

    let timerMontajes = null;
    let ultimoMontajes = 0;

    db.collection('montajes').onSnapshot(() => {
        if (timerMontajes) clearTimeout(timerMontajes);
        timerMontajes = setTimeout(() => {
            const ahora = Date.now();
            if (ahora - ultimoMontajes < 800) return;
            ultimoMontajes = ahora;

            if (document.getElementById('montajes-operacion')?.classList.contains('active') && window.APP.operacionActiva) {
                const modelo = window.APP.modeloActivo || 'MS3';
                cargarMontajesOperacionSilencioso(window.APP.operacionActiva, modelo);
            }
        }, 800);
    });

    let timerAlertas = null;
    let ultimaAlerta = 0;

    db.collection('alertas_admin').onSnapshot(snap => {
        if (timerAlertas) clearTimeout(timerAlertas);
        timerAlertas = setTimeout(() => {
            const ahora = Date.now();
            if (ahora - ultimaAlerta < 500) return;
            ultimaAlerta = ahora;

            const rol = (window.APP.operario?.puesto || '').toLowerCase();
            if (!rol.includes('admin') && !rol.includes('supervisor')) return;

            if (typeof comprobarAlertasAdmin === 'function') {
                comprobarAlertasAdmin();
            }
        }, 500);
    });

let timerInspCal = null;
let ultimaInspCal = 0;

db.collection('inspecciones_caldereria').onSnapshot(snap => {
    if (timerInspCal) clearTimeout(timerInspCal);
    timerInspCal = setTimeout(() => {
        const ahora = Date.now();
        if (ahora - ultimaInspCal < 800) return;
        ultimaInspCal = ahora;

        const opActiva = window.APP.operacionActiva;
        const enMontajes = document.getElementById('montajes-operacion')?.classList.contains('active');

        if (opActiva && enMontajes && typeof mostrarAvisoInspeccionCaldereria === 'function') {
            mostrarAvisoInspeccionCaldereria(opActiva);
        }

        const enAdmin = document.getElementById('admin')?.classList.contains('active');
        const panelInsp = document.getElementById('adminPanelInspeccion');
        const panelActivo = enAdmin && panelInsp && panelInsp.style.display !== 'none';

        if (panelActivo && typeof cargarInspeccionOperacion === 'function') {
            const selOp = document.getElementById('inspeccionOperacionSelect');
            const opSeleccionada = selOp?.value;

            if (opSeleccionada) {
                let cambio = false;
                snap.docChanges().forEach(change => {
                    if (change.doc.id === opSeleccionada) {
                        cambio = true;
                    }
                });

                if (cambio) {
                    console.log('🔄 Inspección actualizada en tiempo real · recargando...');
                    cargarInspeccionOperacion();
                }
            }
        }
    }, 800);
});

db.collection('conversaciones').onSnapshot(snap => {
    if (!window.APP.operario) return;

    const miNombre = window.APP.operario.nombre;
    let num = 0;

    snap.forEach(doc => {
        const c = doc.data();
        if (c.participantes && c.participantes.includes(miNombre)) {
            num += c.noLeidos?.[miNombre] || 0;
        }
    });

    actualizarBadgeChatSidebar(num);
    actualizarTituloPestana(num);

    if (window.APP.panelChat?.abierto) return;
    if (document.getElementById('chat')?.classList.contains('active')) return;

    actualizarBadgeChatFab(num);
});

db.collection('historial_montajes').onSnapshot(snap => {
    if (!window.APP.operario) return;

    const rol = (window.APP.operario.puesto || '').toLowerCase();
    if (rol.includes('admin') || rol.includes('supervisor')) return;

    const miNombre = window.APP.operario.nombre;

    snap.docChanges().forEach(change => {
        if (change.type !== 'modified') return;

        const h = change.doc.data();
        if (!h) return;

        if (h.operario !== miNombre) return;

        const ahora = Date.now();

        if (h.qcEstado === 'rechazado' && h.qcFecha) {
            const diffSeg = (ahora - new Date(h.qcFecha).getTime()) / 1000;
            const alertaId = 'rech_' + change.doc.id + '_' + h.qcFecha;

            if (diffSeg < 15 && !window.APP._alertasQCMostradas.has(alertaId)) {
                window.APP._alertasQCMostradas.add(alertaId);

                const numeroOperacion = _cacheOpsEst?.operaciones?.[h.operacionId]?.numero || '';
                const estacionNombre = _cacheOpsEst?.estaciones?.[h.estacionId]?.nombre || '';

                mostrarAlertaQC({
                    tipo: 'rechazado',
                    montajeNombre: h.montajeNombre,
                    montajeId: h.montajeId,
                    operacionId: h.operacionId,
                    numeroOperacion: numeroOperacion,
                    estacionNombre: estacionNombre,
                    motivo: h.qcComentario || '',
                    fotos: h.qcFotos || [],
                    revisor: h.qcRevisor || ''
                });
            }
        }

        if (h.qcEstado === 'aprobado' && h.qcFecha) {
            const diffSeg = (ahora - new Date(h.qcFecha).getTime()) / 1000;
            const alertaId = 'aprob_' + change.doc.id + '_' + h.qcFecha;

            if (diffSeg < 15 && !window.APP._alertasQCMostradas.has(alertaId)) {
                window.APP._alertasQCMostradas.add(alertaId);

                const numeroOperacion = _cacheOpsEst?.operaciones?.[h.operacionId]?.numero || '';
                const estacionNombre = _cacheOpsEst?.estaciones?.[h.estacionId]?.nombre || '';

                mostrarAlertaQC({
                    tipo: 'aprobado',
                    montajeNombre: h.montajeNombre,
                    montajeId: h.montajeId,
                    operacionId: h.operacionId,
                    numeroOperacion: numeroOperacion,
                    estacionNombre: estacionNombre,
                    revisor: h.qcRevisor || ''
                });
            }
        }
    });

    if (typeof actualizarBadgeNotificaciones === 'function') {
        actualizarBadgeNotificaciones();
    }

    if (document.getElementById('notificaciones')?.classList.contains('active')) {
        if (typeof cargarNotificaciones === 'function') {
            cargarNotificaciones();
        }
    }

    if (rol.includes('admin') || rol.includes('supervisor')) {
        const adminTqcActivo = document.getElementById('admin')?.classList.contains('active');
        const panelTqc = document.getElementById('adminPanelTqc');

        if (adminTqcActivo && panelTqc && panelTqc.style.display !== 'none') {
            if (typeof cargarTQC === 'function') {
                if (window.APP._timerRecargaTQC) clearTimeout(window.APP._timerRecargaTQC);
                window.APP._timerRecargaTQC = setTimeout(() => {
                    cargarTQC();
                }, 500);
            }
        }
    }
});

db.collection('mensajes').onSnapshot(snap => {
    if (!window.APP.operario) return;

    const miNombre = window.APP.operario.nombre;

    snap.docChanges().forEach(change => {
        if (change.type !== 'added') return;

        const msg = change.doc.data();
        if (!msg) return;
        if (msg.emisor === miNombre) return;
        if (msg.receptor !== miNombre) return;

        const fecha = new Date(msg.fecha);
        const diffSeg = (new Date() - fecha) / 1000;
        if (diffSeg > 10) return;

        const enChatPage = document.getElementById('chat')?.classList.contains('active');
        const enConvPage = window.APP.chatActual.conversacionId === msg.conversacionId && enChatPage;
        const enConvPanel = window.APP.panelChat.conversacionId === msg.conversacionId && window.APP.panelChat.abierto;
        if (enConvPage || enConvPanel) return;

        mostrarAlertaMensaje(msg);
    });
});

let _cacheOpsEst = { operaciones: {}, estaciones: {} };

const _recargarCacheOpsEst = async () => {
    try {
        _cacheOpsEst.operaciones = await cargarFirebase('operaciones');
        _cacheOpsEst.estaciones = await cargarFirebase('estaciones');
    } catch (e) {}
};
_recargarCacheOpsEst();
setInterval(_recargarCacheOpsEst, 30000);

db.collection('historial_montajes').onSnapshot(snap => {
    if (!window.APP.operario) return;

    const rol = (window.APP.operario.puesto || '').toLowerCase();
    if (!rol.includes('admin') && !rol.includes('supervisor')) return;

    snap.docChanges().forEach(change => {
        if (change.type !== 'modified') return;

        const h = change.doc.data();
        if (!h) return;

        if (!h.corregido || !h.fechaCorreccion) return;

        const ahora = Date.now();
        const diffSeg = (ahora - new Date(h.fechaCorreccion).getTime()) / 1000;

        if (diffSeg > 15) return;

        const alertaId = 'corr_' + change.doc.id + '_' + h.fechaCorreccion;

        if (window.APP._alertasQCMostradas.has(alertaId)) return;

        window.APP._alertasQCMostradas.add(alertaId);

        const numeroOperacion = _cacheOpsEst.operaciones[h.operacionId]?.numero || '';
        const estacionNombre = _cacheOpsEst.estaciones[h.estacionId]?.nombre || '';

        mostrarAlertaCorreccionAdmin({
            montajeNombre: h.montajeNombre,
            montajeId: h.montajeId,
            operacionId: h.operacionId,
            estacionId: h.estacionId,
            numeroOperacion: numeroOperacion,
            estacionNombre: estacionNombre,
            operario: h.corregidoPor || h.operario || '—',
            qcReenvios: h.qcReenvios || 0
        });
    });
});

let timerEscaneos = null;
let ultimoEscaneo = 0;

db.collection('componentes_escaneados').onSnapshot(snap => {
    if (!window.APP.operario) return;

    if (!window.APP._componentesEscaneados) window.APP._componentesEscaneados = {};
    snap.forEach(doc => {
        const data = doc.data();
        if (data.montajeId) {
            window.APP._componentesEscaneados[data.montajeId] = data;
        }
    });

    if (timerEscaneos) clearTimeout(timerEscaneos);
    timerEscaneos = setTimeout(() => {
        const ahora = Date.now();
        if (ahora - ultimoEscaneo < 500) return;
        ultimoEscaneo = ahora;

        const rol = (window.APP.operario.puesto || '').toLowerCase();

        if (rol.includes('admin') || rol.includes('supervisor')) {
            const adminActivo = document.getElementById('admin')?.classList.contains('active');
            const panelReg = document.getElementById('adminPanelRegistros');

            if (adminActivo && panelReg && panelReg.style.display !== 'none') {
                if (window.APP._regTabActual === 'escaneos') {
                    if (typeof cargarRegistrosEscaneos === 'function') {
                        cargarRegistrosEscaneos();
                    }
                }
            }
        }

        if (!rol.includes('admin') && !rol.includes('supervisor')) {
            const enMontajes = document.getElementById('montajes-operacion')?.classList.contains('active');
            if (enMontajes && window.APP.operacionActiva) {
                const modelo = window.APP.modeloActivo || 'MS3';
                cargarMontajesOperacionSilencioso(window.APP.operacionActiva, modelo);
            }
        }
    }, 500);
});

let timerMatVerif = null;
let ultimoMatVerif = 0;

db.collection('materiales_verificados').onSnapshot(() => {
    if (!window.APP.operario) return;

    if (timerMatVerif) clearTimeout(timerMatVerif);
    timerMatVerif = setTimeout(() => {
        const ahora = Date.now();
        if (ahora - ultimoMatVerif < 500) return;
        ultimoMatVerif = ahora;

        const rol = (window.APP.operario.puesto || '').toLowerCase();
        const esAdmin = rol.includes('admin') || rol.includes('supervisor');

        if (!esAdmin) {
            const enMateriales = document.getElementById('materiales')?.classList.contains('active');
            if (!enMateriales) return;
            if (document.getElementById('modalFaltaMaterial')) return;
            if (typeof cargarMaterialesOperario === 'function') cargarMaterialesOperario();
            return;
        }

        const adminActivo = document.getElementById('admin')?.classList.contains('active');
        if (!adminActivo) return;

        const panelEntrega = document.getElementById('adminPanelEntregarMateriales');
        const panelVisible = panelEntrega && panelEntrega.style.display !== 'none';
        if (!panelVisible) return;

        const selOp = document.getElementById('entregaOperacionSelect');
        const selEst = document.getElementById('entregaEstacionSelect');
        if (!selOp?.value || !selEst?.value) return;

        if (typeof cargarEntregaMateriales === 'function') cargarEntregaMateriales();
    }, 500);
});

db.collection('estaciones_qc').onSnapshot(snap => {
    if (!window.APP.operario) return;

    const rol = (window.APP.operario.puesto || '').toLowerCase();
    if (!rol.includes('admin') && !rol.includes('supervisor')) return;

    let pendientes = 0;
    snap.forEach(doc => {
        const qc = doc.data();
        if (qc.estado === 'pendiente' || qc.estado === 'parcial') {
            pendientes++;
        }
    });

    if (typeof actualizarBadgeTQCSidebar === 'function') {
        actualizarBadgeTQCSidebar(pendientes);
    }

    const panelTqc = document.getElementById('adminPanelTqc');
    const adminActivo = document.getElementById('admin')?.classList.contains('active');
    if (adminActivo && panelTqc && panelTqc.style.display !== 'none') {
        if (typeof cargarTQC === 'function') {
            if (window.APP._timerRecargaTQC) clearTimeout(window.APP._timerRecargaTQC);
            window.APP._timerRecargaTQC = setTimeout(() => {
                cargarTQC();
            }, 500);
        }
    }
});

    console.log('✅ Listeners registrados (con tiempo real)');
}
