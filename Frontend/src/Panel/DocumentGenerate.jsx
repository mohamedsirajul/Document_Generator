import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, AlignmentType, ImageRun } from 'docx';
import { saveAs } from 'file-saver';

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
    },
    getContent: () => {
      try {
        console.log('getContent called in CustomQuillEditor');
        // First try to get the content from the editor
        if (editorRef.current) {
          const editor = editorRef.current.getEditor();
          if (editor && editor.root) {
            console.log('Getting content from editor.root.innerHTML');
            return editor.root.innerHTML || '';
          }
        }
        
        // If that fails, try to get it from the DOM directly
        const editorEl = document.querySelector('.ql-editor');
        if (editorEl) {
          console.log('Getting content from DOM .ql-editor element');
          return editorEl.innerHTML || '';
        }
        
        console.warn('Could not get editor content from any source');
        return '';
      } catch (error) {
        console.error('Error in getContent:', error);
        return '';
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
  // Core state declarations
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatHistory, setChatHistory] = useState({});
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isEditing, setIsEditing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessageId, setLoadingMessageId] = useState(null);
  const [posterProcessing, setPosterProcessing] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [documentData, setDocumentData] = useState({
    type: null,
    currentField: null,
    fields: {}
  });
  const [showChatList, setShowChatList] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [showNotification, setShowNotification] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState({
    fontSize: '16px',
    fontFamily: 'Arial',
    lastSelection: null
  });

  // Refs
  const editorRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Chat content utility functions
  const saveChatContent = (chatId, editorContent, previewContent) => {
    console.log(`Saving chat content for chat ${chatId}`);
    try {
      // Get existing chat data from localStorage
      const chatData = JSON.parse(localStorage.getItem('documentGeneratorChats')) || {};
      
      // Create new entry if chat doesn't exist
      if (!chatData[chatId]) {
        console.log(`Creating new chat entry for ${chatId}`);
        chatData[chatId] = {
          id: chatId,
          messages: messages,
          lastUpdated: new Date().toISOString(),
          title: determineConversationTitle(),
          content: {}
        };
      }
      
      // Update the content with original structure
      const updatedContent = {
        ...(chatData[chatId].content || {}),
            editorContent,
            lastUpdated: new Date().toISOString()
      };
      
      // Only update previewContent if it's provided
      if (previewContent !== null) {
        updatedContent.previewContent = previewContent;
          }
      
      chatData[chatId] = {
        ...chatData[chatId],
        content: updatedContent
        };
      
      // Save to localStorage
        localStorage.setItem('documentGeneratorChats', JSON.stringify(chatData));
      console.log(`Successfully saved chat ${chatId} content`);
    } catch (error) {
      console.error('Error saving chat content:', error);
      // Log details about the data that we're trying to save
      console.error('Chat ID:', chatId);
      console.error('Editor content length:', editorContent ? editorContent.length : 'undefined');
      console.error('Preview content length:', previewContent ? previewContent.length : 'undefined');
      
      // Check if we're hitting localStorage limits
      try {
        const totalSize = new Blob([JSON.stringify(localStorage)]).size;
        console.error('Current localStorage size:', totalSize, 'bytes');
        console.error('Remaining localStorage space:', (5 * 1024 * 1024) - totalSize, 'bytes');
      } catch (e) {
        console.error('Error calculating localStorage size:', e);
      }
      
      throw new Error(`Failed to save chat content: ${error.message}`);
    }
  };

  const loadChatContent = (chatId) => {
    try {
      const chatData = JSON.parse(localStorage.getItem('documentGeneratorChats')) || {};
      if (chatData[chatId]?.content) {
        return {
          editorContent: chatData[chatId].content.editorContent || '',
          previewContent: chatData[chatId].content.previewContent || null
        };
      }
    } catch (error) {
      console.error('Error loading chat content:', error);
    }
    return { editorContent: '', previewContent: null };
  };

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
    setHasUnsavedChanges(true);
    
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
    
    // Save editor content to documentGeneratorChats for the current chat
    if (currentChatId) {
      saveChatContent(currentChatId, content, null);
    }
  };

  // Helper function to save editor content for a specific chat
  const saveEditorContentForChat = (chatId, content) => {
    saveChatContent(chatId, content, null);
  };

  // Helper function to load editor content for a specific chat - keep this for clarity
  const loadEditorContentForChat = (chatId) => {
    try {
      const chatData = JSON.parse(localStorage.getItem('documentGeneratorChats')) || {};
      return chatData[chatId]?.content?.editorContent || '';
    } catch (error) {
      console.error('Error loading editor content for chat:', error);
      return '';
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

`;

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
  
  // Update renderMessage function to show full-size images in chat
  const renderMessage = (message) => {
    const isBot = message.isBot;
    const messageClass = isBot 
      ? 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200'
      : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white';
    const alignmentClass = isBot ? 'justify-start' : 'justify-end';

    // Function to format welcome message with options
    const formatWelcomeMessage = (text) => {
      if (!text.includes("Hello! I'm Siraj AI!")) return text;

      const parts = text.split('Please select from the following options:');
      if (parts.length !== 2) return text;

      const [intro, options] = parts;
      const optionsList = options.split(/\d+\./).filter(Boolean)
        .map(option => option.trim())
        .filter(option => option !== '');

      return (
        <div className="space-y-4">
          <p className={`${isBot ? 'text-gray-800' : 'text-white'} font-medium`}>{intro.trim()}</p>
          <p className={`${isBot ? 'text-gray-800' : 'text-white'} font-medium`}>Please select from the following options:</p>
          <div className="space-y-2">
            {optionsList.map((option, index) => (
              <div key={index} className="flex items-start gap-3 group">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full text-sm font-medium shadow-sm group-hover:shadow-md transition-shadow">
                  {index + 1}
                </span>
                <span className={`${isBot ? 'text-gray-800' : 'text-white'} group-hover:opacity-90 transition-opacity`}>
                  {option}
                </span>
                </div>
            ))}
              </div>
          <div className={`mt-4 ${isBot ? 'text-gray-800' : 'text-white'}`}>
            Or, if you have an existing PDF report, click the "Upload PDF" button below to extract and edit its content.
          </div>
        </div>
      );
    };

      return (
      <div key={message.id} className={`flex ${alignmentClass} mb-6 px-4`}>
        <div className={`flex ${isBot ? 'flex-row' : 'flex-row-reverse'} items-start max-w-[85%] group`}>
          {/* Static bot profile or user profile */}
          {isBot && !message.isLoading ? (
            <BotProfile />
          ) : !message.isLoading && (
            <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden mx-2 ring-2 ring-blue-500/20">
              <img
                src={`${process.env.PUBLIC_URL}/user-avatar.png`}
                alt="User"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234B5563"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>';
                }}
              />
            </div>
          )}

          {/* Message Content */}
          <div className="flex flex-col flex-1">
            {/* Sender Name - Only show for non-loading messages */}
            {!message.isLoading && (
              <div className={`text-sm font-medium mb-1 ${isBot ? 'text-gray-700' : 'text-right text-gray-700'}`}>
                {isBot ? 'Siraj AI' : 'Mohamed Siraj'}
          </div>
            )}
            
            {/* Message Bubble */}
            <div className={`${messageClass} p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow ${message.isLoading ? 'ml-12' : ''}`}>
              {message.isLoading ? (
                <div className="flex items-center">
                  <span className="mr-2 text-gray-800">{message.text}</span>
                  <div className="loading-dots inline-flex">
                    <span className="dot">.</span>
                    <span className="dot">.</span>
                    <span className="dot">.</span>
          </div>
                  <style jsx>{`
                    .loading-dots .dot {
                      animation: blink 1.4s infinite both;
                      font-size: 20px;
                      line-height: 1;
                      margin: 0 1px;
                      color: #4B5563;
                    }
                    .loading-dots .dot:nth-child(2) { animation-delay: 0.2s; }
                    .loading-dots .dot:nth-child(3) { animation-delay: 0.4s; }
                    @keyframes blink {
                      0%, 100% { opacity: 0.2; }
                      20% { opacity: 1; }
                    }
                  `}</style>
                </div>
              ) : message.buttons ? (
                <div>
                  <div className={`${isBot ? 'text-gray-800' : 'text-white'} mb-3`}>{message.text}</div>
                  <div className="flex flex-wrap gap-2">
            {message.buttons.map((button, index) => (
              <button
                key={index}
                onClick={() => handleChatButtonClick(button.action)}
                        className={`px-4 py-2 ${
                          isBot 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-white text-blue-600 hover:bg-blue-50'
                        } rounded shadow-sm hover:shadow-md transition-all`}
              >
                {button.text}
              </button>
            ))}
          </div>
        </div>
              ) : (
                <div className={`${isBot ? 'text-gray-800' : 'text-white'} break-words`}>
                  {formatWelcomeMessage(message.text)}
          </div>
              )}
              
              {/* Timestamp - Only show for non-loading messages */}
              {!message.isLoading && message.timestamp && (
                <div className={`text-xs mt-2 ${
                  isBot ? 'text-gray-500' : 'text-blue-100'
                } ${isBot ? 'text-left' : 'text-right'}`}>
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add a chat list toggle button to the chat header
  const renderChatHeader = () => (
    <div className="flex items-center justify-between p-4 border-b bg-white">
      <div className="flex items-center">
        <button 
          onClick={() => setShowChatList(true)}
          className="p-2 hover:bg-gray-100 rounded-full mr-2"
        >
          <ListIcon size={20} />
        </button>
        <h2 className="text-lg font-medium">
          {currentChatId ? `New Chat - ${currentChatId.replace('chat_', '')}` : 'New Chat'}
        </h2>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">
          {messages.length} messages
        </span>
        <div>
          <span className="text-sm text-gray-500">
            {messages.length > 0 ? `Last updated: ${new Date(messages[messages.length - 1].timestamp).toLocaleString()}` : ''}
        </span>
        </div>
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
            disabled={isLoading || posterProcessing || isPdfUploading || isImageUploading}
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

  // Add an effect to save editor content when chat ID changes or component unmounts
  useEffect(() => {
    // This function handles saving editor content when tab changes or component unmounts
    const saveCurrentEditorContent = () => {
      if (currentChatId && editorContent) {
        // Save to the custom saveChatContent function
        saveChatContent(currentChatId, editorContent, null);
        
        // Also update the complete chat history in localStorage
        const updatedHistory = {
          ...chatHistory,
          [currentChatId]: {
            ...chatHistory[currentChatId],
            content: {
              ...(chatHistory[currentChatId]?.content || {}),
              editorContent: editorContent,
              lastUpdated: new Date().toISOString()
            },
            lastUpdated: new Date().toISOString()
          }
        };
        
        try {
          localStorage.setItem('documentGeneratorChats', JSON.stringify(updatedHistory));
        } catch (error) {
          console.error('Error saving editor content on unmount:', error);
        }
      }
    };
    
    // Set up cleanup function to save content when unmounting or changing tabs
    return saveCurrentEditorContent;
  }, [currentChatId, editorContent, chatHistory]);

  // Update handleGenerateContent function
  const handleGenerateContent = async () => {
    setIsLoading(true);
    try {
      // Add loading message to chat
      const newLoadingMessageId = Date.now();
      setLoadingMessageId(newLoadingMessageId);
      setMessages(prev => [...prev, {
        id: newLoadingMessageId,
        text: 'Started Generating document content...',
        isBot: true
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

      // Close existing WebSocket connection if any
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
      }

      // Create new WebSocket connection for content generation
      const socket = new WebSocket('ws://localhost:8000/ws/generate-content');
      
      socket.onopen = () => {
        console.log('WebSocket Connected for content generation');
        // Send the document data
        socket.send(JSON.stringify({
          type: documentData.type,
          fields: fieldsToSend
        }));
      };

      let accumulatedContent = '';
      let currentSection = '';

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'error') {
          // Remove loading message and show error
          setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: `Error: ${data.error}`,
            isBot: true,
            isError: true
          }]);
          setIsLoading(false);
          setLoadingMessageId(null);
          return;
        }

        if (data.type === 'token') {
          // Accumulate content
          accumulatedContent += data.content;

          // Update the last message with the current content
          setMessages(prev => {
            const messages = [...prev];
            
            // Remove any existing content messages and loading message
            const filteredMessages = messages.filter(msg => !msg.isContent && msg.id !== loadingMessageId);
            
            // Format the content properly
            let formattedContent = '';
            try {
              const parsedContent = JSON.parse(accumulatedContent);
              if (parsedContent.sections) {
                // Only get the content without section headers
                formattedContent = Object.values(parsedContent.sections).join('\n\n');
              } else {
                formattedContent = accumulatedContent;
              }
            } catch (e) {
              formattedContent = accumulatedContent;
            }

            // Add the content message
            filteredMessages.push({
              id: Date.now(),
              text: formattedContent,
              isBot: true,
              isContent: true
            });

            // Add the loading message
            filteredMessages.push({
              id: loadingMessageId,
              text: 'Generating document content...',
              isBot: true,
              isLoading: true
            });
            

            return filteredMessages;
          });
        }

        if (data.type === 'complete') {
          // Process complete response
          const content = data.content || '';
          const pages = content.split('<div class="page-break"></div>');
          setDocumentContent(pages);
          setTotalPages(pages.length);


          // Update editor content without changing cursor position
          setEditorContent(content);

          // Store the content in localStorage
          // localStorage.setItem('documentEditorContent', content);
          // localStorage.setItem('documentContent', JSON.stringify(pages));

          // Also update the chatHistory with this content
          const updatedHistory = {
            ...chatHistory,
            [currentChatId]: {
              ...chatHistory[currentChatId],
              content: {
                editorContent: content,
                previewContent: pages.join('<div class="page-break"></div>'),
                lastUpdated: new Date().toISOString()
              },
              lastUpdated: new Date().toISOString()
            }
          };
          setChatHistory(updatedHistory);
          localStorage.setItem('documentGeneratorChats', JSON.stringify(updatedHistory));

          // Remove loading message and show success message
          setMessages(prev => {
            const messages = [...prev];
            
            // Remove any existing content messages and loading message
            const filteredMessages = messages.filter(msg => !msg.isContent && msg.id !== loadingMessageId);
            
            // Format the final content properly
            let formattedContent = '';
            if (data.sections) {
              // Only get the content without section headers
              formattedContent = Object.values(data.sections).join('\n\n');
            } else {
              formattedContent = content;
            }

            // Add the final content message
            filteredMessages.push({
              id: Date.now(),
              text: formattedContent,
              isBot: true,
              isContent: true
            });

            // Add success message
            filteredMessages.push({
              id: Date.now() + 1,
              text: "Document has been generated successfully!",
              isBot: true
            });

            // Then ask about images
            filteredMessages.push({
              id: Date.now() + 2,
              text: "Would you like to add event images to your document?",
              isBot: true
            });

            // Add buttons for Yes/No
            filteredMessages.push({
              id: Date.now() + 3,
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
            });

            // Save the content for this chat
            saveChatContent(currentChatId, content, data);

            return filteredMessages;
          });

          // Store the complete response for preview
          setPreviewContent(data);
          // localStorage.setItem('previewContent', JSON.stringify(data));
          setWordCount(data.word_count);

          // Reset currentField to indicate all required fields are collected
          setDocumentData(prev => ({
            ...prev,
            currentField: null
          }));

          // Clear loading state
          setIsLoading(false);
          setLoadingMessageId(null);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: 'Error connecting to server. Please try again.',
          isBot: true,
          isError: true
        }]);
        setIsLoading(false);
        setLoadingMessageId(null);
      };

      socket.onclose = () => {
        console.log('WebSocket connection closed');
        setIsLoading(false);
        setLoadingMessageId(null);
      };

      // Store the WebSocket instance
      setWs(socket);

    } catch (error) {
      console.error('Error:', error);
      // Remove any existing loading message
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));
      
      // Add error message with proper formatting
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `Error: ${error.message}`,
        isBot: true,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      setLoadingMessageId(null);
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

          // Load saved content if available - ensure we check for content properly
          if (recentChat.content) {
            console.log("Loading editor content from saved chat:", recentChat.content);
            setEditorContent(recentChat.content.editorContent || '');
            
            // Handle preview content
            if (recentChat.content.previewContent) {
              let previewPages = [];
              
              if (typeof recentChat.content.previewContent === 'string') {
                previewPages = recentChat.content.previewContent.split('<div class="page-break"></div>');
              } else if (recentChat.content.previewContent.content) {
                previewPages = recentChat.content.previewContent.content.split('<div class="page-break"></div>');
              } else if (Array.isArray(recentChat.content.previewContent)) {
                previewPages = recentChat.content.previewContent;
              }
              
              setPreviewContent(recentChat.content.previewContent);
              setDocumentContent(previewPages.length > 0 ? previewPages : ['']);
              setTotalPages(previewPages.length > 0 ? previewPages.length : 1);
              setCurrentPage(1);
            }
          }
        }
      } catch (e) {
        console.error('Error parsing saved chats:', e);
      }
    }
    // Note: We don't automatically create a new chat here anymore
  }, []);

  // Only keep one useEffect to save content when it changes
  useEffect(() => {
    if (currentChatId && (editorContent || documentContent.length > 0)) {
      const chatData = JSON.parse(localStorage.getItem('documentGeneratorChats')) || {};
      if (chatData[currentChatId]) {
        chatData[currentChatId] = {
          ...chatData[currentChatId],
          content: {
            editorContent: editorContent || chatData[currentChatId].content?.editorContent || '',
            previewContent: documentContent.length > 0 ? documentContent.join('<div class="page-break"></div>') : chatData[currentChatId].content?.previewContent || null,
            lastUpdated: new Date().toISOString()
          }
        };
        localStorage.setItem('documentGeneratorChats', JSON.stringify(chatData));
      }
    }
  }, [editorContent, documentContent, currentChatId]);

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

    // Save current editor content when sending a message
    if (currentChatId && editorContent) {
      saveChatContent(currentChatId, editorContent, null);
    }

    // Clear input
    setInputMessage('');

    // Check for clear command
    if (message.toLowerCase() === 'clear') {
      clearChat();
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
`,
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
    
    window.location.reload();
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

  const generatePDF = async () => {
    if (editorRef.current) {
      try {
        // Create a temporary container
        const container = document.createElement('div');
        
        // Set container styles
        container.style.width = '794px'; // A4 width in pixels
        container.style.margin = '0';
        container.style.padding = '40px';
        container.style.backgroundColor = 'white';
        container.style.display = 'block';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.zIndex = '-9999';
        
        // Add content to container
        container.innerHTML = `
          <div style="font-family: Arial, sans-serif;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 20px;">
              <img 
                src="${logoUrl}"
                alt="FXEC Logo" 
                style="height: 50px; margin-bottom: 8px;"
              />
              <h1 style="font-size: 16px; font-weight: bold; text-transform: uppercase; margin: 8px 0;">
                ${documentData.type || 'GUEST LECTURE REPORT'}
              </h1>
              <div style="width: 100px; height: 2px; background-color: #2563eb; margin: 8px auto;"></div>
            </div>

            <!-- Details Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 4px 0;">
                  <span style="font-weight: 600;">Topic:</span>
                  <span style="margin-left: 5px;">${documentData.fields?.Topic || ''}</span>
                </td>
                <td style="padding: 4px 0; text-align: right;">
                  <span style="font-weight: 600;">Event Date:</span>
                  <span style="margin-left: 5px;">${documentData.fields?.['Event Date'] || ''}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 4px 0;">
                  <span style="font-weight: 600;">Guest Name:</span>
                  <span style="margin-left: 5px;">${documentData.fields?.['Guest Name'] || ''}</span>
                </td>
                <td style="padding: 4px 0; text-align: right;">
                  <span style="font-weight: 600;">Activity Code:</span>
                  <span style="margin-left: 5px;">${documentData.fields?.['Activity Code'] || ''}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 4px 0;">
                  <span style="font-weight: 600;">Designation:</span>
                  <span style="margin-left: 5px;">${documentData.fields?.['Guest Designation'] || ''}</span>
                </td>
                <td style="padding: 4px 0; text-align: right;">
                  <span style="font-weight: 600;">Coordinator:</span>
                  <span style="margin-left: 5px;">${documentData.fields?.['Organizer Faculty Name'] || ''}</span>
                </td>
              </tr>
            </table>

            <div style="border-top: 1px solid #d1d5db; margin: 20px 0;"></div>

            <!-- Main Content -->
            <div style="font-size: ${selectedFormat.fontSize}; line-height: 1.6; text-align: justify;">
              ${editorRef.current.getEditor().root.innerHTML}
            </div>

            <!-- Signature -->
            <div style="margin-top: 30px; text-align: right;">
              <div style="display: inline-block; text-align: center;">
                <div style="margin-bottom: 25px;">____________________</div>
                <div style="font-weight: bold;">Signature</div>
                <div>Head of Department</div>
              </div>
            </div>
          </div>
        `;

        // Add container to document body temporarily
        document.body.appendChild(container);

        // Wait for images to load
        await new Promise((resolve) => {
          const images = container.getElementsByTagName('img');
          let loadedImages = 0;
          const totalImages = images.length;

          if (totalImages === 0) resolve();

          Array.from(images).forEach(img => {
            if (img.complete) {
              loadedImages++;
              if (loadedImages === totalImages) resolve();
            } else {
              img.onload = () => {
                loadedImages++;
                if (loadedImages === totalImages) resolve();
              };
              img.onerror = () => {
                loadedImages++;
                if (loadedImages === totalImages) resolve();
              };
            }
          });

          // Fallback timeout
          setTimeout(resolve, 1000);
        });

        // Get the actual height of the content
        const contentHeight = container.offsetHeight;
        
        // Create PDF with custom dimensions
        const pdf = new jsPDF({
          unit: 'px',
          format: [794, Math.max(1123, contentHeight + 80)], // minimum A4 height or content height
          orientation: 'portrait'
        });

        // Convert HTML to canvas with proper dimensions
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          scrollY: 0,
          height: contentHeight,
          windowHeight: contentHeight,
          width: 794,
          windowWidth: 794,
          logging: false,
          onclone: (clonedDoc) => {
            const clonedContainer = clonedDoc.querySelector('div');
            if (clonedContainer) {
              clonedContainer.style.visibility = 'visible';
            }
          }
        });

        // Add the canvas to PDF with proper scaling
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        pdf.addImage(imgData, 'JPEG', 0, 0, 794, contentHeight);

        // Save the PDF
        pdf.save(`${documentData.type || 'document'}.pdf`);

        // Cleanup
        document.body.removeChild(container);

      } catch (error) {
        console.error('PDF Generation Error:', error);
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            text: 'Error generating PDF. Please try again.',
            isBot: true,
            isError: true
          }
        ]);
      }
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
              style={{ 
                fontFamily: `${selectedFormat.fontFamily}, sans-serif`,
                fontSize: selectedFormat.fontSize
              }}
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(previewContent || content || '')
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
            <button
            onClick={() => {
              if (isEditing) {
                // Switching to preview mode
                // First get the current content from the editor
                if (editorRef.current && editorRef.current.getEditor) {
                  const editor = editorRef.current.getEditor();
                  if (editor && editor.root) {
                    const latestContent = editor.root.innerHTML;
                    // Update content state directly before toggling view
                    setEditorContent(latestContent);
                    setPreviewContent(latestContent);
                  }
                }
              }
              // Toggle editing mode
              setIsEditing(!isEditing);
            }}
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
          <button
            onClick={generateDOCX}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Export DOCX</span>
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
  const handleSaveDocument = async () => {
    try {
      console.log('Saving document...', editorRef.current);
      
      // Get current editor content - start with React state
      let currentEditorContent = editorContent || '';
      
      // First, check if we already have content in state
      if (currentEditorContent && currentEditorContent.trim()) {
        console.log('Using content from React state:', currentEditorContent.substring(0, 100) + '...');
      } 
      // Then try getting it from the editor ref
      else if (editorRef.current) {
        console.log('Editor ref exists:', editorRef.current);
        
        // Check if getContent method exists
        if (typeof editorRef.current.getContent === 'function') {
          console.log('Using getContent method');
          currentEditorContent = editorRef.current.getContent();
        } 
        // Fall back to getEditor
        else if (editorRef.current.getEditor) {
          console.log('Using getEditor method');
          const editor = editorRef.current.getEditor();
          console.log('Editor object:', editor);
          
          if (editor && editor.root) {
            console.log('Accessing editor.root.innerHTML');
            currentEditorContent = editor.root.innerHTML;
          } else if (editor) {
            // Try other methods to get content
            console.log('Trying other methods to get content');
            try {
              // Try using getText and converting to HTML
              const text = editor.getText();
              currentEditorContent = `<p>${text}</p>`;
              console.log('Using editor.getText():', text);
            } catch (err) {
              console.error('Error getting text from editor:', err);
            }
          }
        }
      }
      
      // If we still don't have content, try getting it directly from the DOM
      if (!currentEditorContent) {
        console.log('Attempting to get content from DOM');
        const editorElement = document.querySelector('.ql-editor');
        if (editorElement) {
          currentEditorContent = editorElement.innerHTML;
          console.log('Content from DOM:', currentEditorContent.substring(0, 100) + '...');
        }
      }
      
      // Final fallback - use the current state value
      if (!currentEditorContent) {
        console.log('Using current state as fallback');
        currentEditorContent = currentEditorContent || '';
      }
      
      console.log('Final editor content length:', currentEditorContent.length);
      
      if (!currentEditorContent) {
        console.warn("Could not retrieve editor content");
        // Still continue with empty content instead of throwing
        currentEditorContent = '';
      }
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = currentEditorContent;
      const images = tempDiv.getElementsByTagName('img');
      console.log('Found images:', images.length);
      
      // Process content for preview - ensure images is properly handled
      console.log('Processing content for preview');
      const previewContent = processContentForPreview(currentEditorContent, images);
      
      // Save chat content
      console.log('Saving chat content for chat ID:', currentChatId);
      await saveChatContent(currentChatId, currentEditorContent, previewContent);
      
      // Update chat history with the latest content
      console.log('Updating chat history in localStorage');
      const existingHistory = JSON.parse(localStorage.getItem('documentGeneratorChats') || '{}');
      
      // Make sure the chat exists in history
      if (!existingHistory[currentChatId]) {
        console.log('Chat ID not found in history, creating new entry');
        existingHistory[currentChatId] = {
          id: currentChatId,
          messages: messages,
          lastUpdated: new Date().toISOString(),
          title: determineConversationTitle()
        };
      }
      
      const updatedHistory = {
        ...existingHistory,
        [currentChatId]: {
          ...existingHistory[currentChatId],
          content: {
            editorContent: currentEditorContent,
            previewContent,
            lastUpdated: new Date().toISOString()
          }
        }
      };
      
      localStorage.setItem('documentGeneratorChats', JSON.stringify(updatedHistory));
      setChatHistory(updatedHistory);
      
      // Update the editor content state
      setEditorContent(currentEditorContent);
      
      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
      
      // Show success message
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          text: 'Document saved successfully!',
          isBot: true,
          isSuccess: true
        }
      ]);
    } catch (error) {
      console.error('Error saving document:', error);
      // Create a detailed error message
      const errorDetails = error.message || 'Unknown error';
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          text: `Error saving document: ${errorDetails}. Please try again.`,
          isBot: true,
          isError: true
        }
      ]);
    }
  };

  // Add function to process content for preview to ensure images display correctly
  const processContentForPreview = (htmlContent, images) => {
    let processedContent = htmlContent;
    
    // Process images to ensure they are properly displayed in preview
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src && src.startsWith('data:')) {
        // Store base64 images in localStorage
        const imageKey = `img_${currentChatId}_${Date.now()}`;
        localStorage.setItem(imageKey, src);
        
        // Replace data URL with reference
        processedContent = processedContent.replace(src, `local://${imageKey}`);
      }
    });
    
    // Clean up any unnecessary formatting
    processedContent = processedContent
      .replace(/<p><br><\/p>/g, '<br>')
      .replace(/\s+/g, ' ')
      .trim();
      
    return processedContent;
  };

  // Add a function to automatically save when switching to preview mode
  useEffect(() => {
    // When changing from edit mode to preview mode
    if (!isEditing && editorRef.current) {
      try {
        console.log('Auto-saving document when switching to preview mode');
        
        // Get current editor content directly before saving
        let currentContent = '';
        if (editorRef.current && editorRef.current.getEditor) {
          const editor = editorRef.current.getEditor();
          if (editor && editor.root) {
            currentContent = editor.root.innerHTML;
          }
        }
        
        // If we got content, use it to update the state
        if (currentContent) {
          console.log('Setting preview content to match current editor content');
          setEditorContent(currentContent);
          
          // Also update preview content
          setPreviewContent(currentContent);
        }
        
        // Then save the document (will use our updated content)
      handleSaveDocument();
      } catch (error) {
        console.error('Error auto-saving document:', error);
        // Show error message but don't prevent switching to preview
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            text: 'Error auto-saving document. You can continue to preview, but your changes may not be saved.',
            isBot: true,
            isError: true
          }
        ]);
      }
    }
  }, [isEditing]);

  // Function to create a new chat
  const createNewChat = () => {
    // Save current editor content before creating new chat
    if (currentChatId && editorContent) {
      saveChatContent(currentChatId, editorContent, null);
    }
    
    // Generate a unique 6-digit ID
    const generateUniqueId = () => {
      const min = 100000;
      const max = 999999;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    
    // Ensure ID is unique
    let newId;
    do {
      newId = generateUniqueId();
    } while (chatHistory[`chat_${newId}`]);
    
    const newChatId = `chat_${newId}`;
    
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

`,
      isBot: true,
    }]);
    
    setDocumentData({
      type: null,
      currentField: null,
      fields: {}
    });
    
    // Clear editor content for new chat
    setEditorContent('');
    setDocumentContent([]);
    
    // Reset unsaved changes flag for new chat
    setHasUnsavedChanges(false);
    
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

`,
        isBot: true,
      }],
      lastUpdated: new Date().toISOString(),
      title: 'New Chat',
      documentData: {
        type: null,
        currentField: null,
        fields: {}
      },
      content: {
        editorContent: '',
        previewContent: null,
        lastUpdated: new Date().toISOString()
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

          // Load saved content if available - ensure we check for content properly
          if (recentChat.content) {
            console.log("Loading editor content from saved chat:", recentChat.content);
            setEditorContent(recentChat.content.editorContent || '');
            
            // Handle preview content
            if (recentChat.content.previewContent) {
              let previewPages = [];
              
              if (typeof recentChat.content.previewContent === 'string') {
                previewPages = recentChat.content.previewContent.split('<div class="page-break"></div>');
              } else if (recentChat.content.previewContent.content) {
                previewPages = recentChat.content.previewContent.content.split('<div class="page-break"></div>');
              } else if (Array.isArray(recentChat.content.previewContent)) {
                previewPages = recentChat.content.previewContent;
              }
              
              setPreviewContent(recentChat.content.previewContent);
              setDocumentContent(previewPages.length > 0 ? previewPages : ['']);
              setTotalPages(previewPages.length > 0 ? previewPages.length : 1);
              setCurrentPage(1);
            }
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
      // Update the chat history with current messages and content
      const updatedHistory = {
        ...chatHistory,
        [currentChatId]: {
          id: currentChatId,
          messages: messages,
          lastUpdated: new Date().toISOString(),
          title: determineConversationTitle(),
          documentData: documentData,
          content: {
            editorContent: editorContent || chatHistory[currentChatId]?.content?.editorContent || '',
            previewContent: documentContent.length > 0 ? documentContent.join('<div class="page-break"></div>') : 
                            chatHistory[currentChatId]?.content?.previewContent || null,
            lastUpdated: new Date().toISOString()
          }
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
  }, [messages, documentData, editorContent, documentContent]);
  
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
    // Save current editor content before switching
    if (currentChatId && editorContent) {
      // Save to the content sub-object in chat history
      const updatedHistory = {
        ...chatHistory,
        [currentChatId]: {
          ...chatHistory[currentChatId],
          content: {
            ...(chatHistory[currentChatId]?.content || {}),
            editorContent: editorContent,
            lastUpdated: new Date().toISOString()
          },
          lastUpdated: new Date().toISOString()
        }
      };
      
      setChatHistory(updatedHistory);
      localStorage.setItem('documentGeneratorChats', JSON.stringify(updatedHistory));
    }

    if (chatHistory[chatId]) {
      // Load messages and document data
      setMessages(chatHistory[chatId].messages);
      
      if (chatHistory[chatId].documentData) {
        setDocumentData(chatHistory[chatId].documentData);
      }
      
      // Load editor content directly from chat history
      const editorContentToLoad = chatHistory[chatId]?.content?.editorContent || '';
      console.log('Loading editor content for chat:', chatId, editorContentToLoad);
      setEditorContent(editorContentToLoad);
      
      // Reset unsaved changes flag when loading a chat
      setHasUnsavedChanges(false);
      
      // Load preview content if available
      const previewContentToLoad = chatHistory[chatId]?.content?.previewContent;
      
      if (previewContentToLoad) {
        setPreviewContent(previewContentToLoad);
        let previewPages = [];
        
        if (typeof previewContentToLoad === 'string') {
          previewPages = previewContentToLoad.split('<div class="page-break"></div>');
        } else if (previewContentToLoad.content) {
          previewPages = previewContentToLoad.content.split('<div class="page-break"></div>');
        } else if (Array.isArray(previewContentToLoad)) {
          previewPages = previewContentToLoad;
        }
        
        setDocumentContent(previewPages.length > 0 ? previewPages : ['']);
        setTotalPages(previewPages.length > 0 ? previewPages.length : 1);
        setCurrentPage(1);
      } else {
        // Reset preview content if none exists for this chat
        setPreviewContent(null);
        setDocumentContent(['']);
        setTotalPages(1);
        setCurrentPage(1);
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
    setTimeout(() => setShowNotification(false), 3000);
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
    const sortedChats = Object.entries(chatHistory)
      .sort(([, a], [, b]) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
      .map(([id, chat]) => ({ id, ...chat }));
    
    return (
      <div className="fixed left-0 top-0 w-80 h-screen bg-white shadow-lg z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <button
            onClick={() => setShowChatList(false)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-2">
          <button 
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-2"
          >
            <MessageSquare size={16} />
            <span>New Chat</span>
          </button>
          
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => document.getElementById('import-chat').click()}
              className="flex-1 py-2 px-3 bg-gray-100 text-sm text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
            >
              <Upload size={14} />
              Import
            </button>
            <input 
              type="file" 
              id="import-chat" 
              accept=".json" 
              onChange={importChatFromJson} 
              className="hidden" 
            />
            <button 
              onClick={() => exportChatAsJson(currentChatId)}
              className="flex-1 py-2 px-3 bg-gray-100 text-sm text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {sortedChats.map((chat) => {
            const displayId = chat.id.replace('chat_', '');
            const chatTitle = `New Chat - ${displayId}`;

            return (
              <div 
                key={chat.id} 
                onClick={() => loadChat(chat.id)}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                  currentChatId === chat.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-sm truncate flex-1">
                    {chatTitle}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDeleteChat(chat.id);
                  }}
                    className="p-1 hover:bg-gray-200 rounded-full"
                >
                    <X size={14} />
                </button>
              </div>
                <div className="text-xs text-gray-500">
                  {new Date(chat.lastUpdated).toLocaleString([], {
                    month: 'numeric',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Add a new function to render chat tabs at the top
  const renderChatTabs = () => {
    const sortedChats = Object.entries(chatHistory)
      .sort(([, a], [, b]) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
      .map(([id, chat]) => ({ id, ...chat }));
    
    return (
      <div className="flex overflow-x-auto border-b bg-gray-50">
        {/* New Chat Button - Always First */}
          <div 
            onClick={createNewChat}
          className="flex items-center gap-2 px-4 py-2 cursor-pointer bg-blue-600 text-white hover:bg-blue-700 transition-colors border-r"
          >
          <MessageSquare size={16} />
          <span className="text-sm whitespace-nowrap">New Chat</span>
          </div>

        {sortedChats.map((chat) => {
          const displayId = chat.id.replace('chat_', '');
              const tabTitle = chat.documentData?.type 
            ? `${chat.documentData.type} - ${displayId}`
            : `New Chat - ${displayId}`;

              return (
                <div 
                  key={chat.id}
                  onClick={() => loadChat(chat.id)}
              className={`flex items-center gap-2 px-4 py-2 border-r cursor-pointer whitespace-nowrap ${
                currentChatId === chat.id
                  ? 'bg-white border-b-2 border-b-blue-600'
                  : 'hover:bg-gray-100'
              }`}
                >
              <span className="text-sm">{tabTitle}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDeleteChat(chat.id);
                    }}
                className="hover:bg-gray-200 rounded-full p-1"
                  >
                <X size={14} />
                  </button>
                </div>
              );
            })}
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
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data); // Debug log
        
        if (data.status === 'error') {
          // Remove loading message and show error
          setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: `Error: ${data.message}`,
            isBot: true,
            isError: true
          }]);
          setIsProcessing(false);
          setPosterProcessing(false);
          return;
        }

        if (data.status === 'processing') {
          // Update the progress state
          setProcessingProgress(prev => [...prev, data]);
          
          // Update the existing loading message with current status
          setMessages(prev => {
            const updatedMessages = [...prev];
            const messageIndex = updatedMessages.findIndex(msg => msg.id === loadingMessageId);
            
            if (messageIndex !== -1) {
              // Update existing message
              updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                text: `Current status: ${data.message}`,
                isLoading: true,
                loadingDots: true
              };
            } else {
              // Add new message if not found
              updatedMessages.push({
                id: loadingMessageId,
                text: `Current status: ${data.message}`,
                isBot: true,
                isLoading: true,
                loadingDots: true
              });
            }
            
            return updatedMessages;
          });
        }

        if (data.status === 'complete' || data.status === 'success') {
          // Remove loading message
          setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));
          
          // Add completion message
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: 'Poster processing complete! Starting document generation...',
            isBot: true
          }]);

          // Process the extracted data automatically
          if (data.data) {
            processExtractedData(data.data);
          }

          setIsProcessing(false);
          setPosterProcessing(false);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      // Remove loading message and show error
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: 'Error connecting to the server. Please try again.',
        isBot: true,
        isError: true
      }]);
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

    // Add initial loading message to chat
    const newLoadingMessageId = Date.now();
    setLoadingMessageId(newLoadingMessageId);
    setMessages(prev => [...prev, {
      id: newLoadingMessageId,
      text: '\nCurrent status: Starting poster processing',
      isBot: true,
      // isLoading: true
    }]);

    try {
      // Connect to WebSocket
      const socket = connectWebSocket();

      // Wait for the connection to be established
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 5000);

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
          setPosterProcessing(false);
          setIsProcessing(false);
        }
      };
      reader.onerror = (error) => {
        setPosterProcessing(false);
        setIsProcessing(false);
      };
      reader.readAsArrayBuffer(file);

    } catch (error) {
      console.error('Error:', error);
      // Remove loading message and show error
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: 'Error processing poster. Please try again.',
        isBot: true,
        isError: true
      }]);
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

  // ... existing code ...
  // Add this style to your component's return statement
  const loadingStyle = {
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    zIndex: 1000
  };

  const dotStyle = {
    width: '10px',
    height: '10px',
    backgroundColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'dotBounce 1.4s infinite ease-in-out'
  };

  // Add this to your component's return statement
  const loadingMessage = (
    <div style={loadingStyle}>
      <div style={{...dotStyle, animationDelay: '0s'}}></div>
      <div style={{...dotStyle, animationDelay: '0.2s'}}></div>
      <div style={{...dotStyle, animationDelay: '0.4s'}}></div>
    </div>
  );

  // ... existing code ...

  // Helper function to convert HTML content to DOCX paragraphs
  const convertHtmlToDocxParagraphs = (html) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const paragraphs = [];
    
    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        // Handle text nodes
        const text = node.textContent.trim();
        return text ? new TextRun(text) : null;
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const children = Array.from(node.childNodes)
          .map(processNode)
          .filter(Boolean)
          .reduce((acc, curr) => {
            // Handle arrays of children (from lists, etc.)
            if (Array.isArray(curr)) {
              acc.push(...curr);
            } else {
              acc.push(curr);
            }
            return acc;
          }, []);

        switch (node.tagName.toLowerCase()) {
          case 'p':
            // Add extra spacing between paragraphs
            return new Paragraph({ 
              children,
              spacing: { after: 200 }
            });
          case 'div':
            // Treat divs as paragraphs
            return new Paragraph({ 
              children,
              spacing: { after: 200 }
            });
          case 'strong':
          case 'b':
            return new TextRun({ 
              text: node.textContent,
              bold: true 
            });
          case 'em':
          case 'i':
            return new TextRun({ 
              text: node.textContent,
              italics: true 
            });
          case 'u':
            return new TextRun({ 
              text: node.textContent,
              underline: {} 
            });
          case 'br':
            // Handle line breaks
            return new TextRun({ 
              text: '',
              break: 1
            });
          case 'ul':
            return children.map(child => 
              new Paragraph({
                bullet: { level: 0 },
                children: [child],
                spacing: { before: 100, after: 100 }
              })
            );
          case 'ol':
            return children.map((child, index) => 
              new Paragraph({
                numbering: {
                  reference: 'default-numbering',
                  level: 0
                },
                children: [child],
                spacing: { before: 100, after: 100 }
              })
            );
          case 'li':
            // Process list items
            if (children.length === 0) {
              return new TextRun(node.textContent);
            }
            return children;
          case 'span':
            // Handle spans with potential styling
            return children.length > 0 ? children : new TextRun(node.textContent);
          default:
            // Default case: wrap content in paragraph if it's not already
            if (children.length === 0) {
              const text = node.textContent.trim();
              return text ? new Paragraph({ children: [new TextRun(text)] }) : null;
            }
            return new Paragraph({ children });
        }
      }
      return null;
    };

    // Process all nodes and flatten the result
    const processedNodes = Array.from(tempDiv.childNodes).map(processNode);
    processedNodes.forEach(node => {
      if (Array.isArray(node)) {
        paragraphs.push(...node);
      } else if (node) {
        paragraphs.push(node);
      }
    });

    // Add spacing between sections
    return paragraphs.map(paragraph => {
      if (paragraph instanceof Paragraph) {
        return {
          ...paragraph,
          spacing: { ...paragraph.spacing, after: 200 }
        };
      }
      return paragraph;
    });
  };

  const generateDOCX = async () => {
    if (editorRef.current) {
      try {
        // Create document with proper spacing settings
        const doc = new Document({
          sections: [{
            properties: {
              spacing: {
                after: 200,
                line: 360,
                lineRule: 'auto'
              }
            },
            children: [
              // ... rest of your document generation code ...
            ]
          }]
        });

        // ... rest of your generateDOCX code ...
      } catch (error) {
        console.error('DOCX Generation Error:', error);
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            text: 'Error generating DOCX. Please try again.',
            isBot: true,
            isError: true
          }
        ]);
      }
    }
  };

  // ... rest of your existing code ...

  // Modify the main component return to handle the case when no chat is selected
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-100">
      {/* Add the loading animation style */}
      <style>
        {`
          @keyframes bounce {
            0%, 100% {
              transform: translateY(0);
              animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
            }
            50% {
              transform: translateY(-25%);
              animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
            }
          }
          .animate-bounce {
            animation: bounce 1s infinite;
          }
        `}
      </style>
      {/* Show loading indicator when generating content or uploading poster */}
      {/* {(isLoading || posterProcessing) && loadingMessage} */}
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

// Add this component for the static bot profile with updated styling
const BotProfile = React.memo(() => (
  <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden mx-2 ring-2 ring-blue-500/20">
    <img
      src={`${process.env.PUBLIC_URL}/bot-avatar.png`}
      alt="AI Assistant"
      className="w-full h-full object-cover"
      onError={(e) => {
        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234B5563"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>';
      }}
    />
  </div>
));

export default DocumentGenerate; 