import React, { useState, useEffect } from 'react';
import Header from './Header';
import PatientList from './PatientList';
import PatientForm from './PatientForm';
import EEGAnalysis from './EEGAnalysis';
import DashboardHome from './DashboardHome';
import { usePatient } from '../contexts/PatientContext';
import { Users, Plus, BarChart3, Home, Sparkles } from 'lucide-react';

type ActiveView = 'dashboard' | 'patients' | 'add-patient' | 'analysis';

export default function Dashboard() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const { selectedPatient } = usePatient();

  // Listen for navigation events from PatientList
  useEffect(() => {
    const handleNavigateToAnalysis = () => {
      setActiveView('analysis');
    };

    window.addEventListener('navigate-to-analysis', handleNavigateToAnalysis);
    
    return () => {
      window.removeEventListener('navigate-to-analysis', handleNavigateToAnalysis);
    };
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: Home, gradient: 'from-blue-500 to-cyan-500' },
    { id: 'patients', label: 'Patients', icon: Users, gradient: 'from-purple-500 to-pink-500' },
    { id: 'add-patient', label: 'Nouveau Patient', icon: Plus, gradient: 'from-green-500 to-emerald-500' },
    ...(selectedPatient ? [{ id: 'analysis', label: 'Analyse EEG', icon: BarChart3, gradient: 'from-teal-500 to-cyan-500' }] : [])
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Navigation */}
        <nav className="mb-8">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-2 shadow-xl border border-white/20">
            <div className="flex space-x-2 overflow-x-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id as ActiveView)}
                    className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap ${
                      isActive
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg transform scale-105`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'animate-pulse' : ''}`} />
                    <span>{item.label}</span>
                    {isActive && <Sparkles className="h-4 w-4 animate-pulse" />}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Content Area */}
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="relative">
            {/* Decorative gradient overlay */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            
            {activeView === 'dashboard' && <DashboardHome onNavigate={setActiveView} />}
            {activeView === 'patients' && <PatientList />}
            {activeView === 'add-patient' && <PatientForm onSuccess={() => setActiveView('patients')} />}
            {activeView === 'analysis' && selectedPatient && <EEGAnalysis />}
          </div>
        </div>
      </div>
    </div>
  );
}