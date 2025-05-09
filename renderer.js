const { ipcRenderer } = require('electron');
const path = require('path');

const basePath = process.resourcesPath;
const scriptPath = path.join(basePath, 'app.asar.unpacked', 'predict_model.py');
let globalFormData = null;

function initApplication() {
  initNavigationButtons();
  initWindowControls();
  initPredictionForm();
  initResultPage();
  /*initSaveButton();*/
}

function initNavigationButtons() {
  const btnPlus = document.getElementById('btn-plus');
  const btnMoins = document.getElementById('btn-moins');
  const btnRetour = document.getElementById('btn-retour');

  btnPlus?.addEventListener('click', () => ipcRenderer.send('go-to-page', 'plus8.html'));
  btnMoins?.addEventListener('click', () => ipcRenderer.send('go-to-page', 'moins8.html'));
  btnRetour?.addEventListener('click', () => ipcRenderer.send('go-to-page', 'index.html'));
}

function initWindowControls() {
  document.getElementById('btn-minimize')?.addEventListener('click', () => {
    ipcRenderer.send('minimize-window');
  });

  document.getElementById('btn-maximize')?.addEventListener('click', () => {
    ipcRenderer.send('maximize-window');
  });

  document.getElementById('btn-close')?.addEventListener('click', () => {
    ipcRenderer.send('close-window');
  });
}

function initPredictionForm() {
  const form = document.querySelector('.prediction-form');
  if (!form) return;

  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    // Récupérer le message de chargement et le rendre visible
    const resultDiv = document.getElementById('loading-message');
    resultDiv.style.display = "block"; // Afficher le message de chargement
    resultDiv.innerText = "Calcul en cours..."; // Changer le texte de la div
    resultDiv.className = "loading-message"; // Assurer que la classe est correcte

    try {
      const formData = getFormData(form);
      globalFormData = formData;

      const currentPage = window.location.pathname.split('/').pop();
      const modelType = currentPage === 'plus8.html' ? 'model_Sup' : 'model';

      const result = await ipcRenderer.invoke('predict', {
        patientData: formData,
        modelType: modelType
      });

      // Cacher le message de chargement une fois la prédiction terminée
      resultDiv.style.display = "none";

      ipcRenderer.send('navigate-to-result', {
        predictedValue: result.predicted_c0d1,
        inputData: formData,
        modelUsed: modelType
      });
    } catch (error) {
      // Cacher le message de chargement en cas d'erreur
      resultDiv.style.display = "none";
      console.error('Error:', error);
      showError(resultDiv, 'Erreur lors de la prédiction');
    }
  });
}

function initPredictionForm() {
  const form = document.querySelector('.prediction-form');
  if (!form)  {
    return; 
  }
  // Gestion de la soumission du formulaire
  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const resultDiv = document.getElementById('loading-message');
    if (resultDiv) {
      resultDiv.style.display = "block";
      resultDiv.innerText = "Calcul en cours...";
    }

    try {
      const formData = getFormData(form);
      const currentPage = window.location.pathname.split('/').pop();
      const modelType = currentPage === 'plus8.html' ? 'model_Sup' : 'model';

      const result = await ipcRenderer.invoke('predict', {
        patientData: formData,
        modelType: modelType
      });
      // Stockage des résultats pour utilisation ultérieure
      window.lastPredictionResult = {
        value: result.predicted_c0d1,
        formatted: parseFloat(result.predicted_c0d1).toFixed(2),
        formData: formData,
        modelType: modelType
      };
      // Mise à jour de l'affichage
      const predictedValueElement = document.getElementById('predicted-value');
      if (predictedValueElement) {
        predictedValueElement.textContent = window.lastPredictionResult.formatted;
      }
    } catch (error) {
      console.error('Erreur:', error);
      if (resultDiv) resultDiv.innerText = "Erreur lors du calcul";
    } finally {
      if (resultDiv) resultDiv.style.display = "none";
    }
  });
  // Gestion du bouton Recommandation
  const recButton = document.querySelector('.rec-btn');
  if (recButton) {
    recButton.addEventListener('click', function() {
      if (window.lastPredictionResult) {
        ipcRenderer.send('navigate-to-result', {
          predictedValue: window.lastPredictionResult.value,
          formattedValue: window.lastPredictionResult.formatted,
          inputData: window.lastPredictionResult.formData,
          modelUsed: window.lastPredictionResult.modelType
        });
      } else {
        alert('Aucun résultat de prédiction disponible');
        // Optionnel: afficher un message à l'utilisateur
      }
    });
  }
}

/*async function initResultPage() {
  let currentPrediction=0;
  let inputData = {};
  ipcRenderer.on('display-result', (event, data) => {
    // Extraire les données
    inputData = data.inputData;
    // Utiliser les données (exemple)
    console.log("Données reçues:", inputData);
});


  const previousPage = document.referrer;
  const modelType = previousPage.includes('plus8.html') ? 'model_Sup' : 'model';
   // Récupérer la nouvelle valeur de 'dl'
   const dlElement = document.getElementById('dl'); // Récupère l'élément
   const dl = parseFloat(dlElement.value); // Lit et convertit la valeur en nombre
   console.log("Valeur de dl :", dl);
   // Remplacer la valeur de delay par dl
  inputData.delay = dl;
  const result = await ipcRenderer.invoke('predict', {
    patientData: inputData,
    modelType: modelType
  });
  currentPrediction= result.predicted_c0d1
  console.log(currentPrediction); // <--- test
  document.getElementById('predicted-value1').textContent = currentPrediction.toFixed(1);

  const resultCard = document.querySelector('.result-card1');
  if (!resultCard) return;

  const calculateFuturePrediction = () => {
    const proposedDose = parseFloat(document.getElementById('proposed-dose').value);
    if (isNaN(proposedDose)) {
      alert("Veuillez entrer une dose valide");
      return;
    }
    if (currentPrediction <= 0) {
      alert("Erreur : prédiction invalide");
      return;
    }
    const futureC0 = proposedDose * currentPrediction;
    document.getElementById('future-prediction').textContent = futureC0.toFixed(1);
  };

  ipcRenderer.on('display-result', (event, data) => {
    document.getElementById('predicted-value1').textContent = currentPrediction.toFixed(1);
    globalFormData = data.inputData;
    console.log('[RENDERER] Modèle utilisé:', data.modelUsed || 'model (par défaut)');
  });

  document.getElementById('calculate-dose')?.addEventListener('click', () => {
    const minTarget = parseFloat(document.getElementById('min-target').value);
    const maxTarget = parseFloat(document.getElementById('max-target').value);
    if (isNaN(minTarget) || isNaN(maxTarget) || currentPrediction === 0) {
      alert('Veuillez entrer des valeurs valides');
      return;
    }
    const meanTarget = (minTarget + maxTarget) / 2;
    const recDoseMin = minTarget / currentPrediction;
    const recDoseMax = maxTarget / currentPrediction;
    const recDoseMean = meanTarget / currentPrediction;

    document.getElementById('mean-target').textContent = meanTarget.toFixed(1);
    document.getElementById('rec-dose-min').textContent = recDoseMin.toFixed(1);
    document.getElementById('rec-dose-max').textContent = recDoseMax.toFixed(1);
    document.getElementById('rec-dose-mean').textContent = recDoseMean.toFixed(1);
  });

  document.getElementById('calculate-prediction')?.addEventListener('click', calculateFuturePrediction);
  document.getElementById('proposed-dose')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      calculateFuturePrediction();
    }
  });
}
*/
async function initResultPage() {
  let currentPrediction = 0;
  let inputData = null;

  // Attendre les données du backend
  ipcRenderer.on('display-result', (event, data) => {
    inputData = data.inputData;
    console.log("Données reçues:", inputData);
  });

  // Attendre que l'utilisateur entre une valeur de dl et clique sur "Valider"
  document.getElementById('validate-dl').addEventListener('click', async () => {
    if (!inputData) {
      alert("Les données du patient ne sont pas encore chargées.");
      return;
    }

    const dl = parseFloat(document.getElementById('dl').value);
    if (isNaN(dl)) {
      alert("Veuillez entrer une valeur valide pour DL.");
      return;
    }

    inputData.delay = dl;

    const previousPage = document.referrer;
    const modelType = previousPage.includes('plus8.html') ? 'model_Sup' : 'model';

    const result = await ipcRenderer.invoke('predict', {
      patientData: inputData,
      modelType: modelType
    });

    currentPrediction = result.predicted_c0d1;
    console.log("Résultat de prédiction:", currentPrediction);
    document.getElementById('predicted-value1').textContent = currentPrediction.toFixed(2);


    // Listeners pour calculs de doses
    document.getElementById('calculate-dose')?.addEventListener('click', () => {
      const minTarget = parseFloat(document.getElementById('min-target').value);
      const maxTarget = parseFloat(document.getElementById('max-target').value);
      if (isNaN(minTarget) || isNaN(maxTarget) || currentPrediction === 0) {
        alert('Veuillez entrer des valeurs valides');
        return;
      }
      const meanTarget = (minTarget + maxTarget) / 2;
      const recDoseMin = minTarget / currentPrediction;
      const recDoseMax = maxTarget / currentPrediction;
      const recDoseMean = meanTarget / currentPrediction;

      document.getElementById('mean-target').textContent = meanTarget.toFixed(2);
      document.getElementById('rec-dose-min').textContent = recDoseMin.toFixed(2);
      document.getElementById('rec-dose-max').textContent = recDoseMax.toFixed(2);
      document.getElementById('rec-dose-mean').textContent = recDoseMean.toFixed(2);
    });

    // Listener pour la prédiction future
    const calculateFuturePrediction = () => {
      const proposedDose = parseFloat(document.getElementById('proposed-dose').value);
      if (isNaN(proposedDose)) {
        alert("Veuillez entrer une dose valide");
        return;
      }
      const futureC0 = proposedDose * currentPrediction;
      document.getElementById('future-prediction').textContent = futureC0.toFixed(2);
    };

    document.getElementById('calculate-prediction')?.addEventListener('click', calculateFuturePrediction);
    document.getElementById('proposed-dose')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        calculateFuturePrediction();
      }
    });
  });
}

function getFormData(form) {
  return {
    age: parseFloat(form.age.value),
    weight: parseFloat(form.weight.value),
    gender: parseInt(form.gender.value),
    delay: parseFloat(form.delay.value),
    corticoids: parseFloat(form.corticoids.value),
    c0d1: parseFloat(form.c0.value)/parseFloat(form.d1.value),
    mmf: parseFloat(form.mmf.value)
  };
}


function showError(element, message) {
  element.innerText = message;
  element.className = "prediction-result error";
}

function collectAllData() {
  const patientId = document.getElementById('patient-id')?.value || 'unknown';
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR').replace(/\//g, '-');
  const timeStr = now.toLocaleTimeString('fr-FR').replace(/:/g, '-');

  const data = {
    metadata: {
      id: patientId,
      date: dateStr,
      time: timeStr,
      timestamp: now.toISOString()
    },
    patientData: globalFormData || {},
    results: {}
  };

  const resultCard = document.querySelector('.result-card1');
  if (resultCard) {
    data.results = {
      predictedValue: parseFloat(document.getElementById('predicted-value1').textContent) || null,
      minTarget: parseFloat(document.getElementById('min-target').value) || null,
      maxTarget: parseFloat(document.getElementById('max-target').value) || null,
      recommendedDoseMin: parseFloat(document.getElementById('rec-dose-min').textContent) || null,
      recommendedDoseMax: parseFloat(document.getElementById('rec-dose-max').textContent) || null,
      futurePrediction: parseFloat(document.getElementById('future-prediction').textContent) || null,
      proposedDose: parseFloat(document.getElementById('proposed-dose').value) || null
    };
  }

  return data;
}

// Fonction pour sauvegarder les données
function saveData() {
  const data = collectAllData();
  if (!data.patientData || Object.keys(data.patientData).length === 0) {
    alert('Aucune donnée patient à sauvegarder');
    return;
  }

  try {
    // Sauvegarde des données dans le localStorage (si nécessaire)
    let savedData = JSON.parse(localStorage.getItem('pharmalabData')) || [];
    savedData.push(data);
    localStorage.setItem('pharmalabData', JSON.stringify(savedData));

    // Envoi des données à l'application principale pour sauvegarde externe
    ipcRenderer.send('save-data-external', data);

    // Écoute de la réponse contenant l'emplacement de sauvegarde
    ipcRenderer.once('save-data-path', (event, savePath) => {
      // Affichage du chemin de sauvegarde dans une alerte
      alert(`Données sauvegardées avec succès !\nEmplacement de sauvegarde : ${savePath}`);
    });
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    alert('Erreur lors de la sauvegarde: ' + error.message);
  }
}


/*function initSaveButton() {
  const saveButton = document.getElementById('btn-save-all');
  if (saveButton) {
    saveButton.addEventListener('click', saveData);
  }
}*/
document.addEventListener('DOMContentLoaded', () => {
  initPredictionForm(); // Réattacher tes événements de formulaire
});

window.addEventListener('DOMContentLoaded', initApplication);
btnRetour?.addEventListener('click', () => {
  ipcRenderer.send('go-to-page', 'index.html');
  setTimeout(() => {
    resetForm();  // Réinitialiser le formulaire
  }, 100); // Légère temporisation pour permettre à la page de se recharger
});

