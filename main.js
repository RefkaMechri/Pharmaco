const { app, BrowserWindow, ipcMain } = require('electron');
const { PythonShell } = require('python-shell');
const fs = require('fs');
const path = require('path');

let mainWindow;

// Fonction pour obtenir le chemin correct du script Python selon le mode
function getPythonScriptPath() {
  if (process.env.NODE_ENV === 'development') {
    return path.join(__dirname, 'predict_model.py');
  } else {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'predict_model.py');
  }
}

function createWindow(htmlPage = 'index.html') {
  
  mainWindow = new BrowserWindow({
    width: 1550,
    height: 950,
    frame: false,
    icon: path.join(__dirname, 'logo.ico'),  // Assurez-vous que le chemin est correct
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      enableRemoteModule: true,
      sandbox: false
    }
  });

  mainWindow.loadFile(htmlPage);
 /* mainWindow.webContents.openDevTools();*/
}

app.whenReady().then(() => createWindow());

// Gestion des événements IPC
ipcMain.handle('predict', async (event, { patientData, modelType }) => {
  try {
    console.log("[MAIN] Demande de prédiction reçue");

    const scriptPath = getPythonScriptPath();
    const options = {
      mode: 'text',
      pythonPath: 'python',
      scriptPath: path.dirname(scriptPath),
      args: [JSON.stringify(patientData), modelType]
    };

    console.log("[MAIN] Envoi des données au script Python :", options.scriptPath);
    const results = await PythonShell.run(path.basename(scriptPath), options);

    console.log("[MAIN] Résultats reçus :", results);

    const result = JSON.parse(results[0]);

    if (result.status === 'error') {
      throw new Error(result.message);
    }

    return { predicted_c0d1: result.prediction };
  } catch (error) {
    console.error('Erreur de prédiction:', error);
    throw error;
  }
});

// Navigation
ipcMain.on('go-to-page', (event, page) => {
  if (mainWindow) {
    mainWindow.loadFile(page);
  }
});

ipcMain.on('navigate-to-result', (event, data) => {
  if (mainWindow) {
    mainWindow.loadFile('result.html').then(() => {
      mainWindow.webContents.send('display-result', data);
    });
  }
});

ipcMain.on('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('close-window', () => {
  mainWindow.close();
});

ipcMain.on('save-data-external', (event, data) => {
  const savePath = path.join(app.getPath('documents'), 'pharmalab_saves.json');
  try {
    let existing = [];
    if (fs.existsSync(savePath)) {
      existing = JSON.parse(fs.readFileSync(savePath, 'utf8'));
    }
    existing.push(data);
    fs.writeFileSync(savePath, JSON.stringify(existing, null, 2));
    console.log('[MAIN] Données sauvegardées dans :', savePath);

    // Envoi du chemin de sauvegarde au renderer
    event.reply('save-data-path', savePath);
  } catch (err) {
    console.error('[MAIN] Erreur lors de la sauvegarde externe:', err);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
