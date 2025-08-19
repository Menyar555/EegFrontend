import React, { useState } from 'react';
import { usePatient } from '../contexts/PatientContext';
import { Calendar, User, Phone, Mail, FileText, BarChart3, Eye, Upload, Search, Edit, Trash2 } from 'lucide-react';

export default function PatientList() {
  const { patients, selectPatient, selectedPatient, getPatientFiles, updatePatient, deletePatient } = usePatient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState<'all' | 'M' | 'F'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'files'>('name');
  const [editingPatient, setEditingPatient] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Filter and sort patients
  const filteredPatients = patients
    .filter(patient => {
      const matchesSearch = 
        patient.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.dossierNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGender = filterGender === 'all' || patient.gender === filterGender;
      
      return matchesSearch && matchesGender;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'files':
          return getPatientFiles(b.id).length - getPatientFiles(a.id).length;
        default:
          return 0;
      }
    });

  const handleViewAnalysis = (patient: any) => {
    selectPatient(patient);
    // Trigger navigation to analysis view
    window.dispatchEvent(new CustomEvent('navigate-to-analysis'));
  };

  const handleEdit = (patient: any) => {
    setEditingPatient(patient.id);
    setEditForm({
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email || '',
      phone: patient.phone || '',
      address: patient.address || '',
      medicalHistory: patient.medicalHistory || ''
    });
  };

  const handleSaveEdit = () => {
    if (editingPatient) {
      updatePatient(editingPatient, editForm);
      setEditingPatient(null);
      setEditForm({});
    }
  };

  const handleCancelEdit = () => {
    setEditingPatient(null);
    setEditForm({});
  };

  const handleDelete = (patientId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce patient ? Toutes les données associées seront perdues.')) {
      deletePatient(patientId);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Gestion des Patients</h2>
            <p className="text-gray-600 mt-1">
              {filteredPatients.length} patient{filteredPatients.length > 1 ? 's' : ''} 
              {searchTerm || filterGender !== 'all' ? ' trouvé(s)' : ' enregistré(s)'}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2 text-blue-800">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {patients.reduce((sum, p) => sum + getPatientFiles(p.id).length, 0)} fichiers EEG
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou numéro de dossier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value as 'all' | 'M' | 'F')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tous les genres</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'files')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="name">Trier par nom</option>
              <option value="date">Trier par date</option>
              <option value="files">Trier par fichiers</option>
            </select>
          </div>
        </div>
      </div>

      {filteredPatients.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {patients.length === 0 ? 'Aucun patient enregistré' : 'Aucun résultat trouvé'}
          </h3>
          <p className="text-gray-600 mb-6">
            {patients.length === 0 
              ? 'Commencez par ajouter un nouveau patient pour débuter l\'analyse EEG.'
              : 'Essayez de modifier vos critères de recherche.'
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredPatients.map((patient) => {
            const fileCount = getPatientFiles(patient.id).length;
            const isSelected = selectedPatient?.id === patient.id;
            const hasFiles = fileCount > 0;
            const isEditing = editingPatient === patient.id;
            
            return (
              <div
                key={patient.id}
                className={`bg-white border-2 rounded-xl p-6 transition-all hover:shadow-lg ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {isEditing ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900">Modifier le patient</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Sauvegarder
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                        <input
                          type="text"
                          value={editForm.firstName}
                          onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                        <input
                          type="text"
                          value={editForm.lastName}
                          onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                        <input
                          type="text"
                          value={editForm.address}
                          onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Antécédents médicaux</label>
                        <textarea
                          value={editForm.medicalHistory}
                          onChange={(e) => setEditForm({...editForm, medicalHistory: e.target.value})}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
                          hasFiles ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {hasFiles ? (
                            <BarChart3 className="h-8 w-8 text-green-600" />
                          ) : (
                            <User className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {patient.firstName} {patient.lastName}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span className="font-medium">ID: {patient.id}</span>
                            <span>Dossier: {patient.dossierNumber}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              hasFiles 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {hasFiles ? 'Fichiers EEG disponibles' : 'Aucun fichier EEG'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{calculateAge(patient.dateOfBirth)} ans</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-gray-600">
                          <User className="h-4 w-4" />
                          <span>{patient.gender === 'M' ? 'Masculin' : 'Féminin'}</span>
                        </div>
                        
                        {patient.phone && (
                          <div className="flex items-center space-x-2 text-gray-600">
                            <Phone className="h-4 w-4" />
                            <span>{patient.phone}</span>
                          </div>
                        )}
                        
                        {patient.email && (
                          <div className="flex items-center space-x-2 text-gray-600">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{patient.email}</span>
                          </div>
                        )}
                      </div>

                      {patient.medicalHistory && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                          <div className="flex items-start space-x-2">
                            <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Antécédents médicaux</p>
                              <p className="text-sm text-gray-600 mt-1">{patient.medicalHistory}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Créé le {formatDate(patient.createdAt)}</span>
                          <span>•</span>
                          <span>{fileCount} fichier{fileCount > 1 ? 's' : ''} EEG</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-3 ml-6">
                      <button
                        onClick={() => selectPatient(patient)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <User className="h-4 w-4" />
                        <span>{isSelected ? 'Sélectionné' : 'Sélectionner'}</span>
                      </button>

                      {hasFiles ? (
                        <button
                          onClick={() => handleViewAnalysis(patient)}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          <Eye className="h-4 w-4" />
                          <span>Voir Analyses</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => selectPatient(patient)}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          <Upload className="h-4 w-4" />
                          <span>Ajouter EEG</span>
                        </button>
                      )}

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(patient)}
                          className="flex items-center space-x-1 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Modifier</span>
                        </button>

                        <button
                          onClick={() => handleDelete(patient.id)}
                          className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Supprimer</span>
                        </button>
                      </div>

                      <div className={`text-center px-3 py-1 rounded-full text-xs font-medium ${
                        fileCount > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {fileCount} fichier{fileCount > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}