import React, { useState, useEffect } from 'react';
import { Download, FileText, Database, Mail, Share2 } from 'lucide-react';

interface ExportDataProps {
  patient: any;
  file: any;
  data: any;
}

export default function ExportData({ patient, file, data }: ExportDataProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [includeRawSignals, setIncludeRawSignals] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportData, setExportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Récupérer toutes les données nécessaires à l'export
  useEffect(() => {
    const fetchExportData = async () => {
      try {
        const response = await fetch(`/api/eeg/export_data/${patient.id}/${file.filename}`);
        if (response.ok) {
          const data = await response.json();
          setExportData(data);
        } else {
          console.error('Erreur lors de la récupération des données d\'export');
        }
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    if (patient && file) {
      fetchExportData();
    }
  }, [patient, file]);

  const generateCSVData = () => {
    if (!exportData) return "";
    
    const timeInterval = data.selectedInterval || { start: 0, end: data.duration || 300 };
    
    let csvContent = "";
    
    // Header with metadata
    csvContent += "# EEG Analysis Export\n";
    csvContent += `# Patient: ${exportData.patient.firstName} ${exportData.patient.lastName} (${exportData.patient.id})\n`;
    csvContent += `# File: ${exportData.file.filename}\n`;
    csvContent += `# Analysis Date: ${new Date().toISOString()}\n`;
    csvContent += `# Time Interval: ${timeInterval.start}s - ${timeInterval.end}s\n`;
    csvContent += `# Duration: ${(timeInterval.end - timeInterval.start).toFixed(1)}s\n`;
    csvContent += `# Head Circumference: ${exportData.headCircumferenceMm || 'N/A'} mm\n`;
    csvContent += "#\n";
    
    // Interpolated electrode positions
    if (exportData.interpolatedElectrodes && Object.keys(exportData.interpolatedElectrodes).length > 0) {
      csvContent += "# Interpolated Electrode Positions\n";
      csvContent += "Montage_Size,Electrode,Position_X,Position_Y,Position_Z\n";
      
      Object.entries(exportData.interpolatedElectrodes).forEach(([size, positions]: [string, any]) => {
        Object.entries(positions).forEach(([name, pos]: [string, any]) => {
          csvContent += `${size},${name},${pos.x.toFixed(6)},${pos.y.toFixed(6)},${pos.z.toFixed(6)}\n`;
        });
      });
    } else {
      csvContent += "# No interpolated electrode positions available\n";
    }
    
    if (includeRawSignals && data.signals) {
      csvContent += "\n# Raw Signal Data\n";
      csvContent += "Time," + data.electrodes.map((e: any) => e.name).join(",") + "\n";
      
      const startIdx = Math.floor(timeInterval.start * data.samplingRate);
      const endIdx = Math.floor(timeInterval.end * data.samplingRate);
      
      for (let i = startIdx; i < endIdx && i < data.timestamps.length; i++) {
        const row = [data.timestamps[i].toFixed(6)];
        data.electrodes.forEach((electrode: any) => {
          const signal = data.signals[electrode.name];
          row.push(signal && signal[i] ? signal[i].toFixed(6) : '0');
        });
        csvContent += row.join(",") + "\n";
      }
    }
    
    return csvContent;
  };

  const generateJSONData = () => {
    if (!exportData) return "";
    
    const timeInterval = data.selectedInterval || { start: 0, end: data.duration || 300 };
    
    const exportJsonData = {
      metadata: {
        patient: exportData.patient,
        file: exportData.file,
        analysis: {
          date: new Date().toISOString(),
          timeInterval: timeInterval,
          duration: timeInterval.end - timeInterval.start,
        },
        headCircumferenceMm: exportData.headCircumferenceMm,
        availableInterpolations: exportData.availableInterpolations
      },
      interpolatedElectrodes: exportData.interpolatedElectrodes || {},
      statistics: {
        totalElectrodes: data.electrodes.length,
        averageVoltage: data.electrodes.reduce((sum: number, e: any) => sum + e.averageVoltage, 0) / data.electrodes.length,
        maxVoltage: Math.max(...data.electrodes.map((e: any) => e.averageVoltage)),
        minVoltage: Math.min(...data.electrodes.map((e: any) => e.averageVoltage)),
      },
    };
    
    if (includeRawSignals && data.signals) {
      const startIdx = Math.floor(timeInterval.start * data.samplingRate);
      const endIdx = Math.floor(timeInterval.end * data.samplingRate);
      
      exportJsonData.rawSignals = {
        timestamps: data.timestamps.slice(startIdx, endIdx),
        signals: {},
      };
      
      data.electrodes.forEach((electrode: any) => {
        const signal = data.signals[electrode.name];
        exportJsonData.rawSignals.signals[electrode.name] = signal ? signal.slice(startIdx, endIdx) : [];
      });
    }
    
    return JSON.stringify(exportJsonData, null, 2);
  };

  const handleExport = async () => {
    if (!exportData) return;
    
    setIsExporting(true);
    
    try {
      let content = '';
      let filename = '';
      let mimeType = '';
      
      if (exportFormat === 'csv') {
        content = generateCSVData();
        filename = `EEG_Analysis_${patient.id}_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv;charset=utf-8';
      } else if (exportFormat === 'json') {
        content = generateJSONData();
        filename = `EEG_Analysis_${patient.id}_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json;charset=utf-8';
      }
      
      // Créer un Blob avec le contenu
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      // Créer un lien de téléchargement
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Nettoyer
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getEstimatedFileSize = () => {
    let baseSize = 0;
    let signalSize = 0;
    
    if (includeRawSignals && data.signals) {
      const timeInterval = data.selectedInterval || { start: 0, end: data.duration || 300 };
      const samples = (timeInterval.end - timeInterval.start) * data.samplingRate;
      signalSize = samples * data.electrodes.length * 8; // 8 bytes per float
    }
    
    // Ajouter la taille des données interpolées
    if (exportData && exportData.interpolatedElectrodes) {
      const interpolatedCount = Object.values(exportData.interpolatedElectrodes).reduce(
        (total: number, positions: any) => total + Object.keys(positions).length, 0
      );
      baseSize += interpolatedCount * 30; // Estimation pour les positions interpolées
    }
    
    const totalBytes = baseSize + signalSize;
    
    if (totalBytes < 1024) return `${totalBytes} B`;
    if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
    return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Export des Données</h3>
        <p className="text-gray-600">
          Téléchargez les résultats d'analyse au format souhaité
        </p>
      </div>
      
      {/* Aperçu des données disponibles */}
      {exportData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-2">Données disponibles pour l'export</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p><span className="font-medium">Positions interpolées:</span> {
                Object.keys(exportData.interpolatedElectrodes || {}).length > 0 
                  ? Object.keys(exportData.interpolatedElectrodes).join(', ') 
                  : 'Aucune'
              }</p>
            </div>
            <div>
              <p><span className="font-medium">Circonférence tête:</span> {exportData.headCircumferenceMm || 'N/A'} mm</p>
              <p><span className="font-medium">Interpolations disponibles:</span> {
                exportData.availableInterpolations?.length || 0
              }</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Export Configuration */}
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-4">Configuration de l'export</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format de fichier
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="format"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={(e) => setExportFormat(e.target.value as 'csv')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">CSV - Compatible Excel/Calc</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="format"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={(e) => setExportFormat(e.target.value as 'json')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">JSON - Données structurées</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeRawSignals}
                    onChange={(e) => setIncludeRawSignals(e.target.checked)}
                    className="text-indigo-600 focus:ring-indigo-500 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Inclure les signaux bruts (augmente la taille du fichier)
                  </span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Aperçu de l'export</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div>Format: {exportFormat.toUpperCase()}</div>
              <div>Taille estimée: {getEstimatedFileSize()}</div>
              <div>Électrodes: {data.electrodes.length}</div>
              <div>Signaux bruts: {includeRawSignals ? 'Inclus' : 'Exclus'}</div>
              <div>
                Intervalle: {(data.selectedInterval?.start || 0).toFixed(1)}s - {(data.selectedInterval?.end || data.duration).toFixed(1)}s
              </div>
              {exportData && (
                <div>
                  Positions interpolées: {
                    Object.keys(exportData.interpolatedElectrodes || {}).length > 0 
                      ? 'Incluses' 
                      : 'Non disponibles'
                  }
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Export Actions */}
        <div className="space-y-6">
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Download className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Prêt à télécharger</h4>
            <p className="text-gray-600 mb-4">
              Cliquez sur le bouton ci-dessous pour télécharger les données d'analyse
            </p>
            
            <button
              onClick={handleExport}
              disabled={isExporting || !exportData}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Export en cours...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Télécharger {exportFormat.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h5 className="font-medium text-gray-900">Format CSV</h5>
              </div>
              <p className="text-sm text-gray-600">
                Format tabulaire compatible avec Excel, LibreOffice Calc, et autres tableurs.
                Inclut les métadonnées et positions des électrodes interpolées.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <Database className="h-5 w-5 text-green-600" />
                <h5 className="font-medium text-gray-900">Format JSON</h5>
              </div>
              <p className="text-sm text-gray-600">
                Format structuré pour l'intégration avec d'autres systèmes d'analyse.
                Conserve toute la hiérarchie des données, y compris les positions interpolées.
              </p>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h5 className="font-medium text-yellow-900 mb-2">Note importante</h5>
            <p className="text-sm text-yellow-800">
              Les données exportées contiennent des informations médicales sensibles. 
              Assurez-vous de respecter les réglementations en vigueur (RGPD, etc.) 
              lors du stockage et du partage de ces fichiers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}