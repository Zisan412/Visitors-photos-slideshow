const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true, maxlength: 255 },
    storageKey: { type: String, default: null },
    imageUrl: { type: String, required: true },
    imageKitFileId: { type: String, default: null },
    imageKitUrl: { type: String, default: null },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const folderSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    duration: { type: Number, required: true, default: 5, enum: [3, 5, 7, 10, 15] },
    photos: { type: [photoSchema], default: [] },
  },
  { timestamps: true },
);

folderSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.models.Folder || mongoose.model('Folder', folderSchema);
