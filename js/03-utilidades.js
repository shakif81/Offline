async function subirACloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', 'traxx');
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        return data.secure_url;
    } catch (e) {
        console.error('❌ Error Cloudinary:', e);
        return null;
    }
}

function segundosAHHMMSS(s) {
    const abs = Math.abs(Math.round(s));
    const hh = Math.floor(abs / 3600);
    const mm = Math.floor((abs % 3600) / 60);
    const ss = abs % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function segundosAHorasDecimales(seg) {
    return (Math.abs(seg) / 3600).toFixed(2) + 'h';
}

function formatearFecha(fecha) {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
}

function fechaHoyISO() {
    return new Date().toISOString().split('T')[0];
}

function dialogo(mensaje, { titulo = 'Aviso', tipo = 'info', inputs = null, soloOk = false, okTexto = 'Aceptar' } = {}) {
    return new Promise(resolve => {
        document.querySelectorAll('._traxx_dialogo').forEach(d => d.remove());

        document.getElementById('modalCambioMontaje')?.remove();

        const colores = {
            info: 'var(--secondary)',
            warning: 'var(--warning)',
            danger: 'var(--danger)',
            success: 'var(--success)'
        };

        const m = document.createElement('div');
        m.className = '_traxx_dialogo';
        m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';

        m.innerHTML = `
            <div style="background:white;border-radius:16px;padding:24px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
                <h3 style="color:${colores[tipo]};margin-bottom:8px;">${titulo}</h3>
                <p style="font-size:0.9rem;margin-bottom:16px;white-space:pre-wrap;color:var(--gray-700);">${mensaje}</p>
                ${inputs ? inputs.map(i => `<input id="_dlg_${i.name}" placeholder="${i.placeholder||''}" value="${i.value||''}" style="width:100%;padding:10px;border-radius:6px;border:1px solid var(--gray-300);margin-bottom:10px;font-size:0.85rem;">`).join('') : ''}
                <div style="display:flex;gap:8px;">
                    <button id="_dlg_ok" style="flex:1;padding:12px;border:none;border-radius:10px;background:${colores[tipo]};color:white;font-weight:700;cursor:pointer;">${okTexto}</button>
                    ${!soloOk ? '<button id="_dlg_cancel" style="padding:12px 16px;border:1px solid var(--gray-300);border-radius:10px;background:white;cursor:pointer;">Cancelar</button>' : ''}
                </div>
            </div>`;

        document.body.appendChild(m);

        document.getElementById('_dlg_ok').onclick = () => {
            const valores = inputs
                ? Object.fromEntries(inputs.map(i => [i.name, document.getElementById('_dlg_' + i.name).value]))
                : true;
            m.remove();
            resolve(valores);
        };

        if (!soloOk) {
            document.getElementById('_dlg_cancel').onclick = () => {
                m.remove();
                resolve(null);
            };
        }

        if (inputs && inputs.length === 1) {
            document.getElementById('_dlg_' + inputs[0].name).addEventListener('keydown', e => {
                if (e.key === 'Enter') document.getElementById('_dlg_ok').click();
            });
        }
    });
}

function confirmar(msg, opts = {}) {
    return dialogo(msg, { titulo: '⚠️ Confirmar', tipo: 'warning', ...opts });
}

function alertar(msg, opts = {}) {
    return dialogo(msg, { titulo: 'ℹ️ Aviso', tipo: 'info', soloOk: true, ...opts });
}

function preguntar(msg, placeholder = '', opts = {}) {
    return dialogo(msg, {
        titulo: '📝 Introduce',
        tipo: 'info',
        inputs: [{ name: 'valor', placeholder }],
        ...opts
    }).then(r => r ? r.valor : null);
}

function mostrarLoading(msg = 'Procesando...') {
    if (document.getElementById('_globalLoading')) return;
    const d = document.createElement('div');
    d.id = '_globalLoading';
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99998;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:white;font-weight:600;';
    d.innerHTML = `<div style="width:50px;height:50px;border:4px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.8s linear infinite;"></div><div>${msg}</div>`;
    document.body.appendChild(d);
}

function ocultarLoading() {
    document.getElementById('_globalLoading')?.remove();
}

function toast(msg, color = '#10b981', duracion = 3000) {
    try {
        document.querySelectorAll('.traxx-toast').forEach(t => t.remove());

        const t = document.createElement('div');
        t.className = 'traxx-toast';
        t.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: ${color};
            color: white;
            padding: 14px 24px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 0.9rem;
            z-index: 2147483647;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            max-width: 90vw;
            text-align: center;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease, transform 0.3s ease;
            font-family: inherit;
        `;
        t.textContent = msg;
        document.body.appendChild(t);

        requestAnimationFrame(() => {
            t.style.opacity = '1';
            t.style.transform = 'translateX(-50%) translateY(0)';
        });

        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => t.remove(), 300);
        }, duracion);

    } catch (e) {
        console.error('❌ Error en toast:', e);
    }
}

function formatearFechaCorta(fechaISO) {
    if (!fechaISO) return '';
    try {
        const f = new Date(fechaISO);
        const dia = String(f.getDate()).padStart(2, '0');
        const mes = String(f.getMonth() + 1).padStart(2, '0');
        const año = String(f.getFullYear()).slice(-2);
        const hh = String(f.getHours()).padStart(2, '0');
        const mm = String(f.getMinutes()).padStart(2, '0');
        return `${dia}/${mes}/${año} · ${hh}:${mm}`;
    } catch (e) {
        return '';
    }
}
