import { fileURLToPath } from "url";
import { dirname } from "path";
import Banner from "../../models/bannerModel.js";
import {
  deleteFileFromS3,
  getPreSignedUrl,
  uploadFileToS3,
} from "../../utils/s3Utils.js";

//get add new banner
export const getAddNewBanner = async (req, res, next) => {
  try {
    res.render("admin/banner/addBanner", {
      error: "",
      activePage: "Banner",
    });
  } catch (error) {
    next(error);
  }
};

//post add new banner
export const addNewBanner = async (req, res, next) => {
  try {
    const { title, description, type, url } = req.body;
    const image = req.file;

    if (title && description && type && image) {
      const folder = "banners";
      const imageKey = await uploadFileToS3(image, folder);

      await Banner.create({
        title,
        description,
        type,
        url,
        image: imageKey,
      });

      res.redirect("/admin/banners/1");
    } else {
      res.render("admin/banner/addBanner", {
        error: "All fields are required.",
        activePage: "Banner",
      });
    }
  } catch (error) {
    next(error);
  }
};

//get banners
export const getBanners = async (req, res, next) => {
  try {
    // pagination
    const page = parseInt(req.params.page) || 1;
    const pageSize = 5;
    const skip = (page - 1) * pageSize;
    const totalBanners = await Banner.countDocuments();
    const totalPages = Math.ceil(totalBanners / pageSize) || 1;

    let foundBanners = await Banner.find().skip(skip).limit(pageSize);

    foundBanners = await Promise.all(
      foundBanners.map(async (banner) => {
        const imageUrl = banner.image
          ? await getPreSignedUrl(banner.image)
          : "";
        return {
          ...banner.toObject(),
          image: imageUrl,
        };
      })
    );

    res.render("admin/banner/banners", {
      foundBanners,
      activePage: "Banner",
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (error) {
    next(error);
  }
};

//get edit banner
export const getEditBanner = async (req, res, next) => {
  try {
    let foundBanner = await Banner.findById(req.params.id);

    const imageUrl = foundBanner.image
      ? await getPreSignedUrl(foundBanner.image)
      : "";

    if (imageUrl) {
      foundBanner = {
        ...foundBanner.toObject(),
        image: imageUrl,
      };
    }

    res.render("admin/banner/editBanner", {
      foundBanner,
      error: "",
      activePage: "Banner",
    });
  } catch (error) {
    next(error);
  }
};

//post edit banner
export const editBanner = async (req, res, next) => {
  try {
    const { title, description, type, url } = req.body;
    const image = req.file;

    const foundBanner = await Banner.findById(req.params.id);

    if (title && description && type) {
      foundBanner.title = title;
      foundBanner.description = description;
      foundBanner.type = type;
      foundBanner.url = url;

      if (image) {
        if (foundBanner.image) {
          await deleteFileFromS3(foundBanner.image);
        }

        const folder = "banners";
        const newImageKey = await uploadFileToS3(image, folder);
        foundBanner.image = newImageKey;
      }

      await foundBanner.save();

      res.redirect("/admin/banners/1");
    } else {
      res.render("admin/banner/editBanner", {
        foundBanner,
        error: "All fields are required.",
        activePage: "Banner",
      });
    }
  } catch (error) {
    next(error);
  }
};

//banner action
export const bannerAction = async (req, res, next) => {
  try {
    const state = req.body.state === "1";

    const currentBanner = await Banner.findById(req.params.id);

    const bannerType = currentBanner.type;

    let maxActiveBanners;

    if (bannerType === "hero-banner") {
      maxActiveBanners = 2;
    } else if (bannerType === "featured-banner") {
      maxActiveBanners = 2;
    }

    if (state === false) {
      const activeBanners = await Banner.find({
        type: bannerType,
        isActive: true,
      });

      if (activeBanners.length > maxActiveBanners) {
        await Banner.findByIdAndUpdate(req.params.id, {
          $set: { isActive: state },
        });
      } else {
        req.session.message = {
          type: "danger",
          message: `Can't deactivate! atleast ${maxActiveBanners} active ${bannerType} are required`,
        };
      }
    } else {
      await Banner.findByIdAndUpdate(req.params.id, {
        $set: { isActive: state },
      });
    }

    res.redirect("/admin/banners/1");
  } catch (error) {
    next(error);
  }
};
