import React, { useState, useCallback, useEffect } from 'react';
import { usePatient } from '../contexts/PatientContext';
import FileUpload from './analysis/FileUpload';
import SignalVisualization from './analysis/SignalVisualization';
import ElectrodeMap3D from './analysis/ElectrodeMap3D';
import DataSummary from './analysis/DataSummary';
import ExportData from './analysis/ExportData';
import AnalysisHistory from './analysis/AnalysisHistory';
import { Upload, BarChart3, Globe, Table, Download, History } from 'lucide-react';

type AnalysisStep = 'upload' | 'visualization' | 'map3d' | 'summary' | 'export' | 'history';

export default function EEGAnalysis() {
  const { selectedPatient, getPatientFiles, getPatientAnalyses } = usePatient();
  const [activeStep, setActiveStep] = useState<AnalysisStep>('upload');
  const [currentFile, setCurrentFile] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [selectedInterval, setSelectedInterval] = useState({ start: 0, end: 30 });
  
  if (!selectedPatient) return null;
  
  const patientFiles = getPatientFiles(selectedPatient.id);
  const patientAnalyses = getPatientAnalyses(selectedPatient.id);
  
  const steps = [
    { id: 'upload', label: 'Upload EDF', icon: Upload },
    { id: 'visualization', label: 'Visualisation', icon: BarChart3 },
    { id: 'map3d', label: 'Carte 3D', icon: Globe },
    { id: 'summary', label: 'Résumé', icon: Table },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'history', label: 'Historique', icon: History },
  ];
  
  // Mémoiser la fonction de traitement de fichier pour éviter les recréations
  const handleFileProcessed = useCallback((file: any, data: any) => {
    setCurrentFile(file);
    setAnalysisData(data);
    setActiveStep('visualization');
  }, []);
  
  // Mémoiser la fonction de sélection d'intervalle pour éviter les recréations
  const handleIntervalSelected = useCallback((interval: { start: number; end: number }) => {
    setSelectedInterval(interval);
    if (analysisData) {
      setAnalysisData({ ...analysisData, selectedInterval: interval });
    }
  }, [analysisData]);
  
  // Mémoiser la fonction de chargement d'analyse pour éviter les recréations
  const handleLoadAnalysis = useCallback((file: any, data: any) => {
    setCurrentFile(file);
    setAnalysisData(data);
    setActiveStep('visualization');
  }, []);
  
  // Réinitialiser les états lorsque le patient change
  useEffect(() => {
    setCurrentFile(null);
    setAnalysisData(null);
    setSelectedInterval({ start: 0, end: 30 });
    setActiveStep('upload');
  }, [selectedPatient?.id]);
  
  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Analyse EEG</h2>
            <p className="text-gray-600">
              Patient: {selectedPatient.firstName} {selectedPatient.lastName} (ID: {selectedPatient.id})
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
              <span>{patientFiles.length} fichier{patientFiles.length > 1 ? 's' : ''} EEG</span>
              <span>{patientAnalyses.length} analyse{patientAnalyses.length > 1 ? 's' : ''} complète{patientAnalyses.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            const isDisabled = !currentFile && step.id !== 'upload' && step.id !== 'history';
            
            return (
              <button
                key={step.id}
                onClick={() => !isDisabled && setActiveStep(step.id as AnalysisStep)}
                disabled={isDisabled}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors flex-1 justify-center ${
                  isActive
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : isDisabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      
      <div className="bg-white rounded-lg border">
        {activeStep === 'upload' && (
          <FileUpload
            patientId={selectedPatient.id}
            onFileProcessed={handleFileProcessed}
          />
        )}
        
        {activeStep === 'visualization' && currentFile && (
          <SignalVisualization
            patientId={selectedPatient.id}
            edfFilename={currentFile.filename}
            onIntervalSelected={handleIntervalSelected}
          />
        )}
        
        {activeStep === 'map3d' && currentFile && (
          <ElectrodeMap3D 
            data={analysisData} 
            selectedInterval={selectedInterval}
          />
        )}
        
        {activeStep === 'summary' && currentFile && (
          <DataSummary 
            data={analysisData} 
            selectedInterval={selectedInterval}
            edfFilename={currentFile.filename}
            patientId={selectedPatient.id}
          />
        )}
        
        {activeStep === 'export' && currentFile && (
          <ExportData
            patient={selectedPatient}
            file={currentFile}
            data={analysisData}
            selectedInterval={selectedInterval}
          />
        )}
        
        {activeStep === 'history' && (
          <AnalysisHistory
            patient={selectedPatient}
            onLoadAnalysis={handleLoadAnalysis}
          />
        )}
      </div>
    </div>
  );
}