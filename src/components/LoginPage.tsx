import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Lock, User, AlertCircle, Brain, Zap, Shield, UserPlus, Mail, Phone, Calendar } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
    phone: '',
    role: 'doctor' as 'doctor' | 'admin',
    specialization: '',
    licenseNumber: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, register, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (mode === 'login') {
      const success = await login(formData.username, formData.password);
      if (!success) {
        setError('Nom d\'utilisateur ou mot de passe incorrect');
      }
    } else {
      // Validation pour l'inscription
      if (formData.password !== formData.confirmPassword) {
        setError('Les mots de passe ne correspondent pas');
        return;
      }
      
      if (formData.password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        return;
      }
      
      if (!formData.name || !formData.email || !formData.username) {
        setError('Veuillez remplir tous les champs obligatoires');
        return;
      }

      const success = await register(formData);
      if (success) {
        setSuccess('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
        setMode('login');
        setFormData({
          username: formData.username,
          password: '',
          confirmPassword: '',
          name: '',
          email: '',
          phone: '',
          role: 'doctor',
          specialization: '',
          licenseNumber: ''
        });
      } else {
        setError('Erreur lors de la création du compte. Ce nom d\'utilisateur existe peut-être déjà.');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setSuccess('');
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      name: '',
      email: '',
      phone: '',
      role: 'doctor',
      specialization: '',
      licenseNumber: ''
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Neural network pattern */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="neural" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="white" opacity="0.3"/>
              <line x1="10" y1="10" x2="30" y2="10" stroke="white" strokeWidth="0.5" opacity="0.2"/>
              <line x1="10" y1="10" x2="10" y2="30" stroke="white" strokeWidth="0.5" opacity="0.2"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#neural)"/>
        </svg>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="relative mx-auto h-20 w-20 mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
            <div className="relative h-full w-full bg-gradient-to-r from-blue-600 to-purple-700 rounded-full flex items-center justify-center shadow-2xl">
              <Brain className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              NeuroAnalytics
            </span>
          </h1>
          <p className="text-gray-300 text-lg">Système d'Analyse EEG Avancé</p>
          <div className="flex items-center justify-center space-x-6 mt-4 text-gray-400 text-sm">
            <div className="flex items-center space-x-1">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span>Analyse Rapide</span>
            </div>
            <div className="flex items-center space-x-1">
              <Shield className="h-4 w-4 text-green-400" />
              <span>Sécurisé</span>
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-white/10 backdrop-blur-lg rounded-2xl p-1 mb-6">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium transition-all ${
              mode === 'login'
                ? 'bg-white/20 text-white shadow-lg'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Connexion</span>
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium transition-all ${
              mode === 'register'
                ? 'bg-white/20 text-white shadow-lg'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>Inscription</span>
          </button>
        </div>

        {/* Form Container */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {mode === 'login' ? 'Connexion' : 'Créer un compte'}
            </h2>
            <p className="text-gray-300">
              {mode === 'login' 
                ? 'Accédez à votre espace professionnel' 
                : 'Rejoignez la plateforme NeuroAnalytics'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'register' && (
              <>
                {/* Informations personnelles */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Nom complet *
                    </label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="pl-12 w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white placeholder-gray-400 backdrop-blur-sm"
                        placeholder="Dr. Jean Martin"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Email professionnel *
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="pl-12 w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white placeholder-gray-400 backdrop-blur-sm"
                        placeholder="dr.martin@hopital.fr"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Téléphone
                    </label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="pl-12 w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white placeholder-gray-400 backdrop-blur-sm"
                        placeholder="+33 1 23 45 67 89"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Rôle *
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white backdrop-blur-sm"
                      required
                    >
                      <option value="doctor" className="bg-gray-800">Médecin</option>
                      <option value="admin" className="bg-gray-800">Administrateur</option>
                    </select>
                  </div>

                  {formData.role === 'doctor' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                          Spécialisation
                        </label>
                        <input
                          type="text"
                          name="specialization"
                          value={formData.specialization}
                          onChange={handleChange}
                          className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white placeholder-gray-400 backdrop-blur-sm"
                          placeholder="Neurologie, Psychiatrie, etc."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                          Numéro de licence
                        </label>
                        <input
                          type="text"
                          name="licenseNumber"
                          value={formData.licenseNumber}
                          onChange={handleChange}
                          className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white placeholder-gray-400 backdrop-blur-sm"
                          placeholder="Numéro RPPS ou équivalent"
                        />
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Identifiants de connexion */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Nom d'utilisateur *
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="pl-12 w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white placeholder-gray-400 backdrop-blur-sm"
                    placeholder="Entrez votre nom d'utilisateur"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Mot de passe *
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-12 w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white placeholder-gray-400 backdrop-blur-sm"
                    placeholder={mode === 'register' ? 'Minimum 6 caractères' : 'Entrez votre mot de passe'}
                    required
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Confirmer le mot de passe *
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="pl-12 w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white placeholder-gray-400 backdrop-blur-sm"
                      placeholder="Confirmez votre mot de passe"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center space-x-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <Shield className="h-4 w-4" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{mode === 'login' ? 'Connexion en cours...' : 'Création du compte...'}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  {mode === 'login' ? <User className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                  <span>{mode === 'login' ? 'Se connecter' : 'Créer le compte'}</span>
                </div>
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-6 text-center">
            <button
              onClick={switchMode}
              className="text-gray-300 hover:text-white transition-colors text-sm"
            >
              {mode === 'login' 
                ? "Pas encore de compte ? Créer un compte" 
                : "Déjà un compte ? Se connecter"
              }
            </button>
          </div>

          {/* Demo Accounts - Only show in login mode */}
          {mode === 'login' && (
            <div className="mt-8 pt-6 border-t border-white/20">
              <div className="text-sm text-gray-300">
                <p className="font-medium mb-3 text-center text-gray-200">Comptes de démonstration</p>
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-blue-300">👨‍⚕️ Médecin</p>
                        <p className="text-xs text-gray-400">dr.martin / password123</p>
                      </div>
                      <button
                        onClick={() => {
                          setFormData({
                            ...formData,
                            username: 'dr.martin',
                            password: 'password123'
                          });
                        }}
                        className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded hover:bg-blue-500/30 transition-colors"
                      >
                        Utiliser
                      </button>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-purple-300">👨‍💼 Admin</p>
                        <p className="text-xs text-gray-400">admin / admin123</p>
                      </div>
                      <button
                        onClick={() => {
                          setFormData({
                            ...formData,
                            username: 'admin',
                            password: 'admin123'
                          });
                        }}
                        className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded hover:bg-purple-500/30 transition-colors"
                      >
                        Utiliser
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm">
          <p>© 2025 NeuroAnalytics - Analyse EEG Professionnelle</p>
          <p className="mt-1">Sécurisé • Confidentiel • Certifié Médical</p>
        </div>
      </div>
    </div>
  );
}