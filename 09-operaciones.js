function _idOperarioOrden() {
    const nombre = window.APP.operario?.nombre || 'anonimo';
    return nombre.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

async function obtenerOrdenOps() {
    try {
        const operarioId = _idOperarioOrden();
        const data = await cargarFirebase('orden_operaciones');
        const doc = data[operarioId];
        return Array.isArray(doc?.orden) ? doc.orden : [];
    } catch (e) {
        console.warn('⚠️ Error leyendo orden de operaciones:', e);
        return [];
    }
}

async function registrarUsoOperacion(operacionId) {
    if (!operacionId) return;
    try {
        const operarioId = _idOperarioOrden();
        const nombre = window.APP.operario?.nombre || 'Anónimo';

        const data = await cargarFirebase('orden_operaciones', true);
        const doc = data[operarioId] || { orden: [] };
        let orden = Array.isArray(doc.orden) ? doc.orden : [];

        orden = orden.filter(id => id !== operacionId);
        orden.unshift(operacionId);
        orden = orden.slice(0, 50);

        await guardarFirebase('orden_operaciones', operarioId, {
            operario: nombre,
            orden: orden,
            ultimaActualizacion: new Date().toISOString()
        });
    } catch (e) {
        console.warn('⚠️ Error guardando orden de operaciones:', e);
    }
}

async function cargarOperaciones() {
    const grid = document.getElementById('operacionesGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="empty-state">⏳ Cargando operaciones...</div>';

    const ops = await cargarFirebase('operaciones');

const ordenReciente = await obtenerOrdenOps();
const posicionReciente = new Map();
ordenReciente.forEach((id, idx) => posicionReciente.set(id, idx));

const arr = Object.entries(ops).sort((a, b) => {
    const posA = posicionReciente.has(a[0]) ? posicionReciente.get(a[0]) : Infinity;
    const posB = posicionReciente.has(b[0]) ? posicionReciente.get(b[0]) : Infinity;

    if (posA !== Infinity || posB !== Infinity) {
        if (posA !== posB) return posA - posB;
    }

    return String(b[1].numero || '').localeCompare(String(a[1].numero || ''), undefined, { numeric: true });
});

    if (!arr.length) {
        grid.innerHTML = '<div class="empty-state">📭 No hay operaciones. Créalas en Admin.</div>';
        return;
    }

    const paletas = {
        MS3: {
            bg: '#ecfdf5', bgHover: '#d1fae5', border: '#a7f3d0',
            accent: '#10b981', text: '#047857',
            badgeBg: '#10b981', badgeText: '#ffffff', icono: '🔷'
        },
        DC3: {
            bg: '#eff6ff', bgHover: '#dbeafe', border: '#bfdbfe',
            accent: '#3b82f6', text: '#1d4ed8',
            badgeBg: '#3b82f6', badgeText: '#ffffff', icono: '🔶'
        }
    };

    grid.innerHTML = arr.map(([id, op]) => {
    const p = paletas[op.modelo] || paletas.MS3;
    const esReciente = posicionReciente.has(id);
    const posReciente = posicionReciente.get(id);

    return `
        <div onclick="seleccionarOperacion('${id}')"
            style="background:${p.bg};border:1px solid ${p.border};border-left:4px solid ${esReciente ? '#8b5cf6' : p.accent};border-radius:12px;padding:1.1rem 1.2rem;cursor:pointer;transition:all 0.2s ease;text-align:left;position:relative;overflow:hidden;"
            onmouseover="this.style.background='${p.bgHover}'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px ${p.accent}22';"
            onmouseout="this.style.background='${p.bg}'; this.style.transform='translateY(0)'; this.style.boxShadow='';">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.6rem;">
                <span style="font-size:1.1rem;line-height:1;">${p.icono}</span>
                <div style="display:flex;gap:4px;align-items:center;">
                    ${esReciente && posReciente === 0 ? `
                        <span style="background:#8b5cf6;color:white;padding:3px 8px;border-radius:99px;font-size:0.62rem;font-weight:700;letter-spacing:0.03em;">🕐 ÚLTIMA</span>
                    ` : esReciente ? `
                        <span style="background:#ede9fe;color:#6d28d9;padding:3px 8px;border-radius:99px;font-size:0.62rem;font-weight:700;letter-spacing:0.03em;">🕐</span>
                    ` : ''}
                    <span style="background:${p.badgeBg};color:${p.badgeText};padding:3px 10px;border-radius:99px;font-size:0.68rem;font-weight:700;letter-spacing:0.03em;">${op.modelo || 'MS3'}</span>
                </div>
            </div>
                <div style="font-size:1.6rem;font-weight:800;color:${p.text};font-family:'SF Mono', Monaco, monospace;letter-spacing:-0.02em;line-height:1.1;margin-bottom:0.3rem;">${op.numero || '—'}</div>
                ${op.descripcion ? `
                    <div style="font-size:0.78rem;color:${p.text};opacity:0.85;font-weight:500;line-height:1.3;">${op.descripcion}</div>
                ` : `
                    <div style="font-size:0.78rem;color:${p.text};opacity:0.5;font-style:italic;">Sin descripción</div>
                `}
                <div style="position:absolute;right:12px;bottom:12px;color:${p.accent};opacity:0.4;font-size:0.9rem;">→</div>
            </div>
        `;
    }).join('');
}

async function seleccionarOperacion(operacionId) {
    window.APP.operacionActiva = operacionId;
    window.operacionActiva = operacionId;

    registrarUsoOperacion(operacionId).catch(e => console.warn(e));

    const ops = await cargarFirebase('operaciones');
    const op = ops[operacionId];
    if (!op) {
        toast('❌ Operación no encontrada', '#ef4444');
        return;
    }

    window.APP.modeloActivo = op.modelo || 'MS3';

    document.getElementById('montajesTitulo').textContent = 'Operación ' + (op.numero || '—');
    document.getElementById('montajesSubtitulo').textContent = '';

    const infoBar = document.getElementById('operacionInfoBar');
    infoBar.style.display = 'flex';
    document.getElementById('infoOpNumero').textContent = op.numero || '—';
    document.getElementById('infoOpModelo').textContent = op.modelo || 'MS3';

setTimeout(() => mostrarAvisoInspeccionCaldereria(operacionId), 300);

    showPage('montajes-operacion');
    cargarMontajesOperacion(operacionId, op.modelo);
}

function volverAOperaciones() {
    window.APP.operacionActiva = null;
    window.operacionActiva = null;

    const badge = document.getElementById('cronoBadgeFlotante');
    if (badge) badge.style.display = 'none';
    const badgeIr = document.getElementById('cronoBadgeIr');
    if (badgeIr) badgeIr.style.display = 'none';
    if (window.APP.badgeTick) {
        clearInterval(window.APP.badgeTick);
        window.APP.badgeTick = null;
    }
    showPage('operaciones');
}

function filtrarPorOperario(operario) {
    window.APP.filtroOperario = operario;
    if (window.APP.operacionActiva) {
        const modelo = window.APP.modeloActivo || 'MS3';
        cargarMontajesOperacion(window.APP.operacionActiva, modelo);
    }
}
