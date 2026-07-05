// src/config/transportModules.js
export const transportModules = [
  {
    id: 'urbanus',
    title: 'URBANUSS',
    subtitle: 'Unidades tipo autobús',
    image: '/images/urbanu.webp',
    route: '/transporte/urbanus',
    totalUnidades: 42,
    prefijoEco: 'ECO',
    // Aquí mapeamos las imágenes específicas de este vehículo
    imagenesZonas: {
      lateral: '/images/urbanu-lateral.webp',
      frente: '/images/urbanu-freznte.webp',
      trasera: '/images/urbanu-detras.webp'
    }
  },
  {
    id: 'vagoneta',
    title: 'VAGONETA',
    subtitle: 'Unidades tipo van',
    image: '/images/vagoneta.webp',
    route: '/transporte/vagoneta',
    totalUnidades: 20, // Ejemplo: las vagonetas podrían ser menos
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
    route: '/transporte/zafiro',
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
    image: '/images/orionlateral.webp', // Asegúrate de tener esta imagen en tu carpeta public/images/
    route: '/transporte/orion',
    totalUnidades: 0, // O el valor inicial que desees
    prefijoEco: 'ORI',
    imagenesZonas: {
      lateral: '/images/orionlateral.webp',
      frente: '/images/orionfrente.webp',
      trasera: '/images/oriondetras.webp'
    }
  }
];