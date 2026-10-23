const IdGen = {
    _fecha: () => new Date().toISOString().split('T')[0],
    _hora: () => new Date().toTimeString().slice(0, 8).replace(/:/g, ''),

    operario: (nombre) => {
        return String(nombre || '').toLowerCase().trim()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '') || 'operario_' + Date.now();
    },

    operacion: (numero) => {
        return String(numero || '').trim().replace(/\s+/g, '') || 'op_' + Date.now();
    },

    estacion: (numero) => {
        const num = String(numero || '').replace(/[^0-9]/g, '');
        return num ? 'est' + num : 'est_' + Date.now();
    },

    montaje: (operacion, estacionNum, montajeNum) => {
         const op = IdGen.operacion(operacion);
         const estRaw = String(estacionNum || '').trim();
         const estNum = estRaw.match(/(\d+)$/)?.[1] || '0';
         const mont = String(montajeNum || '').replace(/[^0-9]/g, '') || '1';
         return `${op}_est${estNum}_mont${mont}`;
    },

    historial: (operacion, estacionNum, montajeNum) => {
        return `${IdGen.montaje(operacion, estacionNum, montajeNum)}_${IdGen._fecha()}`;
    },

    solicitud: (tipo, codigo) => {
        const tipoUp = String(tipo || 'GEN').toUpperCase().replace(/[^A-Z]/g, '');
        const codigoLimpio = String(codigo || 'GEN').toUpperCase().replace(/[^A-Z0-9-]/g, '');
        return `${tipoUp}_${IdGen._fecha()}_${IdGen._hora()}_${codigoLimpio}`;
    },

    movimientoKanban: (codigo) => {
        const codigoLimpio = String(codigo || 'GEN').toUpperCase().replace(/[^A-Z0-9-]/g, '');
        return `MOV_${IdGen._fecha()}_${IdGen._hora()}_${codigoLimpio}`;
    },

    herramienta: (tipo, par, numero) => {
        const tipoAbrev =
            tipo === 'Llave Dinamométrica' ? 'LL-DIN' :
            tipo === 'Llave Fija' ? 'LL-FIJA' :
            tipo === 'Destornillador' ? 'DES' :
            tipo === 'Otro' ? 'OTRO' : 'HERR';
        const parStr = par ? `${String(par).replace(/[^0-9.]/g, '')}NM` : 'SIN-PAR';
        const numPad = String(numero || '1').padStart(3, '0');
        return `${tipoAbrev}-${parStr}-${numPad}`;
    },

    registroHerramienta: (herramientaId) => {
        const idLimpio = String(herramientaId || 'HERR').replace(/[^A-Z0-9-]/gi, '');
        return `REG_${IdGen._fecha()}_${IdGen._hora()}_${idLimpio}`;
    },

    tornillo: (tipo, nombre) => {
        const tipoAbrev =
            tipo === 'Tornillo' ? 'TOR' :
            tipo === 'Tuerca' ? 'TUE' :
            tipo === 'Arandela' ? 'ARR' : 'OTRO';
        const nombreLimpio = String(nombre || '').trim()
            .replace(/\s+/g, '')
            .replace(/[^A-Za-z0-9xX*]/g, '');
        return `${tipoAbrev}_${nombreLimpio || Date.now()}`;
    },

    componente: (nombre) => {
        return String(nombre || '').trim()
            .replace(/\s+/g, '_')
            .replace(/[^A-Za-z0-9_]/g, '') || 'comp_' + Date.now();
    },

    material: (codigo) => {
        return String(codigo || '').trim()
            .replace(/\s+/g, '')
            .replace(/[^A-Za-z0-9-]/g, '') || 'mat_' + Date.now();
    },

    piezaKanban: (codigo) => {
        return String(codigo || '').trim()
            .replace(/\s+/g, '')
            .replace(/[^A-Za-z0-9-]/g, '') || 'pieza_' + Date.now();
    },

    resistencia: (operacion, estacionNum, montajeNum) => {
        return IdGen.montaje(operacion, estacionNum, montajeNum);
    },

    inspeccion: (operacion, estacionNum) => {
        const op = IdGen.operacion(operacion);
        const est = String(estacionNum || '').replace(/[^0-9]/g, '') || '0';
        return `${op}_est${est}`;
    },

    materialesEstacion: (operacion, estacionNum) => {
        const op = IdGen.operacion(operacion);
        const est = String(estacionNum || '').replace(/[^0-9]/g, '') || '0';
        return `${op}_est${est}`;
    },

    chatConversacion: (emisor, receptor) => {
        const nombres = [emisor, receptor]
            .map(n => String(n || '').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))
            .filter(n => n)
            .sort();
        if (nombres.length < 2) return nombres[0] || 'chat_' + Date.now();
        return `${nombres[0]}__${nombres[1]}`;
    },

    chatMensaje: (emisor, receptor) => {
        const convId = IdGen.chatConversacion(emisor, receptor);
        return `${convId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    },

    config: (nombre) => {
        return String(nombre || '').trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '').toLowerCase() || 'config_' + Date.now();
    }
};

window.IdGen = IdGen;
