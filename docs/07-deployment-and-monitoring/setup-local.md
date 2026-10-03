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
Terminal 1 — **webapp** (primera vez `npm install` tarda 5-15 min):
```bash
cd ~/proyectos/PSWE-07_Procesos_Administracion/app/webapp
nvm use
npm install
make run            # webpack en modo watch; recompila al guardar
```

Terminal 2 — **server** (levanta Docker + compila Go):
```bash
cd ~/proyectos/PSWE-07_Procesos_Administracion/app/server
ENABLED_DOCKER_SERVICES="postgres inbucket" make run-server
```
`ENABLED_DOCKER_SERVICES` limita los contenedores a PostgreSQL y el servidor de correo de prueba (sin él también levanta MinIO/Azurite y consume más RAM).

Abrir http://localhost:8065 → crear primera cuenta (System Admin) → crear equipo.
Correos de prueba (invitaciones, notificaciones): http://localhost:9001 (Inbucket).

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
