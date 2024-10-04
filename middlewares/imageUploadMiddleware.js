import multer from "multer";
import sharp from "sharp";
import logger from "../utils/logger.js";

//memory storage of multer
const storage = multer.memoryStorage();

//filter image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

//instance of multer for uploading image file
const upload = multer({ storage, fileFilter });

//category image upload
export const uploadCategoryImage = upload.single("image");

//category image resize
export const resizeCategoryImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const file = req.file.image;

    const processedBuffer = await sharp(file.buffer)
      .resize(500, 500)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toBuffer();

    req.file = {
      originalname: file.originalname,
      buffer: processedBuffer,
      mimetype: "image/jpeg",
    };
    next();
  } catch (error) {
    next();
  }
};

//product image upload
export const uploadProductImages = upload.fields([
  {
    name: "images",
    maxCount: 3,
  },
]);

//resize product image
export const resizeProductImages = async (req, res, next) => {
  try {
    const images = req.files.images;

    if (!images) return next();

    const processedFiles = await Promise.all(
      images.map(async (file) => {
        const processedBuffer = await sharp(file.buffer)
          .resize(500, 500)
          .toFormat("jpeg")
          .jpeg({ quality: 90 })
          .toBuffer();

        return {
          originalname: file.originalname,
          buffer: processedBuffer,
          mimetype: "image/jpeg",
        };
      })
    );

    req.files = processedFiles;
    next();
  } catch (error) {
    next(error);
  }
};

//upload profile image
export const uploadProfileImage = upload.single("profile");

//resize profile image
export const resizeProfileImage = async (req, res, next) => {
  try {
    const file = req.file;

    if (!file) return next();

    const processedBuffer = await sharp(file.buffer)
      .resize(500, 500, {
        fit: sharp.fit.cover,
        position: "center",
      })
      .toFormat("jpeg")
      .jpeg({ quality: 50 })
      .toBuffer();

    req.file = {
      originalname: file.originalname,
      buffer: processedBuffer,
      mimetype: "image/jpeg",
    };
    next();
  } catch (error) {
    logger.log({
      level: "error",
      message: error,
    });
  }
};

export const uploadBannerImage = upload.single("image");

export const resizeBannerImage = async (req, res, next) => {
  const file = req.file.image;
  if (!file) return next();

  const processedBuffer = await sharp(file.buffer)
    .resize(1920, 1080)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toBuffer();

  req.file = {
    originalname: file.originalname,
    buffer: processedBuffer,
    mimetype: "image/jpeg",
  };
  next();
};
