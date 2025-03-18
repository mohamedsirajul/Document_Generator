import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Edit, Eye } from 'lucide-react';
import DOMPurify from 'dompurify';
import jsPDF from "jspdf";
import "jspdf-autotable";

const Document = () => {
  const [documentData, setDocumentData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const navigate = useNavigate();
  const editorRef = React.useRef(null);

  useEffect(() => {
    // Get document data from localStorage
    const storedData = localStorage.getItem('documentData');
    if (storedData) {
      const data = JSON.parse(storedData);
      setDocumentData(data);
      setEditorContent(data.content);
    } else {
      // If no document data, redirect back to home
      navigate('/');
    }
  }, [navigate]);

  const handleEditorChange = () => {
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFont("Arial", "normal");
    doc.setFontSize(12);
    
    const content = editorRef.current?.innerText || '';
    const lines = doc.splitTextToSize(content, 180);
    doc.text(lines, 10, 10);
    
    doc.save("document.pdf");
  };

  if (!documentData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            {/* Header */}
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {documentData.type} Document
              </h3>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isEditing ? (
                    <>
                      <Eye className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                      Preview
                    </>
                  ) : (
                    <>
                      <Edit className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                      Edit
                    </>
                  )}
                </button>
                <button
                  onClick={generatePDF}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Download className="-ml-1 mr-2 h-5 w-5" />
                  Export PDF
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 py-5 sm:p-6">
              {isEditing ? (
                <div
                  ref={editorRef}
                  contentEditable
                  className="prose max-w-none min-h-[500px] p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onInput={handleEditorChange}
                  dangerouslySetInnerHTML={{ __html: editorContent }}
                />
              ) : (
                <div
                  className="prose max-w-none min-h-[500px] p-4 border rounded-lg bg-white"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editorContent) }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Document; 