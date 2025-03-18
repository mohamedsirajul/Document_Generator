const express = require('express');
const cors = require('cors');
const saveDocumentRouter = require('./src/api/saveDocument');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Use the save document router
app.use('/api', saveDocumentRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 