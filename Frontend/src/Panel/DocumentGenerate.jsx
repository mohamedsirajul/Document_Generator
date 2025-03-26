import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Send, Download, Bold, Italic, Image, List, 
  ListOrdered, Link as LinkIcon, Heading1, Heading2,
  AlignLeft, AlignCenter, AlignRight, Underline,
  Type, Quote, Code, Eye, Edit, Calendar, Upload, X,
  ChevronLeft, ChevronRight, FileUp
} from 'lucide-react';
import DOMPurify from 'dompurify';
import jsPDF from "jspdf";
import "jspdf-autotable";

// Editor Toolbar Component
const EditorToolbar = ({ onFormatClick }) => {
  return (
    <div className="p-2 border-b bg-white flex flex-wrap gap-1">
      <button onClick={() => onFormatClick('bold')} className="p-2 hover:bg-gray-100 rounded">
        <Bold className="w-4 h-4" />
      </button>
      <button onClick={() => onFormatClick('italic')} className="p-2 hover:bg-gray-100 rounded">
        <Italic className="w-4 h-4" />
      </button>
      <button onClick={() => onFormatClick('underline')} className="p-2 hover:bg-gray-100 rounded">
        <Underline className="w-4 h-4" />
      </button>
      <button onClick={() => onFormatClick('insertUnorderedList')} className="p-2 hover:bg-gray-100 rounded">
        <List className="w-4 h-4" />
      </button>
      <button onClick={() => onFormatClick('insertOrderedList')} className="p-2 hover:bg-gray-100 rounded">
        <ListOrdered className="w-4 h-4" />
      </button>
      <button onClick={() => onFormatClick('formatBlock', 'h1')} className="p-2 hover:bg-gray-100 rounded">
        <Heading1 className="w-4 h-4" />
      </button>
      <button onClick={() => onFormatClick('formatBlock', 'h2')} className="p-2 hover:bg-gray-100 rounded">
        <Heading2 className="w-4 h-4" />
      </button>
      <button onClick={() => onFormatClick('justifyLeft')} className="p-2 hover:bg-gray-100 rounded">
        <AlignLeft className="w-4 h-4" />
      </button>
      <button onClick={() => onFormatClick('justifyCenter')} className="p-2 hover:bg-gray-100 rounded">
        <AlignCenter className="w-4 h-4" />
      </button>
      <button onClick={() => onFormatClick('justifyRight')} className="p-2 hover:bg-gray-100 rounded">
        <AlignRight className="w-4 h-4" />
      </button>
    </div>
  );
};

const DocumentGenerate = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isEditing, setIsEditing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const editorRef = useRef(null);
  const [editorContent, setEditorContent] = useState('');
  const [selectedFormat, setSelectedFormat] = useState({
    fontSize: '16px',
    fontFamily: 'Arial'
  });
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [documentData, setDocumentData] = useState({
    type: null,
    currentField: null,
    fields: {}
  });

  const DEPARTMENTS = ["CSBS", "CSE", "ECE", "MECH"];
  const YEARS = ["First Year", "Second Year", "Third Year", "Fourth Year"];
  const [showDepartmentOptions, setShowDepartmentOptions] = useState(false);
  const [showYearOptions, setShowYearOptions] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [previewContent, setPreviewContent] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(true);
  const [showBothPanels, setShowBothPanels] = useState(true);
  const [arrowDirection, setArrowDirection] = useState('right');
  const containerRef = useRef(null);

  // Define required fields for Guest Lecture
  const requiredFields = [
    "Guest Name",
    "Guest Designation",
    "Topic",
    "Event Date",
    "Activity Code",
    "Year",
    "No Of Count",
    "Organizer Department",
    "Organizer Faculty Name"
  ];

  // Add new state for discussion ID
  const [discussionId, setDiscussionId] = useState(null);
  const [documentStorage, setDocumentStorage] = useState({});

  // Add new state for image upload loading
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [documentContent, setDocumentContent] = useState([]);

  // Add logo state
  const [logoUrl] = useState('/logo.png'); // Make sure to add your logo in the public folder

  // Add new state for PDF upload
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  const [showPdfUpload, setShowPdfUpload] = useState(false);

  // Initialize chat with greeting when component mounts
  useEffect(() => {
    const initialMessage = `Hello! I'm Siraj AI! I can help you create various types of documents. Please select from the following options:

1. Minutes of Department Meeting
2. Master list of documents
3. Subject Allocation
4. Requirement of Staff Members
5. Lab Manual
6. List of Experiments
7. Workload Allocation
8. Individual Time Table
9. Master Time Table
10. Coaching Class Time Table
11. Guest Lecture

Or, if you have an existing PDF report, click the "Upload PDF" button below to extract and edit its content.`;

    setMessages([{
      id: 1,
      text: initialMessage,
      isBot: true,
    }]);
  }, []);

  // Add mouse move handler to update arrow direction
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      setArrowDirection(e.clientX > containerCenter ? 'left' : 'right');
    };

    if (showBothPanels) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [showBothPanels]);

  // Add auto-scroll effect when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Add function to load documents data
  const loadDocumentsData = () => {
    try {
      const storedData = localStorage.getItem('documentsData');
      return storedData ? JSON.parse(storedData) : { documents: {}, lastDocumentId: 0 };
    } catch (error) {
      console.error('Error loading documents data:', error);
      return { documents: {}, lastDocumentId: 0 };
    }
  };

  // Update the saveDocument function to only use localStorage
  const saveDocument = (data) => {
    try {
      localStorage.setItem('documentsData', JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving document:', error);
      return false;
    }
  };

  // Update handleDocumentFlow function
  const handleDocumentFlow = async (userMessage) => {
    if (!documentData.type) {
      const messageLower = userMessage.toLowerCase().trim();
      
      // Check for all document types
      const documentTypes = {
        "1": "Minutes",
        "minutes of department meeting": "Minutes",
        "2": "MasterList",
        "master list of documents": "MasterList",
        "3": "SubjectAllocation",
        "subject allocation": "SubjectAllocation",
        "4": "StaffRequirement",
        "requirement of staff members": "StaffRequirement",
        "5": "LabManual",
        "lab manual": "LabManual",
        "6": "Experiments",
        "list of experiments": "Experiments",
        "7": "Workload",
        "workload allocation": "Workload",
        "8": "IndividualTT",
        "individual time table": "IndividualTT",
        "9": "MasterTT",
        "master time table": "MasterTT",
        "10": "CoachingTT",
        "coaching class time table": "CoachingTT",
        "11": "GuestLecture",
        "guest lecture": "GuestLecture"
      };

      const selectedType = documentTypes[messageLower];
      if (selectedType) {
        if (selectedType === "GuestLecture") {
          setDocumentData(prev => ({
            ...prev,
            type: selectedType,
            currentField: "Guest Name",
            fields: {}
          }));

          setMessages(prev => [...prev, {
            id: prev.length + 1,
            text: "Please enter the name of the guest lecturer:",
            isBot: true
          }]);
        } else {
          // For all other document types
          setMessages(prev => [...prev, {
            id: prev.length + 1,
            text: `This document type (${selectedType.replace(/([A-Z])/g, ' $1').trim()}) is currently in development. It will be available soon!\n\nPlease select another document type from the list:\n\n1. Minutes of Department Meeting\n2. Master list of documents\n3. Subject Allocation\n4. Requirement of Staff Members\n5. Lab Manual\n6. List of Experiments\n7. Workload Allocation\n8. Individual Time Table\n9. Master Time Table\n10. Coaching Class Time Table\n11. Guest Lecture`,
            isBot: true
          }]);

          // Reset document data
          setDocumentData({
            type: null,
            currentField: null,
            fields: {}
          });
        }
      } else {
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          text: "I didn't understand that. Please select a number from 1-11 or type the document name.",
          isBot: true
        }]);
      }
    } else if (documentData.type === "GuestLecture") {
      // Store the current field's value
      const updatedFields = {
        ...documentData.fields,
        [documentData.currentField]: userMessage
      };

      setDocumentData(prev => ({
        ...prev,
        fields: updatedFields
      }));

      // Store document data with discussion ID
      setDocumentStorage(prev => ({
        ...prev,
        [discussionId]: {
          ...prev[discussionId],
          type: documentData.type,
          fields: updatedFields,
          lastUpdated: new Date().toISOString()
        }
      }));

      // Define the field sequence and their corresponding questions
      const fieldSequence = [
        { field: "Guest Name", question: "Please enter the guest's name:", type: "text" },
        { field: "Guest Designation", question: "Please enter the guest's designation:", type: "text" },
        { field: "Topic", question: "Please enter the topic of the lecture:", type: "text" },
        { field: "Event Date", question: "Please select the event date:", type: "date" },
        { field: "Activity Code", question: "Please enter the activity code :", type: "text" },
        { field: "Year", question: "Please select the target year:", type: "year" },
        { field: "No Of Count", question: "Please enter the expected number of participants:", type: "text" },
        { field: "Organizer Department", question: "Please select the organizing department:", type: "department" },
        { field: "Organizer Faculty Name", question: "Please enter the faculty coordinator's name:", type: "text" },
        { 
          field: "Images",
          question: "Please upload images related to the document:",
          type: "image",
          multiple: true,
          accept: "image/*"
        }
      ];

      // Find current field index
      const currentIndex = fieldSequence.findIndex(item => item.field === documentData.currentField);

      // Move to next field
      if (currentIndex < fieldSequence.length - 1) {
        const nextField = fieldSequence[currentIndex + 1];
        setDocumentData(prev => ({
          ...prev,
          currentField: nextField.field
        }));

        // Reset all special input states
        setShowDatePicker(false);
        setShowYearOptions(false);
        setShowDepartmentOptions(false);

        // Special handling for different fields
        switch (nextField.type) {
          case "department":
            setShowDepartmentOptions(true);
            setMessages(prev => [...prev, {
              id: prev.length + 1,
              text: nextField.question,
              isBot: true
            }]);
            break;
          case "year":
            setShowYearOptions(true);
            setMessages(prev => [...prev, {
              id: prev.length + 1,
              text: nextField.question,
              isBot: true
            }]);
            break;
          case "date":
            setShowDatePicker(true);
            setMessages(prev => [...prev, {
              id: prev.length + 1,
              text: nextField.question,
              isBot: true
            }]);
            break;
          default:
            setMessages(prev => [...prev, {
              id: prev.length + 1,
              text: nextField.question,
              isBot: true
            }]);
        }
      } else {
        // All fields are collected, show empty document panel
        setEditorContent('');
        setDocumentContent([]);
        setTotalPages(1);
        setCurrentPage(1);
      }
    }
  };

  // Update handleImageUpload function to remove spinner
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setIsImageUploading(true);
    
    try {
    // Generate unique IDs for each image
    const newPreviewImages = files.map(file => ({
        id: `IMG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type,
        size: file.size
    }));
    
    setPreviewImages(prev => [...prev, ...newPreviewImages]);
    setUploadedImages(prev => [...prev, ...files]);

    // After uploading images, prepare the document data
    const documentJson = {
        discussionId,
        type: documentData.type,
        fields: documentData.fields,
        images: newPreviewImages.map(img => ({
            id: img.id,
            name: img.name,
            type: img.type,
            size: img.size,
            url: img.url
        })),
        createdAt: new Date().toISOString()
    };

    // Load current documents data
    const currentData = loadDocumentsData();
    
    // Update with new document
    const updatedData = {
        ...currentData,
        documents: {
            ...currentData.documents,
            [discussionId]: documentJson
        }
    };

    // Save to localStorage
    saveDocument(updatedData);

      // Add message to chat without loading state
      setMessages(prev => [...prev, {
          id: Date.now(),
          text: 'Upload image and click send to generate content.',
          isBot: true
      }]);

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
          id: Date.now(),
          text: 'An error occurred while uploading images. Please try again.',
          isBot: true
      }]);
    } finally {
      setIsImageUploading(false);
    }
  };

  // Update handleImageSubmit function to handle API call without sending images
  const handleImageSubmit = async () => {
    if (uploadedImages.length === 0) return;

    setIsLoading(true);
    try {
      // Add loading message to chat
      const loadingMessageId = Date.now();
      setMessages(prev => [...prev, {
          id: loadingMessageId,
          text: 'Processing images and generating content...',
          isBot: true,
          isLoading: true
      }]);

      // Create document data with images
      const imageData = {
        discussionId,
        type: documentData.type,
        fields: documentData.fields,
        images: previewImages.map(img => ({
          id: img.id,
          name: img.name,
          type: img.type,
          size: img.size,
          url: img.url
        }))
      };

      // Load current documents data
      const currentData = loadDocumentsData();
      
      // Update with new document
      const updatedData = {
        ...currentData,
        documents: {
          ...currentData.documents,
          [discussionId]: {
            ...imageData,
            createdAt: new Date().toISOString()
          }
        }
      };

      // Save document data to localStorage
      const saved = saveDocument(updatedData);

      if (saved) {
        // Add images to chat with correct alignment
        setMessages(prev => [
          ...prev,
          {
            id: prev.length + 1,
            text: `Uploaded ${uploadedImages.length} image(s)`,
            images: previewImages,
            isBot: false,
            isUserUpload: true
          }
        ]);

        // Call the API to generate content without sending images
        const response = await fetch('http://localhost:8000/api/generate-content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: documentData.type,
                fields: documentData.fields
            }),
        });

        const data = await response.json();

        if (data.error) {
          // Remove loading message and show error
          setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));
            setMessages(prev => [...prev, {
            id: Date.now(),
                text: `Error: ${data.error}`,
                isBot: true
            }]);
            return;
        }

        // Process content into pages
        const content = data.content || '';
        const pages = content.split('<div class="page-break"></div>');
        setDocumentContent(pages);
        setTotalPages(pages.length);

        // Generate HTML content for editor with images
        const editorContent = pages.map((page, index) => `
          <div class="page" style="page-break-after: always;">
            ${page}
          </div>
        `).join('') + `
          <div class="page" style="page-break-after: always;">
            <h2 class="text-xl font-bold mb-6">Event Images</h2>
            <div class="grid grid-cols-2 gap-6">
              ${previewImages.map(img => `
                <div class="max-w-[300px]">
                  <img src="${img.url}" alt="${img.name}" class="w-full h-auto object-contain rounded-lg shadow-lg" />
                  <p class="text-sm text-gray-600 mt-2">${img.name}</p>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        // Remove loading message and update with success message and sections
        setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            text: "Document has been generated successfully!",
            isBot: true
          }
        ]);

        // Add sections to chat
        if (data.sections) {
          Object.entries(data.sections).forEach(([section, content]) => {
            setMessages(prev => [...prev, {
              id: Date.now() + Math.random(),
              text: `**${section}**\n\n${content}`,
              isBot: true,
              isContent: true
            }]);
          });
        }

        // Update both chat and document panel
        setEditorContent(editorContent);
        setPreviewContent(data);
        setWordCount(data.word_count);

        // Clear the upload states
        setUploadedImages([]);
        setPreviewImages([]);

        // Move to next step in document flow
        setDocumentData(prev => ({
          ...prev,
          currentField: null,
          fields: {
            ...prev.fields,
            images: imageData.images
          }
        }));
      }
    } catch (error) {
        console.error('Error:', error);
      setMessages(prev => prev.filter(msg => msg.isLoading));
        setMessages(prev => [...prev, {
        id: Date.now(),
            text: 'An error occurred while generating the content. Please try again.',
            isBot: true
        }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add function to get stored document data
  const getStoredDocument = (docId) => {
    return documentStorage[docId];
  };

  // Update removeImage function
  const removeImage = (index) => {
    const imageToRemove = previewImages[index];
    
    // Remove from preview and uploaded arrays
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    
    // Remove from storage
    if (imageToRemove?.id) {
      setDocumentStorage(prev => ({
        ...prev,
        [discussionId]: {
          ...prev[discussionId],
          images: prev[discussionId]?.images.filter(img => img.id !== imageToRemove.id) || []
        }
      }));
    }
  };

  // Update ImagePreview component for smaller images
  const ImagePreview = ({ images, onRemove }) => {
    return (
      <div className="flex flex-col gap-4 mt-2 p-2 bg-white rounded-lg border">
        {images.map((image, index) => (
          <div key={index} className="relative group max-w-[200px]">
            <img
              src={image.url}
              alt={image.name}
              className="w-full h-auto object-contain rounded-lg border border-gray-200"
            />
            <button
              onClick={() => onRemove(index)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="text-sm text-gray-600 mt-2">{image.name}</p>
          </div>
        ))}
      </div>
    );
  };

  // Update renderMessage function to show smaller images in chat
  const renderMessage = (message) => {
    if (message.isLoading) {
      return (
        <div key={message.id} className="mb-4 text-left">
          <div className="inline-block p-4 rounded-lg bg-gray-100 text-gray-800 max-w-[90%]">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>{message.text}</span>
                </div>
            </div>
        </div>
      );
    }

    if (message.isContent) {
      return (
        <div key={message.id} className="mb-4 text-left">
          <div className="inline-block p-4 rounded-lg bg-gray-100 text-gray-800 max-w-[90%]">
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.text) }} />
          </div>
        </div>
      );
    }

    const isUserUpload = message.isUserUpload;
    
    return (
      <div
        key={message.id}
        className={`mb-4 ${message.isBot ? 'text-left' : 'text-right'}`}
      >
        <div
          className={`inline-block p-3 rounded-lg ${
            message.isBot
              ? 'bg-gray-100 text-gray-800'
              : 'bg-blue-600 text-white'
          } max-w-[80%]`}
        >
          <div className="whitespace-pre-wrap font-sans">
            {message.text}
          </div>
          {message.images && (
            <div className="flex flex-col gap-4 mt-4">
              {message.images.map((image, index) => (
                <div key={index} className="max-w-[200px]">
                <img
                  src={image.url}
                  alt={`Uploaded ${index + 1}`}
                    className="w-full h-auto object-contain rounded-lg border-2 border-white"
                />
                  <p className="text-sm mt-2 text-gray-200">{image.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderChatMessages = () => {
    return (
      <div className="flex-1 overflow-y-auto p-4" ref={chatContainerRef}>
        {messages.map((message) => renderMessage(message))}
      </div>
    );
  };

  // Update renderChatInput to handle image upload loading state
  const renderChatInput = () => {
    if (isLoading || isImageUploading || isPdfUploading) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (showPdfUpload) {
      return (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Upload PDF report:</p>
          <div className="flex gap-2">
            <label className="flex-1 flex items-center gap-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
              <FileUp className="w-5 h-5 text-gray-600" />
              <span className="text-gray-600">Choose PDF</span>
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={() => setShowPdfUpload(false)}
              className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      );
    }

    if (documentData.currentField === "Images") {
      return (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Upload images:</p>
          <div className="flex gap-2">
            <label className={`flex-1 flex items-center gap-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors ${isImageUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload className="w-5 h-5 text-gray-600" />
              <span className="text-gray-600">Choose Images</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isImageUploading}
              />
            </label>
            {uploadedImages.length > 0 && (
              <button
                onClick={handleImageSubmit}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isImageUploading}
              >
                <Send className="w-5 h-5" />
                <span>Send</span>
              </button>
            )}
          </div>
          {previewImages.length > 0 && (
            <div>
              <ImagePreview images={previewImages} onRemove={removeImage} />
              <p className="text-sm text-gray-500 mt-2">
                {uploadedImages.length} image(s) selected
              </p>
            </div>
          )}
        </div>
      );
    }

    // Regular chat input for other fields
    return (
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    );
  };

  const renderDatePicker = () => {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-600">Select a date:</p>
        <input
          type="date"
          onChange={(e) => {
            const selectedDate = e.target.value;  // Format: YYYY-MM-DD
            const [year, month, day] = selectedDate.split('-');
            const formattedDate = `${day} ${new Date(selectedDate).toLocaleString('default', { month: 'long' })} ${year}`;
            setSelectedDate(formattedDate);
            setShowDatePicker(false);
            setInputMessage(formattedDate);
            handleSendMessage({ preventDefault: () => {} });
          }}
          className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    );
  };

  const handleTogglePanels = () => {
    if (showBothPanels) {
      // If both panels are shown, collapse based on arrow direction
      setShowBothPanels(false);
    } else {
      // If one panel is shown, show both panels
      setShowBothPanels(true);
    }
  };

  // Add useEffect to load stored data from localStorage
  useEffect(() => {
    const storedData = localStorage.getItem('documentStorage');
    if (storedData) {
      setDocumentStorage(JSON.parse(storedData));
    }
  }, []);

  // Update handleGenerateContent function
  const handleGenerateContent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: documentData.type,
          fields: documentData.fields
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: `Error: ${data.error}`,
          isBot: true
        }]);
        return;
      }

      // Process content into pages
      const content = data.content || '';
      const pages = content.split('<div class="page-break"></div>');
      setDocumentContent(pages);
      setTotalPages(pages.length);

      // Generate HTML content for editor
      const editorContent = pages.map((page, index) => `
        <div class="page" style="page-break-after: always;">
          ${page}
        </div>
      `).join('');

      // Update both chat and document panel
      setEditorContent(editorContent);
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "Document has been generated successfully!",
        isBot: true
      }, {
        id: Date.now() + 1,
        text: content,
        isBot: true,
        isContent: true
      }]);

      // Store the complete response for preview
      setPreviewContent(data);
      setWordCount(data.word_count);

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: 'An error occurred while generating the content. Please try again.',
        isBot: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add pagination controls to the editor section
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-4 p-4 border-t bg-white">
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    );
  };

  // Add back the missing functions
  const handleSendMessage = (event) => {
    event.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message to chat
    setMessages(prev => [...prev, {
      id: prev.length + 1,
      text: userMessage,
      isBot: false
    }]);

    // Handle the message flow
    handleDocumentFlow(userMessage);
  };

  const handleDepartmentSelect = (department) => {
    setShowDepartmentOptions(false);
    setInputMessage(department);
    handleSendMessage({ preventDefault: () => {} });
  };

  const handleYearSelect = (year) => {
    setShowYearOptions(false);
    setInputMessage(year);
    handleSendMessage({ preventDefault: () => {} });
  };

  const handleEditorChange = (e) => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      setEditorContent(content);
      
      // Update word count
      const text = editorRef.current.innerText;
      setWordCount(text.trim().split(/\s+/).length);
    }
  };

  const handleEditorKeyDown = (e) => {
    // Remove all key event handling to allow default behavior
    return true;
  };

  const handleFormatClick = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleEditorChange();
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

  // Update the document panel content rendering
  const renderDocumentContent = (content, isPreview = false) => {
    const containerClass = isPreview ? 'preview-container' : 'edit-container';
    
    const documentHeader = `
      <div class="document-header mb-8">
        <!-- Logo -->
        <div class="flex justify-center mb-4 border-b pb-4">
          <img src="${logoUrl}" alt="Company Logo" class="h-16 object-contain" />
        </div>

        <!-- Document Type -->
        <div class="text-center mb-6">
          <h1 class="text-2xl font-bold tracking-wide">GUEST LECTURE REPORT</h1>
        </div>

        <!-- Document Details -->
        <div class="mb-6">
          <table class="w-full">
            <tbody>
              <tr>
                <td class="py-2" style="width: 120px;"><span class="font-semibold">Topic</span></td>
                <td class="py-2" style="width: 300px;">: ${documentData.fields?.Topic || ''}</td>
                <td class="py-2" style="width: 120px;"><span class="font-semibold">Activity Code</span></td>
                <td class="py-2">: ${documentData.fields?.['Activity Code'] || ''}</td>
              </tr>
              <tr>
                <td class="py-2"><span class="font-semibold">Guest</span></td>
                <td class="py-2">: ${documentData.fields?.['Guest Name'] || ''}</td>
                <td class="py-2"><span class="font-semibold">Event Date</span></td>
                <td class="py-2">: ${documentData.fields?.['Event Date'] || ''}</td>
              </tr>
              <tr>
                <td class="py-2"></td>
                <td class="py-2 text-gray-600 pl-6">${documentData.fields?.['Guest Designation'] || ''}</td>
                <td class="py-2"><span class="font-semibold">Coordinator</span></td>
                <td class="py-2">: ${documentData.fields?.['Organizer Faculty Name'] || ''}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Additional Details -->
        <div class="flex justify-between text-sm mb-6">
          <div style="width: 300px;" class="flex">
            <span class="font-semibold" style="width: 120px;">Department</span>
            <span>: ${documentData.fields?.['Organizer Department'] || ''}</span>
          </div>
          <div style="width: 250px;" class="flex">
            <span class="font-semibold" style="width: 120px;">Year</span>
            <span>: ${documentData.fields?.Year || ''}</span>
          </div>
          <div style="width: 300px;" class="flex">
            <span class="font-semibold" style="width: 180px;">Expected Participants</span>
            <span>: ${documentData.fields?.['No Of Count'] || ''}</span>
          </div>
        </div>

        <!-- Divider -->
        <hr class="border-t-2 border-gray-300 mb-6">
      </div>
    `;

    return (
      <div className={`${containerClass} w-full min-h-[500px] p-8 border rounded-lg bg-white prose max-w-none`}>
        {/* Static Header Section */}
        <div dangerouslySetInnerHTML={{ 
          __html: DOMPurify.sanitize(documentHeader, {
            ADD_TAGS: ['img', 'table', 'tbody', 'tr', 'td', 'style'],
            ADD_ATTR: ['src', 'alt', 'class', 'style', 'width']
          })
        }} />
        
        {/* Content Section */}
        <div className="mt-8">
          {isPreview ? (
            <div 
              className="min-h-[500px] prose max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(content || '', {
                  ADD_TAGS: ['img', 'div'],
                  ADD_ATTR: ['src', 'alt', 'class', 'style']
                })
              }} 
            />
          ) : (
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning={true}
              className="min-h-[500px] outline-none prose max-w-none text-base"
              style={{
                fontFamily: selectedFormat.fontFamily,
                fontSize: selectedFormat.fontSize,
                border: 'none',
                background: 'transparent',
                padding: '0',
                lineHeight: '1.6'
              }}
              onInput={handleEditorChange}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>
      </div>
    );
  };

  // Add new function to handle PDF upload
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.includes('pdf')) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: 'Please upload a valid PDF file.',
        isBot: true
      }]);
      return;
    }

    setIsPdfUploading(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await fetch('http://localhost:8000/api/extract-pdf', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Update document data with extracted content
      setDocumentData(prev => ({
        ...prev,
        type: 'GuestLecture',
        fields: {
          ...data.fields,
        }
      }));

      // Update editor content
      setEditorContent(data.content);
      setDocumentContent([data.content]);
      setTotalPages(1);
      setCurrentPage(1);

      setMessages(prev => [...prev, {
        id: Date.now(),
        text: 'PDF content extracted successfully! You can now edit the content in the document editor.',
        isBot: true
      }]);

      // Switch to editor mode
      setIsEditing(true);
      setShowPdfUpload(false);

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: 'An error occurred while extracting PDF content. Please try again.',
        isBot: true
      }]);
    } finally {
      setIsPdfUploading(false);
    }
  };

  // Add PDF upload button to the document header
  const renderDocumentHeader = () => {
    return (
      <div className="p-4 bg-white border-b flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-gray-600" />
          <span className="font-medium">Document Editor</span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowPdfUpload(true)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <FileUp className="w-4 h-4" />
            <span>Upload PDF</span>
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            {isEditing ? (
              <>
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </>
            )}
          </button>
          <button 
            onClick={generatePDF}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-100">
      <div className="h-full relative" ref={containerRef}>
        <div className="flex h-full">
          {/* Chat section - Always on left */}
          <div 
            className={`${
              !showBothPanels && arrowDirection === 'left' ? 'w-0' : showBothPanels ? 'w-1/2' : 'w-full'
            } transition-all duration-300 ease-in-out border-r flex flex-col bg-gray-50 overflow-hidden`}
          >
            {renderChatMessages()}
            <div className="p-4 border-t bg-white">
              {showDepartmentOptions ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Select a department:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DEPARTMENTS.map((dept) => (
                      <button
                        key={dept}
                        onClick={() => handleDepartmentSelect(dept)}
                        className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>
              ) : showYearOptions ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Select a year:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {YEARS.map((year) => (
                      <button
                        key={year}
                        onClick={() => handleYearSelect(year)}
                        className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              ) : showDatePicker ? (
                renderDatePicker()
              ) : (
                renderChatInput()
              )}
            </div>
          </div>

          {/* Toggle Button */}
          <button
            onClick={handleTogglePanels}
            className={`absolute top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-all duration-300 ${
              showBothPanels 
                ? 'left-1/2 -translate-x-1/2' 
                : arrowDirection === 'right'
                  ? 'right-0 translate-x-[50%]'
                  : 'left-0 translate-x-[-50%]'
            }`}
          >
            {showBothPanels ? (
              arrowDirection === 'right' ? (
                <ChevronRight className="w-6 h-6 text-gray-600" />
              ) : (
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              )
            ) : (
              arrowDirection === 'right' ? (
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              ) : (
                <ChevronRight className="w-6 h-6 text-gray-600" />
              )
            )}
          </button>

          {/* Editor and Preview section - Always on right */}
          <div 
            className={`${
              !showBothPanels && arrowDirection === 'right' ? 'w-0' : showBothPanels ? 'w-1/2' : 'w-full'
            } transition-all duration-300 ease-in-out flex flex-col bg-gray-100 overflow-hidden`}
          >
            {renderDocumentHeader()}
            <div className="flex-1 overflow-y-auto">
              {isEditing ? (
                <>
                  <EditorToolbar onFormatClick={handleFormatClick} />
                  <div className="p-8">
                    {renderDocumentContent(editorContent)}
                  </div>
                </>
              ) : (
                <div className="p-8">
                  {renderDocumentContent(documentContent[currentPage - 1], true)}
                  {renderPagination()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentGenerate; 