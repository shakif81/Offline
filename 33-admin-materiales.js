async function cargarAdminMateriales() {
    const container = document.getElementById('adminMaterialesList');
    const contador = document.getElementById('adminMaterialesContador');
    if (!container) return;

    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">⏳ Cargando...</div>';

    const materiales = await cargarFirebase('materiales_catalogo', true);
    const busqueda = (document.getElementById('adminMaterialesBusqueda')?.value || '').toLowerCase().trim();
    const filtro = document.getElementById('filtroTipoAdminMateriales')?.value || 'todos';

    let arr = Object.entries(materiales);

if (filtro === 'normales') {
    arr = arr.filter(([id, m]) => !m.requiereEscaneo && m.esResistencia !== true);
} else if (filtro === 'escaneo') {
    arr = arr.filter(([id, m]) => m.requiereEscaneo === true);
} else if (filtro === 'resistencias') {
    arr = arr.filter(([id, m]) => m.esResistencia === true);
}

    if (busqueda) {
        arr = arr.filter(([id, m]) =>
            (m.nombre || '').toLowerCase().includes(busqueda) ||
            (m.codigo || '').toLowerCase().includes(busqueda) ||
            (m.ubicacion || '').toLowerCase().includes(busqueda)
        );
    }

    arr.sort((a, b) => (a[1].nombre || '').localeCompare(b[1].nombre || ''));

    if (contador) contador.textContent = `${arr.length} material${arr.length !== 1 ? 'es' : ''}`;

    if (!arr.length) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                ${busqueda ? '🔍 Sin resultados para "' + busqueda + '"' : '📭 No hay materiales. Crea el primero.'}
            </div>
        `;
        return;
    }

    container.innerHTML = arr.map(([id, mat]) => {
        const esResistencia = mat.esResistencia === true;
const esEscaneo = mat.requiereEscaneo === true;

let color = '#f97316';
let icono = '🧪';
let etiqueta = 'Normal';

if (esResistencia) {
    color = '#f59e0b';
    icono = '⚡';
    etiqueta = 'Resistencia';
} else if (esEscaneo) {
    color = '#3b82f6';
    icono = '📷';
    etiqueta = 'Escaneo';
}

const colorBg = color + '10';
const colorBorder = color + '50';

        return `
            <div onclick="editarMaterialAdmin('${id}')"
                style="background:white;border:1px solid ${colorBorder};border-left:4px solid ${color};border-radius:14px;padding:14px 16px;cursor:pointer;transition:all 0.2s ease;position:relative;overflow:hidden;"
                onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 20px ${color}22';"
                onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='';">

                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                 <span style="background:${colorBg};color:${color};padding:4px 8px;border-radius:8px;font-size:0.7rem;font-weight:700;display:flex;align-items:center;gap:4px;border:1px solid ${colorBorder};">
    ${icono} ${etiqueta}
</span>
                    <button onclick="event.stopPropagation();duplicarMaterialAdmin('${id}')"
                        style="background:white;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.7rem;color:#64748b;cursor:pointer;font-family:inherit;font-weight:600;"
                        onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">📋 Copiar</button>
                </div>

                <div style="font-weight:700;font-size:0.95rem;color:#1e293b;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${mat.nombre || 'Sin nombre'}</div>

                ${mat.codigo ? `
                    <div style="font-size:0.75rem;color:${color};font-family:'SF Mono',Monaco,monospace;font-weight:600;margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${mat.codigo}</div>
                ` : `
                    <div style="font-size:0.75rem;color:#cbd5e1;font-style:italic;margin-bottom:8px;">Sin código</div>
                `}

                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:10px;border-top:1px solid #f1f5f9;">
                    <span style="font-size:0.72rem;color:${mat.ubicacion ? '#64748b' : '#94a3b8'};font-weight:600;display:flex;align-items:center;gap:4px;">📍 ${mat.ubicacion || 'Sin ubicación'}</span>
                    <span style="font-size:1rem;color:${color};opacity:0.6;">→</span>
                </div>
            </div>
        `;
    }).join('');
}

function mostrarFormNuevoMaterial() {
    document.getElementById('adminMaterialesForm').style.display = 'block';
    document.getElementById('adminMaterialFormTitulo').textContent = 'Nuevo Material';

    document.getElementById('adminMaterialId').value = '';
    document.getElementById('adminMaterialNombre').value = '';
    document.getElementById('adminMaterialCodigo').value = '';
    document.getElementById('adminMaterialUbicacion').value = '';
    document.getElementById('adminMaterialRequiereEscaneo').checked = false;
document.getElementById('adminMaterialEsResistencia').checked = false;
document.getElementById('adminMaterialNombresResistencias').value = '';
document.getElementById('adminMaterialNombresResistenciasGroup').style.display = 'none';
document.getElementById('btnEliminarMaterial').style.display = 'none';

    actualizarPreviewMaterial();

    document.getElementById('adminMaterialesForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => document.getElementById('adminMaterialNombre').focus(), 300);
}

function editarMaterialAdmin(id) {
    cargarFirebase('materiales_catalogo').then(materiales => {
        const mat = materiales[id];
        if (!mat) return;

        document.getElementById('adminMaterialesForm').style.display = 'block';
        document.getElementById('adminMaterialFormTitulo').textContent = 'Editar Material';

        document.getElementById('adminMaterialId').value = id;
        document.getElementById('adminMaterialNombre').value = mat.nombre || '';
        document.getElementById('adminMaterialCodigo').value = mat.codigo || '';
        document.getElementById('adminMaterialUbicacion').value = mat.ubicacion || '';
        document.getElementById('adminMaterialRequiereEscaneo').checked = mat.requiereEscaneo === true;
document.getElementById('adminMaterialEsResistencia').checked = mat.esResistencia === true;

const nombres = Array.isArray(mat.nombresResistencias) ? mat.nombresResistencias : [];
document.getElementById('adminMaterialNombresResistencias').value = nombres.join('\n');
document.getElementById('adminMaterialNombresResistenciasGroup').style.display =
    mat.esResistencia === true ? 'block' : 'none';

document.getElementById('btnEliminarMaterial').style.display = 'inline-flex';

        actualizarPreviewMaterial();

        document.getElementById('adminMaterialesForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

function cerrarFormMaterial() {
    document.getElementById('adminMaterialesForm').style.display = 'none';
    document.getElementById('adminMaterialId').value = '';
    document.getElementById('adminMaterialNombre').value = '';
    document.getElementById('adminMaterialCodigo').value = '';
    document.getElementById('adminMaterialUbicacion').value = '';
    document.getElementById('adminMaterialRequiereEscaneo').checked = false;
document.getElementById('adminMaterialEsResistencia').checked = false;
document.getElementById('adminMaterialNombresResistencias').value = '';
document.getElementById('adminMaterialNombresResistenciasGroup').style.display = 'none';
document.getElementById('btnEliminarMaterial').style.display = 'none';
}

function actualizarPreviewMaterial() {
    const preview = document.getElementById('adminMaterialPreview');
    if (!preview) return;

    const nombre = document.getElementById('adminMaterialNombre')?.value || 'Sin nombre';
    const codigo = document.getElementById('adminMaterialCodigo')?.value || '';
    const ubicacion = document.getElementById('adminMaterialUbicacion')?.value || '';
    const esEscaneo = document.getElementById('adminMaterialRequiereEscaneo')?.checked;
const esResistencia = document.getElementById('adminMaterialEsResistencia')?.checked;
    const color = esEscaneo ? '#3b82f6' : '#f97316';
    const colorBg = color + '15';
    const icono = esEscaneo ? '📷' : '🧪';

    const label = document.getElementById('adminMaterialEscaneoLabel');
    if (label) {
        if (esEscaneo) {
            label.style.borderColor = '#3b82f6';
            label.style.background = '#eff6ff';
        } else {
            label.style.borderColor = '#cbd5e1';
            label.style.background = 'white';
        }
    }

const labelRes = document.getElementById('adminMaterialResistenciaLabel');
if (labelRes) {
    if (esResistencia) {
        labelRes.style.borderColor = '#f59e0b';
        labelRes.style.background = '#fffbeb';
    } else {
        labelRes.style.borderColor = '#cbd5e1';
        labelRes.style.background = 'white';
    }
}
const groupNombres = document.getElementById('adminMaterialNombresResistenciasGroup');
if (groupNombres) {
    groupNombres.style.display = esResistencia ? 'block' : 'none';
}
    preview.innerHTML = `
        <div style="width:40px;height:40px;background:${colorBg};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">${icono}</div>
        <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:0.9rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                ${nombre}
                ${codigo ? `<span style="font-family:'SF Mono',Monaco,monospace;font-size:0.72rem;color:#64748b;font-weight:400;">(${codigo})</span>` : ''}
            </div>
          <div style="font-size:0.75rem;color:${esResistencia ? '#f59e0b' : color};font-weight:600;display:flex;align-items:center;gap:6px;margin-top:2px;flex-wrap:wrap;">
    <span>${esResistencia ? '⚡ Resistencia' : esEscaneo ? '📷 Requiere escaneo' : '🧪 Material normal'}</span>
                ${ubicacion ? `<span style="color:#cbd5e1;">·</span><span style="color:#64748b;font-weight:400;">📍 ${ubicacion}</span>` : ''}
            </div>
        </div>
    `;
}

async function guardarMaterialAdmin() {
    const id = document.getElementById('adminMaterialId').value || 'mat_' + Date.now();
    const nombre = document.getElementById('adminMaterialNombre').value.trim();
    const codigo = document.getElementById('adminMaterialCodigo').value.trim();
    const ubicacion = document.getElementById('adminMaterialUbicacion').value.trim();
    const requiereEscaneo = document.getElementById('adminMaterialRequiereEscaneo').checked;
const esResistencia = document.getElementById('adminMaterialEsResistencia').checked;

    if (!nombre) {
        alertar('El nombre del material es obligatorio', { tipo: 'warning' });
        document.getElementById('adminMaterialNombre').focus();
        return;
    }
    if (nombre.length < 2) {
        alertar('El nombre es demasiado corto', { tipo: 'warning' });
        return;
    }

    const materiales = await cargarFirebase('materiales_catalogo');
    const duplicado = Object.entries(materiales).find(([oid, m]) =>
        oid !== id && (m.nombre || '').toLowerCase() === nombre.toLowerCase()
    );
    if (duplicado) {
        alertar(`Ya existe un material llamado "${nombre}"`, { tipo: 'warning' });
        return;
    }

    if (codigo) {
        const duplicadoCod = Object.entries(materiales).find(([oid, m]) =>
            oid !== id && (m.codigo || '').toLowerCase() === codigo.toLowerCase()
        );
        if (duplicadoCod) {
            alertar(`Ya existe un material con el código "${codigo}"`, { tipo: 'warning' });
            return;
        }
    }

const nombresTexto = document.getElementById('adminMaterialNombresResistencias')?.value || '';
const nombresResistencias = esResistencia
    ? nombresTexto.split('\n').map(l => l.trim()).filter(l => l)
    : [];

if (esResistencia && nombresResistencias.length === 0) {
    console.info('ℹ️ Material marcado como resistencia sin nombres definidos');
}

const data = {
    nombre: nombre,
    codigo: codigo,
    ubicacion: ubicacion,
    requiereEscaneo: requiereEscaneo,
    esResistencia: esResistencia,
    nombresResistencias: nombresResistencias
};

    mostrarLoading('Guardando material...');
    const ok = await guardarFirebase('materiales_catalogo', id, data);
    ocultarLoading();

    if (ok) {
        toast('✅ Material guardado', '#10b981');
        cerrarFormMaterial();
        cargarAdminMateriales();
    } else {
        toast('❌ Error al guardar', '#ef4444');
    }
}

async function duplicarMaterialAdmin(id) {
    const materiales = await cargarFirebase('materiales_catalogo');
    const mat = materiales[id];
    if (!mat) return;

    const nombreOriginal = mat.nombre || 'Sin nombre';
    const nuevoNombre = await preguntar(
        `Duplicar material "${nombreOriginal}"\n\nEscribe el nombre del nuevo material:`,
        `${nombreOriginal} (copia)`
    );
    if (!nuevoNombre) return;

    const nombreLimpio = nuevoNombre.trim();
    if (!nombreLimpio) {
        alertar('El nombre no puede estar vacío', { tipo: 'warning' });
        return;
    }

    const duplicado = Object.values(materiales).find(m =>
        (m.nombre || '').toLowerCase() === nombreLimpio.toLowerCase()
    );
    if (duplicado) {
        alertar(`Ya existe un material "${nombreLimpio}"`, { tipo: 'warning' });
        return;
    }

    const nuevoId = 'mat_' + Date.now();

    mostrarLoading('Duplicando material...');
    const ok = await guardarFirebase('materiales_catalogo', nuevoId, {
    nombre: nombreLimpio,
    codigo: mat.codigo || '',
    ubicacion: mat.ubicacion || '',
    requiereEscaneo: mat.requiereEscaneo === true,
    esResistencia: mat.esResistencia === true,
    nombresResistencias: Array.isArray(mat.nombresResistencias) ? [...mat.nombresResistencias] : []
});
    ocultarLoading();

    if (ok) {
        toast(`✅ Material duplicado: ${nombreLimpio}`, '#10b981');
        cargarAdminMateriales();
    } else {
        toast('❌ Error al duplicar', '#ef4444');
    }
}

async function eliminarMaterialAdmin() {
    const id = document.getElementById('adminMaterialId').value;
    if (!id) return;

    const nombre = document.getElementById('adminMaterialNombre').value || 'este material';

    const montajes = await cargarFirebase('montajes');
    const montajesQueLoUsan = Object.values(montajes).filter(m => {
        if (!m.materialesNecesarios) return false;
        return m.materialesNecesarios.split('||').some(item => {
            const ref = item.trim().split('=')[0];
            return ref === id;
        });
    });

    if (montajesQueLoUsan.length > 0) {
        const ok = await confirmar(
            `⚠️ El material "${nombre}" está siendo usado en ${montajesQueLoUsan.length} montaje(s).\n\nSi lo eliminas, esos montajes quedarán sin nombre para ese material.\n\n¿Estás seguro?`,
            { titulo: '⚠️ Eliminar material usado', tipo: 'danger', okTexto: '🗑️ Eliminar de todas formas' }
        );
        if (!ok) return;
    } else {
        const ok = await confirmar(
            `¿Eliminar el material "${nombre}"?\n\nEsta acción no se puede deshacer.`,
            { titulo: '🗑️ Eliminar material', tipo: 'danger', okTexto: '🗑️ Eliminar' }
        );
        if (!ok) return;
    }

    mostrarLoading('Eliminando...');
    const eliminado = await eliminarFirebase('materiales_catalogo', id);
    ocultarLoading();

    if (eliminado) {
        toast('🗑️ Material eliminado', '#10b981');
        cerrarFormMaterial();
        cargarAdminMateriales();
    } else {
        toast('❌ Error al eliminar', '#ef4444');
    }
}
