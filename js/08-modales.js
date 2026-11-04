document.addEventListener('keydown', _escHandlerGlobal);

function verPdfGrande(url, nombre) {
    const modal = document.createElement('div');
    modal.id = 'modalPdfGrande';
    modal.style.cssText = 'position:fixed;inset:0;background:white;z-index:99999;display:flex;flex-direction:column;overflow:hidden;';

    modal.innerHTML = `
        <div style="background:white;border-bottom:1px solid #e5e7eb;padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex;align-items:center;gap:14px;min-width:0;">
                <div style="width:48px;height:48px;background:#fef2f2;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">📄</div>
                <div style="min-width:0;">
                    <h2 style="margin:0;color:#1e293b;font-size:1.15rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${nombre || 'Documento'}</h2>
                    <a href="${url}" target="_blank" style="font-size:0.78rem;color:#6366f1;text-decoration:none;">↗ Abrir en pestaña nueva</a>
                </div>
            </div>
            <button onclick="cerrarModal('modalPdfGrande')"
                style="background:#f1f5f9;border:none;border-radius:10px;width:44px;height:44px;font-size:1.3rem;cursor:pointer;color:#475569;display:flex;align-items:center;justify-content:center;flex-shrink:0;">✕</button>
        </div>
        <div style="flex:1;overflow:hidden;background:#f1f5f9;">
            <iframe src="${url}" style="width:100%;height:100%;border:none;"></iframe>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function verFotoGrande(url) {
    document.getElementById('modalFotoGrande')?.remove();
    
    const modal = document.createElement('div');
    modal.id = 'modalFotoGrande';
    // touch-action: none es clave para evitar que el navegador haga zoom a toda la pantalla
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:99999;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none;';
    
    modal.innerHTML = `
        <button onclick="cerrarModal('modalFotoGrande')"
            style="position:absolute;top:20px;right:20px;background:white;border:none;border-radius:10px;width:44px;height:44px;font-size:1.3rem;cursor:pointer;color:#1e293b;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:2;">✕</button>
        <img id="imgZoom" src="${url}" style="max-width:100%;max-height:100%;object-fit:contain;transform-origin:center;user-select:none;-webkit-user-drag:none;">
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const img = modal.querySelector('#imgZoom');

    // Variables para controlar el zoom y el desplazamiento
    let scale = 1;
    let startDist = 0;
    let currentScale = 1;
    let panX = 0, panY = 0;
    let startX = 0, startY = 0;
    let lastTap = 0;

    // ─────────────────────────────────────────────
    // GESTOS TÁCTILES (Móvil / Tablet)
    // ─────────────────────────────────────────────
    modal.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            // Dos dedos: iniciar zoom
            startDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            currentScale = scale;
        } else if (e.touches.length === 1 && scale > 1) {
            // Un dedo (solo si hay zoom): iniciar arrastre
            startX = e.touches[0].pageX - panX;
            startY = e.touches[0].pageY - panY;
        }
    }, { passive: false });

    modal.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Evita scroll de la página
        if (e.touches.length === 2) {
            // Calcular zoom
            const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            scale = Math.min(Math.max(1, currentScale * (dist / startDist)), 6); // Límite max 6x
            if (scale === 1) { panX = 0; panY = 0; }
            img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        } else if (e.touches.length === 1 && scale > 1) {
            // Calcular arrastre
            panX = e.touches[0].pageX - startX;
            panY = e.touches[0].pageY - startY;
            img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        }
    }, { passive: false });

    modal.addEventListener('touchend', (e) => {
        // Doble toque para hacer zoom rápido
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0 && e.touches.length === 0) {
            if (scale > 1) {
                scale = 1; panX = 0; panY = 0;
            } else {
                scale = 2.5;
            }
            img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        }
        lastTap = currentTime;
    });

    // ─────────────────────────────────────────────
    // RATÓN (Ordenador)
    // ─────────────────────────────────────────────
    modal.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.2 : 0.2;
        scale = Math.min(Math.max(1, scale + delta), 6);
        if (scale === 1) { panX = 0; panY = 0; }
        img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }, { passive: false });

    let isDragging = false;
    modal.addEventListener('mousedown', (e) => {
        if (scale > 1) {
            isDragging = true;
            startX = e.pageX - panX;
            startY = e.pageY - panY;
            img.style.cursor = 'grabbing';
        }
    });
    modal.addEventListener('mousemove', (e) => {
        if (isDragging) {
            panX = e.pageX - startX;
            panY = e.pageY - startY;
            img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        }
    });
    modal.addEventListener('mouseup', () => {
        isDragging = false;
        img.style.cursor = scale > 1 ? 'grab' : 'default';
    });
    modal.addEventListener('mouseleave', () => {
        isDragging = false;
    });
}

function renderVideoEmbed(url) {
    if (!url) return '';

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split(/[?&]/)[0];
        else if (url.includes('watch?v=')) videoId = url.split('watch?v=')[1].split(/[?&]/)[0];
        else if (url.includes('/embed/')) videoId = url.split('/embed/')[1].split(/[?&]/)[0];
        return `<iframe src="https://www.youtube.com/embed/${videoId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>`;
    }

    if (url.includes('vimeo.com')) {
        const id = url.match(/vimeo\.com\/(\d+)/)?.[1];
        if (id) return `<iframe src="https://player.vimeo.com/video/${id}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen></iframe>`;
    }

    if (url.match(/\.(mp4|webm|ogg)$/i)) {
        return `<video src="${url}" controls style="position:absolute;top:0;left:0;width:100%;height:100%;background:#000;"></video>`;
    }

    return `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#f8fafc;"><a href="${url}" target="_blank" style="color:#6366f1;font-weight:600;text-decoration:none;font-size:0.9rem;">▶️ Abrir video en pestaña nueva</a></div>`;
}

function cerrarModal(idModal) {
    const modal = document.getElementById(idModal);
    if (modal) modal.remove();
    document.body.style.overflow = '';
}

function _escHandlerGlobal(e) {
    if (e.key === 'Escape') {
        const modales = [
    'modalDetalleMontaje',
    'modalInstruccionesMontaje',
    'modalUbicacionesKanban',
    'modalFotoGrande',
    'modalPdfGrande',
    'modalDetalleEstacion',
    'modalDetallePasos',
    'modalResistencias',
    'modalNuevoChat',
    'modalRevisionQC',
    'modalRechazoMontaje',
    'modalEscaner',
    'modalEscanerManual'
];
        for (const id of modales) {
            const modal = document.getElementById(id);
            if (modal) {
                cerrarModal(id);
                return;
            }
        }

if (document.getElementById('alertaQC')) {
    cerrarAlertaQC();
    return;
}

if (document.getElementById('modalCamaraEscaner')) {
    cerrarCamaraEscaner();
    return;
}

if (document.getElementById('alertaCorreccionAdmin')) {
    cerrarAlertaCorreccionAdmin();
    return;
}
if (window.APP.panelChat?.abierto) {
    cerrarPanelChatFlotante();
    return;
}
 }
}
