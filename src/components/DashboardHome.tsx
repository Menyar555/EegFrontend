import React from 'react';
import { usePatient } from '../contexts/PatientContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  FileText, 
  BarChart3, 
  Clock, 
  TrendingUp, 
  Activity,
  Calendar,
  Eye,
  ChevronRight,
  Brain,
  Zap,
  Shield,
  Star,
  Plus
} from 'lucide-react';
import Plot from 'react-plotly.js';

interface DashboardHomeProps {
  onNavigate: (view: string) => void;
}

export default function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const { patients, eegFiles, analyses, selectPatient } = usePatient();
  const { user } = useAuth();

  const totalPatients = patients.length;
  const totalFiles = eegFiles.length;
  const totalAnalyses = analyses.length;
  const recentFiles = eegFiles.slice(-5).reverse();

  // Generate analytics data
  const getMonthlyStats = () => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentYear = new Date().getFullYear();
    
    const monthlyData = months.map((month, index) => {
      const monthFiles = eegFiles.filter(file => {
        const fileDate = new Date(file.uploadDate);
        return fileDate.getFullYear() === currentYear && fileDate.getMonth() === index;
      });
      return monthFiles.length;
    });

    return { months, data: monthlyData };
  };

  const getPatientAgeDistribution = () => {
    const ageGroups = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '80+': 0 };
    
    patients.forEach(patient => {
      const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
      if (age <= 20) ageGroups['0-20']++;
      else if (age <= 40) ageGroups['21-40']++;
      else if (age <= 60) ageGroups['41-60']++;
      else if (age <= 80) ageGroups['61-80']++;
      else ageGroups['80+']++;
    });

    return ageGroups;
  };

  const monthlyStats = getMonthlyStats();
  const ageDistribution = getPatientAgeDistribution();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPatientById = (patientId: string) => {
    return patients.find(p => p.id === patientId);
  };

  const handleViewAnalysis = (file: any) => {
    const patient = getPatientById(file.patientId);
    if (patient) {
      selectPatient(patient);
      onNavigate('analysis');
    }
  };

  const statsCards = [
    {
      title: 'Total Patients',
      value: totalPatients,
      subtitle: 'Actifs',
      icon: Users,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      iconBg: 'from-blue-100 to-cyan-100',
      onClick: () => onNavigate('patients')
    },
    {
      title: 'Fichiers EEG',
      value: totalFiles,
      subtitle: 'Traités',
      icon: FileText,
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
      iconBg: 'from-emerald-100 to-teal-100',
      onClick: () => onNavigate('patients')
    },
    {
      title: 'Analyses',
      value: totalAnalyses,
      subtitle: 'Complètes',
      icon: BarChart3,
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-50 to-red-50',
      iconBg: 'from-orange-100 to-red-100',
      onClick: () => onNavigate('analysis')
    }
  ];

  return (
    <div className="p-8">
      {/* Welcome Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg animate-glow">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                <Star className="h-3 w-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold gradient-text-primary">Tableau de Bord</h1>
              <p className="text-xl text-gray-600 mt-1">Bienvenue, <span className="font-semibold text-gray-800">{user?.name}</span></p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Système Sécurisé</span>
            </div>
            <div className="bg-gradient-to-r from-blue-400 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Analyse Rapide</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-indigo-800">
              <Calendar className="h-6 w-6" />
              <span className="font-semibold text-lg">
                {new Date().toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
            <div className="text-indigo-600 text-sm">
              Session active depuis {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {statsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              onClick={card.onClick}
              className={`bg-gradient-to-br ${card.bgGradient} border border-white/50 rounded-2xl p-6 hover-lift shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`h-14 w-14 bg-gradient-to-r ${card.iconBg} rounded-xl flex items-center justify-center shadow-md`}>
                  <Icon className={`h-7 w-7 bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`} />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-800">{card.value}</p>
                  <p className={`text-sm font-medium bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                    {card.subtitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">{card.title}</p>
                <div className="flex items-center space-x-1 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">+{Math.floor(Math.random() * 20)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Monthly Activity Chart */}
        <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Activité Mensuelle</h3>
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              2025
            </div>
          </div>
          <Plot
            data={[
              {
                x: monthlyStats.months,
                y: monthlyStats.data,
                type: 'bar',
                marker: { 
                  color: monthlyStats.data.map((_, i) => `rgba(${59 + i * 10}, ${130 + i * 5}, 246, 0.8)`)
                },
                name: 'Fichiers EEG',
              },
            ]}
            layout={{
              height: 300,
              margin: { l: 40, r: 20, t: 20, b: 40 },
              xaxis: { title: 'Mois', gridcolor: '#f1f5f9' },
              yaxis: { title: 'Nombre de fichiers', gridcolor: '#f1f5f9' },
              plot_bgcolor: 'rgba(248, 250, 252, 0.5)',
              paper_bgcolor: 'transparent',
            }}
            config={{ displayModeBar: false }}
            style={{ width: '100%' }}
          />
        </div>

        {/* Age Distribution Chart */}
        <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Répartition par Âge</h3>
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Patients
            </div>
          </div>
          <Plot
            data={[
              {
                labels: Object.keys(ageDistribution),
                values: Object.values(ageDistribution),
                type: 'pie',
                marker: {
                  colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                },
                textinfo: 'label+percent',
                textposition: 'outside',
              },
            ]}
            layout={{
              height: 300,
              margin: { l: 20, r: 20, t: 20, b: 20 },
              showlegend: true,
              legend: { orientation: 'h', y: -0.1 },
              plot_bgcolor: 'transparent',
              paper_bgcolor: 'transparent',
            }}
            config={{ displayModeBar: false }}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Enhanced Recent Activity */}
      <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Activité Récente</h3>
            <p className="text-gray-600 mt-1">{recentFiles.length} fichiers récents</p>
          </div>
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium">
            Dernières 24h
          </div>
        </div>

        {recentFiles.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-24 w-24 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">Aucune activité récente</h4>
            <p className="text-gray-600">Les fichiers EEG uploadés apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentFiles.map((file, index) => {
              const patient = getPatientById(file.patientId);
              const gradients = [
                'from-blue-500 to-cyan-500',
                'from-purple-500 to-pink-500',
                'from-green-500 to-emerald-500',
                'from-orange-500 to-red-500',
                'from-indigo-500 to-purple-500'
              ];
              
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:shadow-lg transition-all duration-300 border border-gray-100 hover-lift"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`h-12 w-12 bg-gradient-to-r ${gradients[index % gradients.length]} rounded-xl flex items-center justify-center shadow-md`}>
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-lg">{file.filename}</p>
                      <p className="text-gray-600">
                        Patient: <span className="font-medium">{patient ? `${patient.firstName} ${patient.lastName}` : 'Inconnu'}</span>
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                          {Math.round(file.duration / 60)} min
                        </span>
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">
                          {file.samplingRate} Hz
                        </span>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                          {file.electrodes.length} électrodes
                        </span>
                        <span className="text-gray-400">{formatDate(file.uploadDate)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleViewAnalysis(file)}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Analyser</span>
                    </button>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enhanced Quick Actions */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          {
            title: 'Gestion Patients',
            description: 'Ajoutez de nouveaux patients ou consultez les dossiers existants',
            icon: Users,
            gradient: 'from-blue-500 to-cyan-500',
            bgGradient: 'from-blue-50 to-cyan-50',
            action: () => onNavigate('patients')
          },
          {
            title: 'Nouveau Patient',
            description: 'Créez un nouveau dossier patient rapidement',
            icon: Plus,
            gradient: 'from-green-500 to-emerald-500',
            bgGradient: 'from-green-50 to-emerald-50',
            action: () => onNavigate('add-patient')
          }
        ].map((action, index) => {
          const Icon = action.icon;
          return (
            <div
              key={action.title}
              onClick={action.action}
              className={`bg-gradient-to-br ${action.bgGradient} border border-white/50 rounded-2xl p-6 hover-lift shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer`}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className={`h-12 w-12 bg-gradient-to-r ${action.gradient} rounded-xl flex items-center justify-center shadow-md`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 text-lg">{action.title}</h4>
              </div>
              <p className="text-gray-700 mb-4 leading-relaxed">{action.description}</p>
              <button className={`text-white font-medium text-sm flex items-center space-x-2 bg-gradient-to-r ${action.gradient} px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-300`}>
                <span>Commencer</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}