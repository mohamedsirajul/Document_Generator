import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Send, Download, Bold, Italic, Image, List, 
  ListOrdered, Link as LinkIcon, Heading1, Heading2,
  AlignLeft, AlignCenter, AlignRight, Underline,
  Type, Quote, Code, Eye, Edit, Calendar, Upload, X,
  ChevronLeft, ChevronRight, FileUp, Save, MessageSquare, List as ListIcon,
  Upload as UploadIcon, Save as SaveIcon, Eye as EyeIcon, Download as DownloadIcon
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
  const [posterProcessing, setPosterProcessing] = useState(false);
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
    if (userMessage.toLowerCase() === 'guest lecture') {
      // Start the guest lecture input flow
      setDocumentData({
        type: 'GuestLecture',
        currentField: 'Guest Name',
        awaitingInput: true,
        fields: {}
      });
      
      setTimeout(() => {
        addMessageToChat({
          type: 'bot',
          content: "Please enter the name of the guest lecturer:",
          timestamp: new Date().toISOString()
        });
      }, 500);
    }
  };

  // Update handleImageUpload function to improve image handling
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setIsImageUploading(true);
    
    try {
      // Generate unique IDs for each image with more readable names
      const newPreviewImages = files.map(file => {
        return {
          id: `IMG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: URL.createObjectURL(file),
          name: file.name,
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

      // Add success message to chat
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `Successfully uploaded ${files.length} image(s). The images have been added to your document.`,
        isBot: true
      }]);

      // Add image preview to chat
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "",
        images: newPreviewImages,
        isBot: false,
        isUserUpload: true
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

    if (message.isError) {
      return (
        <div key={message.id} className="mb-4 text-left">
          <div className="inline-block p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 max-w-[90%]">
            <div className="flex items-start gap-2">
              <span className="text-red-500">⚠️</span>
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

    if (message.isLoader) {
      return (
        <div className="flex items-start space-x-2 mb-4">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-gray-700">{message.content}</p>
            </div>
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
                  <p className="text-sm mt-2 text-gray-600">{image.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Add a chat list toggle button to the chat header
  const renderChatHeader = () => (
    <div className="p-3 border-b bg-white flex justify-between items-center">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setShowChatList(!showChatList)} 
          className="p-2 rounded hover:bg-gray-100"
          title="Chat History"
        >
          <ListIcon className="w-5 h-5 text-gray-600" />
        </button>
        <span className="font-medium">
          {chatHistory[currentChatId]?.title || determineConversationTitle()}
        </span>
      </div>
      <div>
        <span className="text-sm text-gray-500">
          {messages.length} messages
        </span>
      </div>
    </div>
  );

  // New renderChatMessages function with header included
  const renderChatMessages = () => {
    return (
      <>
        {renderChatHeader()}
        <div className="flex-1 overflow-y-auto p-4" ref={chatContainerRef}>
          {messages.map((message) => renderMessage(message))}
        </div>
      </>
    );
  };

  // Update renderChatInput to handle image upload loading state
  const renderChatInput = () => {
    if (isLoading || isImageUploading || isPdfUploading) {
      return (
      <div className="p-4 border-t bg-white space-y-2">
        {(posterProcessing || isLoading || isImageUploading || isPdfUploading) && (
          <div className="flex items-center justify-center gap-3 text-gray-600 mb-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">Processing poster...</span>
          </div>
        )}
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

    // Regular chat input with clear command note
    return (
      <div className="space-y-2">
        <div className="text-red-500 text-sm font-medium px-2">
          Note: Type 'clear' in the chat box to reset everything in the chat panel.
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={isLoading || posterProcessing || isImageUploading || isPdfUploading}
          />
          <button
            type="submit"
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || posterProcessing || isImageUploading || isPdfUploading}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
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

      // Remove loading message first
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));

      if (!response.ok) {
        // Handle HTTP errors
        throw new Error(data.detail || 'Failed to generate content');
      }

      if (data.error || data.detail) {
        // Handle API errors
        const errorMessage = data.detail || data.error || 'An error occurred while generating content';
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: `Error: ${errorMessage}`,
          isBot: true,
          isError: true
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

      // Store the content in localStorage
      localStorage.setItem('documentEditorContent', content);
      localStorage.setItem('documentContent', JSON.stringify(pages));

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
      localStorage.setItem('previewContent', JSON.stringify(data));
      setWordCount(data.word_count);

      // Reset currentField to indicate all required fields are collected
      setDocumentData(prev => ({
        ...prev,
        currentField: null
      }));

    } catch (error) {
      console.error('Error:', error);
      // Remove any existing loading message
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      
      // Add error message with proper formatting
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `Error: ${error.message}`,
        isBot: true,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Update useEffect to load saved content on mount
  useEffect(() => {
    // Load saved chats from localStorage
    const savedChats = localStorage.getItem('documentGeneratorChats');
    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats);
        setChatHistory(parsedChats);
        
        // Find the most recent chat and set it as the current chat
        const chatEntries = Object.entries(parsedChats);
        if (chatEntries.length > 0) {
          // Sort chats by lastUpdated timestamp (newest first)
          chatEntries.sort((a, b) => {
            return new Date(b[1].lastUpdated) - new Date(a[1].lastUpdated);
          });
          
          // Use the most recent chat
          const [recentChatId, recentChat] = chatEntries[0];
          setCurrentChatId(recentChatId);
          setDiscussionId(recentChatId);
          
          // Load the messages from this chat
          setMessages(recentChat.messages || []);
          
          // Load document data if available
          if (recentChat.documentData) {
            setDocumentData(recentChat.documentData);
          }

          // Load saved editor content
          const savedEditorContent = localStorage.getItem('documentEditorContent');
          if (savedEditorContent) {
            setEditorContent(savedEditorContent);
          }

          // Load saved document content
          const savedDocumentContent = localStorage.getItem('documentContent');
          if (savedDocumentContent) {
            const parsedContent = JSON.parse(savedDocumentContent);
            setDocumentContent(parsedContent);
            setTotalPages(parsedContent.length);
          }

          // Load saved preview content
          const savedPreviewContent = localStorage.getItem('previewContent');
          if (savedPreviewContent) {
            setPreviewContent(JSON.parse(savedPreviewContent));
          }
        }
      } catch (e) {
        console.error('Error parsing saved chats:', e);
      }
    }
  }, []);

  // Add new useEffect to save content when it changes
  useEffect(() => {
    if (editorContent) {
      localStorage.setItem('documentEditorContent', editorContent);
    }
    if (documentContent.length > 0) {
      localStorage.setItem('documentContent', JSON.stringify(documentContent));
    }
    if (previewContent) {
      localStorage.setItem('previewContent', JSON.stringify(previewContent));
    }
  }, [editorContent, documentContent, previewContent]);

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
    const message = inputMessage.trim();
    if (!message) return;

    // Clear input
    setInputMessage('');

    // Check for clear command
    if (message.toLowerCase() === 'clear') {
      clearChat();
      return;
    }

    // Add user message to chat
    addMessageToChat({
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // If we're awaiting input for a field, handle it
    if (documentData.awaitingInput) {
      const currentField = documentData.currentField;
      
      // Validate the input based on the field type
      let isValid = true;
      let errorMessage = '';

      switch (currentField) {
        case 'Guest Name':
          if (message.length < 2) {
            isValid = false;
            errorMessage = "Please enter a valid guest name (at least 2 characters)";
          }
          break;

        case 'Guest Designation':
          if (message.length < 2) {
            isValid = false;
            errorMessage = "Please enter a valid designation (at least 2 characters)";
          }
          break;

        case 'Topic':
          if (message.length < 5) {
            isValid = false;
            errorMessage = "Please enter a valid topic (at least 5 characters)";
          }
          break;

        case 'Event Date':
          // Date validation is handled by the date picker
          break;

        case 'Organizer Department':
          // Department validation is handled by the department selector
          break;

        case 'Organizer Faculty Name':
          if (message.length < 2) {
            isValid = false;
            errorMessage = "Please enter a valid faculty name (at least 2 characters)";
          }
          break;

        case 'Activity Code':
          if (message.length < 3) {
            isValid = false;
            errorMessage = "Please enter a valid activity code (at least 3 characters)";
          }
          break;

        case 'Year':
          // Year validation is handled by the year selector
          break;

        case 'No Of Count':
          if (!/^\d+$/.test(message)) {
            isValid = false;
            errorMessage = "Please enter a valid number of participants";
          }
          break;
      }

      if (!isValid) {
        // Show error message and keep waiting for valid input
        addMessageToChat({
          type: 'bot',
          content: errorMessage,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Update the field value
      setDocumentData(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          [currentField]: message
        },
        awaitingInput: false
      }));

      // Function to handle next field transition with delay
      const transitionToNextField = (nextField, message, options = {}) => {
        const { showDatePicker, showDepartmentOptions, showYearOptions } = options;
        
        return new Promise((resolve) => {
          setTimeout(() => {
            addMessageToChat({
              type: 'bot',
              content: message,
              timestamp: new Date().toISOString()
            });
            
            setDocumentData(prev => ({
              ...prev,
              currentField: nextField,
              awaitingInput: true
            }));

            if (showDatePicker) setShowDatePicker(true);
            if (showDepartmentOptions) setShowDepartmentOptions(true);
            if (showYearOptions) setShowYearOptions(true);
            
            resolve();
          }, 1000); // 1 second delay between messages
        });
      };

      // Handle field transitions
      const handleFieldTransition = async () => {
        switch (currentField) {
          case 'Guest Name':
            await transitionToNextField('Guest Designation', "Please enter the guest's designation:");
            break;

          case 'Guest Designation':
            await transitionToNextField('Topic', "Please enter the topic of the lecture:");
            break;

          case 'Topic':
            await transitionToNextField('Event Date', "Please select the event date:", { showDatePicker: true });
            break;

          case 'Event Date':
            await transitionToNextField('Organizer Department', "Please select the organizing department:", { showDepartmentOptions: true });
            break;

          case 'Organizer Department':
            await transitionToNextField('Organizer Faculty Name', "Please enter the faculty coordinator's name:");
            break;

          case 'Organizer Faculty Name':
            await transitionToNextField('Activity Code', "Please enter the activity code:");
            break;

          case 'Activity Code':
            await transitionToNextField('Year', "Please select the target year:", { showYearOptions: true });
            break;

          case 'Year':
            await transitionToNextField('No Of Count', "Please enter the expected number of participants:");
            break;

          case 'No Of Count':
            setTimeout(() => {
              addMessageToChat({
                type: 'bot',
                content: "Thank you! All required information has been collected. Generating document...",
                timestamp: new Date().toISOString()
              });
              
              setDocumentData(prev => ({
                ...prev,
                awaitingInput: false,
                currentField: null
              }));
              
              handleGenerateContent();
            }, 1000);
            break;

          default:
            handleDocumentFlow(message);
            break;
        }
      };

      // Start the field transition
      handleFieldTransition();
    } else {
      handleDocumentFlow(message);
    }
  };

  const clearChat = () => {
    // Reset messages to initial welcome message
    setMessages([{
      id: 1,
      text: `Hello! I'm Siraj AI! I can help you create various types of documents. Please select from the following options:

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

Or, if you have an existing PDF report, click the "Upload PDF" button below to extract and edit its content.`,
      isBot: true,
    }]);

    // Reset document data
    setDocumentData({
      type: null,
      currentField: null,
      fields: {}
    });

    // Reset editor content
    setEditorContent('');
    setDocumentContent(['']);
    setCurrentPage(1);
    setTotalPages(1);

    // Reset all option states
    setShowDepartmentOptions(false);
    setShowYearOptions(false);
    setShowDatePicker(false);
    setShowPdfUpload(false);

    // Reset image states
    setUploadedImages([]);
    setPreviewImages([]);
    
    // Reset format
    setSelectedFormat(prev => ({
      ...prev,
      fontFamily: 'Arial',
      fontSize: '16px'
    }));
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
    const documentHeader = `
      <div class="document-header w-full mx-auto mb-8">
        <!-- Logo and Title Section -->
        <div class="flex flex-col items-center mb-8">
          <img src="${logoUrl}" alt="FXEC Logo" class="h-16 mb-4" />
          <h1 class="text-2xl font-bold tracking-wide text-gray-900 uppercase mb-2">
            ${documentData.type || 'GUEST LECTURE REPORT'}
          </h1>
          <div class="w-48 h-1 bg-blue-600 mx-auto"></div>
        </div>

        <!-- Document Details Section -->
        <div class="w-full p-6">
          <div class="grid grid-cols-2 gap-x-12 gap-y-4">
            <!-- Left Column -->
            <div class="space-y-4">
              <div class="flex">
                <div class="w-36">
                  <span class="font-semibold text-gray-800">Topic:</span>
                </div>
                <div class="flex-1">
                  <span class="text-gray-700">${documentData.fields?.Topic || ''}</span>
                </div>
              </div>

              <div class="flex">
                <div class="w-36">
                  <span class="font-semibold text-gray-800">Guest Name:</span>
                </div>
                <div class="flex-1">
                  <span class="text-gray-700">${documentData.fields?.['Guest Name'] || ''}</span>
                </div>
              </div>

              <div class="flex">
                <div class="w-36">
                  <span class="font-semibold text-gray-800">Designation:</span>
                </div>
                <div class="flex-1">
                  <span class="text-gray-700">${documentData.fields?.['Guest Designation'] || ''}</span>
                </div>
              </div>
            </div>

            <!-- Right Column -->
            <div class="space-y-4">
              <div class="flex justify-end">
                <div class="flex items-center">
                  <span class="font-semibold text-gray-800 mr-4">Event Date:</span>
                  <span class="text-gray-700">${documentData.fields?.['Event Date'] || ''}</span>
                </div>
              </div>

              <div class="flex justify-end">
                <div class="flex items-center">
                  <span class="font-semibold text-gray-800 mr-4">Activity Code:</span>
                  <span class="text-gray-700">${documentData.fields?.['Activity Code'] || ''}</span>
                </div>
              </div>

              <div class="flex justify-end">
                <div class="flex items-center">
                  <span class="font-semibold text-gray-800 mr-4">Coordinator:</span>
                  <span class="text-gray-700">${documentData.fields?.['Organizer Faculty Name'] || ''}</span>
                </div>
              </div>

              <div class="flex justify-end">
                <div class="flex items-center">
                  <span class="font-semibold text-gray-800 mr-4">Department:</span>
                  <span class="text-gray-700">${documentData.fields?.['Organizer Department'] || ''}</span>
                </div>
              </div>

              <div class="flex justify-end">
                <div class="flex items-center">
                  <span class="font-semibold text-gray-800 mr-4">Year:</span>
                  <span class="text-gray-700">${documentData.fields?.['Year'] || ''}</span>
                </div>
              </div>

              <div class="flex justify-end">
                <div class="flex items-center">
                  <span class="font-semibold text-gray-800 mr-4">Participants:</span>
                  <span class="text-gray-700">${documentData.fields?.['No Of Count'] || ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Content Separator -->
        <div class="my-8 flex items-center justify-center">
          <div class="w-full border-t border-gray-300"></div>
        </div>
      </div>
    `;

    return (
      <div className={`${isPreview ? 'preview-container' : 'edit-container'} w-full min-h-[500px] p-8 bg-white prose max-w-none`}>
        {/* Header Section - Always uses system font */}
        <div 
          className="document-header-section" 
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(documentHeader) }}
        />
        
        {/* Content Section - Uses selected font */}
        <div className="document-content-area mt-8">
          {isPreview ? (
            <div 
              className="min-h-[500px] prose max-w-none"
              style={{ fontFamily: `${selectedFormat.fontFamily}, sans-serif` }}
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(content || '')
              }} 
            />
          ) : (
            <CustomQuillEditor
              ref={editorRef}
              value={content}
              onChange={handleEditorChange}
              style={{ height: '500px' }}
              className="h-[500px] mb-12 border-0 document-editor"
            />
          )}
        </div>
      </div>
    );
  };

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

  // Add function to clear editor content
  const handleClearDocument = () => {
    // Show confirmation dialog before clearing
    if (window.confirm('Are you sure you want to clear all content? This action cannot be undone.')) {
      // Clear editor content
      if (editorRef.current) {
        editorRef.current.getEditor().setText('');
      }
      // Reset document content
      setEditorContent('');
      setDocumentContent(['']);
      // Show notification
      setNotification({
        type: 'success',
        message: 'Document content cleared successfully'
      });
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  // Update the document header to include the Clear button
  const renderDocumentHeader = () => {
    return (
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
             {/* Only show PDF upload button when no document type is selected */}
             {!documentData.type && (
              <>
                <input
                  type="file"
                  id="posterUpload"
                  accept="image/*"
                  onChange={handlePosterUpload}
                  className="hidden"
                  disabled={posterProcessing}
                />
                {posterProcessing ? (
                  <div className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 border border-gray-300 rounded-md cursor-not-allowed">
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-gray-500 border-t-transparent rounded-full"></div>
                    Processing...
                  </div>
                ) : (
                <label
                  htmlFor="posterUpload"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <Image className="w-4 h-4 mr-2" />
                  Upload Poster
                </label>
                )}
               <button
                  onClick={() => setShowPdfUpload(true)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium shadow-sm"
                >
                  <FileUp className="w-4 h-4" />
                  <span>Upload PDF</span>
                </button>
              </>
              )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isEditing && (
            <button
              onClick={handleSaveDocument}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-sm font-medium shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium shadow-sm"
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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium shadow-sm"
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
    switch (action) {
      case 'addImages':
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
        
        // Focus on editor
        if (editorRef.current) {
          editorRef.current.focus();
        }

        // Highlight the image button
        highlightImageButton();
        break;

      case 'skipImages':
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: "No problem! Your document has been generated without images. You can continue editing or export it as needed.",
          isBot: true
        }]);
        break;

      default:
        break;
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
          // setTimeout(() => {
          //   // Add message about font options
          //   setMessages(prev => [...prev, {
          //     id: Date.now() + 1,
          //     text: "Would you like to change the font style of your document?",
          //     isBot: true
          //   }]);
            
          //   // Add font style buttons with display names
          //   setMessages(prev => [...prev, {
          //     id: Date.now() + 2,
          //     text: "",
          //     isBot: true,
          //     fontButtons: true,
          //     fonts: Object.entries(fontNameMap).map(([key, value]) => ({
          //       label: value,
          //       value: value
          //     }))
          //   }]);
          // }, 1000); // Show font options after a short delay

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
    if (editorRef.current) {
      try {
        const editor = editorRef.current.getEditor();
        
        // Save current selection
        const currentSelection = editor.getSelection();
        
        // Update the format state
        setSelectedFormat(prev => ({
          ...prev,
          fontFamily
        }));

        // Apply font to the entire editor content
        editor.format('font', fontFamily);
        
        // Update the editor container style
        const editorContainer = editor.root;
        if (editorContainer) {
          editorContainer.style.fontFamily = `${fontFamily}, sans-serif`;
        }
        
        // Apply font to all existing content
        const delta = editor.getContents();
        editor.setContents(delta);
        
        // Restore selection if it existed
        if (currentSelection) {
          editor.setSelection(currentSelection);
        }
        
        // Add confirmation message
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: `Font changed to ${fontFamily}.`,
          isBot: true
        }]);

        // Force a re-render of the editor content
        const currentContent = editor.root.innerHTML;
        setEditorContent(currentContent);
        
      } catch (err) {
        console.error('Error applying font:', err);
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: `Error changing font: ${err.message}`,
          isBot: true,
          isError: true
        }]);
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

  // Add new state variables for chat management
  const [chatHistory, setChatHistory] = useState({});
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showChatList, setShowChatList] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [showNotification, setShowNotification] = useState(false);
  
  // Function to create a new chat
  const createNewChat = () => {
    // Create a new chat ID
    const newChatId = `chat_${Date.now()}`;
    
    // Reset all data
    setMessages([{
      id: 1,
      text: `Hello! I'm Siraj AI! I can help you create various types of documents. Please select from the following options:

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

Or, if you have an existing PDF report, click the "Upload PDF" button below to extract and edit its content.`,
      isBot: true,
    }]);
    
    setDocumentData({
      type: null,
      currentField: null,
      fields: {}
    });
    
    setEditorContent('');
    setDocumentContent([]);
    
    // Set as current chat
    setCurrentChatId(newChatId);
    setDiscussionId(newChatId);
    
    // Close chat list
    setShowChatList(false);
    
    // Add the new chat to history
    const newChat = {
      id: newChatId,
      messages: [{
        id: 1,
        text: `Hello! I'm Siraj AI! I can help you create various types of documents. Please select from the following options:

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

Or, if you have an existing PDF report, click the "Upload PDF" button below to extract and edit its content.`,
        isBot: true,
      }],
      lastUpdated: new Date().toISOString(),
      title: 'New Chat',
      documentData: {
        type: null,
        currentField: null,
        fields: {}
      }
    };
    
    setChatHistory(prev => ({
      ...prev,
      [newChatId]: newChat
    }));
    
    // Save to localStorage
    try {
      const updatedHistory = {
        ...chatHistory,
        [newChatId]: newChat
      };
      localStorage.setItem('documentGeneratorChats', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error('Error saving new chat to history:', e);
    }
  };

  // Initialize chat system - run only once on component mount
  useEffect(() => {
    // Load saved chats from localStorage
    const savedChats = localStorage.getItem('documentGeneratorChats');
    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats);
        setChatHistory(parsedChats);
        
        // Find the most recent chat and set it as the current chat
        const chatEntries = Object.entries(parsedChats);
        if (chatEntries.length > 0) {
          // Sort chats by lastUpdated timestamp (newest first)
          chatEntries.sort((a, b) => {
            return new Date(b[1].lastUpdated) - new Date(a[1].lastUpdated);
          });
          
          // Use the most recent chat
          const [recentChatId, recentChat] = chatEntries[0];
          setCurrentChatId(recentChatId);
          setDiscussionId(recentChatId);
          
          // Load the messages from this chat
          setMessages(recentChat.messages || []);
          
          // Load document data if available
          if (recentChat.documentData) {
            setDocumentData(recentChat.documentData);
          }

          // Load saved editor content
          const savedEditorContent = localStorage.getItem('documentEditorContent');
          if (savedEditorContent) {
            setEditorContent(savedEditorContent);
          }

          // Load saved document content
          const savedDocumentContent = localStorage.getItem('documentContent');
          if (savedDocumentContent) {
            const parsedContent = JSON.parse(savedDocumentContent);
            setDocumentContent(parsedContent);
            setTotalPages(parsedContent.length);
          }

          // Load saved preview content
          const savedPreviewContent = localStorage.getItem('previewContent');
          if (savedPreviewContent) {
            setPreviewContent(JSON.parse(savedPreviewContent));
          }
        }
      } catch (e) {
        console.error('Error parsing saved chats:', e);
      }
    }
    // Note: We don't automatically create a new chat here anymore
  }, []);
  
  // Make sure there's always at least one chat to display content
  useEffect(() => {
    // Check if we have no current chat ID but need to interact with the page
    if (!currentChatId && messages.length === 0) {
      // No chat is loaded yet, but we won't create one until user clicks the button
      // This ensures the user has control over chat creation
      console.log("No chat selected. Use the 'New Chat' button to create one.");
    }
  }, [currentChatId, messages]);

  // Save chat history whenever messages change
  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      // Update the chat history with current messages
      const updatedHistory = {
        ...chatHistory,
        [currentChatId]: {
          id: currentChatId,
          messages: messages,
          lastUpdated: new Date().toISOString(),
          title: determineConversationTitle(),
          documentData: documentData
        }
      };
      
      setChatHistory(updatedHistory);
      
      // Save to localStorage
      try {
        localStorage.setItem('documentGeneratorChats', JSON.stringify(updatedHistory));
      } catch (e) {
        console.error('Error saving chat history:', e);
      }
    }
  }, [messages, documentData]);
  
  // Function to determine a title for the conversation based on content
  const determineConversationTitle = () => {
    if (documentData.type) {
      // If we have a document type, use that for the title
      return `${documentData.type} - ${new Date().toLocaleDateString()}`;
    } else if (messages.length > 0) {
      // Otherwise use the first few words of the first message
      const firstUserMessage = messages.find(m => !m.isBot)?.text;
      if (firstUserMessage) {
        const words = firstUserMessage.split(' ').slice(0, 5).join(' ');
        return words + (words.length < firstUserMessage.length ? '...' : '');
      }
    }
    return `New Chat - ${new Date().toLocaleDateString()}`;
  };
  
  // Function to load a previous chat
  const loadChat = (chatId) => {
    if (chatHistory[chatId]) {
      // Load messages
      setMessages(chatHistory[chatId].messages);
      
      // Load document data if available
      if (chatHistory[chatId].documentData) {
        setDocumentData(chatHistory[chatId].documentData);
      }
      
      // Set as current chat
      setCurrentChatId(chatId);
      setDiscussionId(chatId);
      
      // Close chat list
      setShowChatList(false);
    }
  };
  
  // Function to delete a chat
  const deleteChat = (chatId) => {
    // Create a copy of chat history without the deleted chat
    const updatedHistory = { ...chatHistory };
    delete updatedHistory[chatId];
    
    // Update state
    setChatHistory(updatedHistory);
    
    // Save to localStorage
    localStorage.setItem('documentGeneratorChats', JSON.stringify(updatedHistory));
    
    // If we deleted the current chat
    if (chatId === currentChatId) {
      // Get all remaining chat IDs
      const remainingChatIds = Object.keys(updatedHistory);
      
      if (remainingChatIds.length > 0) {
        // Sort by lastUpdated (newest first)
        remainingChatIds.sort((a, b) => {
          return new Date(updatedHistory[b].lastUpdated) - new Date(updatedHistory[a].lastUpdated);
        });
        
        // Get the most recent chat
        const nextChatId = remainingChatIds[0];
        
        // Load the next chat
        loadChat(nextChatId);
      } else {
        // No chats remaining, reset to welcome screen
        setCurrentChatId(null);
        setDiscussionId(null);
        
        // Reset messages and document data
        setMessages([]);
        setDocumentData({
          type: null,
          currentField: null,
          fields: {}
        });
        
        // Reset editor content
        setEditorContent('');
        setDocumentContent([]);
        
        // Close chat list
        setShowChatList(false);
      }
    }
    
    // Show success notification
    setNotification({
      type: 'success',
      message: 'Chat deleted successfully'
    });
    setShowNotification(true);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };
  
  // Function to confirm chat deletion
  const confirmDeleteChat = (chatId) => {
    setChatToDelete(chatId);
    setShowDeleteConfirm(true);
  };
  
  // Function to handle confirmed deletion
  const handleConfirmedDelete = () => {
    if (chatToDelete) {
      deleteChat(chatToDelete);
      setShowDeleteConfirm(false);
      setChatToDelete(null);
    }
  };
  
  // Function to cancel deletion
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setChatToDelete(null);
  };
  
  // Function to export chat to JSON file
  const exportChatAsJson = (chatId) => {
    if (chatHistory[chatId]) {
      const chatData = chatHistory[chatId];
      const dataStr = JSON.stringify(chatData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `chat-export-${chatId}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };
  
  // Function to import chat from JSON file
  const importChatFromJson = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const chatData = JSON.parse(e.target.result);
        if (chatData.id && chatData.messages) {
          // Add to chat history
          const updatedHistory = {
            ...chatHistory,
            [chatData.id]: chatData
          };
          
          setChatHistory(updatedHistory);
          localStorage.setItem('documentGeneratorChats', JSON.stringify(updatedHistory));
          
          // Load the imported chat
          loadChat(chatData.id);
          
          // Show success notification
          setNotification({
            type: 'success',
            message: 'Chat imported successfully'
          });
          setShowNotification(true);
          
          // Hide notification after 3 seconds
          setTimeout(() => {
            setShowNotification(false);
          }, 3000);
        } else {
          throw new Error('Invalid chat data format');
        }
      } catch (error) {
        console.error('Error importing chat:', error);
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: "Error importing chat: Invalid format",
          isBot: true
        }]);
        
        // Show error notification
        setNotification({
          type: 'error',
          message: 'Error importing chat: Invalid format'
        });
        setShowNotification(true);
        
        // Hide notification after 3 seconds
        setTimeout(() => {
          setShowNotification(false);
        }, 3000);
      }
    };
    
    reader.readAsText(file);
  };

  // Render the chat list
  const renderChatList = () => {
    // Convert chat history object to array and sort by last updated time
    const chats = Object.values(chatHistory).sort((a, b) => 
      new Date(b.lastUpdated) - new Date(a.lastUpdated)
    );
    
    return (
      <div className="absolute left-0 top-0 w-64 h-full bg-white border-r shadow-lg z-50 overflow-y-auto">
        <div className="p-3 border-b flex justify-between items-center bg-blue-600 text-white">
          <h3 className="font-semibold">Conversations</h3>
          <button onClick={() => setShowChatList(false)} className="p-1 hover:bg-blue-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-2">
          <button 
            onClick={createNewChat}
            className="w-full p-2 mb-3 bg-blue-600 text-white rounded flex items-center justify-center gap-2 hover:bg-blue-700"
          >
            <MessageSquare className="w-4 h-4" />
            <span>New Chat</span>
          </button>
          
          <div className="flex justify-between mb-3">
            <input 
              type="file" 
              id="import-chat" 
              accept=".json" 
              onChange={importChatFromJson} 
              className="hidden" 
            />
            <label 
              htmlFor="import-chat" 
              className="p-2 bg-gray-200 rounded text-xs cursor-pointer hover:bg-gray-300 flex-1 text-center mr-1"
            >
              Import Chat
            </label>
            
            <button 
              onClick={() => exportChatAsJson(currentChatId)}
              className="p-2 bg-gray-200 rounded text-xs hover:bg-gray-300 flex-1 ml-1"
              disabled={!currentChatId || !chatHistory[currentChatId]}
            >
              Export Current
            </button>
          </div>
        </div>
        
        <div className="chat-list">
          {chats.length === 0 ? (
            <div className="p-3 text-center text-gray-500 text-sm">
              No saved conversations
            </div>
          ) : (
            chats.map(chat => (
              <div 
                key={chat.id} 
                className={`p-3 border-b cursor-pointer hover:bg-gray-100 flex justify-between items-center ${
                  chat.id === currentChatId ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                }`}
                onClick={() => loadChat(chat.id)}
              >
                <div className="flex-1 truncate pr-2">
                  <div className="font-medium text-sm">{chat.title || 'Untitled Chat'}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(chat.lastUpdated).toLocaleString()}
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDeleteChat(chat.id);
                  }}
                  className="p-1 text-gray-500 hover:text-red-500 hover:bg-gray-200 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Add a new function to render chat tabs at the top
  const renderChatTabs = () => {
    // Convert chat history object to array and sort by last updated time
    const chats = Object.values(chatHistory).sort((a, b) => 
      new Date(b.lastUpdated) - new Date(a.lastUpdated)
    );
    
    return (
      <div className="bg-white border-b shadow-sm">
        <div className="flex items-center px-4 overflow-x-auto">
          {/* New Chat Tab - Always First */}
          <div 
            onClick={createNewChat}
            className="flex items-center px-4 py-2 mx-1 rounded-t-lg cursor-pointer transition-colors bg-blue-600 text-white hover:bg-blue-700"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">New Chat</span>
          </div>

          {/* Divider */}
          {chats.length > 0 && (
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
          )}
          
          {/* Chat Tabs */}
          <div className="flex overflow-x-auto hide-scrollbar">
            {chats.map(chat => {
              // Format the date for the tab
              const date = new Date(chat.lastUpdated);
              const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
              
              // Generate tab title
              const tabTitle = chat.documentData?.type 
                ? `${chat.documentData.type} - ${formattedDate}`
                : `New Chat - ${formattedDate}`;

              return (
                <div 
                  key={chat.id}
                  className={`flex items-center px-4 py-2 mx-1 rounded-t-lg cursor-pointer transition-colors ${
                    chat.id === currentChatId 
                      ? 'bg-gray-100 text-gray-900 border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => loadChat(chat.id)}
                >
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {tabTitle}
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDeleteChat(chat.id);
                    }}
                    className={`ml-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity ${
                      chat.id === currentChatId ? 'opacity-100' : ''
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add custom scrollbar styles */}
        <style jsx>{`
          .hide-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;     /* Firefox */
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none;             /* Chrome, Safari and Opera */
          }
        `}</style>
      </div>
    );
  };

  // Add notification component
  const renderNotification = () => {
    if (!showNotification) return null;
    
    return (
      <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      }`}>
        {notification.message}
      </div>
    );
  };
  
  // Add confirmation dialog
  const renderDeleteConfirmation = () => {
    if (!showDeleteConfirm) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
          <p className="mb-6">Are you sure you want to delete this chat? This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <button 
              onClick={cancelDelete}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirmedDelete}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  const [ws, setWs] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState([]);

  // Add addMessageToChat function
  const addMessageToChat = (message) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: message.content,
      isBot: message.type === 'bot',
      timestamp: message.timestamp
    }]);
  };

  // Function to connect to WebSocket
  const connectWebSocket = () => {
    // Close existing connection if any
    if (ws && ws.readyState !== WebSocket.CLOSED) {
      ws.close();
    }

    const socket = new WebSocket('ws://localhost:8000/ws/process-poster');
    
    socket.onopen = () => {
      console.log('WebSocket Connected');
      // Remove any existing loading messages
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      addMessageToChat({
        type: 'bot',
        content: 'Connected to server. Processing poster...',
        timestamp: new Date().toISOString(),
        isLoading: true
      });
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.status === 'error') {
        // Remove loading message and show error
        setMessages(prev => prev.filter(msg => !msg.isLoading));
        addMessageToChat({
          type: 'bot',
          content: `Error: ${data.message}`,
          timestamp: new Date().toISOString()
        });
        setIsProcessing(false);
        setPosterProcessing(false);
        return;
      }

      if (data.status === 'processing') {
        // Update progress
        setProcessingProgress(prev => [...prev, data]);
        
        // Remove previous loading message and add new progress message
        setMessages(prev => prev.filter(msg => !msg.isLoading));
        addMessageToChat({
          type: 'bot',
          content: data.message,
          timestamp: new Date().toISOString(),
          isLoading: true
        });
      }

      if (data.status === 'complete' || data.status === 'success') {
        // Remove loading message
        setMessages(prev => prev.filter(msg => !msg.isLoading));
        
        // Add completion message
        addMessageToChat({
          type: 'bot',
          content: 'Poster processing complete! Starting document generation...',
          timestamp: new Date().toISOString()
        });

        // Process the extracted data automatically
        if (data.data) {
          processExtractedData(data.data);
        }

        setIsProcessing(false);
        setPosterProcessing(false);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      // Remove loading message and show error
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      addMessageToChat({
        type: 'bot',
        content: 'Error connecting to the server. Please try again.',
        timestamp: new Date().toISOString()
      });
      setIsProcessing(false);
      setPosterProcessing(false);
    };

    socket.onclose = () => {
      console.log('WebSocket Disconnected');
      setIsProcessing(false);
      setPosterProcessing(false);
    };

    setWs(socket);
    return socket;
  };

  // Modified handlePosterUpload function
  const handlePosterUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setPosterProcessing(true);
    setProcessingProgress([]);

    // Add initial message to chat with loading state
    addMessageToChat({
      type: 'bot',
      content: 'Starting poster processing...',
      timestamp: new Date().toISOString(),
      isLoading: true,
      isLoader: true
    });

    try {
      // Connect to WebSocket
      const socket = connectWebSocket();

      // Wait for the connection to be established
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 5000); // 5 second timeout

        if (socket.readyState === WebSocket.OPEN) {
          clearTimeout(timeout);
          resolve();
        } else {
          socket.onopen = () => {
            clearTimeout(timeout);
            resolve();
          };
          socket.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
        }
      });

      // Read and send image data
      const reader = new FileReader();
      reader.onload = () => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(reader.result);
        } else {
          // Remove loading message and show error
          setMessages(prev => prev.filter(msg => !msg.isLoading));
          addMessageToChat({
            type: 'bot',
            content: 'Error: WebSocket connection is not ready. Please try again.',
            timestamp: new Date().toISOString()
          });
          setPosterProcessing(false);
          setIsProcessing(false);
        }
      };
      reader.onerror = (error) => {
        // Remove loading message and show error
        setMessages(prev => prev.filter(msg => !msg.isLoading));
        addMessageToChat({
          type: 'bot',
          content: `Error reading file: ${error.message}`,
          timestamp: new Date().toISOString()
        });
        setPosterProcessing(false);
        setIsProcessing(false);
      };
      reader.readAsArrayBuffer(file);

    } catch (error) {
      console.error('Error:', error);
      // Remove loading message and show error
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      addMessageToChat({
        type: 'bot',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      setPosterProcessing(false);
      setIsProcessing(false);
    }
  };

  // Reset processing state when component unmounts
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
      setIsProcessing(false);
      setPosterProcessing(false);
      setProcessingProgress([]);
    };
  }, []);

  // Update processing state when poster upload starts
  useEffect(() => {
    if (posterProcessing) {
      setIsProcessing(true);
    } else {
      // Add a small delay before enabling buttons to prevent accidental clicks
      const timer = setTimeout(() => {
        setIsProcessing(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [posterProcessing]);

  // Add new function to handle automated responses
  const processExtractedData = (data) => {
    // Set document type and start the flow
    setDocumentData({
      type: 'GuestLecture',
      currentField: 'Guest Name',
      awaitingInput: true,
      fields: {}
    });

    // Add initial message
    addMessageToChat({
      type: 'user',
      content: 'guest lecture',
      timestamp: new Date().toISOString()
    });

    // Function to simulate the conversation
    const simulateField = (field, value, nextField, nextQuestion) => {
      return new Promise(resolve => {
        // Bot asks question
        addMessageToChat({
          type: 'bot',
          content: field.question,
          timestamp: new Date().toISOString()
        });

        // Simulate user response
        setTimeout(() => {
          if (value) {
            addMessageToChat({
              type: 'user',
              content: value,
              timestamp: new Date().toISOString()
            });

            // Update document data
            setDocumentData(prev => ({
              ...prev,
              fields: {
                ...prev.fields,
                [field.name]: value
              }
            }));

            if (nextField && nextQuestion) {
              setDocumentData(prev => ({
                ...prev,
                currentField: nextField,
                awaitingInput: true
              }));
            }
          }
          resolve();
        }, 500);
      });
    };

    // Process fields sequentially
    const processFields = async () => {
      const fields = [
        { name: 'Guest Name', value: data.document_fields?.['Guest Name'] || data.guest_name, question: "Please enter the name of the guest lecturer:" },
        { name: 'Guest Designation', value: data.document_fields?.['Guest Designation'] || data.guest_designation, question: "Please enter the guest's designation:" },
        { name: 'Topic', value: data.document_fields?.['Topic'] || data.event_title, question: "Please enter the topic of the lecture:" },
        { name: 'Event Date', value: data.document_fields?.['Event Date'] || data.event_date, question: "Please select the event date:", type: "date" },
        { name: 'Organizer Department', value: data.document_fields?.['Organizer Department'] || data.department, question: "Please select the organizing department:", type: "department" },
        { name: 'Organizer Faculty Name', value: data.document_fields?.['Organizer Faculty Name'] || data.coordinator, question: "Please enter the faculty coordinator's name:" },
        { name: 'Activity Code', value: null, question: "Please enter the activity code:" },
        { name: 'Year', value: null, question: "Please select the target year:", type: "year" },
        { name: 'No Of Count', value: null, question: "Please enter the expected number of participants:" }
      ];

      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const nextField = fields[i + 1];
        
        if (field.value) {
          await simulateField(
            field,
            field.value,
            nextField?.name,
            nextField?.question
          );
        } else {
          // For missing fields, wait for manual input
          addMessageToChat({
            type: 'bot',
            content: field.question,
            timestamp: new Date().toISOString()
          });
          
          setDocumentData(prev => ({
            ...prev,
            currentField: field.name,
            awaitingInput: true
          }));
          
          // Handle special field types
          if (field.type === 'date') {
            setShowDatePicker(true);
          } else if (field.type === 'department') {
            setShowDepartmentOptions(true);
          } else if (field.type === 'year') {
            setShowYearOptions(true);
          }
          
          // Wait for user input
          await new Promise(resolve => {
            const checkInterval = setInterval(() => {
              if (documentData.fields[field.name]) {
                clearInterval(checkInterval);
                resolve();
              }
            }, 100);
          });
        }
      }
    };

    // Start processing fields
    processFields();
  };

  // Modify the main component return to handle the case when no chat is selected
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
      
      {/* Add notification and confirmation dialog */}
      {renderNotification()}
      {renderDeleteConfirmation()}
      
      <div className="h-full relative flex flex-col" ref={containerRef}>
        {/* Show chat list if open */}
        {showChatList && renderChatList()}
        
        {!currentChatId ? (
          // Show welcome screen when no chat is selected
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
              <FileText className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              <h2 className="text-2xl font-bold mb-4">Welcome to Document Generator</h2>
              <p className="mb-6 text-gray-600">
                Create AI-powered documents with ease. Start by creating a new conversation.
              </p>
              <button 
                onClick={createNewChat}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg flex items-center gap-2 mx-auto hover:bg-blue-700"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Start New Chat</span>
              </button>
            </div>
          </div>
        ) : (
          // Regular UI when a chat is selected
          <>
            {/* Chat tabs at the top */}
            {renderChatTabs()}
            
            <div className="flex flex-1 overflow-hidden">
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
                      <select
                        onChange={(e) => handleDepartmentSelect(e.target.value)}
                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Department</option>
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
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
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentGenerate; 