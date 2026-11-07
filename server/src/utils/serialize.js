function serializePhoto(photo) {
  return {
    id: photo._id.toString(),
    name: photo.originalName,
    imageUrl: photo.imageUrl,
    fileId: photo.imageKitFileId || null,
    mimeType: photo.mimeType,
    size: photo.size,
    width: photo.width,
    height: photo.height,
    createdAt: photo.createdAt,
  };
}

function serializeFolder(folder) {
  return {
    id: folder._id.toString(),
    name: folder.name,
    duration: folder.duration,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
    photos: folder.photos.map(serializePhoto),
  };
}

function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
  };
}

module.exports = { serializeFolder, serializePhoto, serializeUser };
