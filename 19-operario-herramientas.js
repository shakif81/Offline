window.APP.herramientasVista = {
    filtroTipo: 'todos',
    filtroEstado: 'todos',
    filtroPar: '',
    busqueda: ''
};

function mostrarModalHerramientasSinDevolver(herramientasMias) {
    return new Promise(resolve => {
        document.getElementById('modalHerramientasSinDevolver')?.remove();

        const modal = document.createElement('div');
        modal.id = 'modalHerramientasSinDevolver';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';

        const n = herramientasMias.length;

        modal.innerHTML = `
            <div style="background:white;border-radius:18px;padding:24px;max-width:480px;width:100%;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
                <div style="text-align:center;margin-bottom:16px;">
                    <div style="font-size:2.5rem;">🔧</div>
                    <h3 style="color:#1e293b;margin:6px 0 4px 0;font-size:1.1rem;font-weight:700;">Herramientas sin devolver</h3>
                    <p style="font-size:0.85rem;color:#64748b;margin:0;">
                        Tienes <strong style="color:#1e293b;">${n} herramienta${n !== 1 ? 's' : ''}</strong> asignada${n !== 1 ? 's' : ''}.<br>¿Qué quieres hacer antes de cerrar sesión?
                    </p>
                </div>

                <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
                    ${herramientasMias.map(([id, h]) => {
                        const estado = h.estado || 'disponible';
                        const esEnUso = estado === 'en_uso';
                        const colorEstado = esEnUso ? '#f59e0b' : '#3b82f6';
                        const iconoEstado = esEnUso ? '🟡' : '🔵';
                        const textoEstado = esEnUso ? 'En uso' : 'Reservada';
                        return `
                            <div style="background:#f8fafc;border:1px solid #e5e7eb;border-left:3px solid ${colorEstado};border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;">
                                <span style="font-size:1.1rem;flex-shrink:0;">🔧</span>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-weight:700;font-size:0.85rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${h.nombre || 'Sin nombre'}</div>
                                    <div style="font-size:0.72rem;color:#64748b;margin-top:2px;">
                                        ${h.numero ? `#${h.numero}` : ''}${h.codigo ? ` · ${h.codigo}` : ''}
                                    </div>
                                </div>
                                <span style="background:${colorEstado}18;color:${colorEstado};padding:3px 10px;border-radius:99px;font-size:0.7rem;font-weight:700;flex-shrink:0;white-space:nowrap;">${iconoEstado} ${textoEstado}</span>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div style="display:flex;flex-direction:column;gap:8px;">
                    <button id="_hsd_devolver" style="padding:14px;border:none;border-radius:10px;background:#10b981;color:white;font-weight:700;cursor:pointer;font-size:0.88rem;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;">✅ Devolver todas y cerrar sesión</button>
                    <button id="_hsd_sin" style="padding:12px;border:1px solid #fecaca;border-radius:10px;background:#fef2f2;color:#b91c1c;font-weight:700;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;">⚠️ Cerrar sin devolver</button>
                    <button id="_hsd_cancelar" style="padding:10px;border:1px solid #e5e7eb;border-radius:10px;background:white;cursor:pointer;font-size:0.8rem;color:#64748b;font-family:inherit;">❌ Cancelar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('_hsd_devolver').onclick = () => { modal.remove(); resolve('devolver'); };
        document.getElementById('_hsd_sin').onclick = () => { modal.remove(); resolve('cerrar_sin_devolver'); };
        document.getElementById('_hsd_cancelar').onclick = () => { modal.remove(); resolve('cancelar'); };

        modal.addEventListener('click', (e) => {
            if (e.target === modal) { modal.remove(); resolve('cancelar'); }
        });
    });
}

async function confirmarHerramientasLiberadas() {
    const miNombre = window.APP.operario?.nombre;
    if (!miNombre) return;

    const herramientas = await cargarFirebase('herramientas', true);
    const mias = Object.entries(herramientas).filter(([id, h]) =>
        h.reservadaPor === miNombre &&
        (h.estado === 'reservada' || h.estado === 'en_uso')
    );

    if (mias.length > 0) {
        for (const [id] of mias) {
            await guardarFirebase('herramientas', id, {
                estado: 'disponible',
                reservadaPor: '',
                fechaReserva: null,
                fechaInicioUso: null
            });
        }
        toast(`🔧 ${mias.length} herramienta${mias.length > 1 ? 's' : ''} liberada${mias.length > 1 ? 's' : ''}`, '#10b981', 2000);
    } else {
        toast('✅ Montaje terminado · Sin herramientas pendientes', '#10b981', 2000);
    }
}

async function calcularCandidatasHerramientas(paresRequeridosStr) {
    const pares = String(paresRequeridosStr || '')
        .split(',')
        .map(p => parseFloat(p.trim()))
        .filter(p => p > 0);

    if (!pares.length) return {};

    const herramientas = await cargarFirebase('herramientas', true);
    const miNombre = window.APP.operario?.nombre;

    const resultado = {};
    pares.forEach(par => {
        resultado[par] = Object.entries(herramientas)
            .filter(([id, h]) => {
                if (h.tipo !== 'Llave Dinamométrica') return false;
                if (parseFloat(h.par) !== par) return false;

                const esMia = h.reservadaPor === miNombre &&
                              (h.estado === 'reservada' || h.estado === 'en_uso');
                const estaLibre = (h.estado || 'disponible') === 'disponible';

                return esMia || estaLibre;
            })
            .map(([id, h]) => ({
                id,
                nombre: h.nombre || 'Sin nombre',
                numero: h.numero || '',
                codigo: h.codigo || '',
                estado: h.estado || 'disponible',
                esMia: h.reservadaPor === miNombre &&
                       (h.estado === 'reservada' || h.estado === 'en_uso')
            }))
            .sort((a, b) => (b.esMia ? 1 : 0) - (a.esMia ? 1 : 0));

        const auto = resultado[par].find(c => c.esMia);
        if (auto) resultado[par]._autoId = auto.id;
    });

    return resultado;
}

function mostrarModalRegistroHerramientas(montajeNombre, paresRequeridosStr, candidatasPorPar) {
    return new Promise(resolve => {
        document.getElementById('modalRegistroHerramientas')?.remove();

        const pares = Object.keys(candidatasPorPar).map(p => parseFloat(p)).filter(p => p > 0);

        const seleccion = {};
        pares.forEach(par => {
            const cands = candidatasPorPar[par] || [];
            const autoId = cands._autoId;
            const elegida = autoId ? cands.find(c => c.id === autoId) : null;
            if (elegida) {
                seleccion[par] = {
                    id: elegida.id,
                    nombre: elegida.nombre,
                    numero: elegida.numero,
                    codigo: elegida.codigo,
                    auto: true
                };
            }
        });

        const modal = document.createElement('div');
        modal.id = 'modalRegistroHerramientas';
        modal.style.cssText = 'position:fixed;inset:0;background:white;z-index:99999;display:flex;flex-direction:column;overflow:hidden;';

        function render() {
            const totalPares = pares.length;
            const completados = pares.filter(p => seleccion[p]).length;
            const todoListo = completados === totalPares;

            modal.innerHTML = `
                <!-- CABECERA (estilo detalle de estación) -->
                <div style="background:white;border-bottom:1px solid #e5e7eb;padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display:flex;align-items:center;gap:14px;min-width:0;">
                        <div style="width:48px;height:48px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">🔧</div>
                        <div style="min-width:0;">
                            <h2 style="margin:0;color:#1e293b;font-size:1.15rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Herramientas usadas</h2>
                            <div style="font-size:0.78rem;color:#64748b;margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                <span>${montajeNombre || 'Sin nombre'}</span>
                                <span style="color:#cbd5e1;">·</span>
                                <span style="color:#4338ca;font-weight:700;background:#eef2ff;padding:1px 8px;border-radius:99px;font-size:0.72rem;">${completados}/${totalPares}</span>
                            </div>
                        </div>
                    </div>
                    <button onclick="cancelarModalRegistroHerramientas()" style="background:#f1f5f9;border:none;border-radius:10px;width:44px;height:44px;font-size:1.3rem;cursor:pointer;color:#475569;display:flex;align-items:center;justify-content:center;flex-shrink:0;">✕</button>
                </div>

                <!-- AVISO + PROGRESO -->
                <div style="padding:12px 20px;background:#fef3c7;border-bottom:1px solid #fde68a;flex-shrink:0;">
                    <div style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:#92400e;font-weight:600;margin-bottom:8px;">
                        <span style="font-size:1rem;">⚠️</span>
                        <span>Asigna una herramienta a cada par antes de terminar el montaje.</span>
                    </div>
                    <div style="background:#e5e7eb;height:8px;border-radius:99px;overflow:hidden;">
                        <div style="background:${todoListo ? '#10b981' : '#6366f1'};height:100%;width:${(completados / totalPares) * 100}%;border-radius:99px;transition:width 0.3s ease;"></div>
                    </div>
                </div>

                <!-- CONTENIDO (scroll) -->
                <div style="flex:1;overflow-y:auto;padding:1.5rem;background:#fafafa;">
                    <div style="max-width:900px;margin:0 auto;display:flex;flex-direction:column;gap:14px;">

                        ${pares.map(par => {
                            const sel = seleccion[par];
                            const cands = candidatasPorPar[par] || [];

                            return `
                                <div style="background:white;border-radius:14px;padding:1.2rem 1.4rem;border:1px solid ${sel ? '#a7f3d0' : '#fecaca'};border-left:4px solid ${sel ? '#10b981' : '#ef4444'};">

                                    <!-- CABECERA DEL PAR -->
                                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:${sel || cands.length ? '12px' : '0'};">
                                        <span style="background:#1e293b;color:white;padding:5px 12px;border-radius:8px;font-size:0.82rem;font-weight:800;font-family:'SF Mono',Monaco,monospace;flex-shrink:0;">
                                            💪 ${par} Nm
                                        </span>
                                        <span style="font-size:0.78rem;color:#64748b;font-weight:600;">
                                            ${cands.length} candidata${cands.length !== 1 ? 's' : ''}
                                        </span>
                                        ${sel ? `
                                            <button onclick="event.stopPropagation();quitarSeleccionRegistroHerramientas(${par})"
                                                style="margin-left:auto;background:white;border:1px solid #cbd5e1;border-radius:8px;padding:6px 12px;font-size:0.72rem;color:#64748b;cursor:pointer;font-weight:700;font-family:inherit;">
                                                🔄 Cambiar
                                            </button>
                                        ` : ''}
                                    </div>

                                    ${sel ? `
                                        <!-- HERRAMIENTA YA SELECCIONADA -->
                                        <div style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px;">
                                            <span style="font-size:1.3rem;flex-shrink:0;">🔧</span>
                                            <div style="flex:1;min-width:0;">
                                                <div style="font-weight:700;font-size:0.9rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                                    ${sel.nombre}
                                                </div>
                                                <div style="font-size:0.75rem;color:#64748b;margin-top:3px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                                    ${sel.codigo ? `<span style="font-family:'SF Mono',Monaco,monospace;font-weight:700;color:#4338ca;background:#eef2ff;padding:2px 10px;border-radius:6px;">${sel.codigo}</span>` : ''}
                                                    ${sel.numero ? `<span style="font-weight:700;">#${sel.numero}</span>` : ''}
                                                </div>
                                            </div>
                                            ${sel.auto
                                                ? `<span style="background:#ecfdf5;color:#047857;padding:3px 10px;border-radius:99px;font-size:0.68rem;font-weight:700;flex-shrink:0;">AUTO</span>`
                                                : `<span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:99px;font-size:0.68rem;font-weight:700;flex-shrink:0;">MANUAL</span>`}
                                        </div>
                                    ` : `
                                        ${cands.length > 0 ? `
                                            <div style="display:flex;flex-direction:column;gap:8px;">
                                                ${cands.map(c => `
                                                    <button onclick="event.stopPropagation();seleccionarRegistroHerramienta(${par}, '${c.id}')"
                                                        style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;font-size:0.85rem;color:#1e293b;cursor:pointer;text-align:left;font-family:inherit;display:flex;align-items:center;gap:12px;transition:all 0.15s ease;"
                                                        onmouseover="this.style.background='#eef2ff';this.style.borderColor='#c7d2fe';"
                                                        onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e5e7eb';">
                                                        <span style="font-size:1.2rem;flex-shrink:0;">🔧</span>
                                                        <div style="flex:1;min-width:0;">
                                                            <div style="font-weight:700;font-size:0.88rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                                                ${c.nombre}
                                                                ${c.esMia ? ' <span style="color:#6366f1;font-size:0.72rem;font-weight:700;">(tuya)</span>' : ''}
                                                            </div>
                                                            <div style="font-size:0.75rem;color:#64748b;margin-top:3px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                                                ${c.codigo ? `<span style="font-family:'SF Mono',Monaco,monospace;font-weight:700;color:#4338ca;background:#eef2ff;padding:2px 10px;border-radius:6px;">${c.codigo}</span>` : ''}
                                                                ${c.numero ? `<span style="font-weight:700;color:#64748b;">#${c.numero}</span>` : ''}
                                                            </div>
                                                        </div>
                                                        <span style="font-size:0.75rem;color:#6366f1;font-weight:700;flex-shrink:0;">Elegir →</span>
                                                    </button>
                                                `).join('')}
                                            </div>
                                        ` : `
                                            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px;font-size:0.82rem;color:#b91c1c;font-weight:600;display:flex;align-items:center;gap:8px;">
                                                <span style="font-size:1.1rem;">⚠️</span>
                                                <span>No hay llaves disponibles para este par. Reserva o libera una antes de continuar.</span>
                                            </div>
                                        `}
                                    `}
                                </div>
                            `;
                        }).join('')}

                        <div style="height:1rem;"></div>
                    </div>
                </div>

                <!-- PIE FIJO -->
                <div style="padding:14px 20px;border-top:1px solid #e5e7eb;background:white;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;box-shadow:0 -1px 3px rgba(0,0,0,0.05);">
                    <div style="font-size:0.85rem;font-weight:700;color:${todoListo ? '#047857' : '#c2410c'};">
                        ${todoListo ? '✅ Todos los pares asignados' : `⏳ Faltan ${totalPares - completados} por asignar`}
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button onclick="cancelarModalRegistroHerramientas()"
                            style="padding:12px 20px;border:1px solid #e5e7eb;border-radius:10px;background:white;color:#64748b;font-weight:700;cursor:pointer;font-size:0.85rem;font-family:inherit;">
                            Cancelar
                        </button>
                        <button ${!todoListo ? 'disabled' : ''}
                            onclick="confirmarModalRegistroHerramientas()"
                            style="padding:12px 24px;border:none;border-radius:10px;background:${todoListo ? '#10b981' : '#cbd5e1'};color:white;font-weight:700;cursor:${todoListo ? 'pointer' : 'not-allowed'};font-size:0.9rem;font-family:inherit;display:flex;align-items:center;gap:6px;">
                            💾 Confirmar y terminar
                        </button>
                    </div>
                </div>
            `;
        }

        window.seleccionarRegistroHerramienta = function(par, herramientaId) {
            const cands = candidatasPorPar[par] || [];
            const h = cands.find(c => c.id === herramientaId);
            if (!h) return;
            seleccion[par] = {
                id: h.id,
                nombre: h.nombre,
                numero: h.numero,
                codigo: h.codigo,
                auto: false
            };
            render();
        };

        window.quitarSeleccionRegistroHerramientas = function(par) {
            delete seleccion[par];
            render();
        };

        window.cancelarModalRegistroHerramientas = function() {
            modal.remove();
            document.body.style.overflow = '';
            delete window.seleccionarRegistroHerramienta;
            delete window.quitarSeleccionRegistroHerramientas;
            delete window.cancelarModalRegistroHerramientas;
            delete window.confirmarModalRegistroHerramientas;
            resolve(null);
        };

        window.confirmarModalRegistroHerramientas = function() {
            const resultado = pares.map(par => ({
                par,
                herramientaId: seleccion[par].id,
                herramientaNombre: seleccion[par].nombre,
                herramientaNumero: seleccion[par].numero,
                herramientaCodigo: seleccion[par].codigo,
                auto: seleccion[par].auto
            }));

            modal.remove();
            document.body.style.overflow = '';
            delete window.seleccionarRegistroHerramienta;
            delete window.quitarSeleccionRegistroHerramientas;
            delete window.cancelarModalRegistroHerramientas;
            delete window.confirmarModalRegistroHerramientas;
            resolve(resultado);
        };

        render();
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    });
}

async function liberarMisHerramientas() {
    const miNombre = window.APP.operario?.nombre;
    if (!miNombre) return;

    try {
        const herramientas = await cargarFirebase('herramientas', true);
        const mias = Object.entries(herramientas).filter(([id, h]) =>
            h.reservadaPor === miNombre &&
            (h.estado === 'reservada' || h.estado === 'en_uso')
        );

        if (!mias.length) return;

        for (const [id] of mias) {
            await guardarFirebase('herramientas', id, {
                estado: 'disponible',
                reservadaPor: '',
                fechaReserva: null,
                fechaInicioUso: null
            });
        }

        toast(`🔧 ${mias.length} herramienta${mias.length > 1 ? 's' : ''} liberada${mias.length > 1 ? 's' : ''}`, '#10b981');
    } catch (e) {
        console.error('❌ Error liberando herramientas:', e);
    }
}

function comprobarCalibracion(h) {
    if (!h.fechaProxCalib) {
        return { vencida: false, porVencer: false, dias: null, sinFecha: true };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(h.fechaProxCalib + 'T00:00:00');
    const dias = Math.floor((venc - hoy) / (1000 * 60 * 60 * 24));

    return {
        vencida: dias < 0,
        porVencer: dias >= 0 && dias <= 30,
        dias: dias,
        sinFecha: false
    };
}

async function cargarHerramientasOperario() {
    const container = document.getElementById('herramientasContainer');
    if (!container) return;

    container.innerHTML = '<div class="empty-state">⏳ Cargando herramientas...</div>';

    const herramientas = await cargarFirebase('herramientas', true);
    const miNombre = window.APP.operario?.nombre || 'Operario';

    const todos = Object.values(herramientas);
const total = todos.length;
const misReservas = todos.filter(h => h.reservadaPor === miNombre).length;

const disponibles = todos.filter(h => {
    const calib = comprobarCalibracion(h);
    return (h.estado || 'disponible') === 'disponible' && !calib.vencida;
}).length;

const calibracion = todos.filter(h => {
    const calib = comprobarCalibracion(h);
    return h.estado === 'en_calibracion' || calib.vencida;
}).length;

    let html = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:1.2rem;">
        <div style="background:linear-gradient(135deg,#ecfdf5,white);border:1px solid #a7f3d0;border-radius:14px;padding:1rem;text-align:center;">
            <div style="font-size:1.5rem;margin-bottom:4px;">🟢</div>
            <div id="herrCountDisponibles" style="font-size:1.6rem;font-weight:800;color:#047857;line-height:1;">${disponibles}</div>
            <div style="font-size:0.72rem;color:#047857;font-weight:600;margin-top:4px;">Disponibles</div>
        </div>
        <div style="background:linear-gradient(135deg,#eff6ff,white);border:1px solid #bfdbfe;border-radius:14px;padding:1rem;text-align:center;">
            <div style="font-size:1.5rem;margin-bottom:4px;">🔵</div>
            <div id="herrCountReservas" style="font-size:1.6rem;font-weight:800;color:#1d4ed8;line-height:1;">${misReservas}</div>
            <div style="font-size:0.72rem;color:#1d4ed8;font-weight:600;margin-top:4px;">Tus reservas</div>
        </div>
        <div style="background:linear-gradient(135deg,#fff7ed,white);border:1px solid #fed7aa;border-radius:14px;padding:1rem;text-align:center;">
            <div style="font-size:1.5rem;margin-bottom:4px;">🟠</div>
            <div id="herrCountCalibracion" style="font-size:1.6rem;font-weight:800;color:#c2410c;line-height:1;">${calibracion}</div>
            <div style="font-size:0.72rem;color:#c2410c;font-weight:600;margin-top:4px;">En calibración</div>
        </div>
     
        <div style="background:linear-gradient(135deg,#eef2ff,white);border:1px solid #c7d2fe;border-radius:14px;padding:1rem;text-align:center;">
            <div style="font-size:1.5rem;margin-bottom:4px;">📦</div>
            <div id="herrCountTotal" style="font-size:1.6rem;font-weight:800;color:#4338ca;line-height:1;">${total}</div>
            <div style="font-size:0.72rem;color:#4338ca;font-weight:600;margin-top:4px;">Total</div>
        </div>
    </div>

        <div style="margin-bottom:0.75rem;">
            <input type="text" id="herramientasBusqueda"
                placeholder="🔍 Buscar por nombre, código o ubicación..."
                oninput="filtrarHerramientasOperario()"
                value="${window.APP.herramientasVista.busqueda || ''}"
                style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #cbd5e1;font-size:0.85rem;font-family:inherit;">
        </div>

        <div style="display:flex;gap:8px;margin-bottom:1rem;flex-wrap:wrap;align-items:center;background:white;padding:12px 14px;border-radius:10px;border:1px solid #e5e7eb;">
            <select id="herrFiltroTipo" onchange="filtrarHerramientasOperario()" style="padding:8px 12px;border-radius:8px;border:1px solid #cbd5e1;font-size:0.82rem;font-weight:600;color:#1e293b;background:white;cursor:pointer;font-family:inherit;">
                <option value="todos">🔧 Todos los tipos</option>
                <option value="Llave Dinamométrica">🔧 Dinamométricas</option>
                <option value="Llave Fija">🔩 Llaves Fijas</option>
                <option value="Destornillador">🪛 Destornilladores</option>
                <option value="Otro">📦 Otros</option>
            </select>

            <select id="herrFiltroEstado" onchange="filtrarHerramientasOperario()" style="padding:8px 12px;border-radius:8px;border:1px solid #cbd5e1;font-size:0.82rem;font-weight:600;color:#1e293b;background:white;cursor:pointer;font-family:inherit;">
                <option value="todos">📊 Todos los estados</option>
                <option value="disponible">🟢 Disponibles</option>
                <option value="reservada">🔵 Reservadas</option>
                <option value="en_uso">🟡 En uso</option>
                <option value="en_calibracion">🟠 En calibración</option>
                
            </select>

            <select id="herrFiltroPar" onchange="filtrarHerramientasOperario()" style="padding:8px 12px;border-radius:8px;border:1px solid #cbd5e1;font-size:0.82rem;font-weight:600;color:#1e293b;background:white;cursor:pointer;font-family:inherit;">
                <option value="">💪 Cualquier par</option>
                ${[...new Set(todos.filter(h => h.par > 0).map(h => h.par))]
                    .sort((a, b) => a - b)
                    .map(p => `<option value="${p}">💪 ${p} Nm</option>`).join('')}
            </select>

            <button onclick="resetearFiltrosHerramientas()" style="padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:white;color:#64748b;font-size:0.78rem;font-weight:600;cursor:pointer;font-family:inherit;">
                ✕ Limpiar
            </button>

            <div id="herrContador" style="margin-left:auto;font-size:0.78rem;color:#64748b;font-weight:600;white-space:nowrap;">${total} herramienta${total !== 1 ? 's' : ''}</div>
        </div>

        <div id="herrListaPiezas" style="display:flex;flex-direction:column;gap:10px;"></div>
    `;

    container.innerHTML = html;

    window.APP._herramientasCache = herramientas;

    renderHerramientasOperario();
}

function actualizarContadoresHerramientas() {
    const herramientas = window.APP._herramientasCache || {};
    const miNombre = window.APP.operario?.nombre || '';
    const todos = Object.values(herramientas);

    const elDisp = document.getElementById('herrCountDisponibles');
    const elRes = document.getElementById('herrCountReservas');
    const elCal = document.getElementById('herrCountCalibracion');
    const elTotal = document.getElementById('herrCountTotal');

    if (!elDisp) return;

    const disponibles = todos.filter(h => {
        const calib = comprobarCalibracion(h);
        return (h.estado || 'disponible') === 'disponible' && !calib.vencida;
    }).length;

    const calibracion = todos.filter(h => {
        const calib = comprobarCalibracion(h);
        return h.estado === 'en_calibracion' || calib.vencida;
    }).length;

    elDisp.textContent = disponibles;
    elRes.textContent = todos.filter(h => h.reservadaPor === miNombre).length;
    elCal.textContent = calibracion;
    elTotal.textContent = todos.length;
}

function renderHerramientasOperario() {
    const cont = document.getElementById('herrListaPiezas');
    if (!cont) return;

    const herramientas = window.APP._herramientasCache || {};
    const miNombre = window.APP.operario?.nombre || 'Operario';

    const busqueda = (document.getElementById('herramientasBusqueda')?.value || '').toLowerCase().trim();
    const filtroTipo = document.getElementById('herrFiltroTipo')?.value || 'todos';
    const filtroEstado = document.getElementById('herrFiltroEstado')?.value || 'todos';
    const filtroPar = document.getElementById('herrFiltroPar')?.value || '';

    let arr = Object.entries(herramientas);

    if (filtroTipo !== 'todos') arr = arr.filter(([id, h]) => h.tipo === filtroTipo);
    if (filtroEstado !== 'todos') arr = arr.filter(([id, h]) => (h.estado || 'disponible') === filtroEstado);
    if (filtroPar) arr = arr.filter(([id, h]) => parseFloat(h.par) === parseFloat(filtroPar));

    if (busqueda) {
        arr = arr.filter(([id, h]) =>
            (h.nombre || '').toLowerCase().includes(busqueda) ||
            (h.codigo || '').toLowerCase().includes(busqueda) ||
            (h.ubicacion || '').toLowerCase().includes(busqueda)
        );
    }

    const ordenTipo = { 'Llave Dinamométrica': 1, 'Llave Fija': 2, 'Destornillador': 3, 'Otro': 4 };
    arr.sort((a, b) => {
        const misA = a[1].reservadaPor === miNombre ? 0 : 1;
        const misB = b[1].reservadaPor === miNombre ? 0 : 1;
        if (misA !== misB) return misA - misB;

        const dispA = (a[1].estado || 'disponible') === 'disponible' ? 0 : 1;
        const dispB = (b[1].estado || 'disponible') === 'disponible' ? 0 : 1;
        if (dispA !== dispB) return dispA - dispB;

        const ta = ordenTipo[a[1].tipo] || 5;
        const tb = ordenTipo[b[1].tipo] || 5;
        if (ta !== tb) return ta - tb;

        return (parseInt(a[1].numero) || 999) - (parseInt(b[1].numero) || 999);
    });

    const contador = document.getElementById('herrContador');
    if (contador) contador.textContent = `${arr.length} herramienta${arr.length !== 1 ? 's' : ''}`;

    if (!arr.length) {
        cont.innerHTML = '<div class="empty-state"><div style="font-size:2rem;margin-bottom:8px;">🔍</div><div style="font-weight:600;color:#1e293b;">Sin resultados</div></div>';
        return;
    }

    const ICONOS_TIPO = {
        'Llave Dinamométrica': '🔧',
        'Llave Fija': '🔩',
        'Destornillador': '🪛',
        'Otro': '📦'
    };

    const ESTADOS_INFO = {
        'disponible': { color: '#10b981', texto: 'Disponible', icono: '🟢' },
        'reservada': { color: '#3b82f6', texto: 'Reservada', icono: '🔵' },
        'en_uso': { color: '#f59e0b', texto: 'En uso', icono: '🟡' },
        'en_calibracion': { color: '#f97316', texto: 'En calibración', icono: '🟠' },

    };

    let htmlFinal = '';

    arr.forEach(([id, h]) => {
        const tipo = h.tipo || 'Otro';
        const iconoTipo = ICONOS_TIPO[tipo] || '📦';
        const estado = h.estado || 'disponible';
let info = ESTADOS_INFO[estado] || ESTADOS_INFO.disponible;
const esMia = h.reservadaPor === miNombre;
const estaLibre = estado === 'disponible';
const esMiUso = estado === 'en_uso' && h.reservadaPor === miNombre;

const calib = comprobarCalibracion(h);
const calibVencida = calib.vencida;

if (calibVencida) {
    info = { color: '#f97316', texto: 'En calibración', icono: '🟠' };
}

let borderColor = info.color;
if (esMia && !calibVencida) borderColor = '#8b5cf6';
        let bloqueCalib = '';
        if (h.fechaProxCalib) {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const venc = new Date(h.fechaProxCalib + 'T00:00:00');
            const dias = Math.floor((venc - hoy) / (1000 * 60 * 60 * 24));

            let colorCal, iconoCal, textoCal;
            if (dias < 0) {
                colorCal = '#b91c1c'; iconoCal = '🔴';
                textoCal = 'Calibración vencida hace ' + Math.abs(dias) + ' días';
            } else if (dias <= 30) {
                colorCal = '#92400e'; iconoCal = '🟡';
                textoCal = 'Calibración vence en ' + dias + ' días';
            } else {
                colorCal = '#047857'; iconoCal = '🟢';
                textoCal = 'Calibración válida · vence ' + new Date(h.fechaProxCalib).toLocaleDateString('es-ES');
            }

            bloqueCalib = '<div style="font-size:0.72rem;color:' + colorCal + ';font-weight:600;background:' + colorCal + '10;padding:6px 10px;border-radius:8px;margin-top:8px;display:flex;align-items:center;gap:6px;">'
                + '<span>' + iconoCal + '</span><span>' + textoCal + '</span></div>';
        }

        let numeroHTML = '';
        if (h.numero) {
            numeroHTML = '<span style="background:#1e293b;color:white;padding:1px 7px;border-radius:6px;font-size:0.7rem;font-weight:800;font-family:\'SF Mono\',Monaco,monospace;">#' + h.numero + '</span>';
        }

        let codigoHTML = '';
        if (h.codigo) {
            codigoHTML = '<span style="font-family:\'SF Mono\',Monaco,monospace;color:#475569;">' + h.codigo + '</span>';
        }

        let parHTML = '';
        if (h.par) {
            parHTML = '<span style="background:#f5f3ff;color:#6d28d9;padding:1px 8px;border-radius:99px;font-weight:700;">💪 ' + h.par + ' Nm</span>';
        }

        let ubicHTML = '';
        if (h.ubicacion) {
            ubicHTML = '<span>📍 ' + h.ubicacion + '</span>';
        }

        let bloqueReserva = '';
        if (h.reservadaPor) {
            bloqueReserva = '<div style="font-size:0.75rem;color:' + (esMia ? '#6d28d9' : '#3b82f6') + ';font-weight:600;margin-bottom:10px;display:flex;align-items:center;gap:6px;background:' + (esMia ? '#f5f3ff' : '#eff6ff') + ';padding:6px 10px;border-radius:8px;">'
                + '👤 ' + (esMia ? 'Reservada por ti' : 'Reservada por ' + h.reservadaPor) + '</div>';
        }

        let botonesHTML = '';

        if (calibVencida) {
            botonesHTML += '<div style="flex:1;padding:9px 14px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;color:#b91c1c;font-size:0.78rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;">🚫 No disponible · Calibración vencida</div>';
        } else {
            if (estado === 'disponible') {
                botonesHTML += '<button onclick="reservarHerramienta(\'' + id + '\')" style="flex:1;padding:9px 14px;border:none;border-radius:8px;background:#3b82f6;color:white;font-size:0.78rem;font-weight:700;cursor:pointer;font-family:inherit;">🔵 Reservar</button>';
            }

            if (esMia && estado === 'reservada') {
                botonesHTML += '<button onclick="usarHerramienta(\'' + id + '\')" style="flex:1;padding:9px 14px;border:none;border-radius:8px;background:#f59e0b;color:white;font-size:0.78rem;font-weight:700;cursor:pointer;font-family:inherit;">🟡 Empezar</button>';
                botonesHTML += '<button onclick="devolverHerramienta(\'' + id + '\')" style="padding:9px 14px;border:1px solid #e5e7eb;border-radius:8px;background:white;color:#64748b;font-size:0.78rem;font-weight:700;cursor:pointer;font-family:inherit;">✅</button>';
            }

            if (esMiUso) {
                botonesHTML += '<button onclick="devolverHerramienta(\'' + id + '\')" style="flex:1;padding:9px 14px;border:none;border-radius:8px;background:#10b981;color:white;font-size:0.78rem;font-weight:700;cursor:pointer;font-family:inherit;">✅ Devolver</button>';
            }

if (estado === 'en_calibracion' && !esMia && !esMiUso) {
    botonesHTML += '<div style="flex:1;padding:9px 14px;border:1px solid #fed7aa;border-radius:8px;background:#fff7ed;color:#c2410c;font-size:0.78rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;">🔧 Enviada a calibrar</div>';
}
else if (!estaLibre && !esMia && !esMiUso) {
    botonesHTML += '<button onclick="pedirHerramientaOcupada(\'' + id + '\', \'' + (h.nombre || '').replace(/'/g, "\\'") + '\', \'' + (h.reservadaPor || '').replace(/'/g, "\\'") + '\')" style="flex:1;padding:9px 14px;border:1px solid #e5e7eb;border-radius:8px;background:white;color:#64748b;font-size:0.78rem;font-weight:600;cursor:pointer;font-family:inherit;">💬 Ver quién</button>';
}
        }

        htmlFinal += '<div data-herr-id="' + id + '" style="'
            + 'background:' + (calibVencida ? '#fef2f2' : 'white') + ';'
            + 'border:1px solid ' + (calibVencida ? '#fecaca' : (esMia ? '#ddd6fe' : '#e5e7eb')) + ';'
            + 'border-left:4px solid ' + borderColor + ';'
            + 'border-radius:12px;padding:14px 16px;transition:all 0.15s ease;'
            + (calibVencida ? 'opacity:0.85;' : '')
            + '">'
            + '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">'
            + '<span style="font-size:1.4rem;flex-shrink:0;">' + iconoTipo + '</span>'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="font-weight:700;font-size:0.92rem;color:#1e293b;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'
            + numeroHTML
            + '<span>' + (h.nombre || 'Sin nombre') + '</span>'
            + '</div>'
            + '<div style="font-size:0.72rem;color:#64748b;margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'
            + codigoHTML + parHTML + ubicHTML
            + '</div>'
            + '</div>'
            + '<span style="background:' + info.color + '18;color:' + info.color + ';padding:4px 12px;border-radius:99px;font-size:0.72rem;font-weight:700;white-space:nowrap;">'
            + info.icono + ' ' + info.texto + '</span>'
            + '</div>'
            + bloqueReserva
            + bloqueCalib
            + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">'
            + botonesHTML
            + '</div>'
            + '</div>';
    });

    cont.innerHTML = htmlFinal;
}

function filtrarHerramientasOperario() {
    renderHerramientasOperario();
}

function resetearFiltrosHerramientas() {
    const busqueda = document.getElementById('herramientasBusqueda');
    const tipo = document.getElementById('herrFiltroTipo');
    const estado = document.getElementById('herrFiltroEstado');
    const par = document.getElementById('herrFiltroPar');
    if (busqueda) busqueda.value = '';
    if (tipo) tipo.value = 'todos';
    if (estado) estado.value = 'todos';
    if (par) par.value = '';
    renderHerramientasOperario();
}

async function reservarHerramienta(id) {
    const miNombre = window.APP.operario?.nombre || 'Operario';

    try {
        const data = await cargarFirebase('herramientas', true);
        const h = data[id];
        if (!h) {
            toast('❌ Herramienta no encontrada', '#ef4444');
            return;
        }

        const calib = comprobarCalibracion(h);
        if (calib.vencida) {
            toast(`🚫 Calibración vencida hace ${Math.abs(calib.dias)} días · No se puede usar`, '#ef4444', 3500);
            return;
        }

        if ((h.estado || 'disponible') !== 'disponible') {
            toast('⚠️ Ya no está disponible', '#f59e0b');
            cargarHerramientasOperario();
            return;
        }

        await guardarFirebase('herramientas', id, {
            estado: 'reservada',
            reservadaPor: miNombre,
            fechaReserva: new Date().toISOString()
        });

        toast(`🔵 Reservada: ${h.nombre}`, '#3b82f6');
        cargarHerramientasOperario();
    } catch (e) {
        console.error('❌ Error:', e);
        toast('❌ Error al reservar', '#ef4444');
    }
}

async function usarHerramienta(id) {
    const miNombre = window.APP.operario?.nombre || 'Operario';

    try {
        const data = await cargarFirebase('herramientas', true);
        const h = data[id];
        if (!h) return;

        const calib = comprobarCalibracion(h);
        if (calib.vencida) {
            toast(`🚫 Calibración vencida · No se puede usar`, '#ef4444', 3500);
            return;
        }

        if (h.reservadaPor !== miNombre) {
            toast('⚠️ No es tuya', '#f59e0b');
            return;
        }

        await guardarFirebase('herramientas', id, {
            estado: 'en_uso',
            reservadaPor: miNombre,
            fechaInicioUso: new Date().toISOString()
        });

        toast(`🟡 En uso: ${h.nombre}`, '#f59e0b');
        cargarHerramientasOperario();
    } catch (e) {
        console.error('❌ Error:', e);
        toast('❌ Error', '#ef4444');
    }
}

async function devolverHerramienta(id) {
    const miNombre = window.APP.operario?.nombre || 'Operario';

    try {
        const data = await cargarFirebase('herramientas', true);
        const h = data[id];
        if (!h) return;

        if (h.reservadaPor && h.reservadaPor !== miNombre) {
            toast('⚠️ No es tuya', '#f59e0b');
            return;
        }

        const ok = await confirmar(
            `¿Devolver "${h.nombre}"?`,
            { titulo: '✅ Devolver', tipo: 'success', okTexto: '✅ Devolver' }
        );
        if (!ok) return;

        await guardarFirebase('herramientas', id, {
            estado: 'disponible',
            reservadaPor: '',
            fechaReserva: null,
            fechaInicioUso: null
        });

        toast(`✅ Devuelta: ${h.nombre}`, '#10b981');
        cargarHerramientasOperario();
    } catch (e) {
        console.error('❌ Error:', e);
        toast('❌ Error', '#ef4444');
    }
}

function pedirHerramientaOcupada(id, nombre, reservadaPor) {
    alertar(
        `La herramienta "${nombre}" está en uso por:\n\n👤 ${reservadaPor || 'Otro operario'}`,
        { titulo: '🔒 Herramienta ocupada', tipo: 'info' }
    );
}
