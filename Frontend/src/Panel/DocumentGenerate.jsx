import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Send, Download, Bold, Italic, Image, List, 
  ListOrdered, Link as LinkIcon, Heading1, Heading2,
  AlignLeft, AlignCenter, AlignRight, Underline,
  Type, Quote, Code, Eye, Edit, Calendar, Upload, X,
  ChevronLeft, ChevronRight
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

  // Add new state for discussion ID
  const [discussionId, setDiscussionId] = useState(null);
  const [documentStorage, setDocumentStorage] = useState({});

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
11. Guest Lecture`;

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

  // Update handleImageSubmit function
  const handleImageSubmit = () => {
    if (uploadedImages.length === 0) return;

    try {
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

      // Save document data to localStorage only
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
          },
          {
            id: prev.length + 2,
            text: "Images uploaded and stored successfully.",
            isBot: true
          }
        ]);

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
      console.error('Error saving document:', error);
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: "There was an error saving the document. Please try again.",
        isBot: true
      }]);
    }
  };

  // Update useEffect for discussion ID
  useEffect(() => {
    try {
      const currentData = loadDocumentsData();
      const newDocumentId = currentData.lastDocumentId + 1;
      const newDiscussionId = `DOC_${String(newDocumentId).padStart(3, '0')}`;
      setDiscussionId(newDiscussionId);
      
      // Update lastDocumentId and save
      const updatedData = {
        ...currentData,
        lastDocumentId: newDocumentId
      };
      
      saveDocument(updatedData);
    } catch (error) {
      console.error('Error managing document ID:', error);
      const fallbackId = `DOC_${Date.now()}`;
      setDiscussionId(fallbackId);
    }
  }, []);

  const handleEditorChange = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      setEditorContent(content);
      // Update word count
      const text = editorRef.current.innerText;
      setWordCount(text.trim().split(/\s+/).length);
    }
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

  const handleDocumentFlow = async (message) => {
    if (!documentData.type) {
      const messageLower = message.toLowerCase().trim();
      
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
        [documentData.currentField]: message
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
        // Generate document content with a better format
        const content = `
          <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: 'Times New Roman', Times, serif;">
            <!-- Header with College Logo Placeholder -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="font-size: 24px; font-weight: bold; color: #1a365d; margin-bottom: 10px;">MUTHAYAMMAL ENGINEERING COLLEGE</div>
              <div style="font-size: 14px; color: #4a5568; margin-bottom: 5px;">(An Autonomous Institution)</div>
              <div style="font-size: 14px; color: #4a5568; margin-bottom: 5px;">Rasipuram - 637 408, Namakkal Dist., Tamil Nadu</div>
              <div style="width: 100%; height: 2px; background-color: #1a365d; margin: 15px 0;"></div>
            </div>

            <!-- Department Header -->
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="font-size: 18px; font-weight: bold; color: #2d3748;">Department of ${documentData.fields["Organizer Department"]}</div>
              <div style="font-size: 20px; font-weight: bold; color: #1a365d; margin-top: 10px;">GUEST LECTURE DETAILS</div>
            </div>

            <!-- Content Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <tbody>
                <tr>
                  <td style="padding: 8px; border: 1px solid #e2e8f0; width: 40%;"><strong>Name of the Guest</strong></td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;">${documentData.fields["Guest Name"]}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Designation</strong></td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;">${documentData.fields["Guest Designation"]}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Topic</strong></td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;">${documentData.fields["Topic"]}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Date</strong></td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;">${documentData.fields["Event Date"]}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Activity Code</strong></td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;">${documentData.fields["Activity Code"]}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Target Audience</strong></td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;">${documentData.fields["Year"]}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Expected No. of Participants</strong></td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;">${documentData.fields["No Of Count"]}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Faculty Coordinator</strong></td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;">${documentData.fields["Organizer Faculty Name"]}</td>
                </tr>
              </tbody>
            </table>

            <!-- Signature Section -->
            <div style="display: flex; justify-content: space-between; margin-top: 50px;">
              <div style="text-align: center;">
                <div style="margin-bottom: 30px;">____________________</div>
                <div>Faculty Coordinator</div>
              </div>
              <div style="text-align: center;">
                <div style="margin-bottom: 30px;">____________________</div>
                <div>HoD/${documentData.fields["Organizer Department"]}</div>
              </div>
              <div style="text-align: center;">
                <div style="margin-bottom: 30px;">____________________</div>
                <div>Principal</div>
              </div>
            </div>
          </div>
        `;
        
        setEditorContent(content);
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          text: "Document has been generated. You can now edit or export it.",
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
      if (documentData.currentField?.type === 'image') {
        // Add images to messages
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          text: 'Images uploaded successfully:',
          images: previewImages,
          isBot: false
        }]);
        
        // Move to next field
        setDocumentData(prev => ({
          ...prev,
          images: uploadedImages
        }));
        
        // Bot response
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          text: "Thank you! All information has been collected. You can now generate the document.",
          isBot: true
        }]);
      } else {
        // ... existing message handling code ...
      }
    }

    // When handling image upload completion
    if (documentData.currentField === "Images" && uploadedImages.length > 0) {
      const documentJson = {
        discussionId,
        type: documentData.type,
        fields: documentData.fields,
        images: previewImages.map(img => ({
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

      // Add success message to chat
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: "Images uploaded and stored successfully.",
        isBot: true
      }]);
    }
  };

  // Update handleImageUpload function
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
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

  // Image preview component
  const ImagePreview = ({ images, onRemove }) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2 p-2 bg-white rounded-lg border">
        {images.map((image, index) => (
          <div key={index} className="relative group">
            <img
              src={image.url}
              alt={image.name}
              className="w-20 h-20 object-cover rounded-lg border border-gray-200"
            />
            <button
              onClick={() => onRemove(index)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  // Update renderMessage function to fix alignment
  const renderMessage = (message) => {
    const isUserUpload = message.isUserUpload;
    
    return (
      <div
        key={message.id}
        className={`mb-4 ${message.isBot ? 'text-left' : isUserUpload ? 'text-right' : 'text-right'}`}
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
            <div className="flex flex-wrap gap-2 mt-2">
              {message.images.map((image, index) => (
                <img
                  key={index}
                  src={image.url}
                  alt={`Uploaded ${index + 1}`}
                  className="w-24 h-24 object-cover rounded-lg border-2 border-white"
                />
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

  const renderChatInput = () => {
    if (documentData.currentField === "Images") {
      return (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Upload images:</p>
          <div className="flex gap-2">
            <label className="flex-1 flex items-center gap-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
              <Upload className="w-5 h-5 text-gray-600" />
              <span className="text-gray-600">Choose Images</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {uploadedImages.length > 0 && (
              <button
                onClick={handleImageSubmit}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
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
        />
        <button
          type="submit"
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
            <div className="p-4 bg-white border-b flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Document Editor</span>
              </div>
              <div className="flex space-x-2">
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

            <div className="flex-1 overflow-y-auto">
              {isEditing ? (
                <>
                  <EditorToolbar onFormatClick={handleFormatClick} />
                  <div className="p-8">
                    <div
                      ref={editorRef}
                      contentEditable
                      className="w-full h-full min-h-[500px] p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      style={{
                        fontFamily: selectedFormat.fontFamily,
                        fontSize: selectedFormat.fontSize
                      }}
                      onInput={handleEditorChange}
                    />
                  </div>
                </>
              ) : (
                <div className="p-8">
                  <div 
                    className="w-full min-h-[500px] p-4 border rounded-lg bg-white"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editorContent) }}
                  />
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