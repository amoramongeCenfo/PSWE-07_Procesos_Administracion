// Suite Jest de la mejora #17740 (control de animaciones de GIFs y emojis).
//
// Reutiliza la configuración oficial del webapp de Mattermost y la acota a los
// componentes que la mejora toca. Sirve para dos cosas:
//   1. Prueba de regresión rápida en cada PR (CI job "jest").
//   2. Métrica de cobertura de los módulos afectados (línea base vs. final).
//
// Uso (desde app/webapp/channels):
//   npx jest --config ../../../tests/jest.config.feature.js --coverage
//
// Al encontrar un nuevo punto de renderizado de GIF/emoji (issues #16 y #24),
// agregar su ruta en FEATURE_PATHS.

const path = require('path');

const channelsDir = path.resolve(__dirname, '../app/webapp/channels');
const baseConfig = require(path.join(channelsDir, 'jest.config.js'));

// Rutas relativas a app/webapp/channels/src
const FEATURE_PATHS = [
    'components/user_settings/display', // toggle "Permitir imágenes y emojis animados"
    'components/size_aware_image', // imágenes / GIFs en mensajes
    'components/single_image_view', // adjunto de imagen único
    'components/markdown_image', // imágenes embebidas en markdown (GIPHY)
    'components/file_preview_modal', // vista ampliada
    'components/post_emoji', // emojis en el cuerpo del mensaje
    'components/emoji', // emojis personalizados
    'components/post_view/reaction', // reacciones
    'components/post_view/post_reaction', // menú rápido de reacciones
    'components/post_view/post_recent_reactions',
];

// Las pruebas nuevas del equipo se escriben co-ubicadas junto al componente
// (convención de Mattermost: foo.tsx -> foo.test.tsx), así quedan dentro de estas rutas.
module.exports = {
    ...baseConfig,
    rootDir: channelsDir,
    displayName: 'feature-17740',
    watchPlugins: [],
    testMatch: FEATURE_PATHS.flatMap((p) => [
        `<rootDir>/src/${p}/**/*.test.{ts,tsx,js,jsx}`,
        `<rootDir>/src/${p}.test.{ts,tsx,js,jsx}`,
    ]),
    collectCoverageFrom: [
        ...FEATURE_PATHS.flatMap((p) => [
            `src/${p}/**/*.{ts,tsx,js,jsx}`,
            `src/${p}.{ts,tsx,js,jsx}`,
        ]),
        '!**/*.test.{ts,tsx,js,jsx}',
        '!**/__snapshots__/**',
        '!**/index.{ts,js}',
    ],
    coverageReporters: ['json-summary', 'lcov', 'text-summary'],
    coverageDirectory: '<rootDir>/coverage/feature-17740',
};
