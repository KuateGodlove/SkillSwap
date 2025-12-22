// middlewares/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// IMPORTANT: Use absolute path from project root
const projectRoot = path.resolve(__dirname, '..'); // Go up one level from middlewares
const uploadDir = path.join(projectRoot, 'uploads', 'services');

console.log('=== UPLOAD MIDDLEWARE DEBUG ===');
console.log('Project root:', projectRoot);
console.log('Upload directory:', uploadDir);
console.log('Directory exists:', fs.existsSync(uploadDir));

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  console.log('Creating upload directory...');
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Directory created successfully');
}

console.log('=== END DEBUG ===');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log(`Saving file: ${file.originalname} to ${uploadDir}`);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate safe filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const extension = path.extname(safeName).toLowerCase();
    const filename = 'img-' + uniqueSuffix + extension;
    
    console.log(`Generated filename: ${filename} for ${file.originalname}`);
    cb(null, filename);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  console.log(`File filter: ${file.originalname}, MIME: ${file.mimetype}, Ext: ${path.extname(file.originalname)}`);
  
  if (mimetype && extname) {
    console.log(`✓ File accepted: ${file.originalname}`);
    return cb(null, true);
  } else {
    console.log(`✗ File rejected: ${file.originalname}`);
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 5 // Max 5 files
  },
  fileFilter: fileFilter
});

module.exports = upload;