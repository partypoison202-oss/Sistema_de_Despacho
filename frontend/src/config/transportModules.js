// src/config/transportModules.js
export const transportModules = [
  {
    id: 'urbanus',
    title: 'Urbanus',
    subtitle: 'Unidades tipo autobús',
    image: '/images/urbanu.png',
    route: '/transporte/urbanus',
    totalUnidades: 42,
    prefijoEco: 'ECO',
    // Aquí mapeamos las imágenes específicas de este vehículo
    imagenesZonas: {
      lateral: '/images/urbanu-lateral.png',
      frente: '/images/urbanu-frente.png',
      trasera: '/images/urbanu-detras.png'
    }
  },
  {
    id: 'vagoneta',
    title: 'Vagoneta',
    subtitle: 'Unidades tipo van',
    image: '/images/vagoneta.png',
    route: '/transporte/vagoneta',
    totalUnidades: 20, // Ejemplo: las vagonetas podrían ser menos
    prefijoEco: 'VAN',
    imagenesZonas: {
      lateral: '/images/vagoneta lateral.png',
      frente: '/images/vagoneta frente.png',
      trasera: '/images/vagoneta detras.png'
    }
  },
  {
    id: 'zafiro',
    title: 'Zafiro',
    subtitle: 'Unidades tipo microbús',
    image: '/images/zafiro.png',
    route: '/transporte/zafiro',
    totalUnidades: 30,
    prefijoEco: 'ZAF',
    imagenesZonas: {
      lateral: '/images/zafiro lateral_.png',
      frente: '/images/zafiro delante.png',
      trasera: '/images/zafiro detras.png'
    }
  }
];