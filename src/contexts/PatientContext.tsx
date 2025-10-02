import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../utils/api';
import { Patient, EEGFile, EEGAnalysis } from '../types';

interface PatientContextType {
  patients: Patient[];
  eegFiles: EEGFile[];
  analyses: EEGAnalysis[];
  selectedPatient: Patient | null;
  loading: boolean;
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
  setDoctor: (doctorId: string) => Promise<void>;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export function PatientProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [eegFiles, setEEGFiles] = useState<EEGFile[]>([]);
  const [analyses, setAnalyses] = useState<EEGAnalysis[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [doctorId, setDoctorId] = useState<string>("default_doctor_id");
  
  useEffect(() => {
    // Charger les patients au démarrage
    const fetchPatients = async () => {
      try {
        setLoading(true);
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
            id: f.id,
            patientId: p._id,
            filename: f.filename,
            uploadDate: f.uploadDate,
            duration: f.duration || 0,
            samplingRate: f.samplingRate || 0,
            nChannels: f.nChannels || 0,
            electrodes: f.electrodes || [],
            processed: f.processed || false,
          }))
        );
        setEEGFiles(files);
      } catch (err: any) {
        console.error('Erreur lors du chargement des patients:', err);
        // Afficher un message d'erreur à l'utilisateur
        if (err.response) {
          console.error('Response data:', err.response.data);
          console.error('Response status:', err.response.status);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatients();
  }, [doctorId]);
  
  const setDoctor = async (doctorId: string) => {
    try {
      await api.post(`/set-doctor/${doctorId}`);
      setDoctorId(doctorId);
    } catch (err: any) {
      console.error('Erreur lors de la définition du docteur:', err);
      throw new Error('Erreur lors de la définition du docteur');
    }
  };
  
  const addPatient = async (patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
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
      
      // Ajouter le nouveau patient à la liste locale
      const createdPatient = {
        ...patientData,
        id: response.data.patient._id,
        createdAt: response.data.patient.createdAt,
        updatedAt: response.data.patient.updatedAt,
      };
      
      setPatients([...patients, createdPatient]);
    } catch (err: any) {
      console.error('Erreur lors de l\'ajout du patient:', err);
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
        throw new Error(err.response.data.msg || 'Erreur lors de l\'ajout du patient');
      }
      throw new Error('Erreur lors de l\'ajout du patient');
    }
  };
  
  const updatePatient = async (id: string, patientData: Partial<Patient>) => {
    try {
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
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du patient:', err);
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
        throw new Error(err.response.data.msg || 'Erreur lors de la mise à jour du patient');
      }
      throw new Error('Erreur lors de la mise à jour du patient');
    }
  };
  
  const deletePatient = async (id: string) => {
    try {
      await api.delete(`/patients/${id}`);
      
      const updatedPatients = patients.filter(patient => patient.id !== id);
      setPatients(updatedPatients);
      
      if (selectedPatient?.id === id) {
        setSelectedPatient(null);
      }
    } catch (err: any) {
      console.error('Erreur lors de la suppression du patient:', err);
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
        throw new Error(err.response.data.msg || 'Erreur lors de la suppression du patient');
      }
      throw new Error('Erreur lors de la suppression du patient');
    }
  };
  
  const addMultiplePatients = async (patientsData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    try {
      const updatedPatients = [...patients];
      
      for (const patientData of patientsData) {
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
        
        updatedPatients.push({
          ...patientData,
          id: response.data.patient._id,
          createdAt: response.data.patient.createdAt,
          updatedAt: response.data.patient.updatedAt,
        });
      }
      
      setPatients(updatedPatients);
    } catch (err: any) {
      console.error('Erreur lors de l\'ajout multiple de patients:', err);
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
        throw new Error(err.response.data.msg || 'Erreur lors de l\'ajout des patients');
      }
      throw new Error('Erreur lors de l\'ajout des patients');
    }
  };
  
  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
  };
  
  const uploadEEGFile = async (file: File, patientId: string): Promise<EEGFile> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', patientId);
    
    try {
      const response = await api.post('/patients/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const newFile: EEGFile = {
        id: response.data.id,
        patientId,
        filename: response.data.filename,
        uploadDate: response.data.uploadDate,
        duration: 0, // Ces valeurs seraient normalement retournées par le backend
        samplingRate: 0,
        nChannels: 0,
        electrodes: [],
        processed: response.data.processed,
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
      loading,
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
      setDoctor,
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