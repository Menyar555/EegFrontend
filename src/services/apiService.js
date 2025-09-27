const API_BASE_URL = 'http://localhost:5000/api'; // Adapter selon votre configuration

class ApiService {
  // Récupérer les fichiers d'un patient
  async getPatientFiles(patientId) {
    try {
      const response = await fetch(`${API_BASE_URL}/eeg/patient_files/${patientId}`);
      if (!response.ok) throw new Error('Failed to fetch patient files');
      return response.json();
    } catch (error) {
      console.error('Error fetching patient files:', error);
      return [];
    }
  }

  // Récupérer les analyses d'un patient
  async getPatientAnalyses(patientId) {
    try {
      const response = await fetch(`${API_BASE_URL}/eeg/patient_analyses/${patientId}`);
      if (!response.ok) throw new Error('Failed to fetch patient analyses');
      return response.json();
    } catch (error) {
      console.error('Error fetching patient analyses:', error);
      return [];
    }
  }

  // Extraire les signaux d'un fichier EDF
  async extractSignals(patientId, edfFilename, electrodes = [], tmin = 0, tmax = null) {
    const params = new URLSearchParams();
    if (electrodes.length) params.append('electrodes', electrodes.join(','));
    if (tmin !== undefined) params.append('tmin', tmin);
    if (tmax !== null) params.append('tmax', tmax);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/eeg/extract_signals/${patientId}/${edfFilename}?${params.toString()}`
      );
      if (!response.ok) throw new Error('Failed to extract signals');
      return response.json();
    } catch (error) {
      console.error('Error extracting signals:', error);
      throw error;
    }
  }

  // Interpoler les données
async interpolateData(patientId, edfFilename, srcSize, targetSize, headCircumferenceMm, interpolationMethod = 'knn') {
    try {
        const response = await api.get(
            `/eeg/interpolate_${interpolationMethod}_static/${patientId}/${edfFilename}/${srcSize}/${targetSize}?head_circumference_mm=${headCircumferenceMm}`
        );
        if (!response.ok) throw new Error('Failed to interpolate data');
        return response.json();
    } catch (error) {
        console.error('Error interpolating data:', error);
        throw error;
    }
}

  // Récupérer les positions des électrodes
  async getElectrodePositions(patientId, size = null) {
    const url = size 
      ? `${API_BASE_URL}/eeg/electrode_positions/${patientId}?size=${size}`
      : `${API_BASE_URL}/eeg/electrode_positions/${patientId}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch electrode positions');
      return response.json();
    } catch (error) {
      console.error('Error fetching electrode positions:', error);
      throw error;
    }
  }

  // Récupérer les données interpolées
  async getInterpolatedData(patientId, edfFilename, srcSize, targetSize) {
    try {
      // Vérifier que tous les paramètres sont définis
      if (!patientId || !edfFilename || srcSize === undefined || targetSize === undefined) {
        throw new Error(`Paramètres manquants: patientId=${patientId}, edfFilename=${edfFilename}, srcSize=${srcSize}, targetSize=${targetSize}`);
      }
      
      console.log("Appel API getInterpolatedData:", {
        patientId,
        edfFilename,
        srcSize,
        targetSize
      });
      
      const response = await fetch(
        `${API_BASE_URL}/eeg/get_interpolated_data/${patientId}/${edfFilename}/${srcSize}/${targetSize}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Erreur API:", errorData);
        throw new Error(errorData.msg || `Failed to fetch interpolated data: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error fetching interpolated data:', error);
      throw error;
    }
  }
}

export default new ApiService();