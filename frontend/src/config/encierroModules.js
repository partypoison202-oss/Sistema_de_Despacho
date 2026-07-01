// src/config/encierroModules.js
// Mismos módulos de transporte que DESPACHO pero con prefijo de ruta /encierro/
export const encierroModules = [
  {
    id: 'urbanus',
    title: 'URBANUSS',
    subtitle: 'Unidades tipo autobús',
    image: '/images/urbanu.png',
    route: '/encierro/transporte/urbanus',
    totalUnidades: 42,
    prefijoEco: 'ECO',
    imagenesZonas: {
      lateral: '/images/urbanu-lateral.png',
      frente: '/images/urbanu-frente.png',
      trasera: '/images/urbanu-detras.png'
    }
  },
  {
    id: 'vagoneta',
    title: 'VAGONETA',
    subtitle: 'Unidades tipo van',
    image: '/images/vagoneta.png',
    route: '/encierro/transporte/vagoneta',
    totalUnidades: 20,
    prefijoEco: 'VAN',
    imagenesZonas: {
      lateral: '/images/vagoneta lateral.png',
      frente: '/images/vagoneta frente.png',
      trasera: '/images/vagoneta detras.png'
    }
  },
  {
    id: 'zafiro',
    title: 'ZAFIRO',
    subtitle: 'Unidades tipo microbús',
    image: '/images/zafiro.png',
    route: '/encierro/transporte/zafiro',
    totalUnidades: 30,
    prefijoEco: 'ZAF',
    imagenesZonas: {
      lateral: '/images/zafiro lateral_.png',
      frente: '/images/zafiro delante.png',
      trasera: '/images/zafiro detras.png'
    }
  },
  {
    id: 'orion',
    title: 'ORION',
    subtitle: 'Unidades tipo ORION',
    image: '/images/orionlateral.PNG',
    route: '/encierro/transporte/orion',
    totalUnidades: 0,
    prefijoEco: 'ORI',
    imagenesZonas: {
      lateral: '/images/orionlateral.PNG',
      frente: '/images/orionfrente.PNG',
      trasera: '/images/oriondetras.png'
    }
  }
];
