import React, { useState, useEffect, useCallback, useRef } from 'react';
import Plot from 'react-plotly.js';
import { Play, Pause, SkipBack, SkipForward, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import api from '../../utils/api';

interface SignalVisualizationProps {
  patientId: string;
  edfFilename: string;
  onIntervalSelected: (interval: { start: number; end: number }) => void;
}

export default function SignalVisualization({ patientId, edfFilename, onIntervalSelected }: SignalVisualizationProps) {
  // Limiter aux 16 électrodes standard du système 10-20
  const standardElectrodes = ['Fp1', 'Fp2', 'F7', 'F3', 'F4', 'F8', 'T3', 'C3', 'C4', 'T4', 'T5', 'P3', 'P4', 'T6', 'O1', 'O2'];
  
  const [availableElectrodes, setAvailableElectrodes] = useState<string[]>([]);
  const [selectedElectrodes, setSelectedElectrodes] = useState<string[]>([]);
  const [missingElectrodes, setMissingElectrodes] = useState<string[]>([]);
  const [timeWindow, setTimeWindow] = useState({ start: 0, end: 30 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [eegData, setEegData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parametersValid, setParametersValid] = useState(false);
  const [signalScaling, setSignalScaling] = useState(1); // Facteur d'échelle pour les signaux
  
  const maxTime = eegData?.duration || 300;
  
  // Utiliser useRef pour éviter les dépendances changeantes
  const onIntervalSelectedRef = useRef(onIntervalSelected);
  onIntervalSelectedRef.current = onIntervalSelected;
  
  // Vérifier si les paramètres nécessaires sont définis
  const isValidParams = useCallback(() => {
    return patientId && edfFilename && patientId !== 'undefined' && edfFilename !== 'undefined';
  }, [patientId, edfFilename]);
  
  // Récupérer la liste des électrodes disponibles
  const fetchAvailableElectrodes = useCallback(async () => {
    if (!isValidParams()) {
      setParametersValid(false);
      return;
    }
    
    try {
      const response = await api.get(`/eeg/list_channels/${patientId}/${edfFilename}`);
      setAvailableElectrodes(response.data.channels || []);
      
      // Sélectionner par défaut les 8 premières électrodes disponibles
      if (response.data.channels && response.data.channels.length > 0) {
        const defaultSelection = response.data.channels.slice(0, Math.min(8, response.data.channels.length));
        setSelectedElectrodes(defaultSelection);
      }
      
      setParametersValid(true);
      return true;
    } catch (err: any) {
      console.error('Erreur lors de la récupération des électrodes:', err);
      setError(err.response?.data?.msg || 'Erreur lors de la récupération des électrodes');
      setParametersValid(false);
      return false;
    }
  }, [patientId, edfFilename, isValidParams]);
  
  // Effet pour récupérer les électrodes disponibles au chargement
  useEffect(() => {
    fetchAvailableElectrodes();
  }, [fetchAvailableElectrodes]);
  
  // Effet pour récupérer les données EEG depuis le backend
  useEffect(() => {
    const fetchEEGData = async () => {
      if (!isValidParams() || selectedElectrodes.length === 0 || !parametersValid) {
        if (!isValidParams()) {
          setError("ID patient ou nom de fichier EDF manquant");
        } else if (!parametersValid) {
          setError("Patient ou fichier EDF introuvable");
        } else if (selectedElectrodes.length === 0) {
          setError("Aucune électrode sélectionnée");
        }
        return;
      }
      
      setLoading(true);
      setError(null);
      setMissingElectrodes([]); // Réinitialiser les électrodes manquantes
      
      try {
        let response;
        
        // Utiliser POST pour les requêtes avec plusieurs électrodes
        if (selectedElectrodes.length > 1) {
          response = await api.post(`/eeg/extract_signals/${patientId}/${edfFilename}`, {
            electrodes: selectedElectrodes,
            tmin: timeWindow.start,
            tmax: timeWindow.end
          });
        } else {
          // Utiliser GET pour une seule électrode
          response = await api.get(
            `/eeg/extract_signals/${patientId}/${edfFilename}?tmin=${timeWindow.start}&tmax=${timeWindow.end}&electrodes=${selectedElectrodes[0]}`
          );
        }
        
        if (!response.data.electrodes || !response.data.signals) {
          throw new Error('Données de signaux invalides reçues du serveur');
        }
        
        // Vérifier s'il y a des électrodes manquantes
        if (response.data.missing_electrodes && response.data.missing_electrodes.length > 0) {
          setMissingElectrodes(response.data.missing_electrodes);
        }
        
        // Mettre à jour les électrodes sélectionnées avec celles qui sont réellement disponibles
        if (response.data.electrodes.length !== selectedElectrodes.length) {
          setSelectedElectrodes(response.data.electrodes);
        }
        
        // Structurer les données pour le composant
        const signals: Record<string, number[]> = {};
        response.data.electrodes.forEach((electrode: string, index: number) => {
          signals[electrode] = response.data.signals[index];
        });
        
        // Calculer automatiquement un facteur d'échelle approprié
        let maxAmplitude = 0;
        response.data.signals.forEach((signal: number[]) => {
          const minVal = Math.min(...signal);
          const maxVal = Math.max(...signal);
          const amplitude = maxVal - minVal;
          if (amplitude > maxAmplitude) maxAmplitude = amplitude;
        });
        
        // Déterminer un facteur d'échelle si l'amplitude est trop faible
        let scaling = 1;
        if (maxAmplitude > 0 && maxAmplitude < 50) {
          scaling = 50 / maxAmplitude;
        }
        
        setSignalScaling(scaling);
        
        setEegData({
          timestamps: response.data.times,
          signals,
          samplingRate: response.data.sampling_rate,
          duration: response.data.duration || 300,
          rawSignals: signals // Conserver les signaux bruts pour référence
        });
      } catch (err: any) {
        console.error('Erreur lors de la récupération des signaux EEG:', err);
        setError(err.response?.data?.msg || err.message || 'Erreur lors du chargement des données EEG');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEEGData();
  }, [patientId, edfFilename, selectedElectrodes, timeWindow, isValidParams, parametersValid]);
  
  // Effet pour la lecture automatique
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeWindow(prev => {
          const newStart = Math.min(prev.start + playbackSpeed, maxTime - (prev.end - prev.start));
          return {
            start: newStart,
            end: newStart + (prev.end - prev.start)
          };
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, maxTime]);
  
  // Effet pour notifier le parent lorsque la fenêtre de temps change
  useEffect(() => {
    // Utiliser la ref pour accéder à la fonction actuelle sans créer de dépendance
    if (onIntervalSelectedRef.current) {
      onIntervalSelectedRef.current(timeWindow);
    }
  }, [timeWindow]); // Seulement timeWindow comme dépendance
  
  const handleElectrodeToggle = (electrode: string) => {
    setSelectedElectrodes(prev =>
      prev.includes(electrode)
        ? prev.filter(e => e !== electrode)
        : [...prev, electrode]
    );
  };
  
  const generatePlotData = () => {
    if (!eegData?.signals || !eegData?.timestamps) return [];
    
    return selectedElectrodes.map((electrode, index) => {
      // Vérifier que l'électrode existe dans les données
      if (!eegData.signals[electrode]) {
        console.warn(`L'électrode ${electrode} n'existe pas dans les données`);
        return null;
      }
      
      const signal = eegData.signals[electrode] || [];
      
      // Appliquer le facteur d'échelle pour améliorer la visibilité
      const scaledSignal = signal.map((val: number) => val * signalScaling);
      
      // Décaler les signaux pour qu'ils ne se superposent pas
      const offset = index * 150; // Augmenter l'offset pour une meilleure séparation
      const offsetSignal = scaledSignal.map((val: number) => val + offset);
      
      // Couleur différente pour les électrodes selon leur région
      let color = '#3b82f6'; // Bleu par défaut
      if (electrode.startsWith('F')) color = '#ef4444'; // Rouge pour frontal
      if (electrode.startsWith('C')) color = '#10b981'; // Vert pour central
      if (electrode.startsWith('P')) color = '#8b5cf6'; // Violet pour pariétal
      if (electrode.startsWith('O')) color = '#f59e0b'; // Orange pour occipital
      if (electrode.startsWith('T')) color = '#06b6d4'; // Cyan pour temporal
      
      return {
        x: eegData.timestamps,
        y: offsetSignal,
        type: 'scatter',
        mode: 'lines',
        name: electrode,
        line: { width: 1.5, color },
      };
    }).filter(Boolean); // Filtrer les valeurs null
  };
  
  const handleTimeNavigation = (direction: 'back' | 'forward') => {
    const windowSize = timeWindow.end - timeWindow.start;
    const step = windowSize * 0.5;
    
    if (direction === 'back') {
      const newStart = Math.max(0, timeWindow.start - step);
      setTimeWindow({ start: newStart, end: newStart + windowSize });
    } else {
      const newStart = Math.min(maxTime - windowSize, timeWindow.start + step);
      setTimeWindow({ start: newStart, end: newStart + windowSize });
    }
  };
  
  const handleZoom = (factor: number) => {
    const currentCenter = (timeWindow.start + timeWindow.end) / 2;
    const currentSize = timeWindow.end - timeWindow.start;
    const newSize = Math.max(5, Math.min(300, currentSize * factor));
    const newStart = Math.max(0, currentCenter - newSize / 2);
    const newEnd = Math.min(maxTime, newStart + newSize);
    setTimeWindow({ start: newStart, end: newEnd });
  };
  
  const adjustScaling = (factor: number) => {
    setSignalScaling(prev => Math.max(0.1, prev * factor));
  };
  
  const selectAllElectrodes = () => {
    setSelectedElectrodes([...availableElectrodes]);
  };
  
  const selectByRegion = (region: string) => {
    const regionElectrodes = availableElectrodes.filter(e => e.startsWith(region));
    setSelectedElectrodes(regionElectrodes);
  };
  
  const clearSelection = () => {
    setSelectedElectrodes([]);
  };
  
  // Afficher un message d'erreur si les paramètres sont invalides
  if (!isValidParams()) {
    return (
      <div className="p-6">
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
          <div className="text-red-700">
            Paramètres manquants: ID patient ou nom de fichier EDF non spécifiés.
          </div>
        </div>
      </div>
    );
  }
  
  // Afficher un message si les paramètres sont invalides dans la base de données
  if (isValidParams() && !parametersValid) {
    return (
      <div className="p-6">
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
          <div className="text-red-700">
            Patient ou fichier EDF introuvable. Veuillez vérifier les paramètres.
          </div>
        </div>
      </div>
    );
  }
  
  // Afficher un message si aucune électrode n'est disponible
  if (availableElectrodes.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
          <div className="text-yellow-700">
            Aucune électrode disponible dans ce fichier EDF.
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Visualisation des Signaux EEG</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Fichier:</span> {edfFilename}
          </div>
          <div>
            <span className="font-medium">Durée:</span> {eegData ? Math.round(eegData.duration / 60) + ' min' : 'Chargement...'}
          </div>
          <div>
            <span className="font-medium">Échantillonnage:</span> {eegData?.samplingRate || 'Chargement...'} Hz
          </div>
          <div>
            <span className="font-medium">Électrodes:</span> {availableElectrodes.length} disponibles
          </div>
        </div>
      </div>
      
      {/* Affichage des erreurs */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
          <div className="text-red-700">{error}</div>
        </div>
      )}
      
      {/* Affichage des avertissements pour les électrodes manquantes */}
      {missingElectrodes.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
          <div className="text-yellow-700">
            Certaines électrodes demandées sont absentes du fichier EDF: {missingElectrodes.join(', ')}. 
            Seules les électrodes disponibles seront affichées.
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleTimeNavigation('back')}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              disabled={loading}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={() => handleTimeNavigation('forward')}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleZoom(0.5)}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleZoom(2)}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
          
          {/* Ajout de contrôles pour l'échelle des signaux */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Échelle:</span>
            <button
              onClick={() => adjustScaling(0.5)}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              -
            </button>
            <span className="text-sm text-gray-600">{signalScaling.toFixed(1)}x</span>
            <button
              onClick={() => adjustScaling(2)}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              +
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Fenêtre:</label>
            <input
              type="number"
              value={timeWindow.start}
              onChange={(e) => setTimeWindow({ ...timeWindow, start: parseFloat(e.target.value) })}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              min="0"
              max={maxTime - 1}
              step="0.1"
              disabled={loading}
            />
            <span className="text-gray-500">à</span>
            <input
              type="number"
              value={timeWindow.end}
              onChange={(e) => setTimeWindow({ ...timeWindow, end: parseFloat(e.target.value) })}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              min="1"
              max={maxTime}
              step="0.1"
              disabled={loading}
            />
            <span className="text-sm text-gray-500">sec</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Vitesse:</label>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="p-1 border border-gray-300 rounded text-sm"
              disabled={loading}
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
            </select>
          </div>
        </div>
        
        {/* Quick selection buttons */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={selectAllElectrodes}
              className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-full hover:bg-indigo-700"
              disabled={loading}
            >
              Toutes ({availableElectrodes.length})
            </button>
            <button
              onClick={() => selectByRegion('F')}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded-full hover:bg-red-600"
              disabled={loading}
            >
              Frontales
            </button>
            <button
              onClick={() => selectByRegion('C')}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded-full hover:bg-green-600"
              disabled={loading}
            >
              Centrales
            </button>
            <button
              onClick={() => selectByRegion('P')}
              className="px-3 py-1 text-sm bg-purple-500 text-white rounded-full hover:bg-purple-600"
              disabled={loading}
            >
              Pariétales
            </button>
            <button
              onClick={() => selectByRegion('O')}
              className="px-3 py-1 text-sm bg-orange-500 text-white rounded-full hover:bg-orange-600"
              disabled={loading}
            >
              Occipitales
            </button>
            <button
              onClick={() => selectByRegion('T')}
              className="px-3 py-1 text-sm bg-cyan-500 text-white rounded-full hover:bg-cyan-600"
              disabled={loading}
            >
              Temporales
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded-full hover:bg-gray-600"
              disabled={loading}
            >
              Effacer
            </button>
          </div>
        </div>
        
        {/* Electrode selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Électrodes sélectionnées ({selectedElectrodes.length}/{availableElectrodes.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {availableElectrodes.map((electrode: string) => {
              // Couleur selon la région
              let colorClass = 'border-gray-300 hover:bg-gray-50';
              let selectedColorClass = 'bg-indigo-600 text-white border-indigo-600';
              
              if (electrode.startsWith('F')) {
                colorClass = 'border-red-300 hover:bg-red-50';
                selectedColorClass = 'bg-red-600 text-white border-red-600';
              } else if (electrode.startsWith('C')) {
                colorClass = 'border-green-300 hover:bg-green-50';
                selectedColorClass = 'bg-green-600 text-white border-green-600';
              } else if (electrode.startsWith('P')) {
                colorClass = 'border-purple-300 hover:bg-purple-50';
                selectedColorClass = 'bg-purple-600 text-white border-purple-600';
              } else if (electrode.startsWith('O')) {
                colorClass = 'border-orange-300 hover:bg-orange-50';
                selectedColorClass = 'bg-orange-600 text-white border-orange-600';
              } else if (electrode.startsWith('T')) {
                colorClass = 'border-cyan-300 hover:bg-cyan-50';
                selectedColorClass = 'bg-cyan-600 text-white border-cyan-600';
              }
              
              return (
                <button
                  key={electrode}
                  onClick={() => handleElectrodeToggle(electrode)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    selectedElectrodes.includes(electrode)
                      ? selectedColorClass
                      : `bg-white text-gray-700 ${colorClass}`
                  }`}
                  disabled={loading}
                >
                  {electrode}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Plot */}
      <div className="bg-white border rounded-lg p-4">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-12 w-12 text-gray-400" />
            <span className="ml-3 text-gray-600">Chargement des données EEG...</span>
          </div>
        ) : eegData ? (
          <Plot
            data={generatePlotData()}
            layout={{
              title: `Signaux EEG (${timeWindow.start.toFixed(1)}s - ${timeWindow.end.toFixed(1)}s)`,
              xaxis: {
                title: 'Temps (secondes)',
                gridcolor: '#f0f0f0',
                range: [timeWindow.start, timeWindow.end]
              },
              yaxis: {
                title: 'Amplitude (µV) - Électrodes décalées',
                gridcolor: '#f0f0f0',
                showticklabels: false,
                // Ajuster automatiquement la plage de l'axe Y
                autorange: true
              },
              height: 600,
              showlegend: true,
              legend: { orientation: 'h', y: -0.2 },
              margin: { l: 50, r: 50, t: 50, b: 100 },
              plot_bgcolor: 'white',
              paper_bgcolor: 'white',
            }}
            config={{
              displayModeBar: true,
              modeBarButtonsToRemove: ['lasso2d', 'select2d'],
              displaylogo: false,
            }}
            style={{ width: '100%' }}
          />
        ) : (
          <div className="flex justify-center items-center h-64 text-gray-500">
            {error ? "Erreur de chargement des données" : "Sélectionnez des électrodes pour afficher les signaux"}
          </div>
        )}
      </div>
    </div>
  );
}