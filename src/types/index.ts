export interface User {
  id: string;
  username: string;
  name: string;
  role: 'doctor' | 'admin';
  email?: string;
  phone?: string;
  specialization?: string;
  licenseNumber?: string;
  createdAt?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

export interface Patient {
  id: string;
  dossierNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'M' | 'F';
  email?: string;
  phone?: string;
  address?: string;
  medicalHistory?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EEGFile {
  id: string;
  patientId: string;
  filename: string;
  uploadDate: string;
  duration: number;
  samplingRate: number;
  nChannels: number;
  electrodes: { name: string; x: number; y: number; z: number }[];
  processed: boolean;
}

export interface EEGElectrode {
  name: string;
  x: number;
  y: number;
  z: number;
  averageVoltage: number;
}

export interface EEGFile {
  id: string;
  patientId: string;
  filename: string;
  uploadDate: string;
  duration: number;
  samplingRate: number;
  nChannels: number;
  electrodes: { name: string; x: number; y: number; z: number }[];
  processed: boolean;
}

export interface EEGAnalysis {
  id: string;
  patientId: string;
  fileId: string;
  electrodes: { name: string; x: number; y: number; z: number; averageVoltage: number }[];
  timestamps: number[];
  signals: { [key: string]: number[] };
  duration: number;
  samplingRate: number;
  selectedInterval?: { start: number; end: number };
}

export interface TimeInterval {
  start: number;
  end: number;
}