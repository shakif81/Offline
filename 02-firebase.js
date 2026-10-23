function inicializarFirebase() {
    if (window.APP.db) return window.APP.db;
    try {
        firebase.initializeApp(FIREBASE_CONFIG);
        window.APP.db = firebase.firestore();
        window.db = window.APP.db;
        if (typeof window.APP.db.enablePersistence === 'function') {
            window.APP.db.enablePersistence({ synchronizeTabs: true })
                .then(() => { window.APP.persistenciaOffline = true; })
                .catch(e => {
                    window.APP.persistenciaOffline = false;
                    console.warn('⚠️ Persistencia offline no disponible:', e.code || e);
                });
        }
        return window.APP.db;
    } catch (e) {
        console.error('❌ Error inicializando Firebase:', e);
        return null;
    }
}

async function esperarEscritura(promesa, ms = 6000) {
    promesa.catch(e => console.warn('⚠️ Escritura rechazada al sincronizar:', e));
    if (!navigator.onLine) {
        window.APP.escriturasPendientes = (window.APP.escriturasPendientes || 0) + 1;
        if (typeof actualizarIndicadorConexion === 'function') actualizarIndicadorConexion();
        return true;
    }
    try {
        return await Promise.race([
            promesa.then(() => true),
            new Promise(resolve => setTimeout(() => {
                window.APP.escriturasPendientes = (window.APP.escriturasPendientes || 0) + 1;
                resolve(true);
            }, ms))
        ]);
    } catch (e) {
        console.error('❌ Escritura rechazada:', e);
        return false;
    }
}

async function guardarFirebase(col, id, data) {
    const db = window.APP.db;
    if (!db) return false;
    try {
        const ok = await esperarEscritura(db.collection(col).doc(id).set(data, { merge: true }));
        if (ok) delete window.APP.fbCache[col];
        return ok;
    } catch (e) {
        console.error(`❌ Error guardando ${col}/${id}:`, e);
        return false;
    }
}

async function eliminarFirebase(col, id) {
    const db = window.APP.db;
    if (!db) return false;
    try {
        const ok = await esperarEscritura(db.collection(col).doc(id).delete());
        if (ok) delete window.APP.fbCache[col];
        return ok;
    } catch (e) {
        console.error(`❌ Error eliminando ${col}/${id}:`, e);
        return false;
    }
}

async function cargarFirebase(col, forceRefresh = false) {
    const db = window.APP.db;
    if (!db) return {};

    const CACHE_TTL = 10000;
    const cached = window.APP.fbCache[col];
    if (!forceRefresh && cached && (Date.now() - cached.ts) < CACHE_TTL) {
        return cached.data;
    }
    try {
        const ref = db.collection(col);
        let snap;
        if (!navigator.onLine) {
            snap = await ref.get({ source: 'cache' });
        } else {
            snap = await Promise.race([
                ref.get(),
                new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('timeout')), 5000))
            ]).catch(() => ref.get({ source: 'cache' }));
        }
        const result = {};
        snap.forEach(doc => { result[doc.id] = doc.data(); });
        window.APP.fbCache[col] = { data: result, ts: Date.now() };
        return result;
    } catch (e) {
        console.error(`❌ Error cargando ${col}:`, e);
        return cached?.data || {};
    }
}
