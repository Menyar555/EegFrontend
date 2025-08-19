import api from './api';

export const edfService = {
  /**
   * Récupère le résumé des électrodes après interpolation
   * @param patientId - ID du patient
   * @param edfFilename - Nom du fichier EDF
   * @param targetSize - Nombre d'électrodes cible (32, 64, 128)
   * @param headCircumference - Circonférence de la tête en mm
   * @param tmin - Temps de début de l'intervalle (optionnel)
   * @param tmax - Temps de fin de l'intervalle (optionnel)
   * @returns Promesse avec les données des électrodes
   */
  getElectrodeSummary: async (
    patientId: string, 
    edfFilename: string, 
    targetSize: number, 
    headCircumference: number, 
    tmin?: number, 
    tmax?: number
  ) => {
    try {
      const params = new URLSearchParams({
        head_circumference_mm: headCircumference.toString(),
      });
      
      if (tmin !== undefined) params.append('tmin', tmin.toString());
      if (tmax !== undefined) params.append('tmax', tmax.toString());
      
      const response = await api.get(`/eeg/get_electrode_summary/${patientId}/${edfFilename}/${targetSize}?${params.toString()}`);
      return response.data.electrodes;
    } catch (error) {
      console.error('Erreur lors de la récupération du résumé des électrodes:', error);
      throw error;
    }
  },
  
  // Autres méthodes EDF si nécessaire...
  uploadEdf: (patientId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/eeg/upload_edf/${patientId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  listChannels: (patientId: string, edfFilename: string) => {
    return api.get(`/eeg/list_channels/${patientId}/${edfFilename}`);
  },
  
  interpolateTo: (targetSize: number, patientId: string, edfFilename: string, headCircumference: number) => {
    return api.get(`/eeg/interpolate_to/${targetSize}/${patientId}`, {
      params: {
        edf_filename: edfFilename,
        head_circumference_mm: headCircumference,
      },
    });
  },
};