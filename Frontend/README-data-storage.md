# Document Generator Chat Data Storage

This document explains how chat data is stored and managed in the Document Generator application.

## Overview

The Document Generator application uses a hybrid approach to storing chat data:

1. **In a browser environment**: Data is stored in `localStorage` for persistence between sessions
2. **In an Electron environment**: Data is stored in JSON files in the application's user data directory

## Data Structure

All chat data follows this common structure:

```json
{
  "chats": {
    "chat_1744211446393": {
      "id": "chat_1744211446393",
      "messages": [
        {
          "id": 1,
          "text": "Hello! I'm Siraj AI!...",
          "isBot": true
        },
        // More messages...
      ],
      "lastUpdated": "2025-04-09T15:11:17.507Z",
      "title": "GuestLecture - 4/9/2025",
      "documentData": {
        "type": "GuestLecture",
        "currentField": "Guest Name",
        "fields": {}
      }
    }
    // More chats...
  },
  "lastUpdated": "2025-04-09T15:11:17.507Z",
  "defaultMessages": {
    "welcome": "Hello! I'm Siraj AI!..."
  }
}
```

## Key Components

### 1. FileSystemService

`FileSystemService` handles the actual reading and writing of data, with methods for:

- Reading data from localStorage or JSON files
- Writing data to localStorage or JSON files
- Exporting chats to JSON files
- Importing chats from JSON files

The service automatically detects whether it's running in Electron or a browser and uses the appropriate storage mechanism.

### 2. ChatService

`ChatService` provides a higher-level API for managing chats:

- Loading chats from storage
- Creating new chats
- Updating existing chats
- Deleting chats
- Exporting and importing chats

## Implementation Details

### Browser Storage

In a browser environment, the application stores all chat data in a single localStorage key:

```javascript
localStorage.setItem('documentGeneratorChats', JSON.stringify(chatData));
```

### Electron Storage

In an Electron environment, the application stores chat data in a JSON file in the user's application data directory:

```
<user data directory>/chatData.json
```

## Using the System

### Initializing

The chat system initializes automatically when the application starts:

```javascript
// From DocumentGenerate.jsx
useEffect(() => {
  const initializeChat = async () => {
    try {
      // Get chat data from service
      const { chats, defaultMessages } = await chatService.loadChats();
      
      // Set chat history
      setChatHistory(chats || {});
      
      // Create a new chat ID
      const newChatId = `chat_${Date.now()}`;
      setCurrentChatId(newChatId);
      // ...
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  };
  
  initializeChat();
}, []);
```

### Creating a New Chat

```javascript
const createNewChat = async () => {
  // Create a new chat ID
  const newChatId = `chat_${Date.now()}`;
  
  // Set initial data
  const initialMessage = {
    id: 1,
    text: chatService.getWelcomeMessage(),
    isBot: true,
  };
  
  // Create new chat in service
  await chatService.createChat({
    messages: [initialMessage],
    title: `New Chat - ${new Date().toLocaleDateString()}`,
    documentData: {
      type: null,
      currentField: null,
      fields: {}
    }
  });
};
```

### Saving Chat Updates

```javascript
// When chat messages or document data changes
useEffect(() => {
  const saveChat = async () => {
    if (currentChatId && messages.length > 0) {
      // Update chat in service
      await chatService.updateChat(currentChatId, {
        messages,
        title: determineConversationTitle(),
        documentData,
        lastUpdated: new Date().toISOString()
      });
    }
  };
  
  saveChat();
}, [messages, documentData]);
```

## Troubleshooting

If chat data is not being saved or loaded correctly:

1. In a browser environment, check if localStorage is available and not full
2. In an Electron environment, check if the application has write permissions to the user data directory
3. Look for error messages in the console that might indicate issues with file access

## Future Improvements

Potential improvements to the data storage system:

1. Adding support for cloud sync
2. Implementing data compression for large chat histories
3. Adding encryption for sensitive document data
4. Implementing automatic backups 