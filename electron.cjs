const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let serverProcess = null;
let mainWindow = null;

// Start the Express compiled backend service in a safe background thread
function startBackendServer() {
  try {
    const serverPath = path.join(__dirname, 'dist', 'server.cjs');
    
    // Spawn the node child process for the local full-stack server
    serverProcess = fork(serverPath, [], {
      env: { 
        ...process.env, 
        NODE_ENV: 'production',
        PORT: '3000'
      }
    });

    serverProcess.on('error', (err) => {
      console.error('[DESKTOP BACKEND ERROR]: Failed to keep embedded server running:', err);
    });

    console.log('[DESKTOP CORE]: Local full-stack background service triggered.');
  } catch (error) {
    console.error('[DESKTOP PRE-START FAILURE]:', error);
  }
}

function createMainWindow() {
  // Setup the Window frame size and desktop properties
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 1024,
    minHeight: 768,
    title: "INNOVA POS PRO - Desktop",
    icon: path.join(__dirname, 'public', 'app-icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextBridge: true,
      sandbox: true
    },
    // Set elegant dark header style or standard window
    backgroundColor: '#ffffff'
  });

  // Load the web app served by the locally spawned express server with resilient retry backoffs
  const loadWithRetry = (attempt = 1) => {
    console.log(`[DESKTOP CORE]: Connecting to local database backend (Attempt ${attempt}/15)...`);
    mainWindow.loadURL('http://localhost:3000')
      .then(() => {
        console.log('[DESKTOP CORE]: Successfully established server connection and opened application.');
      })
      .catch((err) => {
        console.warn(`[DESKTOP CORE]: Connection attempt ${attempt} missed. Retrying in 1.5 seconds...`);
        if (attempt < 15) {
          setTimeout(() => {
            loadWithRetry(attempt + 1);
          }, 1500);
        } else {
          console.error('[DESKTOP CORE]: Express server process took too long to boot. Loading local bundle as fallback.');
          mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html')).catch((fileError) => {
            console.error('[DESKTOP CORE CRITICAL]: Native static fallback loading failed:', fileError);
          });
        }
      });
  };

  setTimeout(() => {
    loadWithRetry();
  }, 1000);

  // Manage navigation external link behavior (open in default browser instead of frame)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
      return { action: 'allow' };
    }
    // External links open in default OS browser (Edge/Chrome/Safari)
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Set standard clean window menus
  const template = [
    {
      label: 'Application',
      submenu: [
        { label: 'Recharger la page', role: 'reload' },
        { label: 'Plein écran', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Quitter', click: () => { app.quit(); } }
      ]
    },
    {
      label: 'Éditer',
      submenu: [
        { label: 'Annuler', role: 'undo' },
        { label: 'Rétablir', role: 'redo' },
        { type: 'separator' },
        { label: 'Couper', role: 'cut' },
        { label: 'Copier', role: 'copy' },
        { label: 'Coller', role: 'paste' },
        { label: 'Tout sélectionner', role: 'selectAll' }
      ]
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'Documentation & Support',
          click: async () => {
            await shell.openExternal('https://ai.studio/build');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Electron lifecycle bindings
app.whenReady().then(() => {
  startBackendServer();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up background server process when exiting
app.on('will-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
