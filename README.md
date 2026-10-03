# PSWE-07 Procesos y Administración de Software — Proyecto final

Proyecto final del curso **C3-PSWE Procesos de Ingeniería de Software** (Universidad CENFOTEC).

**Mejora propuesta:** opción de cuenta para desactivar la animación de GIFs y emoji en Mattermost (accesibilidad, WCAG 2.2.2).
**Issue base:** [mattermost/mattermost#17740](https://github.com/mattermost/mattermost/issues/17740)

## Código base
`app/` contiene el código fuente de [Mattermost](https://github.com/mattermost/mattermost) **v11.11.1**
(commit `3acb3a7f684d11ccfcec4e5bd11c79f64e3eabf9`), copiado sin historial ni submódulos.
Licencias originales en `app/LICENSE.txt` y `app/LICENSE.enterprise`.

## Estructura
```
.
├── app/      # Código fuente de Mattermost (server Go + webapp TypeScript/React)
├── docs/     # Documentación del proyecto (por entregable)
└── tests/    # Pruebas de la mejora
```

## Documentación
| Documento | Entregable |
|---|---|
| [C4 Nivel 1 — Contexto](docs/03-technical-spec/c4-contexto.md) | E1-h |
| [Setup local (demo y desarrollo)](docs/07-deployment-and-monitoring/setup-local.md) | E1-e/f |

## Equipo
| Integrante |
|---|
| Edgar Jacob | 
| Brandon Garita | 
| Alejandro Mora | 
