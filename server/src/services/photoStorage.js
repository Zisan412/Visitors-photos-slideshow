const fs = require('fs/promises');
const path = require('path');
const ImageKit = require('@imagekit/nodejs');
const { toFile } = require('@imagekit/nodejs');
const config = require('../config/env');
const httpError = require('../utils/httpError');

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
let imageKitClient;

function isImageKitConfigured() {
  return config.imageKitConfigured;
}

function getImageKitClient() {
  if (!isImageKitConfigured()) {
    throw httpError(503, 'Image storage is not configured.');
  }
  if (!imageKitClient) {
    imageKitClient = new ImageKit({
      privateKey: config.imageKitPrivateKey,
    });
  }
  return imageKitClient;
}

async function uploadImage(buffer, fileName, folder) {
  const uploaded = await getImageKitClient().files.upload({
    file: await toFile(buffer, fileName),
    fileName,
    folder,
    useUniqueFileName: false,
  });
  if (!uploaded.fileId || !uploaded.url) throw new Error('ImageKit upload returned incomplete file details.');
  return { fileId: uploaded.fileId, url: uploaded.url };
}

async function deleteImageKitFile(fileId) {
  return getImageKitClient().files.delete(fileId);
}

async function deletePhotoAsset(photo) {
  if (photo.storageKey) {
    try {
      await fs.unlink(path.join(UPLOAD_DIR, photo.storageKey));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  if (photo.imageKitFileId) await deleteImageKitFile(photo.imageKitFileId);
}

async function getImageKitImage(url) {
  const imageUrl = new URL(url);
  const endpoint = new URL(config.imageKitUrlEndpoint);
  if (imageUrl.origin !== endpoint.origin) {
    throw new Error('Stored image URL does not match the configured ImageKit endpoint.');
  }
  const response = await fetch(imageUrl, { redirect: 'error' });
  if (!response.ok) {
    throw new Error(`ImageKit image request failed with status ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

module.exports = {
  UPLOAD_DIR,
  deleteImageKitFile,
  deletePhotoAsset,
  getImageKitImage,
  isImageKitConfigured,
  uploadImage,
};
