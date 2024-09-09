import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import Banner from "../../models/bannerModel.js";
import logger from "../../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    const { title, description, type, url, images } = req.body;

    if (title && description && type && images) {
      const imagesWithPath = images.map((image) => "/banners/" + image);

      await Banner.create({
        title,
        description,
        type,
        url,
        images: imagesWithPath,
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

    const foundBanners = await Banner.find().skip(skip).limit(pageSize);

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
    const foundBanner = await Banner.findById(req.params.id);

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
  const foundBanner = await Banner.findById(req.params.id);
  try {
    const { title, description, type, url } = req.body;

    if (title && description && type) {
      const dataToUpdate = {
        title,
        description,
        type,
        url,
      };

      await Banner.findByIdAndUpdate(req.params.id, dataToUpdate, {
        runValidators: true,
      });

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

//delete a banner image
export const deleteBannerImage = async (req, res, next) => {
  try {
    const { image } = req.body;

    await Banner.findByIdAndUpdate(
      req.params.id,
      { $pull: { images: image } },
      { new: true }
    );

    fs.unlink(path.join(__dirname, "../../public", image), (error) => {
      if (error) {
        logger.log({
          level: "error",
          message: error,
        });
      }
    });

    res.redirect(`/admin/edit-banner/${req.params.id}`);
  } catch (error) {
    next(error);
  }
};

//add a banner image
export const addBannerImage = async (req, res, next) => {
  try {
    const { images } = req.body;

    const newBannerImage = "/banners/" + images;

    if (typeof images !== "undefined") {
      await Banner.findByIdAndUpdate(
        req.params.id,
        { $push: { images: newBannerImage } },
        { new: true }
      );

      res.redirect(`/admin/edit-banner/${req.params.id}`);
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
