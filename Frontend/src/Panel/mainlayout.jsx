import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ArrowRight, CheckCircle, X, Send, FileTextIcon, MessageSquare, Image, FileUp, Download, History, Save, Trash2, Share2 } from 'lucide-react';

// Main Page Component
const MainPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "AI-Powered Generation",
      description: "Create documents using our intelligent AI assistant that understands your requirements",
      icon: <MessageSquare className="w-6 h-6" />
    },
    {
      title: "Smart Templates",
      description: "Choose from various document templates including Minutes, Guest Lectures, and more",
      icon: <FileText className="w-6 h-6" />
    },
    {
      title: "Conversation Management",
      description: "Save, organize, and manage your document generation conversations",
      icon: <History className="w-6 h-6" />
    },
    {
      title: "Image Integration",
      description: "Easily add and manage images in your documents with our intuitive interface",
      icon: <Image className="w-6 h-6" />
    },
    {
      title: "PDF Support",
      description: "Upload existing PDFs to extract and edit their content seamlessly",
      icon: <FileUp className="w-6 h-6" />
    },
    {
      title: "Export Options",
      description: "Export your documents in multiple formats including PDF and HTML",
      icon: <Download className="w-6 h-6" />
    }
  ];

  const conversationFeatures = [
    {
      title: "Save Conversations",
      description: "All your document generation conversations are automatically saved",
      icon: <Save className="w-6 h-6" />
    },
    {
      title: "Chat History",
      description: "Access and continue previous conversations anytime",
      icon: <History className="w-6 h-6" />
    },
    {
      title: "Manage Chats",
      description: "Organize, delete, or export your conversations",
      icon: <Trash2 className="w-6 h-6" />
    },
    {
      title: "Share Documents",
      description: "Export and share your generated documents with others",
      icon: <Share2 className="w-6 h-6" />
    }
  ];

  const documentTypes = [
    "Minutes of Department Meeting",
    "Master list of documents",
    "Subject Allocation",
    "Requirement of Staff Members",
    "Lab Manual",
    "List of Experiments",
    "Workload Allocation",
    "Individual Time Table",
    "Master Time Table",
    "Coaching Class Time Table",
    "Guest Lecture"
  ];

  const handleGenerateDocument = () => {
    navigate('/generate');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-800 mb-6 animate-slide-down">
            AI Document Generator
          </h1>
          <p className="text-lg text-gray-600 mb-8 animate-slide-up max-w-2xl mx-auto">
            Create professional academic and administrative documents with our AI-powered generation system.
            Simply describe what you need, and our intelligent assistant will help you create the perfect document.
          </p>
          <button 
            onClick={handleGenerateDocument}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold
              transform transition-all duration-300 hover:scale-105 hover:bg-blue-700
              animate-pulse hover:animate-none"
          >
            Start Generating
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

        {/* Conversation Management Section */}
        <div className="bg-white p-8 rounded-xl shadow-lg mb-16 animate-fade-in">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Smart Conversation Management
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {conversationFeatures.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-gray-50 p-6 rounded-lg border border-gray-200
                  transform transition-all duration-300 hover:scale-105 hover:shadow-md"
                style={{
                  animation: `slideIn 0.5s ease-out ${index * 0.1}s both`
                }}
              >
                <div className="text-blue-600 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-gray-600">
            <p className="mb-4">
              Our conversation management system helps you:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Keep track of all your document generation sessions</li>
              <li>Resume previous conversations exactly where you left off</li>
              <li>Organize your documents by conversation</li>
              <li>Export and share your work with others</li>
            </ul>
          </div>
        </div>

        {/* Document Types Section */}
        <div className="bg-white p-8 rounded-xl shadow-lg mb-16 animate-fade-in">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Supported Document Types
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documentTypes.map((type, index) => (
              <div 
                key={type}
                className="bg-gray-50 p-4 rounded-lg border border-gray-200
                  transform transition-all duration-300 hover:scale-105 hover:shadow-md"
                style={{
                  animation: `slideIn 0.5s ease-out ${index * 0.1}s both`
                }}
              >
                <p className="text-gray-700">{type}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white p-8 rounded-xl shadow-lg animate-fade-in">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            How It Works
          </h2>
          <div className="space-y-4">
            <p className="text-gray-600">
              1. Start a new chat session and select your document type
            </p>
            <p className="text-gray-600">
              2. Provide the required information through our interactive chat interface
            </p>
            <p className="text-gray-600">
              3. Add images or upload existing PDFs if needed
            </p>
            <p className="text-gray-600">
              4. Preview and edit your document in real-time
            </p>
            <p className="text-gray-600">
              5. Export your document in your preferred format
            </p>
          </div>
          <div className="mt-6 text-sm text-gray-500">
            All your documents and conversations are automatically saved and can be accessed anytime
          </div>
        </div>
      </div>

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
