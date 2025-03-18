import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, X, Send, Download, Bold, Italic, Image, List, 
  ListOrdered, Link as LinkIcon, Heading1, Heading2,
  AlignLeft, AlignCenter, AlignRight, Underline,
  Type, Quote, Code, Eye, Edit, Maximize2, Minimize2, Calendar, Upload
} from 'lucide-react';
import DOMPurify from 'dompurify';
import jsPDF from "jspdf";
import "jspdf-autotable";

export const DocumentGenerateModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isEditing, setIsEditing] = useState(true);
  const editorRef = useRef(null);
  const [editorContent, setEditorContent] = useState('');
  const [selectedFormat, setSelectedFormat] = useState({
    fontSize: '16px',
    fontFamily: 'Arial'
  });
  const [isFullPage, setIsFullPage] = useState(false);
  const modalRef = useRef(null);
  const chatContainerRef = useRef(null);

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

  // Remove initial preview template
  const [previewTemplate, setPreviewTemplate] = useState('');

  // Add state for images
  const [uploadedImages, setUploadedImages] = useState([]);
  const fileInputRef = useRef(null);

  // Add new state for preview content and word count
  const [previewContent, setPreviewContent] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Initialize chat with greeting when component mounts
  useEffect(() => {
    if (messages.length === 0 && isOpen) {
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
    }
  }, [isOpen, messages.length]);

  // Add auto-scroll effect
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle year selection
  const handleYearSelect = (year) => {
    setShowYearOptions(false);
    setInputMessage(year);
    const event = new Event('submit');
    event.preventDefault = () => {};
    handleSendMessage(event);
  };

  // Handle document flow
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
        setDocumentData(prev => ({
          ...prev,
          type: selectedType,
          currentField: selectedType === "GuestLecture" ? "Guest Name" : null,
          fields: {}
        }));

        // Add bot response based on document type
        const botResponses = {
          "Minutes": "Please provide the date of the meeting.",
          "MasterList": "Please select the department.",
          "SubjectAllocation": "Please select the department.",
          "StaffRequirement": "Please select the department.",
          "LabManual": "Please select the department.",
          "Experiments": "Please select the department.",
          "Workload": "Please select the department.",
          "IndividualTT": "Please select the department.",
          "MasterTT": "Please select the department.",
          "CoachingTT": "Please select the department.",
          "GuestLecture": "Please enter the name of the guest lecturer:"
        };

        setMessages(prev => [...prev, {
          id: prev.length + 1,
          text: botResponses[selectedType],
          isBot: true
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          text: "I didn't understand that. Please select a number from 1-11 or type the document name.",
          isBot: true
        }]);
      }
    } else if (documentData.type === "GuestLecture") {
      // Store the current field's value
      setDocumentData(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          [prev.currentField]: message
        }
      }));

      // Define the field sequence
      const fieldSequence = [
        "Guest Name",
        "Guest Designation",
        "Topic",
        "Event Date",
        "Year",
        "No Of Count",
        "Organizer Department",
        "Organizer Faculty Name"
      ];

      // Find current field index
      const currentIndex = fieldSequence.indexOf(documentData.currentField);

      // Move to next field
      if (currentIndex < fieldSequence.length - 1) {
        const nextField = fieldSequence[currentIndex + 1];
        setDocumentData(prev => ({
          ...prev,
          currentField: nextField
        }));

        // Special handling for different fields
        switch (nextField) {
          case "Event Date":
            setShowDatePicker(true);
            setMessages(prev => [...prev, {
              id: prev.length + 1,
              text: "Please select the event date:",
              isBot: true
            }]);
            break;
          case "Year":
            setShowYearOptions(true);
            setMessages(prev => [...prev, {
              id: prev.length + 1,
              text: "Please select the year:",
              isBot: true
            }]);
            break;
          case "Organizer Department":
            setShowDepartmentOptions(true);
            setMessages(prev => [...prev, {
              id: prev.length + 1,
              text: "Please select the department:",
              isBot: true
            }]);
            break;
          default:
            setMessages(prev => [...prev, {
              id: prev.length + 1,
              text: `Please enter the ${nextField}:`,
              isBot: true
            }]);
        }
      } else {
        // Generate the final document and redirect to the document page
        const generatedContent = await generateGuestLectureDocument(documentData.fields);
        
        // Store the document data in localStorage for the new page
        localStorage.setItem('documentData', JSON.stringify({
          type: documentData.type,
          fields: documentData.fields,
          content: generatedContent
        }));
        
        // Reset document data
        setDocumentData({
          type: null,
          currentField: null,
          fields: {}
        });
        
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          text: "Document has been generated. Opening in new page...",
          isBot: true
        }]);

        // Close the modal
        onClose();

        // Navigate to the document page
        navigate('/document');
      }
    }
  };

  // Handle sending messages
  const handleSendMessage = async (event) => {
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
    await handleDocumentFlow(userMessage);
  };

  const applyFormatting = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleEditorChange();
  };

  // Add auto-scroll effect
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const generateGuestLectureDocument = async (fields) => {
    try {
      // First, get the document preview without images
      const previewResponse = await fetch('http://localhost:8000/api/preview-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: "Guest Lecture",
          fields: fields
        }),
      });

      if (!previewResponse.ok) {
        throw new Error('Failed to generate document preview');
      }

      const previewData = await previewResponse.json();
      setPreviewContent(previewData.content);
      setWordCount(previewData.word_count);
      setIsPreviewMode(true);

      // Format the content for display
      const formattedContent = `
        <div class="document-container max-w-4xl mx-auto p-8 bg-white shadow-lg">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-4">Guest Lecture Report</h1>
            <p class="text-xl text-gray-600">Department of ${fields["Organizer Department"]}</p>
            <p class="text-sm text-gray-500 mt-2">Word Count: ${previewData.word_count}</p>
          </div>

          <div class="mb-8">
            <div class="bg-gray-50 p-6 rounded-lg mb-6">
              <h2 class="text-2xl font-bold mb-2">${fields["Guest Name"]}</h2>
              <p class="text-xl text-gray-600 mb-4">${fields["Guest Designation"]}</p>
              <p class="text-lg font-semibold">Topic:</p>
              <p class="text-gray-800 text-lg mb-4">${fields["Topic"]}</p>
            </div>

            <div class="grid grid-cols-2 gap-6 mb-6">
              <div class="bg-gray-50 p-4 rounded-lg">
                <h3 class="font-semibold mb-2">Event Details</h3>
                <p><strong>Date:</strong> ${fields["Event Date"]}</p>
                <p><strong>Activity Code:</strong> ${fields["Activity Code"]}</p>
                <p><strong>Target Audience:</strong> ${fields["Year"]} students</p>
                <p><strong>Expected Attendance:</strong> ${fields["No Of Count"]} students</p>
              </div>
              <div class="bg-gray-50 p-4 rounded-lg">
                <h3 class="font-semibold mb-2">Contact Information</h3>
                <p><strong>Faculty Coordinator:</strong> ${fields["Organizer Faculty Name"]}</p>
                <p><strong>Department:</strong> ${fields["Organizer Department"]}</p>
              </div>
            </div>
          </div>

          <div class="mt-8 prose max-w-none">
            <div class="generated-content">
              ${previewData.content}
            </div>
          </div>

          ${uploadedImages.length > 0 ? `
            <div class="mt-8">
              <h3 class="text-xl font-bold mb-4">Attached Images</h3>
              <div class="grid grid-cols-2 gap-4">
                ${uploadedImages.map((image, index) => `
                  <div class="relative">
                    <img src="${image}" class="w-full h-auto rounded-lg shadow-md" alt="Uploaded image ${index + 1}" />
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="mt-8 text-center text-gray-600 border-t pt-4">
            <p>For registration and queries, please contact:</p>
            <p>${fields["Organizer Faculty Name"]}</p>
            <p>Department of ${fields["Organizer Department"]}</p>
          </div>
        </div>
      `;

      setEditorContent(formattedContent);
      return formattedContent;

    } catch (error) {
      console.error('Error generating document:', error);
      return `
        <div class="document-section text-red-600">
          <p>Error generating document. Please try again.</p>
          <p>Error details: ${error.message}</p>
        </div>
      `;
    }
  };

  // Add a function to handle final document generation with images
  const handleFinalGeneration = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/generate-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: "Guest Lecture",
          fields: documentData.fields,
          images: uploadedImages
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate final document');
      }

      const data = await response.json();
      setEditorContent(data.content);
      setIsPreviewMode(false);
      return data.content;
    } catch (error) {
      console.error('Error generating final document:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Update the editor's content when switching to edit mode
    if (isEditing && editorRef.current) {
      editorRef.current.innerHTML = editorContent;
    }
  }, [isEditing, editorContent]);

  const handleEditorChange = () => {
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
    }
  };

  const sendMessageToBackend = async (message) => {
    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          message: message
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error:', error);
      return `Error: ${error.message}`;
    }
  };

  // Update handleImageUpload to show images in chat
  const handleImageUpload = async (event) => {
    try {
      const files = Array.from(event.target.files);
      
      // Validate file types and sizes
      const validFiles = files.filter(file => {
        const isValidType = file.type.startsWith('image/');
        const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
        
        if (!isValidType) {
          alert(`${file.name} is not a valid image file`);
        }
        if (!isValidSize) {
          alert(`${file.name} is too large. Maximum size is 5MB`);
        }
        
        return isValidType && isValidSize;
      });

      const newImages = await Promise.all(
        validFiles.map(async (file) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
          });
        })
      );

      if (newImages.length > 0) {
        setUploadedImages(prev => [...prev, ...newImages]);
        
        // Add images to chat as a message
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            text: 'Uploaded Images:',
            isBot: false,
            images: newImages
          }
        ]);
      }
      
      // Clear the input
      event.target.value = '';
      
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    }
  };

  // Add this function to remove images
  const removeImage = (indexToRemove) => {
    setUploadedImages(uploadedImages.filter((_, index) => index !== indexToRemove));
  };

  // Add this function to handle PDF generation
  const generatePDF = async () => {
    const documentDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      header: {
        image: window.origin + '/assets/img/fxmain.png',
        width: 150,
        alignment: 'center',
        margin: [0, 10]
      },
      footer: function(currentPage, pageCount) { 
        return {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: 'center',
          margin: [0, 10]
        };
      },
      content: [
        {
          text: documentData.fields["Topic"],
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 20]
        },
        {
          columns: [
            {
              width: '*',
              text: [
                { text: 'Guest Speaker:\n', style: 'subheader' },
                { text: documentData.fields["Guest Name"], style: 'normalText' },
                { text: '\n' + documentData.fields["Guest Designation"], style: 'italicText' }
              ]
            },
            {
              width: '*',
              text: [
                { text: 'Event Details:\n', style: 'subheader' },
                { text: 'Date: ' + documentData.fields["Event Date"], style: 'normalText' },
                { text: '\nVenue: Department Seminar Hall', style: 'normalText' }
              ]
            }
          ],
          columnGap: 20,
          margin: [0, 0, 0, 20]
        },
        {
          text: 'Event Overview',
          style: 'sectionHeader',
          margin: [0, 0, 0, 10]
        },
        {
          text: editorContent.replace(/<[^>]+>/g, ''),
          style: 'normalText',
          margin: [0, 0, 0, 20]
        }
      ],
      styles: {
        header: {
          fontSize: 24,
          bold: true,
          color: '#1a237e'
        },
        subheader: {
          fontSize: 14,
          bold: true,
          margin: [0, 10, 0, 5]
        },
        sectionHeader: {
          fontSize: 16,
          bold: true,
          color: '#283593',
          margin: [0, 15, 0, 10]
        },
        normalText: {
          fontSize: 12,
          lineHeight: 1.4
        },
        italicText: {
          fontSize: 12,
          italics: true,
          color: '#455a64'
        }
      }
    };

    // Add images if available
    if (uploadedImages.length > 0) {
      // Add a page break before images
      documentDefinition.content.push({
        text: 'Event Documentation',
        style: 'sectionHeader',
        pageBreak: 'before'
      });

      // Add images in a grid layout
      const imagesPerRow = 2;
      for (let i = 0; i < uploadedImages.length; i += imagesPerRow) {
        const rowImages = uploadedImages.slice(i, i + imagesPerRow);
        const imageWidth = 250; // Adjust based on your needs

        documentDefinition.content.push({
          columns: rowImages.map(image => ({
            image: image,
            width: imageWidth,
            margin: [0, 5, 10, 5]
          })),
          columnGap: 10,
          margin: [0, 10]
        });
      }

      // Add image captions if needed
      documentDefinition.content.push({
        text: `Total ${uploadedImages.length} image${uploadedImages.length > 1 ? 's' : ''} from the event`,
        style: 'italicText',
        alignment: 'center',
        margin: [0, 10]
      });
    }

    // Add coordinator information at the end
    documentDefinition.content.push({
      text: '\n\nFaculty Coordinator',
      style: 'subheader',
      alignment: 'right'
    });
    documentDefinition.content.push({
      text: documentData.fields["Organizer Faculty Name"],
      style: 'normalText',
      alignment: 'right'
    });
    documentDefinition.content.push({
      text: `Department of ${documentData.fields["Organizer Department"]}`,
      style: 'normalText',
      alignment: 'right'
    });

    try {
      window.pdfMake.createPdf(documentDefinition).open();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const EditorToolbar = () => {
    return (
      <div className="flex items-center space-x-2 p-2 bg-gray-100 border-b">
        <div className="flex items-center gap-2 border-r pr-2">
          <select 
            className="p-1 border rounded"
            onChange={(e) => {
              setSelectedFormat(prev => ({ ...prev, fontFamily: e.target.value }));
              applyFormatting('fontName', e.target.value);
            }}
          >
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
          </select>
          <select 
            className="p-1 border rounded"
            onChange={(e) => {
              setSelectedFormat(prev => ({ ...prev, fontSize: e.target.value }));
              applyFormatting('fontSize', e.target.value.replace('px', ''));
            }}
          >
            {[12, 14, 16, 18, 20, 24, 28, 32].map(size => (
              <option key={size} value={`${size}px`}>{size}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2 border-r pr-2">
          <button onClick={() => applyFormatting('bold')} className="p-2 hover:bg-gray-200 rounded" title="Bold">
            <Bold className="w-4 h-4" />
          </button>
          <button onClick={() => applyFormatting('italic')} className="p-2 hover:bg-gray-200 rounded" title="Italic">
            <Italic className="w-4 h-4" />
          </button>
          <button onClick={() => applyFormatting('underline')} className="p-2 hover:bg-gray-200 rounded" title="Underline">
            <Underline className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-2 border-r pr-2">
          <button onClick={() => applyFormatting('justifyLeft')} className="p-2 hover:bg-gray-200 rounded" title="Align Left">
            <AlignLeft className="w-4 h-4" />
          </button>
          <button onClick={() => applyFormatting('justifyCenter')} className="p-2 hover:bg-gray-200 rounded" title="Align Center">
            <AlignCenter className="w-4 h-4" />
          </button>
          <button onClick={() => applyFormatting('justifyRight')} className="p-2 hover:bg-gray-200 rounded" title="Align Right">
            <AlignRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-2 border-r pr-2">
          <button onClick={() => applyFormatting('insertUnorderedList')} className="p-2 hover:bg-gray-200 rounded" title="Bullet List">
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => applyFormatting('insertOrderedList')} className="p-2 hover:bg-gray-200 rounded" title="Numbered List">
            <ListOrdered className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const url = prompt('Enter URL:', 'https://');
              if (url) applyFormatting('createLink', url);
            }} 
            className="p-2 hover:bg-gray-200 rounded" 
            title="Insert Link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
        </div>
        
        <div className="relative">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            multiple
            className="hidden"
            id="image-upload"
          />
          <label 
            htmlFor="image-upload"
            className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded hover:bg-gray-50 cursor-pointer"
            title="Upload Images"
          >
            <Upload size={16} />
            <span>Upload Images</span>
          </label>
        </div>

        {/* Preview uploaded images */}
        {uploadedImages.length > 0 && (
          <div className="mt-4 p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Uploaded Images:</h4>
            <div className="grid grid-cols-2 gap-4">
              {uploadedImages.map((image, index) => (
                <div key={index} className="relative">
                  <img 
                    src={image} 
                    alt={`Uploaded ${index + 1}`} 
                    className="w-full h-40 object-cover rounded"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add preview mode toggle */}
        {previewContent && (
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="p-2 hover:bg-gray-200 rounded"
            title={isPreviewMode ? "Edit Document" : "Preview Document"}
          >
            {isPreviewMode ? <Edit size={20} /> : <Eye size={20} />}
          </button>
        )}
        
        {/* Add word count display */}
        {wordCount > 0 && (
          <span className="ml-auto text-sm text-gray-600">
            Words: {wordCount}
          </span>
        )}
      </div>
    );
  };

  const handleExport = () => {
    const doc = new jsPDF();
    
    doc.setFont("Arial", "normal");
    doc.setFontSize(12);
    
    const content = editorRef.current?.innerText || '';
    const lines = doc.splitTextToSize(content, 180);
    doc.text(lines, 10, 10);
    
    doc.save("document.pdf");
  };

  const toggleFullPage = () => {
    setIsFullPage(!isFullPage);
  };

  const handleDepartmentSelect = (department) => {
    setShowDepartmentOptions(false);
    setInputMessage(department);
    handleSendMessage(new Event('submit'));
  };

  const handleDateSelect = (date) => {
    if (!date) return;
    setSelectedDate(date);
    setShowDatePicker(false);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    setInputMessage(formattedDate);
    const event = new Event('submit');
    event.preventDefault = () => {};
    handleSendMessage(event);
  };

  // Date picker section
  const renderDatePicker = () => (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">Select a date:</p>
      <input
        type="date"
        value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
        onChange={(e) => {
          const date = new Date(e.target.value);
          handleDateSelect(date);
        }}
        min={new Date().toISOString().split('T')[0]}
        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  // Update the chat input section with image upload button
  const renderChatInput = () => (
    <form onSubmit={handleSendMessage} className="flex items-center space-x-2 p-4 border-t bg-white">
      <div className="relative flex-1 flex items-center">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          className="w-full p-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          multiple
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute right-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          title="Upload Images"
        >
          <Image className="w-5 h-5" />
        </button>
      </div>
      <button 
        type="submit"
        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Send className="w-5 h-5" />
      </button>
    </form>
  );

  // Update the message rendering to show images
  const renderMessage = (message) => (
    <div
      key={message.id}
      className={`flex ${message.isBot ? 'justify-start' : 'justify-end'} mb-4`}
    >
      <div
        className={`rounded-lg p-3 max-w-[80%] ${
          message.isBot ? 'bg-gray-100' : 'bg-blue-100'
        }`}
      >
        <p className="text-sm mb-2">{message.text}</p>
        {message.images && (
          <div className="grid grid-cols-2 gap-2">
            {message.images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`Uploaded ${index + 1}`}
                  className="w-full h-32 object-cover rounded"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full 
                    opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      <div className={`fixed inset-0 z-50 ${isFullPage ? '' : 'bg-black bg-opacity-50 flex items-center justify-center'}`}>
        <div 
          ref={modalRef}
          className={`bg-gray-100 rounded-lg shadow-xl flex flex-col ${
            isFullPage 
              ? 'fixed inset-0 rounded-none' 
              : 'w-11/12 h-[90vh]'
          }`}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b bg-white rounded-t-lg">
            <h2 className="text-xl font-semibold">Document Generation</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullPage}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title={isFullPage ? "Exit full page" : "Full page"}
              >
                {isFullPage ? (
                  <Minimize2 className="w-5 h-5 text-gray-600" />
                ) : (
                  <Maximize2 className="w-5 h-5 text-gray-600" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className={`flex flex-1 overflow-hidden ${
            isFullPage ? 'h-[calc(100vh-4rem)]' : ''
          }`}>
            {/* Chat section */}
            <div className="w-1/3 border-r flex flex-col bg-gray-50">
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4"
              >
                {messages.map(message => renderMessage(message))}
              </div>

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

            {/* Editor and Preview section */}
            <div className="flex-1 flex flex-col bg-gray-100">
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
                    <EditorToolbar />
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

              <div className="flex justify-end gap-2 p-4 border-t">
                <button
                  onClick={generatePDF}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                    flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Generate PDF
                </button>
                </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DocumentGenerateModal;
