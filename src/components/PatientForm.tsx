import React, { useState } from 'react';
import { usePatient } from '../contexts/PatientContext';
import { User, Calendar, Phone, Mail, MapPin, FileText, Save, X, UserPlus, Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';

interface PatientFormProps {
  onSuccess: () => void;
}

export default function PatientForm({ onSuccess }: PatientFormProps) {
  const { addPatient, addMultiplePatients } = usePatient();
  const [activeTab, setActiveTab] = useState<'manual' | 'csv'>('manual');
  const [formData, setFormData] = useState({
    dossierNumber: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'M' as 'M' | 'F',
    email: '',
    phone: '',
    address: '',
    medicalHistory: '',
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPatient(formData);
    onSuccess();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvError('Veuillez sélectionner un fichier CSV');
      return;
    }

    setCsvFile(file);
    setCsvError('');
    setIsProcessing(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setCsvError('Le fichier CSV doit contenir au moins un en-tête et une ligne de données');
        setIsProcessing(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['dossiernumber', 'firstname', 'lastname', 'dateofbirth', 'gender'];
      
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        setCsvError(`Colonnes manquantes: ${missingHeaders.join(', ')}`);
        setIsProcessing(false);
        return;
      }

      const patients = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        const patient: any = {};
        
        headers.forEach((header, i) => {
          switch (header) {
            case 'dossiernumber':
              patient.dossierNumber = values[i] || '';
              break;
            case 'firstname':
              patient.firstName = values[i] || '';
              break;
            case 'lastname':
              patient.lastName = values[i] || '';
              break;
            case 'dateofbirth':
              patient.dateOfBirth = values[i] || '';
              break;
            case 'gender':
              patient.gender = values[i]?.toUpperCase() === 'F' ? 'F' : 'M';
              break;
            case 'email':
              patient.email = values[i] || '';
              break;
            case 'phone':
              patient.phone = values[i] || '';
              break;
            case 'address':
              patient.address = values[i] || '';
              break;
            case 'medicalhistory':
              patient.medicalHistory = values[i] || '';
              break;
          }
        });

        return patient;
      }).filter(p => p.firstName && p.lastName && p.dossierNumber);

      setCsvPreview(patients);
    } catch (error) {
      setCsvError('Erreur lors de la lecture du fichier CSV');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCsvImport = () => {
    if (csvPreview.length > 0) {
      addMultiplePatients(csvPreview);
      onSuccess();
    }
  };

  const downloadTemplate = () => {
    const template = `dossierNumber,firstName,lastName,dateOfBirth,gender,email,phone,address,medicalHistory
DOS-2025-001,Jean,Martin,1980-05-15,M,jean.martin@email.com,0123456789,123 Rue de la Santé Paris,Aucun antécédent
DOS-2025-002,Marie,Dubois,1975-08-22,F,marie.dubois@email.com,0987654321,456 Avenue Médicale Lyon,Hypertension`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_patients.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <div className="h-16 w-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold gradient-text-primary">Nouveau Patient</h2>
            <p className="text-gray-600 mt-1 text-lg">Créez un nouveau dossier patient ou importez plusieurs patients via CSV</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-md font-medium transition-colors flex-1 justify-center ${
              activeTab === 'manual'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Saisie Manuelle</span>
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-md font-medium transition-colors flex-1 justify-center ${
              activeTab === 'csv'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Import CSV</span>
          </button>
        </div>
      </div>

      {activeTab === 'manual' ? (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
              <User className="h-6 w-6 text-blue-600" />
              <span>Informations Personnelles</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Numéro de dossier *
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="dossierNumber"
                    value={formData.dossierNumber}
                    onChange={handleChange}
                    className="pl-12 w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm"
                    placeholder="Ex: DOS-2025-001"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Genre *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm"
                  required
                >
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Prénom *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="pl-12 w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm"
                    placeholder="Prénom du patient"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Nom de famille *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="pl-12 w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm"
                    placeholder="Nom de famille du patient"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Date de naissance *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="pl-12 w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
              <Phone className="h-6 w-6 text-purple-600" />
              <span>Informations de Contact</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-12 w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white shadow-sm"
                    placeholder="Numéro de téléphone"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-12 w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white shadow-sm"
                    placeholder="Adresse email"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Adresse
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="pl-12 w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white shadow-sm"
                    placeholder="Adresse complète"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Medical Information Section */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
              <FileText className="h-6 w-6 text-emerald-600" />
              <span>Informations Médicales</span>
            </h3>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Antécédents médicaux
              </label>
              <textarea
                name="medicalHistory"
                value={formData.medicalHistory}
                onChange={handleChange}
                rows={5}
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white shadow-sm resize-none"
                placeholder="Historique médical, traitements en cours, allergies, conditions neurologiques..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-6">
            <button
              type="submit"
              className="flex items-center space-x-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <Save className="h-5 w-5" />
              <span>Créer le patient</span>
            </button>
            <button
              type="button"
              onClick={onSuccess}
              className="flex items-center space-x-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white px-8 py-4 rounded-xl hover:from-gray-500 hover:to-gray-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <X className="h-5 w-5" />
              <span>Annuler</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-8">
          {/* CSV Import Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
              <Upload className="h-6 w-6 text-blue-600" />
              <span>Import de Patients via CSV</span>
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Download className="h-4 w-4" />
                    <span>Télécharger le modèle CSV</span>
                  </button>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <label className="cursor-pointer">
                    <span className="text-blue-600 font-medium">Cliquez pour sélectionner</span>
                    <span className="text-gray-600"> ou glissez-déposez votre fichier CSV</span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {csvError && (
                  <div className="mt-4 flex items-center space-x-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{csvError}</span>
                  </div>
                )}

                {isProcessing && (
                  <div className="mt-4 flex items-center space-x-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Traitement du fichier...</span>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-medium text-gray-900 mb-3">Format requis</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>Colonnes obligatoires:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>dossierNumber</li>
                    <li>firstName</li>
                    <li>lastName</li>
                    <li>dateOfBirth (YYYY-MM-DD)</li>
                    <li>gender (M/F)</li>
                  </ul>
                  <p className="mt-3"><strong>Colonnes optionnelles:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>email</li>
                    <li>phone</li>
                    <li>address</li>
                    <li>medicalHistory</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* CSV Preview */}
          {csvPreview.length > 0 && (
            <div className="bg-white border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span>Aperçu des Patients ({csvPreview.length})</span>
                </h3>
                <button
                  onClick={handleCsvImport}
                  className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 font-semibold shadow-lg"
                >
                  <Upload className="h-4 w-4" />
                  <span>Importer {csvPreview.length} patient{csvPreview.length > 1 ? 's' : ''}</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dossier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prénom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Naissance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Genre</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {csvPreview.slice(0, 10).map((patient, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.dossierNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.lastName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.firstName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.dateOfBirth}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.gender}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.email || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvPreview.length > 10 && (
                  <div className="text-center py-4 text-gray-500">
                    ... et {csvPreview.length - 10} autres patients
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-6">
            <button
              type="button"
              onClick={onSuccess}
              className="flex items-center space-x-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white px-8 py-4 rounded-xl hover:from-gray-500 hover:to-gray-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <X className="h-5 w-5" />
              <span>Retour</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}