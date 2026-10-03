# Diagrama de arquitectura preliminar — C4 Nivel 1: Contexto (E1-h)

Diagrama "as code" en Mermaid. Fuente: [`c4-contexto.mmd`](c4-contexto.mmd).
Imagen generada con Mermaid CLI: `npx @mermaid-js/mermaid-cli -i c4-contexto.mmd -o c4-contexto.png -s 2 -b white`

![C4 Nivel 1 — Contexto](c4-contexto.png)

> Notación C4 sobre `flowchart` de Mermaid (el tipo `C4Context` nativo es experimental y genera solapamientos).
> Borde naranja = sistema que recibe la mejora; flechas naranjas = flujos de contenido animado afectados.

## Fuente

```mermaid
---
title: "C4 Nivel 1 — Contexto: Mattermost v11.11.1 + mejora issue 17740"
---
flowchart LR
    usuario["<b>Usuario final</b><br/>[Persona]<br/><br/>Miembro de equipo; puede ser<br/>sensible a contenido animado"]
    admin["<b>Administrador del sistema</b><br/>[Persona]<br/><br/>Configura y opera la<br/>instancia auto-hospedada"]

    mm["<b>Mattermost</b><br/>[Sistema de software]<br/><br/>Plataforma de colaboración auto-hospedada<br/>Servidor Go + webapp React/TypeScript<br/><br/><i>Mejora: preferencia de usuario para<br/>desactivar animación de GIF y emoji</i>"]

    giphy["<b>Giphy</b><br/>[Sistema externo]<br/><br/>Proveedor de GIFs<br/>del selector de GIF"]
    web["<b>Sitios web externos</b><br/>[Sistema externo]<br/><br/>Imágenes/GIF enlazados<br/>y vistas previas de enlaces"]
    email["<b>Servidor SMTP</b><br/>[Sistema externo]<br/><br/>Notificaciones e<br/>invitaciones por correo"]
    push["<b>Push Proxy / HPNS</b><br/>[Sistema externo]<br/><br/>Notificaciones push<br/>a apps móviles"]
    idp["<b>Proveedor de identidad</b><br/>[Sistema externo]<br/><br/>OAuth 2.0 / SAML / LDAP<br/>(opcional)"]
    integ["<b>Integraciones externas</b><br/>[Sistema externo]<br/><br/>Webhooks, slash<br/>commands, bots"]

    usuario -- "Chatea y configura preferencia<br/>de animación<br/>[HTTPS / WebSocket]" --> mm
    admin -- "Administra<br/>(System Console, mmctl)<br/>[HTTPS]" --> mm
    mm -- "Busca y muestra GIFs<br/>[HTTPS]" --> giphy
    mm -- "Obtiene imágenes<br/>y previews [HTTPS]" --> web
    mm -- "Envía correos<br/>[SMTP]" --> email
    mm -- "Envía notificaciones<br/>[HTTPS]" --> push
    mm -- "Autentica usuarios<br/>[OAuth/SAML/LDAP]" --> idp
    integ <-- "Eventos y mensajes<br/>[REST API]" --> mm

    classDef person fill:#08427B,stroke:#073B6F,color:#fff
    classDef system fill:#1168BD,stroke:#0B4884,color:#fff
    classDef focus fill:#1168BD,stroke:#F5A623,stroke-width:4px,color:#fff
    classDef external fill:#999999,stroke:#6B6B6B,color:#fff
    class usuario,admin person
    class mm focus
    class giphy,web,email,push,idp,integ external
    linkStyle 2,3 stroke:#F5A623,stroke-width:2px
```

## Elementos
| Elemento | Tipo | Descripción | Relación con la mejora |
|---|---|---|---|
| Usuario final | Persona | Miembro de equipo que usa canales, DMs e hilos | Activa/desactiva la preferencia de animación |
| Administrador | Persona | Opera la instancia (System Console, mmctl) | Sin cambios en el alcance |
| Mattermost | Sistema | Servidor Go + webapp React/TS; PostgreSQL y almacenamiento de archivos son internos (nivel 2) | Recibe la nueva preferencia y el render estático de GIF/emoji |
| Giphy | Externo | Proveedor del selector de GIF | Sus GIFs se mostrarán estáticos si la preferencia está desactivada |
| Sitios web externos | Externo | Imágenes/GIF enlazados y previews | Igual que Giphy |
| SMTP / Push / IdP / Integraciones | Externos | Correo, push, autenticación, webhooks | Sin impacto |

## Notas
- Versión preliminar; se actualiza en E2 (nivel 2 — contenedores) y en la entrega final.
