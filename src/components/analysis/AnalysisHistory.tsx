import React, { useState, useEffect, useMemo } from 'react';
import { usePatient } from '../../contexts/PatientContext';
import { History, FileText, Calendar, Clock, Eye, Download, Search, Filter, AlertCircle, Activity, BarChart3 } from 'lucide-react';
import apiService from '../../services/apiService';

interface AnalysisHistoryProps {
  patient: any;
  onLoadAnalysis: (file: any, data: any) => void;
}

interface FileData {
  id: string;
  filename: string;
  uploadDate: string;
  electrodes: string[] | any[];
  duration: number;
  samplingRate: number;
  processed: boolean;
}

interface AnalysisData {
  id?: string;
  filename?: string;
  type: string;
  source_size?: number;  // Format utilisé par le backend
  target_size?: number;  // Format utilisé par le backend
  sourceSize?: number;   // Format alternatif
  targetSize?: number;   // Format alternatif
  createdAt: string;
  channels: string[];
  data_path?: string;
  times_path?: string;
  edf_filename?: string; // Alternative à filename
}

export default function AnalysisHistory({ patient, onLoadAnalysis }: AnalysisHistoryProps) {
  const { getPatientFiles, getPatientAnalyses } = usePatient();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'filename' | 'duration'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientFiles, setPatientFiles] = useState<FileData[]>([]);
  const [patientAnalyses, setPatientAnalyses] = useState<AnalysisData[]>([]);
  const [headCircumference, setHeadCircumference] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'analyses'>('files');
  const [dataLoading, setDataLoading] = useState(true);

  // Charger les données du patient
  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      try {
        // Récupérer les fichiers depuis le contexte ou l'API
        const contextFiles = getPatientFiles(patient.id);
        if (contextFiles.length > 0) {
          setPatientFiles(contextFiles);
        } else {
          const files = await apiService.getPatientFiles(patient.id);
          setPatientFiles(files);
        }
        
        // Récupérer les analyses depuis le contexte ou l'API
        const contextAnalyses = getPatientAnalyses(patient.id);
        if (contextAnalyses.length > 0) {
          setPatientAnalyses(contextAnalyses);
        } else {
          const analyses = await apiService.getPatientAnalyses(patient.id);
          console.log("Analyses chargées:", analyses); // Debug
          setPatientAnalyses(analyses);
        }
        
        // Récupérer la circonférence de la tête
        const positionsData = await apiService.getElectrodePositions(patient.id);
        setHeadCircumference(positionsData.head_circumference_mm);
        
      } catch (err) {
        setError('Erreur lors du chargement des données du patient');
        console.error(err);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [patient.id, getPatientFiles, getPatientAnalyses]);

  // Utiliser useMemo pour optimiser le filtrage et le tri
  const filteredFiles = useMemo(() => {
    if (!patientFiles.length) return [];
    
    return patientFiles
      .filter(file => 
        file && file.filename && file.filename.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        let aVal, bVal;
        
        switch (sortBy) {
          case 'filename':
            aVal = a.filename?.toLowerCase() || '';
            bVal = b.filename?.toLowerCase() || '';
            break;
          case 'duration':
            aVal = a.duration || 0;
            bVal = b.duration || 0;
            break;
          default:
            aVal = new Date(a.uploadDate || 0).getTime();
            bVal = new Date(b.uploadDate || 0).getTime();
        }
        
        if (sortOrder === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });
  }, [patientFiles, searchTerm, sortBy, sortOrder]);

  const filteredAnalyses = useMemo(() => {
    if (!patientAnalyses.length) return [];
    
    return patientAnalyses
      .filter(analysis => {
        // Vérifier si filename ou edf_filename existe et n'est pas undefined
        const filename = analysis.filename || analysis.edf_filename || '';
        return filename && filename.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        let aVal, bVal;
        
        switch (sortBy) {
          case 'filename':
            aVal = (a.filename || a.edf_filename || '').toLowerCase();
            bVal = (b.filename || b.edf_filename || '').toLowerCase();
            break;
          default:
            aVal = new Date(a.createdAt || 0).getTime();
            bVal = new Date(b.createdAt || 0).getTime();
        }
        
        if (sortOrder === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });
  }, [patientAnalyses, searchTerm, sortBy, sortOrder]);

  // Formater la date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Date invalide';
    }
  };

  // Formater la durée
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Obtenir le nom de l'électrode (gère les chaînes et les objets)
  const getElectrodeName = (electrode: string | any) => {
    if (typeof electrode === 'string') {
      return electrode;
    }
    return electrode.name || `Electrode`;
  };

  // Obtenir une clé unique pour l'électrode
  const getElectrodeKey = (electrode: string | any, index: number) => {
    if (typeof electrode === 'string') {
      return electrode;
    }
    return electrode.id || electrode.name || `electrode-${index}`;
  };

  // Obtenir le nom du fichier pour l'analyse
  const getAnalysisFilename = (analysis: AnalysisData) => {
    return analysis.filename || analysis.edf_filename || 'Fichier inconnu';
  };

  // Obtenir une clé unique pour l'analyse
  const getAnalysisKey = (analysis: AnalysisData, index: number) => {
    return analysis.id || `${analysis.filename || analysis.edf_filename}-${analysis.createdAt}-${index}`;
  };

  // Obtenir la taille source de l'analyse
  const getSourceSize = (analysis: AnalysisData): number => {
    // Essayer différents formats possibles
    if (analysis.sourceSize !== undefined) return analysis.sourceSize;
    if (analysis.source_size !== undefined) return analysis.source_size;
    
    // Si aucune taille n'est définie, essayer de la déduire du nombre de canaux
    if (analysis.channels && analysis.channels.length > 0) {
      return analysis.channels.length;
    }
    
    // Valeur par défaut
    return 19; // Nombre standard d'électrodes EEG
  };

  // Obtenir la taille cible de l'analyse
  const getTargetSize = (analysis: AnalysisData): number => {
    // Essayer différents formats possibles
    if (analysis.targetSize !== undefined) return analysis.targetSize;
    if (analysis.target_size !== undefined) return analysis.target_size;
    
    // Valeur par défaut
    return 64; // Taille cible commune
  };

  // Charger une analyse depuis un fichier
  const handleLoadAnalysis = async (file: FileData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Vérifier si la circonférence de la tête est disponible
      if (!headCircumference) {
        throw new Error("La circonférence de la tête n'est pas définie pour ce patient");
      }

      // Déterminer les tailles source et cible
      const srcSize = Array.isArray(file.electrodes) ? file.electrodes.length : 0;
      const targetSize = 64; // Taille cible par défaut

      // Appeler l'API pour interpoler les données
      const interpolationData = await apiService.interpolateData(
        patient.id,
        file.filename,
        srcSize,
        targetSize,
        headCircumference
      );

      // Récupérer les positions des électrodes pour la grille cible
      const targetPositionsData = await apiService.getElectrodePositions(patient.id, targetSize);
      const electrodePositions = targetPositionsData.electrode_positions[targetSize] || [];

      // Formater les données pour onLoadAnalysis
      const analysisData = {
        timestamps: interpolationData.times,
        signals: {},
        electrodes: electrodePositions,
        duration: interpolationData.times[interpolationData.times.length - 1] - interpolationData.times[0],
        samplingRate: interpolationData.sampling_rate
      };

      // Remplir l'objet signals
      interpolationData.signals.forEach((signalArray: number[], index: number) => {
        analysisData.signals[interpolationData.channels[index]] = signalArray;
      });

      // Appeler onLoadAnalysis avec les données réelles
      onLoadAnalysis(file, analysisData);
      
      // Optionnel: rafraîchir la liste des analyses
      const updatedAnalyses = await apiService.getPatientAnalyses(patient.id);
      setPatientAnalyses(updatedAnalyses);
      
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement de l\'analyse');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Recharger une analyse existante
  const handleReloadAnalysis = async (analysis: AnalysisData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Récupérer le nom du fichier
      const filename = getAnalysisFilename(analysis);
      if (!filename || filename === 'Fichier inconnu') {
        throw new Error("Nom de fichier manquant pour cette analyse");
      }

      // Récupérer les tailles source et cible
      const sourceSize = getSourceSize(analysis);
      const targetSize = getTargetSize(analysis);
      
      console.log("Rechargement de l'analyse:", {
        filename,
        sourceSize,
        targetSize,
        patientId: patient.id
      });

      // Récupérer le fichier original associé à l'analyse
      const originalFile = patientFiles.find(file => file.filename === filename);
      if (!originalFile) {
        throw new Error("Fichier original introuvable");
      }

      // Récupérer les données interpolées depuis le backend
      const interpolatedData = await apiService.getInterpolatedData(
        patient.id,
        filename,
        sourceSize,
        targetSize
      );

      // Formater les données pour onLoadAnalysis
      const analysisData = {
        timestamps: interpolatedData.times,
        signals: {},
        electrodes: interpolatedData.electrodes,
        duration: interpolatedData.times[interpolatedData.times.length - 1] - interpolatedData.times[0],
        samplingRate: interpolatedData.sampling_rate
      };

      // Remplir l'objet signals
      interpolatedData.signals.forEach((signalArray: number[], index: number) => {
        analysisData.signals[interpolatedData.channels[index]] = signalArray;
      });

      // Appeler onLoadAnalysis avec les données
      onLoadAnalysis(originalFile, analysisData);
      
    } catch (err) {
      setError(err.message || 'Erreur lors du rechargement de l\'analyse');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculer les statistiques
  const totalFiles = patientFiles.length;
  const totalDuration = Math.round(patientFiles.reduce((sum, f) => sum + (f.duration || 0), 0) / 60);
  const totalAnalyses = patientAnalyses.length;

  // Afficher un indicateur de chargement pendant le chargement des données
  if (dataLoading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Historique des Analyses</h3>
        <p className="text-gray-600">
          Consultez et rechargez les analyses EEG précédentes pour {patient.firstName} {patient.lastName}
        </p>
      </div>

      {/* Afficher les erreurs */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-red-800">Erreur</h4>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Onglets */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('files')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'files'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Fichiers EEG
            </div>
          </button>
          <button
            onClick={() => setActiveTab('analyses')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analyses'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Analyses effectuées
            </div>
          </button>
        </nav>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'filename' | 'duration')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="date">Trier par date</option>
            <option value="filename">Trier par nom</option>
            {activeTab === 'files' && <option value="duration">Trier par durée</option>}
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="desc">Décroissant</option>
            <option value="asc">Croissant</option>
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h4 className="font-medium text-blue-900">Fichiers EEG</h4>
          </div>
          <p className="text-2xl font-bold text-blue-600">{totalFiles}</p>
          <p className="text-sm text-blue-700">Total uploadés</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-5 w-5 text-green-600" />
            <h4 className="font-medium text-green-900">Durée Totale</h4>
          </div>
          <p className="text-2xl font-bold text-green-600">{totalDuration}</p>
          <p className="text-sm text-green-700">Minutes d'EEG</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="h-5 w-5 text-purple-600" />
            <h4 className="font-medium text-purple-900">Analyses</h4>
          </div>
          <p className="text-2xl font-bold text-purple-600">{totalAnalyses}</p>
          <p className="text-sm text-purple-700">Complétées</p>
        </div>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'files' ? (
        // Liste des fichiers
        filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {totalFiles === 0 ? 'Aucun fichier EEG' : 'Aucun résultat'}
            </h3>
            <p className="text-gray-600">
              {totalFiles === 0 
                ? 'Commencez par uploader un fichier EDF pour ce patient'
                : 'Aucun fichier ne correspond à votre recherche'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFiles.map((file) => (
              <div
                key={file.id || file.filename}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <FileText className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{file.filename}</h4>
                        <p className="text-sm text-gray-600">ID: {file.id}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(file.uploadDate)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(file.duration)}</span>
                      </div>
                      
                      <div className="text-gray-600">
                        <span className="font-medium">Fréq:</span> {file.samplingRate} Hz
                      </div>
                      
                      <div className="text-gray-600">
                        <span className="font-medium">Électrodes:</span> {Array.isArray(file.electrodes) ? file.electrodes.length : 0}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Array.isArray(file.electrodes) && file.electrodes.slice(0, 10).map((electrode, index) => (
                        <span
                          key={getElectrodeKey(electrode, index)}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {getElectrodeName(electrode)}
                        </span>
                      ))}
                      {Array.isArray(file.electrodes) && file.electrodes.length > 10 && (
                        <span key="more-electrodes" className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          +{file.electrodes.length - 10} autres
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-6">
                    <button
                      onClick={() => handleLoadAnalysis(file)}
                      disabled={loading}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        loading 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Chargement...</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          <span>Analyser</span>
                        </>
                      )}
                    </button>
                    
                    <div className="flex items-center justify-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        file.processed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {file.processed ? 'Traité' : 'En cours'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Liste des analyses
        filteredAnalyses.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {totalAnalyses === 0 ? 'Aucune analyse' : 'Aucun résultat'}
            </h3>
            <p className="text-gray-600">
              {totalAnalyses === 0 
                ? 'Aucune analyse n\'a été effectuée pour ce patient'
                : 'Aucune analyse ne correspond à votre recherche'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnalyses.map((analysis, index) => (
              <div
                key={getAnalysisKey(analysis, index)}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Activity className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{getAnalysisFilename(analysis)}</h4>
                        <p className="text-sm text-gray-600">
                          {analysis.type} - {getSourceSize(analysis)} → {getTargetSize(analysis)} électrodes
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(analysis.createdAt)}</span>
                      </div>
                      
                      <div className="text-gray-600">
                        <span className="font-medium">Type:</span> {analysis.type}
                      </div>
                      
                      <div className="text-gray-600">
                        <span className="font-medium">Électrodes:</span> {analysis.channels.length}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {analysis.channels.slice(0, 10).map((channel, channelIndex) => (
                        <span
                          key={`channel-${channelIndex}`}
                          className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                        >
                          {channel}
                        </span>
                      ))}
                      {analysis.channels.length > 10 && (
                        <span key="more-channels" className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          +{analysis.channels.length - 10} autres
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-6">
                    <button
                      onClick={() => handleReloadAnalysis(analysis)}
                      disabled={loading}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        loading 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Chargement...</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          <span>Voir l'analyse</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Comment utiliser l'historique</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li key="help-1">• Utilisez l'onglet "Fichiers EEG" pour analyser de nouveaux fichiers</li>
          <li key="help-2">• Utilisez l'onglet "Analyses effectuées" pour revoir les analyses précédentes</li>
          <li key="help-3">• Utilisez la recherche pour trouver rapidement un fichier ou une analyse spécifique</li>
          <li key="help-4">• Les analyses rechargées conservent tous les paramètres d'origine</li>
        </ul>
      </div>
    </div>
  );
}