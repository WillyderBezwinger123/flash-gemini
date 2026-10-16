const { app, BrowserWindow, ipcMain, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

// Use a dedicated writable user-data folder inside the project to prevent Windows cache lock errors
const localUserDataDir = path.join(__dirname, '../.user-data');
if (!fs.existsSync(localUserDataDir)) {
  fs.mkdirSync(localUserDataDir, { recursive: true });
}
app.setPath('userData', localUserDataDir);

function getStoragePath() {
  return path.join(app.getPath('userData'), 'flash-calendar-data.json');
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 380,
    minHeight: 600,
    title: 'Flash Calendar & Tasks',
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else if (isDev && !fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.focus();
    setTimeout(() => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(false);
      }
    }, 800);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  // IPC: Load local native file storage
  ipcMain.handle('storage:load', async () => {
    try {
      const filePath = getStoragePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
      }
      return null;
    } catch (err) {
      console.error('Failed to load storage:', err);
      return null;
    }
  });

  // IPC: Save local native file storage
  ipcMain.handle('storage:save', async (_event, data) => {
    try {
      const filePath = getStoragePath();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { ok: true };
    } catch (err) {
      console.error('Failed to save storage:', err);
      return { ok: false, error: String(err) };
    }
  });

  // IPC: Native desktop notification
  ipcMain.handle('app:notify', async (_event, { title, body }) => {
    try {
      if (Notification.isSupported()) {
        new Notification({ title, body }).show();
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  // IPC: Auto-detect GitHub CLI token on laptop for 1-click free GitHub Gist Cloud Sync
  ipcMain.handle('sync:detect-gh-token', async () => {
    try {
      const token = execSync('gh auth token', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      const username = execSync('gh api user -q .login', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (token) {
        return { ok: true, token, username };
      }
      return { ok: false, error: 'No gh token found' };
    } catch (err) {
      return { ok: false, error: 'GitHub CLI not logged in or unavailable' };
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
