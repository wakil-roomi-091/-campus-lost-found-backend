const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure cloudinary with your credentials
cloudinary.config({
  cloud_name: "dspcl9tug",
  api_key: "785779287459171",
  api_secret: "860pcvDil_9QaDZFaW1D47cpo1o",
});

console.log("✅ Cloudinary configured with cloud name: dspcl9tug");

// Configure storage for profile pictures
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "campus-profiles/profile-pictures",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [{ width: 500, height: 500, crop: "limit" }],
  },
});

// Configure storage for cover photos
const coverStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "campus-profiles/cover-photos",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [{ width: 1500, height: 500, crop: "limit" }],
  },
});

// Configure storage for item images
const itemStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "campus-items",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});

// Create multer upload instances
const uploadProfile = multer({ storage: profileStorage });
const uploadCover = multer({ storage: coverStorage });
const uploadItem = multer({ storage: itemStorage });

module.exports = { cloudinary, uploadProfile, uploadCover, uploadItem };
