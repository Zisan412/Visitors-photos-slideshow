const path = require('path');
const mongoose = require('mongoose');
const sharp = require('sharp');
const Folder = require('../models/Folder');
const { publish } = require('../services/liveUpdates');
const {
  UPLOAD_DIR,
  deleteImageKitFile,
  deletePhotoAsset,
  getImageKitImage,
  isImageKitConfigured,
  uploadImage,
} = require('../services/photoStorage');
const { serializeFolder } = require('../utils/serialize');
const httpError = require('../utils/httpError');
const { publicApiUrl } = require('../config/env');

const MAX_PHOTOS_PER_FOLDER = 100;
const MAX_IMAGE_PIXELS = 40_000_000;

async function addPhotos(req, res) {
  const folder = await Folder.findOne({ _id: req.params.folderId, owner: req.user._id });
  if (!folder) throw httpError(404, 'Folder not found.');
  if (!req.files?.length) throw httpError(400, 'Choose at least one photo to upload.');
  if (folder.photos.length + req.files.length > MAX_PHOTOS_PER_FOLDER) {
    throw httpError(400, `A folder can contain at most ${MAX_PHOTOS_PER_FOLDER} photos.`);
  }
  if (!isImageKitConfigured()) throw httpError(503, 'Image storage is not configured.');

  const uploadedFileIds = [];
  try {
    for (const file of req.files) {
      const photoId = new mongoose.Types.ObjectId();
      const fileName = `${new mongoose.Types.ObjectId()}.jpg`;
      let metadata;
      let image;
      try {
        ({ data: image, info: metadata } = await sharp(file.buffer, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'error' })
          .rotate()
          .jpeg({ quality: 88, mozjpeg: true })
          .toBuffer({ resolveWithObject: true }));
      } catch {
        throw httpError(400, `${file.originalname} is not a valid or supported image.`);
      }

      const uploaded = await uploadImage(image, fileName, `/visitor-photos/${req.user._id}/${folder._id}`);
      uploadedFileIds.push(uploaded.fileId);
      folder.photos.push({
        _id: photoId,
        originalName: path.basename(file.originalname).slice(0, 255),
        storageKey: null,
        imageUrl: `${publicApiUrl}/api/photos/${photoId}`,
        imageKitFileId: uploaded.fileId,
        imageKitUrl: uploaded.url,
        mimeType: 'image/jpeg',
        size: metadata.size,
        width: metadata.width,
        height: metadata.height,
      });
    }
    await folder.save();
  } catch (error) {
    const cleanup = await Promise.allSettled(uploadedFileIds.map(deleteImageKitFile));
    for (const result of cleanup) {
      if (result.status === 'rejected') {
        console.error('ImageKit upload cleanup failed:', result.reason.name || 'Error', result.reason.code || 'no-code');
      }
    }
    throw error;
  }

  publish(req.user._id, 'photos-added', folder._id);
  return res.status(201).json({ folder: serializeFolder(folder) });
}

async function deletePhoto(req, res) {
  const folder = await Folder.findOne({
    _id: req.params.folderId,
    owner: req.user._id,
    'photos._id': req.params.photoId,
  });
  if (!folder) throw httpError(404, 'Photo not found.');

  const photo = folder.photos.id(req.params.photoId);
  await deletePhotoAsset(photo);
  folder.photos.pull({ _id: photo._id });
  await folder.save();

  publish(req.user._id, 'photo-deleted', folder._id);
  return res.status(204).end();
}

async function servePhoto(req, res) {
  const folder = await Folder.findOne({
    owner: req.user._id,
    'photos._id': req.params.photoId,
  }).select('photos');
  if (!folder) throw httpError(404, 'Photo not found.');

  const photo = folder.photos.id(req.params.photoId);
  res.set('Cache-Control', 'private, no-store');
  if (photo.imageKitFileId) {
    if (!photo.imageKitUrl) throw new Error('ImageKit URL is missing for a stored image.');
    res.type(photo.mimeType);
    return res.send(await getImageKitImage(photo.imageKitUrl));
  }
  if (!photo.storageKey) throw new Error('Photo storage key is missing.');
  return res.sendFile(path.basename(photo.storageKey), { root: UPLOAD_DIR });
}

module.exports = { addPhotos, deletePhoto, servePhoto };
