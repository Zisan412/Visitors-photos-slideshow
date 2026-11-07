const fs = require('fs/promises');
const path = require('path');
const Folder = require('../models/Folder');
const { publish } = require('../services/liveUpdates');
const { serializeFolder } = require('../utils/serialize');
const httpError = require('../utils/httpError');

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

function validateFolderInput(body, partial = false) {
  body = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const values = {};
  if (!partial || Object.hasOwn(body, 'name')) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 60) throw httpError(400, 'Folder name must be between 1 and 60 characters.');
    values.name = name;
  }
  if (!partial || Object.hasOwn(body, 'duration')) {
    const duration = Number(body.duration);
    if (![3, 5, 7, 10, 15].includes(duration)) throw httpError(400, 'Choose a supported slideshow duration.');
    values.duration = duration;
  }
  return values;
}

async function listFolders(req, res) {
  const folders = await Folder.find({ owner: req.user._id }).sort({ createdAt: -1 });
  return res.json({ folders: folders.map(serializeFolder) });
}

async function getFolder(req, res) {
  const folder = await Folder.findOne({ _id: req.params.folderId, owner: req.user._id });
  if (!folder) throw httpError(404, 'Folder not found.');
  return res.json({ folder: serializeFolder(folder) });
}

async function createFolder(req, res) {
  const values = validateFolderInput(req.body);
  const folder = await Folder.create({ ...values, owner: req.user._id });
  publish(req.user._id, 'folder-created', folder._id);
  return res.status(201).json({ folder: serializeFolder(folder) });
}

async function updateFolder(req, res) {
  const values = validateFolderInput(req.body, true);
  if (Object.keys(values).length === 0) throw httpError(400, 'Provide a folder name or slideshow duration to update.');
  const folder = await Folder.findOneAndUpdate(
    { _id: req.params.folderId, owner: req.user._id },
    { $set: values },
    { new: true, runValidators: true },
  );
  if (!folder) throw httpError(404, 'Folder not found.');
  publish(req.user._id, 'folder-updated', folder._id);
  return res.json({ folder: serializeFolder(folder) });
}

async function deleteFolder(req, res) {
  const folder = await Folder.findOneAndDelete({ _id: req.params.folderId, owner: req.user._id });
  if (!folder) throw httpError(404, 'Folder not found.');

  const removals = await Promise.allSettled(folder.photos.map(photo => fs.unlink(path.join(UPLOAD_DIR, photo.storageKey))));
  for (const result of removals) {
    if (result.status === 'rejected' && result.reason.code !== 'ENOENT') {
      console.error('Local photo cleanup failed:', result.reason.code || 'unknown');
    }
  }
  publish(req.user._id, 'folder-deleted', folder._id);
  return res.status(204).end();
}

module.exports = { createFolder, deleteFolder, getFolder, listFolders, updateFolder, validateFolderInput };
