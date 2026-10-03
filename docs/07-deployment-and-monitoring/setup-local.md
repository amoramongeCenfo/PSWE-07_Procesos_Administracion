# Setup local — Mattermost v11.11.1

Guía para que cada integrante ejecute la versión base del proyecto en su máquina.

- **Opción A — Demo (≈15 min):** imagen oficial de Docker. Solo para *ver* la aplicación y tomar capturas del estado actual. No usa el código de `app/`.
- **Opción B — Desarrollo:** compila `app/` (server Go + webapp React). Necesaria para implementar la mejora (#17740) a partir de E2.

Referencia oficial: https://developers.mattermost.com/contribute/developer-setup/

---

## 0. Requisitos de la máquina

| Recurso | Mínimo | Recomendado |
|---|---|---|
| RAM | 8 GB | 16 GB+ |
| Disco libre | 30 GB | 50 GB |
| SO | Linux, macOS o Windows 10/11 con WSL2 | — |

**Versiones exigidas por el código (v11.11.1):**

| Herramienta | Versión | Fuente |
|---|---|---|
| Go | 1.26.7 (o superior dentro de 1.26) | `app/server/go.mod` |
| Node.js | 24.11 | `app/.nvmrc` |
| Docker + Docker Compose v2 | reciente | servicios de desarrollo (PostgreSQL, Inbucket) |
| make, git, gcc | — | build del server |

> **Máquinas corporativas:** Docker Desktop requiere licencia paga en empresas de más de 250 empleados o USD 10M de facturación. En ese caso usar **Docker Engine dentro de WSL** (gratuito) o una máquina personal. Verificar también políticas de TI sobre WSL/virtualización.

---

## Opción A — Demo con imagen oficial

Requisito: solo Docker (Docker Desktop en Windows/macOS personal, o Docker Engine en Linux/WSL).

1. Usar el archivo [`docker-compose.demo.yml`](docker-compose.demo.yml) de esta carpeta.
2. Levantar:
   ```bash
   docker compose -f docker-compose.demo.yml up -d
   docker compose -f docker-compose.demo.yml logs -f mattermost   # esperar "Server is listening on :8065"
   ```
3. Abrir http://localhost:8065 → crear la primera cuenta (queda como **System Admin**) → crear un equipo.
4. Detener / borrar:
   ```bash
   docker compose -f docker-compose.demo.yml down        # detiene (conserva datos)
   docker compose -f docker-compose.demo.yml down -v     # detiene y borra datos
   ```

---

## Opción B — Entorno de desarrollo

### B.1 Windows: preparar WSL2 + Ubuntu
PowerShell **como administrador**:
```powershell
wsl --install -d Ubuntu-24.04
```
Reiniciar, abrir "Ubuntu", crear usuario/contraseña Linux.

Limitar recursos de la VM — crear `C:\Users\<usuario>\.wslconfig`:
```ini
[wsl2]
memory=8GB
processors=4
# Si hay VPN y WSL pierde red/DNS:
# networkingMode=mirrored
```
Aplicar con `wsl --shutdown` y volver a abrir Ubuntu.

> ⚠️ Trabajar **dentro del filesystem de Linux** (`~/proyectos/...`), **no** en `/mnt/c/...`: compilar y `npm install` desde `/mnt/c` es 5-10× más lento.

### B.2 Docker
- **Máquina personal (Windows/macOS):** Docker Desktop → Settings → Resources → WSL Integration → activar Ubuntu.
- **Linux o WSL sin Docker Desktop:** Docker Engine dentro de Ubuntu:
  ```bash
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER
  # cerrar y reabrir la terminal
  docker run --rm hello-world
  ```
  En WSL, si `docker` no arranca solo: `sudo service docker start` (o habilitar systemd en `/etc/wsl.conf` con `[boot]` / `systemd=true`).

### B.3 Herramientas de build (Ubuntu / WSL)
```bash
sudo apt update && sudo apt install -y build-essential git curl

# Go 1.26.7
curl -LO https://go.dev/dl/go1.26.7.linux-amd64.tar.gz
sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.26.7.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin' >> ~/.bashrc && source ~/.bashrc
go version          # go1.26.7

# Node 24.11 vía nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 24.11 && nvm use 24.11
node -v
```
macOS: `xcode-select --install`, luego `brew install go@1.26 nvm` (ajustar a 1.26.7) y `nvm install 24.11`.

### B.4 Clonar el repositorio
```bash
mkdir -p ~/proyectos && cd ~/proyectos
git clone https://github.com/amoramongeCenfo/PSWE-07_Procesos_Administracion.git
cd PSWE-07_Procesos_Administracion/app
```

### B.5 Ejecutar

Se usan **dos terminales de Ubuntu** que deben **quedar abiertas** mientras trabajas (si las cierras, se detienen la webapp y el server). Abre cada una desde el menú inicio → **"Ubuntu 24.04"** (terminal interactiva: así se cargan en el PATH `go`, `node` y `npm`; si usas otra consola podrían no encontrarse).

**Paso 0 — Docker Desktop encendido.**
Abre **Docker Desktop** y espera a que abajo a la izquierda diga **"Engine running"**. No arranca solo al encender la PC, así que hay que abrirlo cada vez. Verifícalo desde Ubuntu:
```bash
docker ps        # debe responder sin error (lista vacía la primera vez)
```

**Paso 1 — Terminal 1: webapp.** La primera vez `npm install` tarda 5-15 min (descarga ~1.4 GB).
```bash
cd ~/proyectos/PSWE-07_Procesos_Administracion/app/webapp
nvm use                 # usa Node 24.11 (lee .nvmrc)
npm install             # solo la primera vez (o si cambió package.json)
make run                # webpack en modo watch; recompila al guardar
```
⏳ **Espera a que termine el primer build** (verás `webpack ... compiled successfully`). **Deja esta terminal abierta.**

**Paso 2 — Terminal 2: server** (levanta PostgreSQL/Inbucket en Docker y compila Go):
```bash
cd ~/proyectos/PSWE-07_Procesos_Administracion/app/server
ENABLED_DOCKER_SERVICES="postgres inbucket" make run-server
```
`ENABLED_DOCKER_SERVICES` limita los contenedores a PostgreSQL y al servidor de correo de prueba (sin él también levanta MinIO/Azurite y consume más RAM).

> ℹ️ `make run-server` arranca el servidor **en segundo plano y el comando "termina"** (vuelve el prompt) — es normal, **no cierres la terminal**: si la cierras, el servidor se detiene. La primera compilación de Go tarda 1-3 min; está listo cuando en el log aparece `Server is listening on [::]:8065`.

**Paso 3 — Verificar.** En el navegador de Windows abre **http://localhost:8065** (WSL reenvía `localhost` automáticamente). O desde Ubuntu:
```bash
curl http://localhost:8065/api/v4/system/ping     # debe devolver {"status":"OK"}
```
Luego: crear la primera cuenta (queda como **System Admin**) → crear un equipo.
Correos de prueba (invitaciones, notificaciones): **http://localhost:9001** (Inbucket).

> Si la página sale en blanco unos segundos, webpack aún está terminando de compilar chunks: recarga en un momento.

### B.6 Detener
```bash
cd ~/proyectos/PSWE-07_Procesos_Administracion/app/server
make stop           # detiene server, webapp y contenedores
```
Liberar la RAM de WSL (Windows): `wsl --shutdown`.

### B.7 Pruebas (base para la estrategia de tests en E2)
```bash
# webapp (Jest) — un archivo/carpeta concreto, la suite completa es muy larga
cd app/webapp/channels && npm test -- src/components/<carpeta>

# server (Go)
cd app/server && go test ./channels/app/... -run <NombreTest>
```

---

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `validate-go-version` falla | Go < 1.26 | Instalar Go 1.26.7 (B.3) |
| `permission denied ... docker.sock` | Usuario fuera del grupo `docker` | `sudo usermod -aG docker $USER` y reabrir terminal |
| Puerto 5432 u 8065 ocupado | Otro PostgreSQL / Mattermost local | Detener el servicio o cambiar el puerto |
| WSL sin internet con VPN | NAT de WSL2 + VPN corporativa | `networkingMode=mirrored` en `.wslconfig` |
| Página en blanco en :8065 | Webapp aún compilando | Esperar a que `make run` termine el primer build |
| `npm install` muy lento | Repo en `/mnt/c` | Clonar en `~/proyectos` (filesystem Linux) |
| `start-docker` falla: `Cannot connect to the Docker daemon` | Docker Desktop apagado | Abrir Docker Desktop y esperar "Engine running" (Paso 0) |
| `start-docker` falla: `lookup registry-1.docker.io: no such host` | DNS del engine aún no listo tras abrir Docker Desktop | Esperar unos segundos y reintentar `make run-server`; o pre-descargar: `docker pull postgres:14 && docker pull inbucket/inbucket:3.1.1` |
| El server se detiene solo | Se cerró la Terminal 2 | `make run-server` corre en esa terminal; mantenerla abierta |
| `command not found: go` / `node` | Terminal no interactiva | Abrir la terminal desde "Ubuntu 24.04" (menú inicio) |

---

## Estado por integrante

| Integrante | SO / máquina | Opción | ¿Corre? | Fecha | Evidencia |
|---|---|---|---|---|---|
| [TODO] | [TODO] | A / B | [ ] | [TODO] | `docs/evidencia/setup-p1.png` |
| [TODO] | [TODO] | A / B | [ ] | [TODO] | `docs/evidencia/setup-p2.png` |
| [TODO] | [TODO] | A / B | [ ] | [TODO] | `docs/evidencia/setup-p3.png` |

## Problemas encontrados por el equipo

| Fecha | Problema | Solución | Quién |
|---|---|---|---|
| [TODO] | [TODO] | [TODO] | [TODO] |
