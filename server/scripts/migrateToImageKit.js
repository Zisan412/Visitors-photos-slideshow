const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../src/config/env');
const Folder = require('../src/models/Folder');
const {
  UPLOAD_DIR,
  deleteImageKitFile,
  isImageKitConfigured,
  uploadImage,
} = require('../src/services/photoStorage');

function directAtlasSeedUri(uri) {
  const parsed = new URL(uri);
  if (parsed.protocol !== 'mongodb+srv:' || !/-shard-\d{2}-\d{2}\./i.test(parsed.hostname)) {
    return null;
  }

  const options = new URLSearchParams(parsed.search);
  options.set('tls', 'true');
  if (parsed.username && !options.has('authSource')) options.set('authSource', 'admin');
  const credentials = parsed.username
    ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ''}@`
    : '';
  return `mongodb://${credentials}${parsed.hostname}:${parsed.port || 27017}${parsed.pathname}?${options}`;
}

function mongoErrorCode(error) {
  let cause = error;
  while (cause.cause && cause.cause !== cause) cause = cause.cause;
  return cause.code || error.code;
}

async function migratePhotos() {
  let migrated = 0;
  let failed = 0;
  const folders = Folder.find({
    photos: { $elemMatch: { imageKitFileId: null, storageKey: { $type: 'string' } } },
  }).cursor();

  for await (const folder of folders) {
    for (const photo of folder.photos) {
      if (photo.imageKitFileId || !photo.storageKey) continue;

      let uploaded;
      try {
        const filePath = path.join(UPLOAD_DIR, path.basename(photo.storageKey));
        const file = await fs.readFile(filePath);
        uploaded = await uploadImage(
          file,
          photo.storageKey,
          `/visitor-photos/${folder.owner}/${folder._id}`,
        );
        photo.imageKitFileId = uploaded.fileId;
        photo.imageKitUrl = uploaded.url;
        await folder.save();
        migrated += 1;
        console.log(`Migrated photo ${photo._id}`);
      } catch (error) {
        failed += 1;
        if (uploaded?.fileId) {
          try {
            await deleteImageKitFile(uploaded.fileId);
          } catch (cleanupError) {
            console.error(
              `ImageKit cleanup failed for photo ${photo._id}:`,
              cleanupError.name || 'Error',
              cleanupError.code || 'no-code',
            );
          }
        }
        console.error(`Photo migration failed for ${photo._id}:`, error.name || 'Error', error.code || 'no-code');
      }
    }
  }

  console.log(`ImageKit migration finished: ${migrated} migrated, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

async function main() {
  if (!config.mongoUri) throw new Error('MONGO_URI is not configured.');
  if (!isImageKitConfigured()) throw new Error('ImageKit credentials are not configured.');

  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  } catch (error) {
    let fallbackUri;
    try {
      fallbackUri = directAtlasSeedUri(config.mongoUri);
    } catch {
      fallbackUri = null;
    }

    if (mongoErrorCode(error) !== 'ECONNREFUSED' || !/querySrv/i.test(String(error.message)) || !fallbackUri) {
      throw error;
    }
    console.warn('Atlas SRV DNS lookup was refused; retrying the configured shard seed host with system DNS.');
    await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 10000 });
  }
  try {
    await migratePhotos();
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error('ImageKit migration could not run:', error.name || 'Error', error.code || 'no-code');
  process.exitCode = 1;
});
