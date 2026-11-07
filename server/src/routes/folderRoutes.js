const express = require('express');
const multer = require('multer');
const { createFolder, deleteFolder, getFolder, listFolders, updateFolder } = require('../controllers/folderController');
const { addPhotos, deletePhoto, servePhoto } = require('../controllers/photoController');
const { connectEvents } = require('../controllers/eventsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10, fields: 4 },
  fileFilter(req, file, callback) {
    if (!file.mimetype.startsWith('image/')) {
      callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
      return;
    }
    callback(null, true);
  },
});

router.use(requireAuth);
router.get('/events', connectEvents);
router.get('/photos/:photoId', servePhoto);
router.get('/folders', listFolders);
router.post('/folders', createFolder);
router.get('/folders/:folderId', getFolder);
router.patch('/folders/:folderId', updateFolder);
router.delete('/folders/:folderId', deleteFolder);
router.post('/folders/:folderId/photos', upload.array('photos', 20), addPhotos);
router.delete('/folders/:folderId/photos/:photoId', deletePhoto);

module.exports = router;
