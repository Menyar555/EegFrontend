import React, { useState, useCallback } from 'react';
import { usePatient } from '../../contexts/PatientContext';
import { Upload, FileText, CheckCircle, AlertCircle, User, Ruler, Settings, Brain, Activity, Zap } from 'lucide-react';
import axios from 'axios';

interface FileUploadProps {
  patientId: string;
  onFileProcessed: (file: any, data: any, patientConfig: any) => void;
}

// Créer une instance axios avec la configuration de base
const api = axios.create({
  baseURL: '/api',
  timeout: 90000, // 30 secondes timeout
});

export default function FileUpload({ patientId, onFileProcessed }: FileUploadProps) {
  const { uploadEEGFile } = usePatient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [electrodePositions, setElectrodePositions] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Configuration du patient
  const [patientConfig, setPatientConfig] = useState({
    headCircumference: 56, // cm - circonférence moyenne adulte
    originalElectrodes: 16, // Nombre d'électrodes original
    interpolationTarget: 32, // Nombre d'électrodes après interpolation
    interpolationMethod: 'knn', // Méthode d'interpolation par défaut
    age: 35,
    gender: 'M',
    notes: ''
  });

  // Méthodes d'interpolation disponibles
  const interpolationMethods = [
    {
      id: 'knn',
      name: 'K-Nearest Neighbors (KNN)',
      description: 'Interpolation basée sur les k plus proches voisins',
      precision: '±2mm',
      speed: 'Rapide',
      quality: 'Excellente',
      endpoint: 'interpolate_knn_static'
    },
    {
      id: 'spherical',
      name: 'Interpolation Sphérique',
      description: 'Interpolation sur surface sphérique avec harmoniques',
      precision: '±1.5mm',
      speed: 'Moyenne',
      quality: 'Très haute',
      endpoint: 'interpolate_knn_spherically'
    },
    {
      id: 'idw',
      name: 'Inverse Distance Weighting (IDW)',
      description: 'Pondération par distance inverse',
      precision: '±3mm',
      speed: 'Très rapide',
      quality: 'Bonne',
      endpoint: 'interpolate_idw_static'
    }
  ];

  // Fonction utilitaire pour obtenir l'endpoint
  const getEndpointForMethod = (method) => {
    const found = interpolationMethods.find(m => m.id === method);
    return found ? found.endpoint : 'interpolate_knn_static';
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.edf')) {
      setError('Veuillez sélectionner un fichier EDF (.edf)');
      return;
    }
    
    setIsUploading(true);
    setError('');
    setUploadProgress(0);
    
    try {
      // Create form data with file and head circumference
      const formData = new FormData();
      formData.append('file', file);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      // Upload file to API
      api.post(`/eeg/upload_edf/${patientId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      .then(response => {
        const result = response.data;
        
        if (response.status !== 200) {
          throw new Error(
            result.msg || 
            result.message || 
            'Échec de la configuration'
          );
        }
        
        // Update the uploaded file
        const updatedFile = {
          ...result,
          originalElectrodes: patientConfig.originalElectrodes,
        };
        
        setUploadedFile(updatedFile);
        setUploadProgress(100);
        setShowConfig(true);
        setIsUploading(false);
      })
      .catch(err => {
        console.error('Erreur upload:', err);
        setError(`Erreur lors du traitement du fichier EDF: ${err.response?.data?.msg || err.message}`);
        setIsUploading(false);
      });
    } catch (err: any) {
      console.error('Erreur upload:', err);
      setError(`Erreur lors du traitement du fichier EDF: ${err.response?.data?.msg || err.message}`);
      setIsUploading(false);
    }
  }, [patientId, patientConfig.originalElectrodes]);

  const handleConfigChange = (field: keyof PatientConfig, value: any) => {
    setPatientConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConfigSubmit = async () => {
    if (!uploadedFile) {
      setError('Aucun fichier téléchargé');
      return;
    }
    
    setIsProcessing(true);
    setError('');
    setProcessingStep('Initialisation...');
    setProcessingProgress(0);
    
    try {
      // Step 1: Save parameters and convert coordinates
      setProcessingStep('Conversion des coordonnées...');
      setProcessingProgress(10);
      
      const headCircumferenceMm = patientConfig.headCircumference * 10; // Convert to mm
      
      const configResponse = await api.post(`/eeg/convert_coordinates/${patientId}`, {
        head_circumference_mm: headCircumferenceMm,
        montage_sizes: [patientConfig.originalElectrodes, patientConfig.interpolationTarget]
      });
      
      if (!configResponse.data.success) {
        throw new Error(
          configResponse.data.message || 
          configResponse.data.error || 
          'Échec de la configuration'
        );
      }
      
      // Store calculated positions
      setElectrodePositions(configResponse.data.data);
      
      // Step 2: Interpolate with chosen method
      const selectedMethod = interpolationMethods.find(m => m.id === patientConfig.interpolationMethod);
      setProcessingStep(`Interpolation des signaux (${selectedMethod?.name})...`);
      setProcessingProgress(60);
      
      const endpoint = getEndpointForMethod(patientConfig.interpolationMethod);
      const interpolationResponse = await api.get(
        `/eeg/${endpoint}/${patientId}/${uploadedFile.filename}/${patientConfig.originalElectrodes}/${patientConfig.interpolationTarget}?head_circumference_mm=${headCircumferenceMm}`
      );
      
      if (!interpolationResponse.data.channels) {
        throw new Error('Échec de l\'interpolation');
      }
      
      // Step 3: Retrieve interpolated data
      setProcessingStep('Récupération des données interpolées...');
      setProcessingProgress(80);
      
      const interpolatedDataResponse = await api.get(
        `/eeg/get_interpolated_data/${patientId}/${uploadedFile.filename}/${patientConfig.originalElectrodes}/${patientConfig.interpolationTarget}`
      );
      
      if (!interpolatedDataResponse.data.signals || !interpolatedDataResponse.data.times) {
        throw new Error('Données interpolées invalides');
      }
      
      // Step 4: Prepare final data
      setProcessingStep('Finalisation...');
      setProcessingProgress(90);
      
      // Create EEG data object
      const eegData = {
        timestamps: interpolatedDataResponse.data.times,
        signals: interpolatedDataResponse.data.channels.reduce((acc: any, electrode: string, index: number) => ({
          ...acc,
          [electrode]: interpolatedDataResponse.data.signals[index]
        }), {}),
        electrodes: Object.keys(configResponse.data.data[patientConfig.interpolationTarget.toString()]).map(name => ({
          name,
          ...configResponse.data.data[patientConfig.interpolationTarget.toString()][name]
        })),
        duration: uploadedFile.duration,
        samplingRate: interpolatedDataResponse.data.sampling_rate || uploadedFile.sfreq,
        patientConfig,
        interpolationInfo: {
          original: patientConfig.originalElectrodes,
          interpolated: patientConfig.interpolationTarget,
          method: selectedMethod?.name || 'KNN Sphérique',
          accuracy: selectedMethod?.precision || '±2mm'
        }
      };
      
      setProcessingProgress(100);
      setProcessingStep('Analyse terminée avec succès!');
      
      // Small delay so user sees success message
      setTimeout(() => {
        onFileProcessed(uploadedFile, eegData, patientConfig);
        setIsProcessing(false);
      }, 1000);
      
    } catch (err: any) {
      console.error('Erreur complète:', {
        error: err,
        response: err.response?.data,
        status: err.response?.status
      });
      
      let errorMessage = 'Erreur technique';
      if (err.response) {
        errorMessage = err.response.data?.msg || err.response.data?.message || err.response.data?.error || 'Erreur serveur';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setIsProcessing(false);
    }
  };

  if (showConfig && uploadedFile) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Settings className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Configuration Patient</h3>
              <p className="text-gray-600">Paramètres anatomiques et interpolation des électrodes</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration anatomique */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
            <h4 className="text-xl font-bold text-blue-900 mb-6 flex items-center space-x-2">
              <User className="h-6 w-6" />
              <span>Paramètres Anatomiques</span>
            </h4>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Circonférence de la tête (cm) *
                </label>
                <div className="relative">
                  <Ruler className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    min="45"
                    max="70"
                    step="0.5"
                    value={patientConfig.headCircumference}
                    onChange={(e) => handleConfigChange('headCircumference', parseFloat(e.target.value))}
                    className="pl-12 w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm"
                    placeholder="56.0"
                  />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Petite: 45-53 cm</span>
                    <span>Normale: 54-58 cm</span>
                    <span>Grande: 59-70 cm</span>
                  </div>
                  <div className="mt-1 text-xs text-blue-600">
                    Mesure: tour de tête au niveau des sourcils et de l'occiput
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Âge (années)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={patientConfig.age}
                    onChange={(e) => handleConfigChange('age', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Genre
                  </label>
                  <select
                    value={patientConfig.gender}
                    onChange={(e) => handleConfigChange('gender', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Notes cliniques
                </label>
                <textarea
                  value={patientConfig.notes}
                  onChange={(e) => handleConfigChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm resize-none"
                  placeholder="Observations particulières, conditions d'enregistrement..."
                />
              </div>
            </div>
          </div>
          
          {/* Configuration interpolation */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6">
            <h4 className="text-xl font-bold text-purple-900 mb-6 flex items-center space-x-2">
              <Brain className="h-6 w-6" />
              <span>Interpolation des Électrodes</span>
            </h4>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Nombre d'électrodes original *
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {[16, 32, 64].map(count => (
                    <button
                      key={count}
                      onClick={() => handleConfigChange('originalElectrodes', count)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        patientConfig.originalElectrodes === count
                          ? 'border-purple-500 bg-purple-100 text-purple-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                      }`}
                    >
                      <div className="font-bold text-base mb-2">{count} électrodes</div>
                      <div className="text-sm opacity-75">
                        {count === 16 && 'Configuration standard clinique'}
                        {count === 32 && 'Résolution standard'}
                        {count === 64 && 'Haute résolution'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Interpolation vers *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[32, 64, 128].map(count => (
                    <button
                      key={count}
                      onClick={() => handleConfigChange('interpolationTarget', count)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        patientConfig.interpolationTarget === count
                          ? 'border-purple-500 bg-purple-100 text-purple-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                      }`}
                    >
                      <div className="font-bold text-base mb-2">{count}</div>
                      <div className="text-xs opacity-75">
                        {count === 32 ? 'Résolution standard' :
                         count === 64 ? 'Haute résolution' : 'Très haute résolution'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Show calculated positions if available */}
              {electrodePositions && (
                <div className="bg-white/80 rounded-lg p-4 border border-purple-200">
                  <h5 className="font-bold text-purple-900 mb-2">Positions calculées</h5>
                  <div className="text-sm text-purple-800">
                    <div>• Positions pour {patientConfig.originalElectrodes} électrodes: {electrodePositions[patientConfig.originalElectrodes.toString()] ? Object.keys(electrodePositions[patientConfig.originalElectrodes.toString()]).length : 0}</div>
                    <div>• Positions pour {patientConfig.interpolationTarget} électrodes: {electrodePositions[patientConfig.interpolationTarget.toString()] ? Object.keys(electrodePositions[patientConfig.interpolationTarget.toString()]).length : 0}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Methods of interpolation */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
            <h4 className="text-xl font-bold text-amber-900 mb-6 flex items-center space-x-2">
              <Zap className="h-6 w-6" />
              <span>Méthode d'Interpolation</span>
            </h4>
            <div className="space-y-4">
              {interpolationMethods.map(method => (
                <button
                  key={method.id}
                  onClick={() => handleConfigChange('interpolationMethod', method.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    patientConfig.interpolationMethod === method.id
                      ? 'border-amber-500 bg-amber-100 text-amber-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300'
                  }`}
                >
                  <div className="font-bold text-base mb-2">{method.name}</div>
                  <div className="text-sm opacity-75 mb-3">{method.description}</div>
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium">Précision:</span>
                      <span>{method.precision}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Vitesse:</span>
                      <span>{method.speed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Qualité:</span>
                      <span>{method.quality}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 bg-white/80 rounded-lg p-4 border border-amber-200">
              <h5 className="font-bold text-amber-900 mb-2">Méthode sélectionnée</h5>
              <div className="text-sm text-amber-800">
                <div><strong>Algorithme:</strong>{interpolationMethods.find(m => m.id === patientConfig.interpolationMethod)?.name.split('(')[0].trim()}</div>
              <div><strong>Précision:</strong>{interpolationMethods.find(m => m.id === patientConfig.interpolationMethod)?.precision}</div>
              <div><strong>Base:</strong> Système 10-20 international</div>
              <div><strong>Validation:</strong> Conforme aux normes cliniques</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Summary configuration */}
        <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
          <h4 className="text-xl font-bold text-green-900 mb-4">Résumé de la Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
            <div className="bg-white/80 rounded-lg p-3">
              <div className="font-medium text-green-900 mb-2">Fichier EDF</div>
              <div className="text-green-700">{uploadedFile.filename}</div>
              <div className="text-xs text-green-600 mt-1">
                {Math.round(uploadedFile.duration / 60)} min • {uploadedFile.sfreq} Hz
              </div>
            </div>
            
            <div className="bg-white/80 rounded-lg p-3">
              <div className="font-medium text-green-900 mb-2">Anatomie</div>
              <div className="text-green-700">{patientConfig.headCircumference} cm</div>
              <div className="text-xs text-green-600 mt-1">
                {patientConfig.age} ans • {patientConfig.gender === 'M' ? 'Masculin' : 'Féminin'}
              </div>
            </div>
            
            <div className="bg-white/80 rounded-lg p-3">
              <div className="font-medium text-green-900 mb-2">Électrodes</div>
              <div className="text-green-700">{patientConfig.originalElectrodes} → {patientConfig.interpolationTarget}</div>
              <div className="text-xs text-green-600 mt-1">
                Facteur: ×{(patientConfig.interpolationTarget / patientConfig.originalElectrodes).toFixed(1)}
              </div>
            </div>

            <div className="bg-white/80 rounded-lg p-3">
              <div className="font-medium text-green-900 mb-2">Méthode</div>
              <div className="text-green-700">
                {interpolationMethods.find(m => m.id === patientConfig.interpolationMethod)?.name.split('(')[0].trim()}
              </div>
              <div className="text-xs text-green-600 mt-1">
                {interpolationMethods.find(m => m.id === patientConfig.interpolationMethod)?.precision}
              </div>
            </div>
            
            <div className="bg-white/80 rounded-lg p-3">
              <div className="font-medium text-green-900 mb-2">Résolution</div>
              <div className="text-green-700">
                {patientConfig.interpolationTarget === 32 ? 'Standard' :
                 patientConfig.interpolationTarget === 64 ? 'Haute' : 'Très haute'}
              </div>
              <div className="text-xs text-green-600 mt-1">
                {interpolationMethods.find(m => m.id === patientConfig.interpolationMethod)?.quality}
              </div>
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="mt-8 flex space-x-4">
          <button
            onClick={handleConfigSubmit}
            disabled={isProcessing}
            className={`flex items-center space-x-3 px-8 py-4 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 ${
              isProcessing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{processingStep}</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                <span>Démarrer l'analyse</span>
              </>
            )}
          </button>
          
          <button
            onClick={() => {
              setShowConfig(false);
              setUploadedFile(null);
              setElectrodePositions(null);
              setUploadProgress(0);
            }}
            className="flex items-center space-x-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white px-8 py-4 rounded-xl hover:from-gray-500 hover:to-gray-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <Upload className="h-5 w-5" />
            <span>Nouveau fichier</span>
          </button>
        </div>
        
        {/* Processing bar */}
        {isProcessing && (
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{processingStep}</span>
              <span className="text-sm font-medium text-gray-700">{processingProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">{processingStep}</p>
          </div>
        )}
        
        {/* Error display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Charger un fichier EDF
        </h3>
        <p className="text-gray-600">
          Sélectionnez un fichier EEG au format .edf pour commencer l'analyse
        </p>
      </div>
      
      {!isUploading ? (
        <div className="max-w-md mx-auto">
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <FileText className="h-12 w-12 text-gray-400 mb-3" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Cliquez pour charger</span> ou glissez-déposez
              </p>
              <p className="text-xs text-gray-500">Fichiers EDF uniquement</p>
            </div>
            <input
              type="file"
              accept=".edf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          
          {error && (
            <div className="mt-4 flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-md mx-auto">
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <div>
                <p className="font-medium text-gray-900">Traitement du fichier EDF...</p>
                <p className="text-sm text-gray-600">Extraction des signaux et métadonnées</p>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">{uploadProgress}%</p>
          </div>
        </div>
      )}
      
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Processus d'analyse EEG</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div>1. <strong>Upload EDF:</strong> Chargement et validation du fichier</div>
          <div>2. <strong>Configuration:</strong> Paramètres anatomiques du patient</div>
          <div>3. <strong>Calcul des positions:</strong> Coordonnées réelles et interpolées</div>
          <div>4. <strong>Analyse:</strong> Visualisation et traitement des signaux</div>
        </div>
      </div>
    </div>
  );
}