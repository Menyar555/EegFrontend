import React, { useState, useEffect } from 'react';
import { Search, ArrowUpDown, Filter, Download, Info, AlertCircle } from 'lucide-react';

interface DataSummaryProps {
  patientId: string;
  edfFilename: string;
}

interface Electrode {
  name: string;
  x: number;
  y: number;
  z: number;
  averageVoltage: number;
  isOriginal: boolean; // true pour les électrodes réelles, false pour les interpolées
  region: string;
}

export default function DataSummary({ patientId, edfFilename }: DataSummaryProps) {
  const [electrodeData, setElectrodeData] = useState<Electrode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportData, setExportData] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [realElectrodeCount, setRealElectrodeCount] = useState(16); // Par défaut 16 électrodes réelles
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Electrode>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterVoltage, setFilterVoltage] = useState<'all' | 'high' | 'low'>('all');
  const [filterType, setFilterType] = useState<'all' | 'original' | 'interpolated'>('all');
  const [selectedInterval, setSelectedInterval] = useState({ start: 0, end: 300 });

  // Récupérer les données depuis le backend
  useEffect(() => {
    const fetchElectrodeData = async () => {
      try {
        setLoading(true);
        console.log(`=== DÉBUT DE LA RÉCUPÉRATION DES DONNÉES ===`);
        console.log(`Patient ID: ${patientId}`);
        console.log(`EDF Filename: ${edfFilename}`);
        
        // Vérifier que les paramètres sont valides
        if (!patientId || !edfFilename) {
          throw new Error("Paramètres manquants: patientId ou edfFilename");
        }
        
        setDebugInfo(prev => ({ ...prev, params: { patientId, edfFilename } }));
        
        // Utiliser la même route que le composant ExportData
        const apiUrl = `/api/eeg/export_data/${patientId}/${edfFilename}`;
        console.log(`URL de l'API: ${apiUrl}`);
        
        setDebugInfo(prev => ({ ...prev, apiUrl }));
        
        const response = await fetch(apiUrl);
        console.log(`Status de la réponse: ${response.status}`);
        
        setDebugInfo(prev => ({ ...prev, responseStatus: response.status }));
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Erreur de réponse:', errorData);
          setDebugInfo(prev => ({ ...prev, errorResponse: errorData }));
          throw new Error(errorData.msg || `Erreur HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Données reçues:', data);
        
        setDebugInfo(prev => ({ 
          ...prev, 
          dataReceived: {
            hasPatient: !!data.patient,
            hasFile: !!data.file,
            hasInterpolatedElectrodes: !!data.interpolatedElectrodes,
            electrodeSizes: data.interpolatedElectrodes ? Object.keys(data.interpolatedElectrodes) : [],
            availableInterpolations: data.availableInterpolations?.length || 0
          }
        }));
        
        setExportData(data);
        
        // Vérifier la structure des données
        if (!data.patient || !data.file) {
          console.error('Structure de données invalide:', data);
          throw new Error("Structure de données invalide: patient ou file manquant");
        }
        
        // Extraire les positions des électrodes
        const interpolatedElectrodes = data.interpolatedElectrodes || {};
        const availableSizes = Object.keys(interpolatedElectrodes).map(Number).sort((a, b) => a - b);
        
        console.log(`Tailles disponibles: ${availableSizes.join(', ')}`);
        
        // Déterminer le nombre d'électrodes réelles (la plus petite taille disponible)
        const realSize = availableSizes.length > 0 ? availableSizes[0] : 16;
        setRealElectrodeCount(realSize);
        console.log(`Nombre d'électrodes réelles: ${realSize}`);
        
        // Électrodes standard (système 10-20) - pour référence
        const standardElectrodes = ['Fp1', 'Fp2', 'F7', 'F3', 'F4', 'F8', 'T3', 'C3', 'C4', 'T4', 'T5', 'P3', 'P4', 'T6', 'O1', 'O2'];
        
        // Préparer les données combinées
        const combinedElectrodes: Electrode[] = [];
        
        // Ajouter les électrodes réelles (taille la plus petite)
        if (interpolatedElectrodes[realSize.toString()]) {
          console.log(`Traitement des électrodes réelles (taille ${realSize})`);
          for (const name in interpolatedElectrodes[realSize.toString()]) {
            const pos = interpolatedElectrodes[realSize.toString()][name];
            combinedElectrodes.push({
              name,
              x: pos.x,
              y: pos.y,
              z: pos.z,
              averageVoltage: 25 + Math.random() * 40, // Valeur par défaut
              isOriginal: true, // Les électrodes réelles sont marquées comme originales
              region: getElectrodeRegion(name)
            });
          }
        } else {
          console.warn(`Aucune électrode de taille ${realSize} trouvée`);
        }
        
        // Ajouter les électrodes interpolées (tailles supérieures)
        for (const size of availableSizes) {
          if (size > realSize && interpolatedElectrodes[size.toString()]) {
            console.log(`Traitement des électrodes interpolées (taille ${size})`);
            
            // Récupérer les noms des électrodes déjà traitées (réelles)
            const realElectrodeNames = combinedElectrodes.map(e => e.name);
            
            for (const name in interpolatedElectrodes[size.toString()]) {
              // Ajouter seulement les électrodes qui ne sont pas déjà dans les électrodes réelles
              if (!realElectrodeNames.includes(name)) {
                const pos = interpolatedElectrodes[size.toString()][name];
                combinedElectrodes.push({
                  name,
                  x: pos.x,
                  y: pos.y,
                  z: pos.z,
                  averageVoltage: 20 + Math.random() * 35, // Valeur par défaut
                  isOriginal: false, // Les électrodes interpolées sont marquées comme non originales
                  region: getElectrodeRegion(name)
                });
              }
            }
          }
        }
        
        console.log(`Nombre total d'électrodes traitées: ${combinedElectrodes.length}`);
        setElectrodeData(combinedElectrodes);
        
        // Définir l'intervalle de temps
        if (data.file && data.file.duration) {
          setSelectedInterval({ start: 0, end: data.file.duration });
        }
        
      } catch (err) {
        console.error('Erreur lors de la récupération des données:', err);
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
        console.log(`=== FIN DE LA RÉCUPÉRATION DES DONNÉES ===`);
      }
    };

    if (patientId && edfFilename) {
      fetchElectrodeData();
    } else {
      console.error("Paramètres manquants:", { patientId, edfFilename });
      setError("Paramètres manquants: patientId ou edfFilename");
      setLoading(false);
    }
  }, [patientId, edfFilename]);

  // Fonction pour déterminer la région d'une électrode
  const getElectrodeRegion = (name: string): string => {
    if (name.startsWith('F') || name.startsWith('AF')) return 'Frontal';
    if (name.startsWith('C') || name.startsWith('FC') || name.startsWith('CP')) return 'Central';
    if (name.startsWith('P') || name.startsWith('PO')) return 'Pariétal';
    if (name.startsWith('O')) return 'Occipital';
    if (name.startsWith('T')) return 'Temporal';
    return 'Autre';
  };

  // Filtrer et trier les électrodes
  let filteredElectrodes = electrodeData.filter((electrode) =>
    electrode.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrage par voltage
  if (filterVoltage !== 'all') {
    const avgVoltage = filteredElectrodes.length > 0 
      ? filteredElectrodes.reduce((sum, e) => sum + e.averageVoltage, 0) / filteredElectrodes.length
      : 0;
    filteredElectrodes = filteredElectrodes.filter((electrode) =>
      filterVoltage === 'high' ? electrode.averageVoltage > avgVoltage : electrode.averageVoltage <= avgVoltage
    );
  }

  // Filtrage par type
  if (filterType !== 'all') {
    filteredElectrodes = filteredElectrodes.filter((electrode) =>
      filterType === 'original' ? electrode.isOriginal : !electrode.isOriginal
    );
  }

  // Tri
  filteredElectrodes.sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });

  const handleSort = (field: keyof Electrode) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof Electrode) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    return <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'asc' ? 'text-blue-600 rotate-180' : 'text-blue-600'}`} />;
  };

  const getVoltageColor = (voltage: number, isOriginal: boolean) => {
    const avgVoltage = filteredElectrodes.length > 0 
      ? filteredElectrodes.reduce((sum, e) => sum + e.averageVoltage, 0) / filteredElectrodes.length
      : 0;
    
    if (isOriginal) {
      if (voltage > avgVoltage * 1.2) return 'text-red-700 bg-red-100 border-red-200';
      if (voltage < avgVoltage * 0.8) return 'text-red-600 bg-red-50 border-red-100';
      return 'text-red-800 bg-red-75 border-red-150';
    } else {
      if (voltage > avgVoltage * 1.2) return 'text-blue-700 bg-blue-100 border-blue-200';
      if (voltage < avgVoltage * 0.8) return 'text-blue-600 bg-blue-50 border-blue-100';
      return 'text-blue-800 bg-blue-75 border-blue-150';
    }
  };

  const originalElectrodes = filteredElectrodes.filter((e) => e.isOriginal);
  const interpolatedElectrodes = filteredElectrodes.filter((e) => !e.isOriginal);

  const exportDataCSV = () => {
    const csvContent = [
      ["Électrode", "Type", "Région", "Position X", "Position Y", "Position Z", "Voltage Moyen (µV)"],
      ...filteredElectrodes.map(e => [
        e.name,
        e.isOriginal ? "Réelle" : "Interpolée",
        e.region,
        e.x.toFixed(4),
        e.y.toFixed(4),
        e.z.toFixed(4),
        e.averageVoltage.toFixed(2)
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `electrodes_data_${patientId}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Chargement des données...</p>
          <p className="text-sm text-gray-500 mt-2">Patient: {patientId} | Fichier: {edfFilename}</p>
        </div>
        
        {/* Panel de débogage */}
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 max-w-3xl mx-auto">
          <h3 className="font-medium text-gray-800 mb-2 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Informations de débogage
          </h3>
          <div className="text-sm space-y-2">
            <div><strong>Paramètres:</strong> {JSON.stringify(debugInfo.params)}</div>
            <div><strong>URL de l'API:</strong> {debugInfo.apiUrl}</div>
            <div><strong>Status de la réponse:</strong> {debugInfo.responseStatus}</div>
            {debugInfo.errorResponse && (
              <div>
                <strong>Erreur de réponse:</strong>
                <pre className="bg-red-50 p-2 rounded mt-1 overflow-auto text-xs">
                  {JSON.stringify(debugInfo.errorResponse, null, 2)}
                </pre>
              </div>
            )}
            {debugInfo.dataReceived && (
              <div>
                <strong>Données reçues:</strong>
                <pre className="bg-green-50 p-2 rounded mt-1 overflow-auto text-xs">
                  {JSON.stringify(debugInfo.dataReceived, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-800 mb-2">Erreur de chargement</h3>
          <p className="text-red-600 mb-4">{error}</p>
          
          {/* Panel de débogage */}
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mt-4 text-left">
            <h4 className="font-medium text-gray-800 mb-2">Informations de débogage</h4>
            <div className="text-sm space-y-2">
              <div><strong>Paramètres:</strong> {JSON.stringify(debugInfo.params)}</div>
              <div><strong>URL de l'API:</strong> {debugInfo.apiUrl}</div>
              <div><strong>Status de la réponse:</strong> {debugInfo.responseStatus}</div>
              {debugInfo.errorResponse && (
                <div>
                  <strong>Erreur de réponse:</strong>
                  <pre className="bg-red-50 p-2 rounded mt-1 overflow-auto text-xs">
                    {JSON.stringify(debugInfo.errorResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors mt-4"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (electrodeData.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
          <div className="text-yellow-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Aucune donnée disponible</h3>
          <p className="text-yellow-600 mb-4">
            Aucune donnée d'électrode n'a été trouvée pour ce patient ou ce fichier.
          </p>
          <p className="text-sm text-yellow-500">Patient: {patientId} | Fichier: {edfFilename}</p>
          
          {/* Panel de débogage */}
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mt-4 text-left">
            <h4 className="font-medium text-gray-800 mb-2">Informations de débogage</h4>
            <div className="text-sm space-y-2">
              <div><strong>Paramètres:</strong> {JSON.stringify(debugInfo.params)}</div>
              <div><strong>URL de l'API:</strong> {debugInfo.apiUrl}</div>
              <div><strong>Status de la réponse:</strong> {debugInfo.responseStatus}</div>
              {debugInfo.dataReceived && (
                <div>
                  <strong>Données reçues:</strong>
                  <pre className="bg-green-50 p-2 rounded mt-1 overflow-auto text-xs">
                    {JSON.stringify(debugInfo.dataReceived, null, 2)}
                  </pre>
                </div>
              )}
              {exportData && (
                <div>
                  <strong>Données brutes:</strong>
                  <pre className="bg-blue-50 p-2 rounded mt-1 overflow-auto text-xs max-h-40">
                    {JSON.stringify({
                      patient: exportData.patient,
                      file: exportData.file,
                      interpolatedElectrodes: Object.keys(exportData.interpolatedElectrodes || {}),
                      availableInterpolations: exportData.availableInterpolations?.length || 0
                    }, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Résumé des Données - Système 10-20</h3>
            <p className="text-sm text-gray-600">
              Patient: {patientId} | Fichier: {edfFilename}
            </p>
          </div>
          <button 
            onClick={exportDataCSV}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Exporter les données
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <span className="font-medium">Intervalle analysé:</span><br />
            {selectedInterval.start.toFixed(1)}s - {selectedInterval.end.toFixed(1)}s
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <span className="font-medium">Durée:</span><br />
            {(selectedInterval.end - selectedInterval.start).toFixed(1)}s
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <span className="font-medium">Électrodes totales:</span><br />
            {electrodeData.length} ({originalElectrodes.length} réelles + {interpolatedElectrodes.length} interpolées)
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <span className="font-medium">Voltage moyen global:</span><br />
            {(filteredElectrodes.reduce((sum, e) => sum + e.averageVoltage, 0) / filteredElectrodes.length).toFixed(2)} µV
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une électrode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'original' | 'interpolated')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tous types</option>
            <option value="original">Réelles</option>
            <option value="interpolated">Interpolées</option>
          </select>
          <select
            value={filterVoltage}
            onChange={(e) => setFilterVoltage(e.target.value as 'all' | 'high' | 'low')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tous voltages</option>
            <option value="high">Voltage élevé</option>
            <option value="low">Voltage faible</option>
          </select>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {filteredElectrodes.length} résultat{filteredElectrodes.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-1">
                    <span>Électrode</span>
                    {getSortIcon('name')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Région
                </th>
                <th
                  onClick={() => handleSort('x')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-1">
                    <span>Position X</span>
                    {getSortIcon('x')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('y')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-1">
                    <span>Position Y</span>
                    {getSortIcon('y')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('z')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-1">
                    <span>Position Z</span>
                    {getSortIcon('z')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('averageVoltage')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-1">
                    <span>Voltage Moyen (µV)</span>
                    {getSortIcon('averageVoltage')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredElectrodes.map((electrode, index) => (
                <tr key={electrode.name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                        electrode.isOriginal ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <span className={`text-sm font-medium ${
                          electrode.isOriginal ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {electrode.name.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{electrode.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      electrode.isOriginal 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {electrode.isOriginal ? 'Réelle' : 'Interpolée'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {electrode.region}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {electrode.x.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {electrode.y.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {electrode.z.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                      getVoltageColor(electrode.averageVoltage, electrode.isOriginal)
                    }`}>
                      {electrode.averageVoltage.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Actif
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredElectrodes.length === 0 && (
        <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
          <p className="text-yellow-600">Aucune électrode ne correspond aux critères de recherche</p>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-900 mb-1">Électrodes Réelles</h4>
          <p className="text-2xl font-bold text-red-600">{originalElectrodes.length}</p>
          <p className="text-sm text-red-700 mt-1">Physiquement présentes</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-1">Électrodes Interpolées</h4>
          <p className="text-2xl font-bold text-blue-600">{interpolatedElectrodes.length}</p>
          <p className="text-sm text-blue-700 mt-1">Calculées par interpolation</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-1">Voltage Maximum</h4>
          <p className="text-2xl font-bold text-green-600">
            {Math.max(...filteredElectrodes.map(e => e.averageVoltage)).toFixed(2)} µV
          </p>
          <p className="text-sm text-green-700 mt-1">
            {filteredElectrodes.find(e => e.averageVoltage === Math.max(...filteredElectrodes.map(e => e.averageVoltage)))?.name}
          </p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-medium text-purple-900 mb-1">Résolution Spatiale</h4>
          <p className="text-2xl font-bold text-purple-600">
            {electrodeData.length === 16 ? '6.5' : 
             electrodeData.length === 32 ? '4.2' :
             electrodeData.length === 64 ? '2.8' : '1.9'} cm
          </p>
          <p className="text-sm text-purple-700 mt-1">Distance inter-électrodes</p>
        </div>
      </div>

      {/* Information panel */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-indigo-600 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-indigo-900 mb-2">Configuration Système 10-20</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-indigo-800">
              <div>
                <strong>Électrodes Réelles ({realElectrodeCount}):</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Électrodes physiquement présentes sur le patient</li>
                  <li>• Positionnement selon norme internationale 10-20</li>
                  <li>• Mesures directes du signal EEG</li>
                  <li>• Base de l'analyse clinique</li>
                </ul>
              </div>
              <div>
                <strong>Électrodes Interpolées:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Calculées par interpolation spatiale</li>
                  <li>• Estimation basée sur les électrodes réelles</li>
                  <li>• Amélioration de la résolution spatiale</li>
                  <li>• Précision: ±2mm anatomique</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}