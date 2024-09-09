import Category from "../../models/categoryModel.js";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { dirname } from "path";
import logger from "../../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const getCategories = async (req, res, next) => {
  try {
    // pagination
    const page = parseInt(req.params.page) || 1;
    const pageSize = 5;
    const skip = (page - 1) * pageSize;
    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / pageSize);

    const foundCategories = await Category.find().skip(skip).limit(pageSize);

    res.render("admin/category/categories", {
      categoryDatas: foundCategories,
      activePage: "Category",
      currentPage: page || 1,
      totalPages: totalPages || 1,
    });
  } catch (error) {
    next(error);
  }
};

//get new category
export const getNewCategory = (req, res) => {
  res.render("admin/category/newCategory", {
    error: "",
    activePage: "Category",
  });
};

//post new category
export const addNewCategory = async (req, res, next) => {
  try {
    const { name, image, offerPercentage, offerValidUpto } = req.body;
    if (!name || !image) {
      res.render("admin/category/newCategory", {
        error: "PLease fill in all fields",
        activePage: "Category",
      });
    }

    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    }).collation({ locale: "en", strength: 2 });

    if (existingCategory) {
      return res.render("admin/category/newCategory", {
        error: "Category with this name already exists",
        activePage: "Category",
      });
    }

    const categoryData = {
      name,
      image: "/categories/" + image,
    };

    // Add offerPercentage and offerValidUpto to categoryData if provided
    if (offerPercentage && offerValidUpto) {
      categoryData.offerPercentage = parseInt(offerPercentage);
      categoryData.offerValidUpto = new Date(offerValidUpto);
      categoryData.isOfferActive = true;
    }

    await Category.create(categoryData);

    const pageSize = 5;
    const totalCategories = await Category.countDocuments();
    const page = Math.ceil(totalCategories / pageSize);
    res.redirect(`/admin/categories/${page}`);
  } catch (error) {
    let hasError = false;
    let message;

    if (error.code === 11000) {
      hasError = true;
      message = "Category with the name already exist.";
    } else if (
      error.message.includes("Category validation failed: name: Path `name`")
    ) {
      hasError = true;
      message = "Name should contain 3 to 20 characters.";
    } else if (
      error.message.includes(
        "Category validation failed: name: Category name must not contain special characters"
      )
    ) {
      hasError = true;
      message = "Category name must not contain special characters";
    }

    if (hasError) {
      res.render("admin/category/newCategory", {
        error: message,
        activePage: "Category",
      });
    } else {
      next(error);
    }
  }
};

export const getEditCategory = async (req, res, next) => {
  try {
    const foundCategory = await Category.findById(req.params.id);

    if (!foundCategory) {
      logger.info("no category found");
    } else {
      res.render("admin/category/editCategory", {
        categoryData: foundCategory,
        error: "",
        activePage: "Category",
      });
    }
  } catch (error) {
    next(error);
  }
};

export const editCategory = async (req, res, next) => {
  const { id } = req.params;
  const { name, image, offerPercentage, offerValidUpto } = req.body;
  const foundCategory = await Category.findById(id);
  try {
    let updatedData = {
      name,
    };

    if (typeof image !== "undefined") {
      fs.unlink(
        path.join(__dirname, "../../public", foundCategory.image),
        (err) => {
          if (err) {
            logger.log({
              level: "error",
              message: err,
            });
          }
        }
      );
      updatedData.image = "/categories/" + image;
    }

    if (offerPercentage && offerValidUpto) {
      updatedData.offerPercentage = parseInt(offerPercentage);
      updatedData.offerValidUpto = new Date(offerValidUpto);
    }

    await foundCategory.updateOne(updatedData, { runValidators: true });
    res.redirect("/admin/categories/1");
  } catch (error) {
    let hasError = false;
    let message;

    if (error.code === 11000) {
      hasError = true;
      message = "Category with the name already exist.";
    } else if (
      error.message.includes("is longer than the maximum allowed length (20)")
    ) {
      hasError = true;
      message = "Name should be between 3 to 20 characters.";
    } else if (
      error.message.includes("is shorter than the minimum allowed length (3)")
    ) {
      hasError = true;
      message = "Name should be between 3 to 20 characters.";
    } else if (
      error.message.includes(
        "Category name must not contain special characters"
      )
    ) {
      hasError = true;
      message = error.message;
    }

    if (hasError) {
      res.render("admin/category/editCategory", {
        categoryData: foundCategory,
        error: message,
        activePage: "Category",
      });
    } else {
      next(error);
    }
  }
};

export const desableCategory = async (req, res, next) => {
  try {
    const state = req.body.state === "1";
    // const state = req.body.state === "1" ? true : false ;
    await Category.findByIdAndUpdate(req.params.id, {
      $set: { disabled: state },
    });
    res.redirect("/admin/categories/1");
  } catch (error) {
    next(error);
  }
};

export const offerAction = async (req, res, next) => {
  try {
    const state = req.body.state === "1";
    const currentCategory = await Category.findById(req.params.id);
    const currentDate = new Date();
    if (
      !currentCategory.offerValidUpto ||
      currentDate > currentCategory.offerValidUpto
    ) {
      req.session.message = {
        type: "danger",
        message: "Offer has no valid Date !",
      };
      return res.redirect("/admin/categories/1");
    }

    await Category.findByIdAndUpdate(req.params.id, {
      $set: { isOfferActive: state },
    });
    res.redirect("/admin/categories/1");
  } catch (error) {
    next(error);
  }
};
