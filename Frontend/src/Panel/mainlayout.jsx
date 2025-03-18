import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ArrowRight, CheckCircle, X, Send, FileTextIcon } from 'lucide-react';
import { DocumentGenerateModal } from './DocumentGenerateModal';


// Main Page Component
const MainPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "Smart Templates",
      description: "Create professional documents using our intelligent template system",
      icon: <FileText className="w-6 h-6" />
    },
    {
      title: "Quick Generation",
      description: "Generate documents in seconds with our advanced processing",
      icon: <ArrowRight className="w-6 h-6" />
    },
    {
      title: "High Accuracy",
      description: "Ensure perfect formatting and content accuracy every time",
      icon: <CheckCircle className="w-6 h-6" />
    }
  ];

  const handleGenerateDocument = () => {
    navigate('/generate');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-800 mb-6 animate-slide-down">
            Document Generation
          </h1>
          <p className="text-lg text-gray-600 mb-8 animate-slide-up">
            Create professional documents instantly with our powerful generation system
          </p>
          <button 
            onClick={handleGenerateDocument}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold
              transform transition-all duration-300 hover:scale-105 hover:bg-blue-700
              animate-pulse hover:animate-none"
          >
            Generate Document
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="bg-white p-6 rounded-xl shadow-lg transform transition-all duration-300 
                hover:scale-105 hover:shadow-xl"
              style={{
                animation: `slideIn 0.5s ease-out ${index * 0.2}s both`
              }}
            >
              <div className="text-blue-600 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div className="bg-white p-8 rounded-xl shadow-lg animate-fade-in">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            How It Works
          </h2>
          <p className="text-gray-600 mb-4">
            Our document generation system uses advanced algorithms to create perfectly formatted
            documents based on your requirements. Simply click the generate button above to get started.
          </p>
          <div className="text-sm text-gray-500">
            Supported formats: PDF, DOCX, HTML
          </div>
        </div>
      </div>

      {/* Document Generation Modal */}
      <DocumentGenerateModal 
        isOpen={false} 
        onClose={() => {}} 
      />

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-down {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-slide-down {
          animation: slide-down 0.8s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }
      `}</style>
    </div>
  );
};

export default MainPage;
