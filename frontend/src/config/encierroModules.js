// src/config/encierroModules.js
// Mismos módulos de transporte que DESPACHO pero con prefijo de ruta /encierro/
export const encierroModules = [
  {
    id: 'urbanuss',
    title: 'URBANUSS',
    subtitle: 'Unidades tipo autobús',
    image: '/images/urbanu.webp',
    route: '/encierro/transporte/urbanus',
    totalUnidades: 42,
    prefijoEco: 'ECO',
    imagenesZonas: {
      lateral: '/images/urbanu-lateral.webp',
      frente: '/images/urbanu-frente.webp',
      trasera: '/images/urbanu-detras.webp'
    }
  },
  {
    id: 'vagoneta',
    title: 'VAGONETA',
    subtitle: 'Unidades tipo van',
    image: '/images/vagoneta.webp',
    route: '/encierro/transporte/vagoneta',
    totalUnidades: 20,
    prefijoEco: 'VAN',
    imagenesZonas: {
      lateral: '/images/vagoneta lateral.webp',
      frente: '/images/vagoneta frente.webp',
      trasera: '/images/vagoneta detras.webp'
    }
  },
  {
    id: 'zafiro',
    title: 'ZAFIRO',
    subtitle: 'Unidades tipo microbús',
    image: '/images/zafiro.webp',
    route: '/encierro/transporte/zafiro',
    totalUnidades: 30,
    prefijoEco: 'ZAF',
    imagenesZonas: {
      lateral: '/images/zafiro lateral_.webp',
      frente: '/images/zafiro delante.webp',
      trasera: '/images/zafiro detras.webp'
    }
  },
  {
    id: 'orion',
    title: 'ORION',
    subtitle: 'Unidades tipo ORION',
    image: '/images/orionlateral.webp',
    route: '/encierro/transporte/orion',
    totalUnidades: 0,
    prefijoEco: 'ORI',
    imagenesZonas: {
      lateral: '/images/orionlateral.webp',
      frente: '/images/orionfrente.webp',
      trasera: '/images/oriondetras.webp'
    }
  }
];
