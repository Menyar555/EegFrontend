import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../utils/api';
import { Patient, EEGFile, EEGAnalysis } from '../types';

interface PatientContextType {
  patients: Patient[];
  eegFiles: EEGFile[];
  analyses: EEGAnalysis[];
  selectedPatient: Patient | null;
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePatient: (id: string, patient: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  addMultiplePatients: (patients: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  selectPatient: (patient: Patient) => void;
  uploadEEGFile: (file: File, patientId: string) => Promise<EEGFile>;
  getPatientFiles: (patientId: string) => EEGFile[];
  getPatientAnalyses: (patientId: string) => EEGAnalysis[];
  saveAnalysis: (analysis: EEGAnalysis) => void;
  getAnalysisById: (analysisId: string) => EEGAnalysis | undefined;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export function PatientProvider({ children }: { children: ReactNode }) {
  // Suppression de la dépendance à l'authentification
  const [patients, setPatients] = useState<Patient[]>([]);
  const [eegFiles, setEEGFiles] = useState<EEGFile[]>([]);
  const [analyses, setAnalyses] = useState<EEGAnalysis[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  useEffect(() => {
    // Chargement des patients sans vérification d'authentification
    const fetchPatients = async () => {
      try {
        const response = await api.get('/patients');
        const fetchedPatients = response.data.map((p: any) => ({
          id: p._id,
          dossierNumber: p.numero_dossier,
          firstName: p.autres_info?.firstName || '',
          lastName: p.autres_info?.lastName || '',
          dateOfBirth: p.date_naissance,
          gender: p.autres_info?.gender || 'M',
          email: p.autres_info?.email || '',
          phone: p.autres_info?.phone || '',
          address: p.autres_info?.address || '',
          medicalHistory: p.autres_info?.medicalHistory || '',
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString(),
        }));
        setPatients(fetchedPatients);
        
        const files = response.data.flatMap((p: any) =>
          (p.edf_files || []).map((f: any) => ({
            id: f.filename,
            patientId: p._id,
            filename: f.filename,
            uploadDate: f.upload_date,
            duration: f.duration,
            samplingRate: f.sfreq,
            nChannels: f.n_channels,
            electrodes: f.electrodes || [],
            processed: f.processed || false,
          }))
        );
        setEEGFiles(files);
      } catch (err) {
        console.error('Erreur lors du chargement des patients:', err);
      }
    };
    
    fetchPatients();
  }, []); // Suppression de la dépendance à user
  
  const addPatient = async (patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newPatient = {
      id: patientData.dossierNumber,
      numero_dossier: patientData.dossierNumber,
      date_naissance: patientData.dateOfBirth,
      autres_info: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        gender: patientData.gender,
        email: patientData.email,
        phone: patientData.phone,
        address: patientData.address,
        medicalHistory: patientData.medicalHistory,
      },
    };
    
    const response = await api.post('/patients', newPatient);
    
    setPatients([...patients, {
      ...patientData,
      id: response.data.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);
  };
  
  const updatePatient = async (id: string, patientData: Partial<Patient>) => {
    const updatedData = {
      numero_dossier: patientData.dossierNumber,
      date_naissance: patientData.dateOfBirth,
      autres_info: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        gender: patientData.gender,
        email: patientData.email,
        phone: patientData.phone,
        address: patientData.address,
        medicalHistory: patientData.medicalHistory,
      },
    };
    
    await api.put(`/patients/${id}`, updatedData);
    
    const updatedPatients = patients.map(patient =>
      patient.id === id ? { ...patient, ...patientData, updatedAt: new Date().toISOString() } : patient
    );
    
    setPatients(updatedPatients);
    
    if (selectedPatient?.id === id) {
      setSelectedPatient(updatedPatients.find(p => p.id === id) || null);
    }
  };
  
  const deletePatient = async (id: string) => {
    await api.delete(`/patients/${id}`);
    
    const updatedPatients = patients.filter(patient => patient.id !== id);
    setPatients(updatedPatients);
    
    if (selectedPatient?.id === id) {
      setSelectedPatient(null);
    }
  };
  
  const addMultiplePatients = async (patientsData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const newPatients = patientsData.map(patientData => ({
      id: patientData.dossierNumber,
      numero_dossier: patientData.dossierNumber,
      date_naissance: patientData.dateOfBirth,
      autres_info: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        gender: patientData.gender,
        email: patientData.email,
        phone: patientData.phone,
        address: patientData.address,
        medicalHistory: patientData.medicalHistory,
      },
    }));
    
    const updatedPatients = [...patients];
    
    for (const patient of newPatients) {
      const response = await api.post('/patients', patient);
      updatedPatients.push({
        ...patient.autres_info,
        id: response.data.id,
        dossierNumber: patient.numero_dossier,
        dateOfBirth: patient.date_naissance,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    setPatients(updatedPatients);
  };
  
  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
  };
  
  const uploadEEGFile = async (file: File, patientId: string): Promise<EEGFile> => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post(`/eeg/upload_edf/${patientId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const newFile: EEGFile = {
        id: response.data.filename,
        patientId,
        filename: response.data.filename,
        uploadDate: response.data.upload_date || new Date().toISOString(),
        duration: response.data.info.duration || 0,
        samplingRate: response.data.info.sfreq || 0,
        nChannels: response.data.info.n_channels || 0,
        electrodes: response.data.electrodes || [],
        processed: false,
      };
      
      setEEGFiles([...eegFiles, newFile]);
      return newFile;
    } catch (err: any) {
      console.error('Erreur détaillée dans uploadEEGFile:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        headers: err.response?.headers,
      });
      
      throw new Error(
        err.response?.data?.msg ||
        err.response?.data?.error ||
        err.message === 'Network Error'
          ? 'Erreur de connexion au serveur. Vérifiez si le serveur est en cours d\'exécution.'
          : 'Erreur lors de l\'upload du fichier EDF'
      );
    }
  };
  
  const getPatientFiles = (patientId: string) => {
    return eegFiles.filter(file => file.patientId === patientId);
  };
  
  const getPatientAnalyses = (patientId: string) => {
    return analyses.filter(analysis => analysis.patientId === patientId);
  };
  
  const saveAnalysis = (analysis: EEGAnalysis) => {
    setAnalyses([...analyses, analysis]);
  };
  
  const getAnalysisById = (analysisId: string) => {
    return analyses.find(analysis => analysis.id === analysisId);
  };
  
  return (
    <PatientContext.Provider value={{
      patients,
      eegFiles,
      analyses,
      selectedPatient,
      addPatient,
      updatePatient,
      deletePatient,
      addMultiplePatients,
      selectPatient,
      uploadEEGFile,
      getPatientFiles,
      getPatientAnalyses,
      saveAnalysis,
      getAnalysisById,
    }}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
}