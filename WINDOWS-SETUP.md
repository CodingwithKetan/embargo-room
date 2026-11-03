# Windows Day-0 setup (do this tonight, before Nov 4)

Recommended path: **build inside WSL2.** The bash scripts, Node and Docker all
work unchanged there; only Switch Console runs on the Windows side.

## 1. Enable WSL2 (PowerShell as Administrator)
```powershell
wsl --install -d Ubuntu
# reboot if prompted, then set a username/password in the Ubuntu window
```

## 2. Docker Desktop
- Install Docker Desktop for Windows.
- Settings -> General: "Use the WSL 2 based engine" (on).
- Settings -> Resources -> WSL Integration: enable your Ubuntu distro.
- Confirm in the Ubuntu terminal: `docker run --rm hello-world`

## 3. Switch Console (Windows side)
- Download `switch-console-x64.exe` (or `.msi`) from the Switch releases page.
- It's Authenticode-signed, so no SmartScreen workaround is needed.
- Launch it; it starts the Switch core in Docker and ships Mattermost for the
  local demo (no Slack admin needed).

## 4. Your AI agent (in Ubuntu/WSL)
- Install Claude Code (or your chosen agent) inside WSL, and sign in / set the
  API key for whichever one you use.

## 5. Prove the harness (in Ubuntu/WSL, from the repo)
```bash
./verify.sh --target vulnerable   # TRIGGERED
./verify.sh --target bad-patch    # TRIGGERED   (incomplete fix)
./verify.sh --target patched      # SAFE
```
If all three print the expected verdict, the hard technical core is proven and
you can focus the next 3 days on the Switch workflow.

## Staying native Windows instead?
Use `verify.ps1 -Target vulnerable` in PowerShell. Everything else (Dockerfiles,
poc.js, the Switch template) is unchanged. But WSL2 is the smoother road.
