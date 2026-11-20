const test = require('node:test');
const assert = require('node:assert/strict');
const { validateFolderInput } = require('../src/controllers/folderController');
const { publish, subscribe } = require('../src/services/liveUpdates');
const { serializeFolder, serializePhoto } = require('../src/utils/serialize');
const { normalizeSecurityAnswer, questions } = require('../src/utils/securityQuestions');

test('folder input accepts supported values and normalizes name', () => {
  assert.deepEqual(validateFolderInput({ name: '  Weekend  ', duration: '7' }), {
    name: 'Weekend',
    duration: 7,
  });
});

test('folder input rejects unsupported duration and blank names', () => {
  assert.throws(() => validateFolderInput({ name: 'Trip', duration: 4 }), { status: 400 });
  assert.throws(() => validateFolderInput({ name: '  ', duration: 5 }), { status: 400 });
});

test('photo and folder responses expose only the protected image URL', () => {
  const photo = {
    _id: { toString: () => 'photo-id' },
    originalName: 'trip.jpg',
    imageUrl: '/api/photos/photo-id',
    imageKitFileId: 'private-provider-id',
    imageKitUrl: 'https://ik.imagekit.io/example/private-image.jpg',
    mimeType: 'image/jpeg',
    size: 1200,
    width: 40,
    height: 30,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const serializedPhoto = serializePhoto(photo);
  assert.equal(serializedPhoto.imageUrl, '/api/photos/photo-id');
  assert.equal('fileId' in serializedPhoto, false);
  assert.equal('imageKitUrl' in serializedPhoto, false);

  const folder = {
    _id: { toString: () => 'folder-id' },
    name: 'Weekend',
    duration: 5,
    createdAt: photo.createdAt,
    updatedAt: photo.createdAt,
    photos: [photo],
  };
  assert.equal(serializeFolder(folder).photos[0].id, 'photo-id');
});

test('live updates are delivered only to the subscribed account', () => {
  const firstMessages = [];
  const secondMessages = [];
  const firstClient = { write: message => { firstMessages.push(message); return true; } };
  const secondClient = { write: message => { secondMessages.push(message); return true; } };
  const unsubscribe = subscribe('account-one', firstClient);
  subscribe('account-two', secondClient);

  publish('account-one', 'photos-added', 'folder-one');

  assert.equal(firstMessages.length, 1);
  assert.deepEqual(JSON.parse(firstMessages[0].replace(/^data: /, '').trim()), {
    type: 'photos-added',
    folderId: 'folder-one',
  });
  assert.equal(secondMessages.length, 0);

  unsubscribe();
  publish('account-one', 'folder-deleted', 'folder-one');
  assert.equal(firstMessages.length, 1);
});

test('security question answers normalize casing, spacing, and Unicode consistently', () => {
  assert.equal(normalizeSecurityAnswer('  CAFÉ  '), normalizeSecurityAnswer('cafe\u0301'));
  assert.equal(normalizeSecurityAnswer('  WELLS  '), 'wells');
  assert.equal(Object.keys(questions).length, 4);
});
