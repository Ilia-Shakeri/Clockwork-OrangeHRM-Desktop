// Connection Wizard for Clockwork (First-run setup)

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Cable, CheckCircle, Loader, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { testConnection, saveToLocalStorage } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type Step = 1 | 2 | 3 | 4;

export function ConnectionWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [connectionType, setConnectionType] = useState<'localhost' | 'remote'>('remote');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  
  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };
  
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const result = await testConnection(apiUrl, apiKey);
      setTestResult(result);
      
      if (result.success) {
        setTimeout(() => {
          handleNext();
        }, 1000);
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection failed',
      });
    } finally {
      setTesting(false);
    }
  };
  
  const handleFinish = () => {
    // Save connection settings
    saveToLocalStorage('clockwork-connection', {
      type: connectionType,
      apiUrl,
      apiKey,
      connected: true,
      lastTested: new Date().toISOString(),
    });
    
    // Navigate to dashboard
    navigate('/');
  };
  
  const steps = [
    { number: 1, label: 'Connection Type' },
    { number: 2, label: 'API URL' },
    { number: 3, label: 'Authentication' },
    { number: 4, label: 'Complete' },
  ];
  
  return (
    <div className="min-h-screen bg-[var(--clockwork-bg-secondary)] flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[var(--clockwork-orange)] rounded-lg flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2"/>
                <path d="M12 6V12L16 14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h1 className="text-3xl font-semibold text-[var(--clockwork-gray-900)]">
              Clockwork
            </h1>
          </div>
          <p className="text-[var(--clockwork-gray-600)]">
            Welcome! Let's connect to your OrangeHRM instance
          </p>
        </div>
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      currentStep >= step.number
                        ? 'bg-[var(--clockwork-green)] text-white'
                        : 'bg-[var(--clockwork-gray-200)] text-[var(--clockwork-gray-500)]'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <p
                    className={`text-xs mt-2 font-medium ${
                      currentStep >= step.number
                        ? 'text-[var(--clockwork-gray-900)]'
                        : 'text-[var(--clockwork-gray-500)]'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded transition-all ${
                      currentStep > step.number
                        ? 'bg-[var(--clockwork-green)]'
                        : 'bg-[var(--clockwork-gray-200)]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Steps Content */}
        <Card>
          <AnimatePresence mode="wait">
            {/* Step 1: Connection Type */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <h2 className="text-2xl font-semibold text-[var(--clockwork-gray-900)] mb-2">
                  Choose Connection Type
                </h2>
                <p className="text-[var(--clockwork-gray-600)] mb-6">
                  Select how you want to connect to your OrangeHRM API
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <button
                    onClick={() => setConnectionType('localhost')}
                    className={`p-6 border-2 rounded-lg transition-all text-left ${
                      connectionType === 'localhost'
                        ? 'border-[var(--clockwork-orange)] bg-[var(--clockwork-orange-light)]'
                        : 'border-[var(--clockwork-border)] hover:border-[var(--clockwork-gray-400)]'
                    }`}
                  >
                    <Cable className="w-8 h-8 text-[var(--clockwork-orange)] mb-3" />
                    <h3 className="font-semibold text-[var(--clockwork-gray-900)] mb-1">
                      Localhost API
                    </h3>
                    <p className="text-sm text-[var(--clockwork-gray-600)]">
                      Connect to OrangeHRM running on your local machine
                    </p>
                  </button>
                  
                  <button
                    onClick={() => setConnectionType('remote')}
                    className={`p-6 border-2 rounded-lg transition-all text-left ${
                      connectionType === 'remote'
                        ? 'border-[var(--clockwork-orange)] bg-[var(--clockwork-orange-light)]'
                        : 'border-[var(--clockwork-border)] hover:border-[var(--clockwork-gray-400)]'
                    }`}
                  >
                    <Cable className="w-8 h-8 text-[var(--clockwork-green)] mb-3" />
                    <h3 className="font-semibold text-[var(--clockwork-gray-900)] mb-1">
                      Remote API URL
                    </h3>
                    <p className="text-sm text-[var(--clockwork-gray-600)]">
                      Connect to a remote OrangeHRM server
                    </p>
                  </button>
                </div>
                
                <div className="flex justify-end">
                  <Button variant="primary" onClick={handleNext}>
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
            
            {/* Step 2: API URL */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <h2 className="text-2xl font-semibold text-[var(--clockwork-gray-900)] mb-2">
                  Enter API Base URL
                </h2>
                <p className="text-[var(--clockwork-gray-600)] mb-6">
                  Provide the base URL of your OrangeHRM API endpoint
                </p>
                
                <div className="mb-8">
                  <Input
                    label="API Base URL"
                    type="text"
                    placeholder={
                      connectionType === 'localhost'
                        ? 'http://localhost:3000/api'
                        : 'https://your-orangehrm.com/api'
                    }
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    helperText="Include the protocol (http:// or https://)"
                  />
                  
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/30">
                    <p className="text-sm text-[var(--clockwork-gray-700)]">
                      <strong>Example URLs:</strong>
                    </p>
                    <ul className="text-xs text-[var(--clockwork-gray-600)] mt-2 space-y-1">
                      <li>• http://localhost:8080/api/v2</li>
                      <li>• https://hr.company.com/orangehrm/api</li>
                      <li>• https://192.168.1.100:3000/api</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={handleBack}>
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button variant="primary" onClick={handleNext} disabled={!apiUrl}>
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
            
            {/* Step 3: Authentication */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <h2 className="text-2xl font-semibold text-[var(--clockwork-gray-900)] mb-2">
                  API Authentication
                </h2>
                <p className="text-[var(--clockwork-gray-600)] mb-6">
                  Enter your API key to authenticate with OrangeHRM
                </p>
                
                <div className="mb-6">
                  <Input
                    label="API Key / Token"
                    type="password"
                    placeholder="Enter your API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    helperText="Find this in your OrangeHRM admin panel under Configuration → API"
                  />
                  
                  {testResult && (
                    <div
                      className={`mt-4 p-4 rounded-lg border ${
                        testResult.success
                          ? 'bg-[var(--clockwork-green-light)] border-[var(--clockwork-green)]/20'
                          : 'bg-red-50 border-red-200 dark:bg-red-950/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {testResult.success ? (
                          <CheckCircle className="w-5 h-5 text-[var(--clockwork-green)] flex-shrink-0 mt-0.5" />
                        ) : (
                          <Cable className="w-5 h-5 text-[var(--clockwork-error)] flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-[var(--clockwork-gray-900)]">
                            {testResult.success ? 'Connection Successful!' : 'Connection Failed'}
                          </p>
                          <p className="text-sm text-[var(--clockwork-gray-700)] mt-1">
                            {testResult.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={handleBack} disabled={testing}>
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleTest}
                    disabled={!apiKey || testing}
                  >
                    {testing ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
            
            {/* Step 4: Complete */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 text-center"
              >
                <div className="w-16 h-16 bg-[var(--clockwork-green-light)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-[var(--clockwork-green)]" />
                </div>
                
                <h2 className="text-2xl font-semibold text-[var(--clockwork-gray-900)] mb-2">
                  All Set!
                </h2>
                <p className="text-[var(--clockwork-gray-600)] mb-8">
                  Your connection to OrangeHRM is configured and ready to use. You can now
                  start generating attendance reports.
                </p>
                
                <div className="p-4 bg-[var(--clockwork-gray-50)] border border-[var(--clockwork-border)] rounded-lg mb-8 text-left">
                  <h3 className="font-semibold text-[var(--clockwork-gray-900)] mb-3">
                    Connection Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--clockwork-gray-600)]">Type:</span>
                      <span className="text-[var(--clockwork-gray-900)] font-medium">
                        {connectionType === 'localhost' ? 'Localhost' : 'Remote API'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--clockwork-gray-600)]">URL:</span>
                      <span className="text-[var(--clockwork-gray-900)] font-medium font-mono text-xs">
                        {apiUrl}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--clockwork-gray-600)]">Status:</span>
                      <span className="text-[var(--clockwork-green)] font-medium">
                        Connected
                      </span>
                    </div>
                  </div>
                </div>
                
                <Button variant="primary" onClick={handleFinish} className="w-full md:w-auto">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
        
        {/* Skip for now */}
        {currentStep === 1 && (
          <div className="text-center mt-4">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-[var(--clockwork-gray-500)] hover:text-[var(--clockwork-gray-700)] transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
