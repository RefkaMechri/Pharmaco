import pickle
import sys
import json
import numpy as np
from pathlib import Path

def load_model(model_type):
    """Charge le modèle approprié selon le type"""
    # Détermine le nom du modèle à charger selon le type
    model_filename = 'model_Sup.pkl' if model_type == 'model_Sup' else 'model.pkl'

    # Trouve le chemin complet du fichier modèle dans le dossier courant
    model_path = Path(__file__).parent / model_filename

    if not model_path.exists():
        raise FileNotFoundError(f"Fichier modèle {model_filename} introuvable à l'emplacement: {model_path}")

    # Chargement du modèle
    with open(model_path, 'rb') as f:
        model = pickle.load(f)

    # Vérification de l'existence de la méthode 'predict' dans le modèle
    if not hasattr(model, 'predict'):
        raise ValueError(f"Modèle {model_filename} invalide: méthode 'predict' manquante")

    return model

def validate_input_data(data):
    """Valide les données d'entrée"""
    required_keys = ['age', 'weight', 'gender', 'delay', 'corticoids', 'c0d1', 'mmf']
    
    # Vérification de la présence de toutes les clés nécessaires
    if not all(key in data for key in required_keys):
        missing = [k for k in required_keys if k not in data]
        raise ValueError(f"Champs manquants: {missing}")

    # Conversion et validation des types de données
    try:
        features = [
            float(data['age']),
            float(data['weight']),
            int(data['gender']),
            float(data['delay']),
            float(data['corticoids']),
            float(data['c0d1']),
            float(data['mmf'])
        ]
    except (ValueError, TypeError) as e:
        raise ValueError(f"Erreur de conversion des données: {str(e)}")

    return np.array([features])

def main():
    try:
        # Vérification des arguments
        if len(sys.argv) < 2:
            raise ValueError("Arguments manquants: données patient et type de modèle requis")

        # Lecture des arguments
        patient_data = json.loads(sys.argv[1])
        model_type = sys.argv[2] if len(sys.argv) > 2 else 'model'  # Par défaut 'model'

        # Validation du type de modèle
        if model_type not in ['model', 'model_Sup']:
            raise ValueError("Type de modèle invalide. Options: 'model' ou 'model_Sup'")

        # Chargement du modèle
        model = load_model(model_type)
        print(f"[PYTHON] Modèle chargé: {model_type}", file=sys.stderr)

        # Validation et préparation des données
        input_features = validate_input_data(patient_data)

        # Prédiction
        prediction = float(model.predict(input_features)[0])

        # Retourner le résultat
        print(json.dumps({
            'status': 'success',
            'prediction': prediction,
            'model_used': model_type  # Information sur le modèle utilisé
        }))

    except Exception as e:
        # Retourne l'erreur avec plus de détails
        print(json.dumps({
            'status': 'error',
            'message': str(e),
            'model_used': sys.argv[2] if len(sys.argv) > 2 else 'model'
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
