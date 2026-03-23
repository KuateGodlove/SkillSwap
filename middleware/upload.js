// middleware/upload.js
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const ROOT_UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const ensureUploadDir = (folder = '') => {
  const targetDir = path.join(ROOT_UPLOAD_DIR, folder);
  fs.mkdirSync(targetDir, { recursive: true });
  return targetDir;
};

const buildStorage = (folder = '') => multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ensureUploadDir(folder));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const createFileFilter = ({ allowedExtensions, message }) => (req, file, cb) => {
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedExtensions.test(file.mimetype.toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }

  return cb(new Error(message));
};

const createUpload = ({
  folder = '',
  allowedExtensions,
  message,
  fileSize = 5 * 1024 * 1024
}) => multer({
  storage: buildStorage(folder),
  limits: { fileSize },
  fileFilter: createFileFilter({ allowedExtensions, message })
});

const upload = createUpload({
  allowedExtensions: /jpeg|jpg|png|gif|pdf|doc|docx|txt/,
  message: 'Only images, PDFs, and documents are allowed'
});

const avatarUpload = createUpload({
  folder: 'avatars',
  allowedExtensions: /jpeg|jpg|png|gif|webp/,
  message: 'Only image files are allowed for profile photos'
});

module.exports = upload;
module.exports.avatarUpload = avatarUpload;
