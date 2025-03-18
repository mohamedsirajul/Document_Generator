const socket = new WebSocket('ws://your-server:8000/ws/generate-content');
let completeText = '';

// Connection opened
socket.addEventListener('open', (event) => {
  // Send document generation request
  socket.send(JSON.stringify({
    type: "Guest Lecture",
    fields: {
      "Guest Name": "Dr. Jane Smith",
      "Guest Designation": "Professor of Computer Science, MIT",
      "Event Date": "2023-04-15",
      "Activity Code": "CS-GL-2023",
      "Year": "2023",
      "No Of Count": "120",
      "Organizer Department": "Computer Science",
      "Organizer Faculty Name": "Dr. Robert Johnson",
      "Topic": "Advancements in Artificial Intelligence"
    }
  }));
});

// Listen for messages
socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'token') {
    // Display token in real-time
    completeText += data.content;
    document.getElementById('output').textContent = completeText;
  } 
  else if (data.type === 'complete') {
    // Process complete document
    console.log('Document completed:', data);
    // Display sections, word count, etc.
  }
  else if (data.type === 'error') {
    console.error('Error:', data.error);
  }
});

// Connection closed
socket.addEventListener('close', (event) => {
  console.log('Connection closed');
});