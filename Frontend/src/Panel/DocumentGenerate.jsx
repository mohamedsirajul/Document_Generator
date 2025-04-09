import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Send, Download, Bold, Italic, Image, List, 
  ListOrdered, Link as LinkIcon, Heading1, Heading2,
  AlignLeft, AlignCenter, AlignRight, Underline,
  Type, Quote, Code, Eye, Edit, Calendar, Upload, X,
  ChevronLeft, ChevronRight, FileUp, Save
} from 'lucide-react';
import DOMPurify from 'dompurify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import jsPDF from "jspdf";
import "jspdf-autotable";
import Joyride, { STATUS } from 'react-joyride';

// Add a mapping of CSS-safe names to display names
const fontNameMap = {
  'Arial': 'Arial',
  'TimesNewRoman': 'Times New Roman',
  'Calibri': 'Calibri',
  'Georgia': 'Georgia',
  'Verdana': 'Verdana', 
  'Roboto': 'Roboto',
  'OpenSans': 'Open Sans',
  'Montserrat': 'Montserrat',
  'Lato': 'Lato',
  'Mirza': 'Mirza'
};

// Custom Quill editor component with font whitelist
const CustomQuillEditor = React.forwardRef((props, ref) => {
  const editorRef = useRef(null);
  
  useEffect(() => {
    if (editorRef.current) {
      // Initialize Quill and set up fonts
      const editor = editorRef.current.getEditor();
      if (editor) {
        try {
          // Access Quill through ReactQuill
          const Quill = ReactQuill.Quill;
          
          // Properly extend the font attributor
          const FontAttributor = Quill.import('attributors/class/font');
          FontAttributor.whitelist = Object.keys(fontNameMap);
          Quill.register(FontAttributor, true);
          
          // Create a custom font style tag
          const styleEl = document.createElement('style');
          styleEl.setAttribute('data-quill-font-styles', 'true');
          
          // Generate CSS for all fonts with proper display in the dropdown
          let fontStyles = '';
          
          // Add styles for dropdown appearance
          Object.entries(fontNameMap).forEach(([className, fontFamily]) => {
            // Style for the font in the editor
            fontStyles += `.ql-font-${className} { font-family: '${fontFamily}', sans-serif; }\n`;
            
            // Style for the font in the dropdown
            fontStyles += `.ql-picker.ql-font .ql-picker-item[data-value="${className}"] { font-family: '${fontFamily}', sans-serif; }\n`;
          });
          
          // Add styles for the currently selected font in the toolbar
          fontStyles += `.ql-picker.ql-font .ql-picker-label[data-value="Arial"]::before { content: 'Arial'; }\n`;
          
          Object.entries(fontNameMap).forEach(([className, fontFamily]) => {
            fontStyles += `.ql-picker.ql-font .ql-picker-label[data-value="${className}"]::before { content: '${fontFamily}'; font-family: '${fontFamily}', sans-serif; }\n`;
            fontStyles += `.ql-picker.ql-font .ql-picker-item[data-value="${className}"]::before { content: '${fontFamily}'; font-family: '${fontFamily}', sans-serif; }\n`;
          });
          
          styleEl.innerHTML = fontStyles;
          document.head.appendChild(styleEl);
          
          // Log success if fonts are registered
          console.log('Custom fonts registered:', FontAttributor.whitelist);
        } catch (err) {
          console.error('Error registering fonts:', err);
        }
      }
    }
    
    // Cleanup function
    return () => {
      // Remove style element if it exists
      const styleEl = document.querySelector('style[data-quill-font-styles]');
      if (styleEl) {
        document.head.removeChild(styleEl);
      }
    };
  }, []);
  
  // Forward the ref to parent component with extended methods
  React.useImperativeHandle(ref, () => ({
    getEditor: () => editorRef.current ? editorRef.current.getEditor() : null,
    focus: () => {
      if (editorRef.current) {
        const editor = editorRef.current.getEditor();
        if (editor) {
          editor.focus();
          // Don't set the cursor at the end when focusing
        }
      }
    }
  }));
  
  // Create a custom toolbar
  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': Object.keys(fontNameMap) }],
        // [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
      ]
    },
    clipboard: {
      matchVisual: false,
    }
  };
  
  return (
    <ReactQuill
      ref={editorRef}
      theme="snow"
      {...props}
      modules={modules}
      formats={[
        'header',
        'font',
        'size',
        'bold', 'italic', 'underline', 'strike',
        'list', 'bullet',
        'align',
        'link', 'image'
      ]}
    />
  );
});

// Editor Toolbar Component
const EditorToolbar = ({ onFormatClick, selectedFormat, onFormatChange }) => {
  const fonts = [
    { label: 'Arial', value: 'Arial' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Calibri', value: 'Calibri' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Verdana', value: 'Verdana' },
    { label: 'Roboto', value: 'Roboto' },
    { label: 'Open Sans', value: 'Open Sans' },
    { label: 'Montserrat', value: 'Montserrat' },
    { label: 'Lato', value: 'Lato' }
  ];

  const fontSizes = [
    { label: 'Small', value: '12px' },
    { label: 'Normal', value: '16px' },
    { label: 'Large', value: '20px' },
    { label: 'Extra Large', value: '24px' }
  ];

  return (
    <div className="p-2 border-b bg-white flex flex-wrap gap-2 items-center">
      {/* Font Family Dropdown */}
      <select 
        value={selectedFormat.fontFamily}
        onChange={(e) => onFormatChange('fontFamily', e.target.value)}
        className="p-1 border rounded hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {fonts.map((font) => (
          <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
            {font.label}
          </option>
        ))}
      </select>

      {/* Font Size Dropdown */}
      <select 
        value={selectedFormat.fontSize}
        onChange={(e) => onFormatChange('fontSize', e.target.value)}
        className="p-1 border rounded hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {fontSizes.map((size) => (
          <option key={size.value} value={size.value}>
            {size.label}
          </option>
        ))}
      </select>

      <div className="h-6 w-px bg-gray-300 mx-2" />

      <button onClick={() => onFormatClick('bold')} className="p-2 hover:bg-gray-100 rounded">
        <Bold className="w-4 h-4" />
      </button>
      <button onClick={() => onFormatClick('italic')} className="p-2 hover:bg-gray-100 rounded">
        <Italic className="w-4 h-4" />
      </button>
      <button onClick={() => onFormatClick('underline')} className="p-2 hover:bg-gray-100 rounded">
        <Underline className="w-4 h-4" />
      </button>

      <div className="h-6 w-px bg-gray-300 mx-2" />

      <button onClick={() => onFormatClick('insertUnorderedList')} className="p-2 hover:bg-gray-100 rounded">
        <List className="w-4 h-4" />
      </button>
      <button onClick={() => onFormatClick('insertOrderedList')} className="p-2 hover:bg-gray-100 rounded">
        <ListOrdered className="w-4 h-4" />
      </button>

      <div className="h-6 w-px bg-gray-300 mx-2" />

      <button onClick={() => onFormatClick('formatBlock', 'h1')} className="p-2 hover:bg-gray-100 rounded">
        <Heading1 className="w-4 h-4" />
      </button>
      <button onClick={() => onFormatClick('formatBlock', 'h2')} className="p-2 hover:bg-gray-100 rounded">
        <Heading2 className="w-4 h-4" />
      </button>

      <div className="h-6 w-px bg-gray-300 mx-2" />

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
    fontFamily: 'Arial',
    lastSelection: null
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
  const [logoUrl] = useState(`${process.env.PUBLIC_URL}/Fxec_logo.png`); // Ensure the logo is in the public folder
  
  // Add new state for PDF upload
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  const [showPdfUpload, setShowPdfUpload] = useState(false);

  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Add new state for Joyride tour
  const [runTour, setRunTour] = useState(false);
  const [tourSteps, setTourSteps] = useState([]);
  const [isImageButtonClicked, setIsImageButtonClicked] = useState(false);
  const [needsImageUpload, setNeedsImageUpload] = useState(false);

  // Simplified Quill modules configuration
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    }
  };

  // Quill editor formats
  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'align',
    'link', 'image'
  ];

  // Function to handle content change
  const handleEditorChange = (content) => {
    setEditorContent(content);
    
    // Update word count
    const text = editorRef.current?.getEditor().getText() || '';
    setWordCount(text.trim().split(/\s+/).length);

    // Save state for undo/redo without changing cursor position
    if (editorRef.current) {
      const currentContent = editorRef.current.getEditor().root.innerHTML;
      setUndoStack(prev => [...prev, currentContent]);
      setRedoStack([]);
      
      // Don't modify selection here to keep cursor in place
    }
  };

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
        { field: "Activity Code", question: "Please enter the activity code:", type: "text" },
        { field: "Year", question: "Please select the target year:", type: "year" },
        { field: "No Of Count", question: "Please enter the expected number of participants:", type: "text" },
        { field: "Organizer Department", question: "Please select the organizing department:", type: "department" },
        { field: "Organizer Faculty Name", question: "Please enter the faculty coordinator's name:", type: "text" }
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
        // All required fields are collected, generate content automatically
        handleGenerateContent();
      }
    }
  };

  // Update handleImageUpload function to improve image handling
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setIsImageUploading(true);
    
    try {
      // Generate unique IDs for each image with more readable names
      const newPreviewImages = files.map(file => {
        // Extract just the filename
        const fileName = file.name;
        
        return {
          id: `IMG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: URL.createObjectURL(file),
          name: fileName,
          type: file.type,
          size: file.size
        };
      });
      
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

  // Update handleImageSubmit function to properly display images in the editor
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
        // Add images to chat with improved display
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

        // Generate improved HTML content for editor with images
        const editorContent = pages.map((page, index) => `
          <div class="page" style="page-break-after: always; font-family: ${selectedFormat.fontFamily};">
            ${page}
          </div>
        `).join('') + `
          <div class="event-images" style="margin-top: 2rem;">
            <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1.5rem; font-family: ${selectedFormat.fontFamily}; color: #2563eb; background-color: #f3f4f6; padding: 8px; border-radius: 4px;">Event Images</h2>
            ${previewImages.map(img => `
              <div style="margin-bottom: 1.5rem;">
                <p style="font-size: 0.875rem; color: #4b5563; margin-bottom: 0.5rem; font-family: ${selectedFormat.fontFamily};">${img.name}</p>
                <img src="${img.url}" alt="${img.name}" style="max-width: 100%; display: block; margin-bottom: 1rem; border-radius: 0.375rem;" />
              </div>
            `).join('')}
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

  // Update ImagePreview component
  const ImagePreview = ({ images, onRemove }) => {
    return (
      <div className="flex flex-col gap-4 mt-2 p-2 bg-white rounded-lg">
        {images.map((image, index) => (
          <div key={index} className="relative group max-w-[250px]">
            <div className="bg-blue-500 text-white text-sm py-1 px-2 rounded-t-md">
              {image.name}
            </div>
            <img
              src={image.url}
              alt={image.name}
              className="w-full h-auto object-contain rounded-b-md"
            />
            <button
              onClick={() => onRemove(index)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  // Update renderMessage function to show full-size images in chat
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

    if (message.buttons) {
      return (
        <div key={message.id} className="mb-4 text-left">
          <div className="flex gap-2">
            {message.buttons.map((button, index) => (
              <button
                key={index}
                onClick={() => handleChatButtonClick(button.action)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {button.text}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (message.fontButtons) {
      return (
        <div key={message.id} className="mb-4 text-left">
          <div className="flex flex-wrap gap-2">
            {message.fonts.map((font, index) => (
              <button
                key={index}
                onClick={() => handleFontSelect(font.value)}
                className="px-4 py-2 border border-gray-300 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                style={{ fontFamily: font.value }}
              >
                {font.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

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
          } max-w-[90%]`}
        >
          <div className="whitespace-pre-wrap font-sans">
            {message.text}
          </div>
          {message.images && (
            <div className="flex flex-wrap gap-4 mt-4">
              {message.images.map((image, index) => (
                <div key={index} className="w-full max-w-[300px]">
                  <img
                    src={image.url}
                    alt={`Uploaded ${index + 1}`}
                    className="w-full h-auto object-contain rounded-lg"
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
      // Add loading message to chat
      const loadingMessageId = Date.now();
      setMessages(prev => [...prev, {
        id: loadingMessageId,
        text: 'Generating document content...',
        isBot: true,
        isLoading: true
      }]);

      // Check if all required fields are filled
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
      
      // Create a copy of fields to ensure we have all required fields
      const fieldsToSend = { ...documentData.fields };
      
      // Set default value for any missing fields
      requiredFields.forEach(field => {
        if (!fieldsToSend[field]) {
          fieldsToSend[field] = "Not specified";
        }
      });

      const response = await fetch('http://localhost:8000/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: documentData.type,
          fields: fieldsToSend
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

      // Update editor content without changing cursor position
      setEditorContent(content);
      
      // Remove position cursor code to allow natural cursor position

      // Remove loading message
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));
      
      // First show a success message
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "Document has been generated successfully!",
        isBot: true
      }]);
      
      // Display sections if available
      if (data.sections) {
        // Add a message indicating that sections follow
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: "Here are the document sections:",
          isBot: true
        }]);
        
        // Add each section as a separate message
        Object.entries(data.sections).forEach(([section, content], index) => {
          setMessages(prev => [...prev, {
            id: Date.now() + index + 2,
            text: `**${section}**\n\n${content}`,
            isBot: true,
            isContent: true
          }]);
        });
      }
      
      // Then ask about images
      setMessages(prev => [...prev, {
        id: Date.now() + 100,
        text: "Would you like to add event images to your document?",
        isBot: true
      }]);

      // Add buttons for Yes/No
      setMessages(prev => [...prev, {
        id: Date.now() + 101,
        text: "",
        isBot: true,
        buttons: [
          {
            text: "Yes, add images",
            action: "addImages"
          },
          {
            text: "No, continue without images",
            action: "skipImages"
          }
        ]
      }]);

      // Store the complete response for preview
      setPreviewContent(data);
      setWordCount(data.word_count);

      // Reset currentField to indicate all required fields are collected
      setDocumentData(prev => ({
        ...prev,
        currentField: null
      }));

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

  const handleEditorKeyDown = (e) => {
    // Handle Ctrl+Z for undo
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      handleUndo();
    }
    
    // Handle Ctrl+Y for redo
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      handleRedo();
    }

    // Save selection range when typing
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      setSelectedFormat(prev => ({
        ...prev,
        lastSelection: selection.getRangeAt(0).cloneRange()
      }));
    }
  };

  const handleFormatClick = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.getEditor().focus();
      restoreCursorPosition();
      
      // Ensure text direction is maintained
      editorRef.current.getEditor().root.style.direction = 'ltr';
      editorRef.current.getEditor().root.style.unicodeBidi = 'bidi-override';
    }
    handleEditorChange();
  };

  const generatePDF = () => {
    if (editorRef.current) {
      const content = editorRef.current.getEditor().root.innerHTML;
      const element = document.createElement('div');
      element.innerHTML = content;
      
      const doc = new jsPDF();
      doc.html(element, {
        callback: function(doc) {
          doc.save('document.pdf');
        },
        x: 10,
        y: 10
      });
    }
  };

  // Add function to handle format changes
  const handleFormatChange = (property, value) => {
    setSelectedFormat(prev => ({
      ...prev,
      [property]: value
    }));

    if (editorRef.current) {
      editorRef.current.getEditor().root.style[property] = value;
    }
  };

  // Add undo/redo handlers
  const handleUndo = () => {
    if (undoStack.length > 0) {
      const previousContent = undoStack[undoStack.length - 1];
      const currentContent = editorContent;
      
      setRedoStack(prev => [...prev, currentContent]);
      setUndoStack(prev => prev.slice(0, -1));
      setEditorContent(previousContent);
      
      if (editorRef.current) {
        editorRef.current.getEditor().root.innerHTML = previousContent;
      }
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextContent = redoStack[redoStack.length - 1];
      const currentContent = editorContent;
      
      setUndoStack(prev => [...prev, currentContent]);
      setRedoStack(prev => prev.slice(0, -1));
      setEditorContent(nextContent);
      
      if (editorRef.current) {
        editorRef.current.getEditor().root.innerHTML = nextContent;
      }
    }
  };

  // Add function to restore cursor position
  const restoreCursorPosition = () => {
    if (selectedFormat.lastSelection) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(selectedFormat.lastSelection);
    }
  };

  // Update renderDocumentContent to use CustomQuillEditor
  const renderDocumentContent = (content, isPreview = false) => {
    const containerClass = isPreview ? 'preview-container' : 'edit-container';
    
    const documentHeader = `
      <div class="document-header mb-8" style="font-family: system-ui, -apple-system, sans-serif;">
        <!-- Logo -->
        <div class="flex justify-center mb-4 pb-4">
          <img src="${logoUrl}" alt="Fxec Logo" class="w-full h-16 object-contain" />
        </div>

        <!-- Document Type -->
        <div class="text-center mb-6">
          <h1 class="text-2xl font-bold tracking-wide">GUEST LECTURE REPORT</h1>
        </div>

        <!-- Document Details -->
        <div class="mb-6">
          <table class="w-full border-collapse">
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
                <td class="py-2">Guest Designation</td>
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

    // Update editor content styles with improved image handling
    const customStyles = `
      <style>
        .ql-editor {
          font-family: ${selectedFormat.fontFamily}, sans-serif;
          font-size: ${selectedFormat.fontSize};
          line-height: 1.6;
        }
        .event-images h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 1.5rem;
          font-family: ${selectedFormat.fontFamily}, sans-serif;
          color: #2563eb;
          background-color: #f3f4f6;
          padding: 8px;
          border-radius: 4px;
        }
        .event-image-container {
          margin-bottom: 1.5rem;
        }
        .event-image-name {
          font-size: 0.875rem;
          color: #4b5563;
          margin-bottom: 0.5rem;
          font-family: ${selectedFormat.fontFamily}, sans-serif;
          background-color: #3b82f6;
          color: white;
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .event-image {
          max-width: 100%;
          display: block;
          margin-bottom: 1rem;
          border-radius: 0.375rem;
        }
        
        /* Better image handling for preview mode */
        .document-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1rem 0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
      </style>
    `;

    return (
      <div className={`${containerClass} w-full min-h-[500px] p-8 bg-white prose max-w-none`}>
        {/* Static Header Section */}
        <div dangerouslySetInnerHTML={{ 
          __html: DOMPurify.sanitize(documentHeader + customStyles)
        }} />
        
        {/* Content Section with improved styling */}
        <div className="mt-8 document-content-area">
          {isPreview ? (
            <div 
              className="min-h-[500px] prose max-w-none document-content"
              style={{
                fontFamily: selectedFormat.fontFamily,
                fontSize: selectedFormat.fontSize,
                lineHeight: '1.6'
              }}
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(content || '')
              }} 
            />
          ) : (
            <CustomQuillEditor
              ref={editorRef}
              value={content}
              onChange={handleEditorChange}
              style={{ 
                height: '500px',
                fontFamily: selectedFormat.fontFamily,
                fontSize: selectedFormat.fontSize
              }}
              className="h-[500px] mb-12 border-0 document-editor"
            />
          )}
        </div>
      </div>
    );
  };

  // Update useEffect to initialize editor content
  useEffect(() => {
    if (editorRef.current && editorContent) {
      setEditorContent(editorContent);
    }
  }, [editorContent]);

  // Add function to handle paste events to clean up pasted content
  const handlePaste = (e) => {
    e.preventDefault();
    
    // Get pasted text
    const text = e.clipboardData.getData('text/plain');
    
    // Insert text at cursor position
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      
      // Move cursor to end of pasted text
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    handleEditorChange();
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
          {isEditing && (
            <button
              onClick={handleSaveDocument}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          )}
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

  // Add new function to highlight the image button in the editor toolbar
  const highlightImageButton = () => {
    // Get the image button in the Quill toolbar
    const imageButton = document.querySelector('.ql-image');
    if (imageButton) {
      // Add blinking animation to highlight the button
      imageButton.classList.add('highlight-button');
      imageButton.style.animation = 'pulse 1.5s infinite';
      imageButton.style.backgroundColor = '#e9f5ff';
      imageButton.style.borderRadius = '4px';
      imageButton.style.boxShadow = '0 0 8px #3b82f6';
      
      // Add tooltip
      imageButton.title = 'Click here to add event images';
      
      // Remove highlight after a while
      setTimeout(() => {
        imageButton.style.animation = '';
        imageButton.style.backgroundColor = '';
        imageButton.style.boxShadow = '';
        imageButton.classList.remove('highlight-button');
      }, 10000);
    }
  };

  // Update the handleChatButtonClick function to correctly focus the editor
  const handleChatButtonClick = (action) => {
    if (action === 'addImages') {
      // Set flag that user needs to add images
      setNeedsImageUpload(true);
      
      // Start the Joyride tour to guide user to image button
      startImageUploadTour();
      
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "Click on the highlighted image button in the editor toolbar to add your event images.",
        isBot: true
      }]);
      
      // Switch to edit mode if not already there
      if (!isEditing) {
        setIsEditing(true);
      }
      
      // Focus on editor - only try to focus if the editor exists
      if (editorRef.current) {
        try {
          // Use the proper focus method from our forwarded ref
          editorRef.current.focus();
        } catch (err) {
          console.warn('Could not focus editor:', err);
          // As a fallback, try to focus the editor container
          const editorElement = document.querySelector('.ql-editor');
          if (editorElement) {
            editorElement.focus();
          }
        }
      }
    } else if (action === 'skipImages') {
      setNeedsImageUpload(false);
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "No problem! Your document has been created without event images. You can continue editing the document.",
        isBot: true
      }]);
    }
  };

  // Add function to start the image upload tour
  const startImageUploadTour = () => {
    // Define the tour steps
    const steps = [
      {
        target: '.ql-image',
        content: 'Click this button to add event images to your document',
        disableBeacon: true,
        spotlightClicks: true,
        placement: 'bottom',
        styles: {
          options: {
            zIndex: 10000,
          }
        }
      }
    ];
    
    setTourSteps(steps);
    setRunTour(true);
  };
  
  // Handle tour callback
  const handleJoyrideCallback = (data) => {
    const { status, action, index } = data;
    
    // If tour is finished or skipped
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false);
    }
    
    // If image button was clicked during tour
    if (action === 'click' && index === 0) {
      setIsImageButtonClicked(true);
      setRunTour(false);
    }
  };
  
  // Add event listener to Quill editor to detect image button click
  useEffect(() => {
    if (editorRef.current && needsImageUpload) {
      const imageButton = document.querySelector('.ql-image');
      if (imageButton) {
        const handleImageClick = () => {
          setIsImageButtonClicked(true);
          setNeedsImageUpload(false);
          
          // Add confirmation message in chat
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: "Great! Your images will be added to the document.",
            isBot: true
          }]);
          
          // After image is added, display font style options
          setTimeout(() => {
            // Add message about font options
            setMessages(prev => [...prev, {
              id: Date.now() + 1,
              text: "Would you like to change the font style of your document?",
              isBot: true
            }]);
            
            // Add font style buttons with display names
            setMessages(prev => [...prev, {
              id: Date.now() + 2,
              text: "",
              isBot: true,
              fontButtons: true,
              fonts: Object.entries(fontNameMap).map(([key, value]) => ({
                label: value,
                value: value
              }))
            }]);
          }, 1000); // Show font options after a short delay

          // Remove the event listener
          imageButton.removeEventListener('click', handleImageClick);
        };
        
        imageButton.addEventListener('click', handleImageClick);
        
        // Clean up the event listener
        return () => {
          imageButton.removeEventListener('click', handleImageClick);
        };
      }
    }
  }, [editorRef.current, needsImageUpload]);
  
  // Prevent user from clicking other buttons while image upload is required
  useEffect(() => {
    if (needsImageUpload && !isImageButtonClicked) {
      // Disable all toolbar buttons except image
      const toolbarButtons = document.querySelectorAll('.ql-toolbar button:not(.ql-image)');
      toolbarButtons.forEach(button => {
        button.disabled = true;
        button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
      });
      
      return () => {
        // Re-enable all toolbar buttons
        toolbarButtons.forEach(button => {
          button.disabled = false;
          button.style.opacity = '1';
          button.style.cursor = 'pointer';
        });
      };
    }
  }, [needsImageUpload, isImageButtonClicked]);
  
  // Add a pulse style to draw attention to the image button
  useEffect(() => {
    if (needsImageUpload && !isImageButtonClicked) {
      const imageButton = document.querySelector('.ql-image');
      if (imageButton) {
        imageButton.style.animation = 'pulse 1.5s infinite';
        imageButton.style.backgroundColor = '#e9f5ff';
        imageButton.style.borderRadius = '4px';
        imageButton.style.boxShadow = '0 0 8px #3b82f6';
        imageButton.style.transform = 'scale(1.2)';
        imageButton.style.zIndex = '100';
        
        // Add overlay to prevent clicking on other parts
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '99';
        overlay.style.pointerEvents = 'none';
        document.body.appendChild(overlay);
        
        // Create hole in overlay for image button
        const rect = imageButton.getBoundingClientRect();
        overlay.innerHTML = `
          <div style="
            position: absolute;
            top: ${rect.top - 10}px;
            left: ${rect.left - 10}px;
            width: ${rect.width + 20}px;
            height: ${rect.height + 20}px;
            background-color: transparent;
            border-radius: 8px;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
            pointer-events: none;
          "></div>
        `;
        
        return () => {
          imageButton.style.animation = '';
          imageButton.style.backgroundColor = '';
          imageButton.style.boxShadow = '';
          imageButton.style.transform = '';
          imageButton.style.zIndex = '';
          document.body.removeChild(overlay);
        };
      }
    }
  }, [needsImageUpload, isImageButtonClicked]);

  // Add CSS for the pulsing animation
  useEffect(() => {
    // Add style to document head
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
        100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Add Google Fonts - update to include all fonts in their proper formats
  useEffect(() => {
    // Add Google Fonts link including all web fonts
    const googleFontsLink = document.createElement('link');
    googleFontsLink.rel = 'stylesheet';
    googleFontsLink.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Montserrat:wght@400;700&family=Lato:wght@400;700&family=Mirza:wght@400;700&family=Calibri:wght@400;700&display=swap';
    document.head.appendChild(googleFontsLink);
    
    return () => {
      document.head.removeChild(googleFontsLink);
    };
  }, []);

  // Update handleFontSelect to maintain cursor position
  const handleFontSelect = (fontFamily) => {
    // Convert display name to CSS-safe name if needed
    const cssSafeFontName = Object.entries(fontNameMap).find(
      ([key, value]) => value === fontFamily
    )?.[0] || fontFamily;
    
    // Update the document font
    setSelectedFormat(prev => ({
      ...prev,
      fontFamily
    }));
    
    // Apply the font using CSS and Quill format - only to the editor content
    if (editorRef.current) {
      try {
        const editor = editorRef.current.getEditor();
        
        // Save current selection before formatting
        const currentSelection = editor.getSelection();
        
        // Get the current content and length
        const length = editor.getLength();
        
        // Target only the editor content by formatting just the text content
        // Format only the content area, not headers or other parts
        editor.formatText(0, length, 'font', cssSafeFontName);
        
        // Also update the CSS to ensure the font is applied correctly
        const editorElement = editor.root;
        editorElement.style.fontFamily = `${fontFamily}, sans-serif`;
        
        // Restore selection if it existed
        if (currentSelection) {
          editor.setSelection(currentSelection);
        }
        
        // Add confirmation message
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: `Font changed to ${fontFamily} for document content.`,
          isBot: true
        }]);
      } catch (err) {
        console.error('Error applying font:', err);
        
        // Fallback to CSS styling if Quill API fails
        try {
          const editorElement = document.querySelector('.ql-editor');
          if (editorElement) {
            editorElement.style.fontFamily = `${fontFamily}, sans-serif`;
            
            // Add confirmation message even with fallback method
            setMessages(prev => [...prev, {
              id: Date.now(),
              text: `Font changed to ${fontFamily} for document content (using fallback method).`,
              isBot: true
            }]);
          }
        } catch (cssErr) {
          console.error('Fallback font styling also failed:', cssErr);
        }
      }
    }
  };

  // Add function to handle saving document changes
  const handleSaveDocument = () => {
    if (!editorRef.current) return;
    
    // Get current editor content
    const editor = editorRef.current.getEditor();
    const htmlContent = editor.root.innerHTML;
    
    // Update document content state
    setEditorContent(htmlContent);
    
    // Save images properly by processing them to be visible in preview mode
    const images = Array.from(editor.root.querySelectorAll('img'));
    
    // Create a properly formatted page for preview
    const formattedContent = processContentForPreview(htmlContent, images);
    setDocumentContent([formattedContent]);
    
    // Show success message
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: "Document changes saved successfully!",
      isBot: true
    }]);
  };

  // Add function to process content for preview to ensure images display correctly
  const processContentForPreview = (htmlContent, images) => {
    let processedContent = htmlContent;
    
    // Ensure images have proper styles and max-width for preview
    images.forEach((img, index) => {
      const imgSrc = img.getAttribute('src');
      if (imgSrc) {
        // Give each image a unique ID to track it
        const imgId = `doc-img-${index}-${Date.now()}`;
        img.setAttribute('id', imgId);
        
        // Add styles for better presentation in preview
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.borderRadius = '8px';
        img.style.margin = '1rem 0';
        img.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      }
    });
    
    return processedContent;
  };

  // Add a function to automatically save when switching to preview mode
  useEffect(() => {
    // When changing from edit mode to preview mode
    if (!isEditing && editorRef.current) {
      handleSaveDocument();
    }
  }, [isEditing]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-100">
      {/* Add Joyride component for guided tour */}
      <Joyride
        callback={handleJoyrideCallback}
        continuous={false}
        run={runTour}
        scrollToFirstStep={true}
        showProgress={false}
        showSkipButton={false}
        steps={tourSteps}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#3b82f6',
          },
          spotlight: {
            backgroundColor: 'transparent',
          },
          tooltipContainer: {
            textAlign: 'center',
          },
          buttonNext: {
            backgroundColor: '#3b82f6',
          },
          buttonBack: {
            color: '#3b82f6',
          }
        }}
      />
      
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
                <div className="p-8">
                  {renderDocumentContent(editorContent)}
                </div>
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