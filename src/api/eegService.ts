// src/api/eegService.ts
import api from '../utils/api';

interface UploadEDFResponse {
  filename: string;
  electrodes: Array<{
    name: string;
    x: number;
    y: number;
    z: number;
  }>;
  info: {
    duration: number;
    sfreq: number;
    n_channels: number;
  };
}

interface ExtractSignalsResponse {
  times: number[];
  signals: number[][];
  electrodes: string[];
  sampling_rate: number;
}

interface InterpolationResponse {
  channels: string[];
  signals_shape: number[];
  times_length: number;
}

interface CoordinatesResponse {
  msg: string;
  results: {
    [key: string]: Array<{
      name: string;
      x: number;
      y: number;
      z: number;
    }>;
  };
  errors: any;
}

export default {
  /**
   * Upload un fichier EDF
   */
  async uploadEDFFile(patientId: string, file: File): Promise<UploadEDFResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/eeg/upload_edf/${patientId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Sauvegarde la circonférence crânienne
   */
  async saveHeadCircumference(
    patientId: string, 
    circumference: number
  ): Promise<CoordinatesResponse> {
    const response = await api.post(`/eeg/convert_coordinates/${patientId}`, {
      head_circumference_mm: circumference * 10,
      montage_sizes: [16, 32, 64, 128],
    });
    return response.data;
  },

  /**
   * Extrait les signaux EEG
   */
  async extractSignals(
    patientId: string, 
    filename: string, 
    electrodes: string[]
  ): Promise<ExtractSignalsResponse> {
    const response = await api.post(`/eeg/extract_signals/${patientId}/${filename}`, {
      electrodes,
      tmin: 0,
      tmax: 60,
    });
    return response.data;
  },

  /**
   * Interpole les signaux
   */
  async interpolateSignals(
    patientId: string, 
    filename: string, 
    sourceSize: number, 
    targetSize: number
  ): Promise<InterpolationResponse> {
    const response = await api.get(
      `/eeg/interpolate_knn_from_mongo/${patientId}/${filename}/${sourceSize}/${targetSize}`
    );
    return response.data;
  },

  /**
   * Liste des électrodes disponibles
   */
  async getElectrodesList(filename: string): Promise<{ channels: string[] }> {
    const response = await api.get(`/eeg/electrodes_list/${filename}`);
    return response.data;
  },
};