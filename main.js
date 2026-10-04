'use strict';

const { app, globalShortcut } = require('electron');
const path = require('path');

app.setName('FastTTS');
// Conserva los datos y sesiones de instalaciones previas tras cambiar productName.
app.setPath('userData', path.join(app.getPath('appData'), 'tiktok-live-tts'));

// Debe ocurrir antes de importar cualquier modulo local: portal-view/store.js
// carga core/paths.js durante el require y este cachea ambos paths.
if (app.isPackaged) {
  process.env.TIKTOK_RESOURCES_PATH = process.resourcesPath;
}
process.env.TIKTOK_USER_DATA_PATH = app.getPath('userData');

const { ensureSingleInstance } = require('./electron-shell/single-instance');
const { createWindow, showMainWindow, waitForServer, PORT } = require('./electron-shell/window');
const { createTray, buildTrayMenu, showStartupError } = require('./electron-shell/tray');
const { setupAutoUpdater, installUpdate } = require('./electron-shell/updater');
const { attachIpcBridge } = require('./electron-shell/ipc-bridge');
const { createPortalViewController } = require('./electron-shell/portal-view/controller');
const { attachPortalViewIpc } = require('./electron-shell/portal-view/ipc');
const { startUiohook, stopUiohook, isUiohookActive, registerUiohookShortcut } = require('./electron-shell/uiohook');
const { GLOBAL_SHORTCUT } = require('./features/clips/global-shortcut');
const { getActiveAccount } = require('./core/account-data-path');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let pendingUpdateVersion = null;
let quitTasksDone = false;
let cierresListos = false;
let ipcHandles = null;
let portalView = null;
let portalViewIpcHandles = null;

ensureSingleInstance(app, () => showMainWindow(mainWindow));

// Arranca /core + los 16 dominios de negocio (server.js ya no tiene logica
// propia desde la Fase 1). Envuelto para mostrar un dialogo recuperable en
// vez de una excepcion sin manejar que bloquee al auto-updater.
let serverLoadError = null;
let serverModule = null;
try {
  serverModule = require('./server');
} catch (error) {
  serverLoadError = error;
  if (!app.isPackaged) throw error;
}

const bus = serverModule && serverModule.bus;
const logger = serverModule && serverModule.logger;

// uncaughtException / unhandledRejection: los registra server.js (siempre, para
// `node server.js` y para Electron).

const ICON_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'tray-icon.ico')
  : path.join(__dirname, 'tray-icon.ico');

function getMainWindow() { return mainWindow; }
function getTray() { return tray; }

function trayCallbacks() {
  return {
    onOpen: () => showMainWindow(mainWindow),
    onInstallUpdate: installUpdate,
    onQuit: () => app.quit(),
  };
}

app.whenReady().then(() => {
  if (serverLoadError) {
    // Intenta actualizar primero — si hay un fix disponible, se descarga e
    // instala automaticamente sin que el usuario tenga que reinstalar a mano.
    if (app.isPackaged) {
      try {
        const { autoUpdater } = require('electron-updater');
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = false;
        autoUpdater.on('update-downloaded', () => autoUpdater.quitAndInstall(false, true));
        autoUpdater.checkForUpdates().catch(() => { /* best-effort */ });
      } catch (_) { /* best-effort */ }
    }
    showStartupError(serverLoadError);
    return;
  }

  waitForServer(() => {
    mainWindow = createWindow({
      iconPath: ICON_PATH,
      bus,
      onClose: () => {
        if (isQuitting) return;
        isQuitting = true;
        app.quit();
      },
    });

    portalView = createPortalViewController({ mainWindow, logger, accountId: getActiveAccount() });
    portalViewIpcHandles = attachPortalViewIpc({ controller: portalView });
    bus.on('account:changing', () => {
      if (!portalView) return;
      portalView.destroyAll();
      portalViewIpcHandles?.dispose();
      portalView = null;
    }, 'electron-shell');
    bus.on('account:changed', ({ current }) => {
      portalView = createPortalViewController({ mainWindow, logger, accountId: current });
      portalViewIpcHandles = attachPortalViewIpc({ controller: portalView });
    }, 'electron-shell');

    tray = createTray({ iconPath: ICON_PATH, logger, ...trayCallbacks() });

    if (app.isPackaged) {
      setupAutoUpdater({
        app,
        bus,
        logger,
        getMainWindow,
        getTray,
        buildTrayMenu: (version) => buildTrayMenu(trayCallbacks(), version),
        onPendingVersion: (version) => { pendingUpdateVersion = version; },
      });
    }

    startUiohook(logger);

    ipcHandles = attachIpcBridge({ app, bus, logger, getMainWindow, globalShortcut });

    // Atajo de clip (Ctrl+Shift+M): manda IPC al renderer, que hace su
    // propio bookmark local (elapsed/toast) y llama POST /api/obs/save-replay
    // (front sin cambios). /clips (Fase 11) sirve al comando movil markClip,
    // que no tiene renderer del que colgar un bookmark local — ese camino
    // pasa por bus.emit('clips:marcar') en vez de IPC.
    const clipCallback = () => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('mark-clip');
    };
    const clipShortcutOk = isUiohookActive()
      ? registerUiohookShortcut('clip', GLOBAL_SHORTCUT, clipCallback)
      : globalShortcut.register(GLOBAL_SHORTCUT, clipCallback);
    if (!clipShortcutOk && logger) {
      logger.log(
        'warn', 'electron-shell', 'main.js#registerClipShortcut', 'electron_shell.atajo_clip_fallido',
        `No se pudo registrar el atajo de clip ${GLOBAL_SHORTCUT} (¿otra app lo tiene tomado?)`,
        { atajo: GLOBAL_SHORTCUT, via: isUiohookActive() ? 'uiohook' : 'globalShortcut' }
      );
    }
  }, () => {
    showStartupError(new Error(`El servidor local no respondio en http://127.0.0.1:${PORT}`));
  });
});

app.on('before-quit', (event) => {
  isQuitting = true;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeAllListeners('close');
  }

  // Los cierres ya terminaron -> este before-quit (el disparado por el
  // app.quit() del .finally) deja salir de verdad.
  if (cierresListos) return;

  // Hasta que los cierres terminen, NUNCA dejar quitar. El cierre por X
  // (path principal) destruye la ventana sin cancelar 'close', luego
  // 'window-all-closed' dispara otro app.quit() re-entrante — sin este
  // preventDefault incondicional, ese segundo quit abandona el
  // Promise.allSettled todavia pendiente y el shutdown ordenado no corre.
  event.preventDefault();

  if (quitTasksDone) return;
  quitTasksDone = true;

  // Shutdown ordenado de los dominios (moderation.json flush, matar children
  // de yt-dlp, cerrar WS de canales).
  // shutdownAll es async y process.on('exit') no puede esperar microtasks.
  const HARD_QUIT_MS = 8000;
  const cierres = [require('./core/shutdown').shutdownAll(logger)];
  Promise.race([
    Promise.allSettled(cierres),
    new Promise((r) => setTimeout(r, HARD_QUIT_MS)),
  ]).finally(() => { cierresListos = true; app.quit(); });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (ipcHandles) {
    ipcHandles.clearSoundpadShortcuts();
    ipcHandles.unregisterAllTtsShortcuts();
  }
  if (portalViewIpcHandles) portalViewIpcHandles.dispose();
  if (portalView) portalView.destroyAll();
  stopUiohook();
});

// Mantiene la app viva en la tray solo cuando la tray realmente existe y no
// se esta cerrando; si no, deja que Electron cierre normal para no dejar un
// proceso huerfano corriendo sin ventana visible.
app.on('window-all-closed', (e) => {
  // Shutdown ordenado en vuelo -> no dejar que el default de Electron corte
  // el proceso; el app.quit() del .finally lo cierra cuando termina.
  if (quitTasksDone && !cierresListos) { e.preventDefault(); return; }
  if (tray && !isQuitting) { e.preventDefault(); return; }
  app.quit();
});
