# PSWE-07 Procesos y Administración de Software — Proyecto final

[![Webapp CI](https://github.com/amoramongeCenfo/PSWE-07_Procesos_Administracion/actions/workflows/webapp-ci.yml/badge.svg)](https://github.com/amoramongeCenfo/PSWE-07_Procesos_Administracion/actions/workflows/webapp-ci.yml)

Proyecto final del curso **C3-PSWE Procesos de Ingeniería de Software** (Universidad CENFOTEC).

**Mejora propuesta:** opción de cuenta para desactivar la animación de GIFs en Mattermost (accesibilidad, WCAG 2.2.2).
**Issue base:** [mattermost/mattermost#17740](https://github.com/mattermost/mattermost/issues/17740)

## Código base
`app/` contiene el código fuente de [Mattermost](https://github.com/mattermost/mattermost) **v11.11.1**
(commit `3acb3a7f684d11ccfcec4e5bd11c79f64e3eabf9`), copiado sin historial ni submódulos.
Licencias originales en `app/LICENSE.txt` y `app/LICENSE.enterprise`.

## Estructura
```
.
├── .github/  # Plantillas de issues y PR (CI en #14)
├── app/      # Código fuente de Mattermost (server Go + webapp TypeScript/React)
├── docs/     # Documentación del proyecto (por entregable)
└── tests/    # Configuración de la suite de pruebas de la mejora
```

## Documentación
| Documento | Entregable |
|---|---|
| [C4 Nivel 1 — Contexto](docs/03-technical-spec/c4-contexto.md) | E1-h |
| [Setup local (demo y desarrollo)](docs/07-deployment-and-monitoring/setup-local.md) | E1-e/f |
| [Flujo de desarrollo: issues, ramas, PR](docs/04-development-process/flujo-desarrollo.md) | E2-a |
| [Estrategia de pruebas](docs/06-testing/estrategia-tests.md) | E2-a |
| [CI con GitHub Actions](docs/07-deployment-and-monitoring/ci-github-actions.md) | E2-a |

## Equipo
| Integrante |
|---|
| Edgar Jacob | 
| Brandon Garita | 
| Alejandro Mora | 
