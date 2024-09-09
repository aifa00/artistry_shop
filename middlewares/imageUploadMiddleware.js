import multer from "multer";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { v4 } from "uuid";
import logger from "../utils/logger.js";

//find the directory of the current module file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

    req.file.originalname = "category-" + v4() + ".png";

    req.body.image = req.file.originalname;

    await sharp(req.file.buffer)
      .resize(500, 500)
      .toFormat("png")
      .png({ quality: 90 })
      .toFile(
        path.join(__dirname, "../public", "categories", req.file.originalname)
      );

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
    if (!req.files.images) return next();

    req.body.images = [];

    await Promise.all(
      req.files.images.map(async (file) => {
        const filename = "product-" + v4() + ".jpeg";

        await sharp(file.buffer)
          .resize(500, 500)
          .toFormat("jpeg")
          .jpeg({ quality: 90 })
          .toFile(path.join(__dirname, "../public", "products", filename));

        req.body.images.push(filename);
      })
    );
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
    if (!req.file) return next();

    req.file.originalname = "profile-" + v4() + ".png";

    req.body.profile = req.file.originalname;

    await sharp(req.file.buffer)
      .resize(200, 200)
      .toFormat("png")
      .png({ quality: 90 })
      .toFile(
        path.join(__dirname, "../public", "profiles", req.file.originalname)
      );
    next();
  } catch (error) {
    logger.log({
      level: "error",
      message: error,
    });
  }
};

export const uploadBannerImages = upload.fields([
  {
    name: "images",
    maxCount: 3,
  },
]);

export const resizeBannerImages = async (req, res, next) => {
  if (!req.files.images) return next();

  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file) => {
      const filename = "banner-" + v4() + ".jpeg";

      await sharp(file.buffer)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(path.join(__dirname, "../public", "banners", filename));

      req.body.images.push(filename);
    })
  );
  next();
};
