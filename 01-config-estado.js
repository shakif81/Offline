const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCk4CrThg7vq0xq90TSZQRhDCkPGgrm8bI",
    authDomain: "linea-traxx.firebaseapp.com",
    projectId: "linea-traxx",
    storageBucket: "linea-traxx.firebasestorage.app",
    messagingSenderId: "658250993876",
    appId: "1:658250993876:web:eed181a102dfd1665a6b41"
};

const CLOUDINARY_CONFIG = {
    cloudName: 'xkxg0dte',
    uploadPreset: 'traxx_upload'
};

window.APP = {
    db: null,
    operario: null,
    operarioSeleccionado: null,
    operacionActiva: null,
    modeloActivo: 'MS3',
    estacionDetalleId: null,
    fbCache: {},
    herramientasCache: {},
    intervals: [],
    cronoTick: null,
    badgeTick: null,
    dashTick: null,
    cronosOperacion: {},
    badgeModo: 'total',
    escanerConfig: {
        cortarHash: true,
        soloNumeros: true,
        quitarComillas: true,
        quitarGuiones: false,
        quitarEspacios: true,
        mayusculas: false,
        prefijos: [],
        longitud: 0
    },
    fotosInstrucciones: [],
    fotosInspeccion: {},
    filtroOperario: null,
    filtroMateriales: null,
    adminOperarioColorSeleccionado: '#607d8b'
};

window.db = null;

window.operarioActual = null;

window.operacionActiva = null;
