import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";
import {
  deleteFileFromS3,
  getPreSignedUrl,
  uploadFileToS3,
} from "../../utils/s3Utils.js";

export const getProducts = async (req, res, next) => {
  try {
    //pagination
    const page = parseInt(req.params.page) || 1;
    const pageSize = 5;
    const skip = (page - 1) * pageSize;
    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / pageSize);

    let foundProducts = await Product.find({})
      .populate("category")
      .skip(skip)
      .limit(pageSize);

    if (foundProducts.length > 0) {
      foundProducts = await Promise.all(
        foundProducts.map(async (product) => {
          const images = await Promise.all(
            product.images.map(async (key) => {
              const url = await getPreSignedUrl(key);
              return url;
            })
          );

          return {
            ...product.toObject(),
            images,
          };
        })
      );
    }

    res.render("admin/products/products", {
      productDatas: foundProducts,
      activePage: "Products",
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

//get add product
export const getAddProduct = async (req, res, next) => {
  try {
    const foundCategories = await Category.find({}, { name: 1 });
    res.render("admin/products/addProduct", {
      foundCategories,
      error: "",
      activePage: "Products",
    });
  } catch (error) {
    next(error);
  }
};

//add new product
export const addNewProduct = async (req, res, next) => {
  const {
    title,
    category,
    description,
    price,
    stock,
    artist,
    color,
    offerPercentage,
    offerValidUpto,
  } = req.body;

  const images = req.files;

  const foundCategories = await Category.find({}, { name: 1 });
  try {
    const existingProduct = await Product.findOne({
      title: { $regex: new RegExp(`^${title}$`, "i") },
    }).collation({ locale: "en", strength: 2 });

    if (
      !title ||
      !description ||
      !category ||
      !price ||
      !stock ||
      !artist ||
      !color ||
      !images
    ) {
      return res.render("admin/products/addProduct", {
        foundCategories,
        error: "All fields are required.",
        activePage: "Products",
      });
    } else if (existingProduct) {
      return res.render("admin/products/addProduct", {
        foundCategories,
        error: "Product with this name already exist",
        activePage: "Products",
      });
    } else {
      const folder = "products";
      const productImages = await Promise.all(
        images.map(async (img) => {
          const key = await uploadFileToS3(img, folder);
          return key;
        })
      );

      const productData = {
        title,
        description,
        stock,
        price,
        category,
        artist,
        color,
        images: productImages,
      };

      // Add offerPercentage and offerValidUpto to productData if provided
      if (offerPercentage && offerValidUpto) {
        productData.offerPercentage = parseInt(offerPercentage);
        productData.offerValidUpto = new Date(offerValidUpto);
        productData.isOfferActive = true;
      }

      await Product.create(productData);

      await Category.findByIdAndUpdate(category, {
        $inc: { productsCount: 1 },
      });
    }
    const pageSize = 5;

    const totalProducts = await Product.countDocuments();

    const page = Math.ceil(totalProducts / pageSize);

    res.redirect(`/admin/products/${page}`);
  } catch (error) {
    let hasError = false;
    let message;

    if (error.code === 11000) {
      hasError = true;
      message = "Product with the name already exist.";
    } else if (
      error.message.includes("Product validation failed: price: Path `price`")
    ) {
      hasError = true;
      message = "Price value should not be negative";
    } else if (
      error.message.includes("Product validation failed: stock: Path `stock`")
    ) {
      hasError = true;
      message = "Stock value should not be negative";
    } else if (
      error.message.includes(
        "Product validation failed: price: Cast to Number failed for value"
      )
    ) {
      hasError = true;
      message = "PLease enter a valid price";
    } else if (
      error.message.includes(
        "Product validation failed: stock: Cast to Number failed for value "
      )
    ) {
      hasError = true;
      message = "PLease enter a valid stock number";
    }

    if (hasError) {
      res.render("admin/products/addProduct", {
        foundCategories,
        error: message,
        activePage: "Products",
      });
    } else {
      next(error);
    }
  }
};

//get edit product
export const getEditProduct = async (req, res, next) => {
  try {
    let foundProduct = await Product.findById(req.params.id).populate(
      "category"
    );

    if (foundProduct) {
      const imageUrls = await Promise.all(
        foundProduct.images.map(async (key) => {
          const url = await getPreSignedUrl(key);
          const newObj = {
            key,
            url,
          };
          return newObj;
        })
      );

      foundProduct = {
        ...foundProduct.toObject(),
        images: imageUrls,
      };
    }

    const foundCategories = await Category.find({}, { name: 1 });

    res.render("admin/products/editProduct", {
      foundProduct,
      foundCategories,
      error: "",
      activePage: "Products",
    });
  } catch (error) {
    next(error);
  }
};

//edit product
export const editProduct = async (req, res, next) => {
  const {
    title,
    category,
    description,
    price,
    stock,
    artist,
    color,
    offerPercentage,
    offerValidUpto,
  } = req.body;

  //for rendering same page with error
  const foundCategories = await Category.find({}, { name: 1 });
  const foundProduct = await Product.findById(req.params.id);

  try {
    const existingProduct = await Category.findOne({
      title: { $regex: new RegExp(`^${title}$`, "i") },
    }).collation({ locale: "en", strength: 2 });

    if (existingProduct) {
      return res.render("admin/products/editProduct", {
        foundProduct,
        foundCategories,
        error: "Product with this name already exist!",
        activePage: "Products",
      });
    }

    let updatedData = {
      title,
      category,
      description,
      price,
      stock,
      artist,
      color,
    };

    if (offerPercentage && offerValidUpto) {
      updatedData.offerPercentage = parseInt(offerPercentage);
      updatedData.offerValidUpto = new Date(offerValidUpto);
    }

    await Product.findByIdAndUpdate(req.params.id, updatedData, {
      runValidators: true,
    });

    //category updation
    const oldCategory = await Category.findById(foundProduct.category);
    const updatedProduct = await Product.findById(req.params.id);
    const newCategory = await Category.findById(updatedProduct.category);
    if (oldCategory._id.toString() !== newCategory._id.toString()) {
      oldCategory.productsCount -= 1;
      newCategory.productsCount += 1;
    }

    await oldCategory.save();
    await newCategory.save();

    res.redirect("/admin/products/1");
  } catch (error) {
    let hasError = false;
    let message;

    if (error.code === 11000) {
      hasError = true;
      message = "Product with the name already exist.";
    }
    if (hasError) {
      res.render("admin/products/editProduct", {
        foundProduct,
        foundCategories,
        error: message,
        activePage: "Products",
      });
    } else {
      next(error);
    }
  }
};

//delete a product image
export const deleteSingleImage = async (req, res, next) => {
  try {
    const { key } = req.body;

    await deleteFileFromS3(key);

    await Product.findByIdAndUpdate(
      req.params.id,
      { $pull: { images: key } },
      { new: true }
    );

    res.redirect(`/admin/edit-product/${req.params.id}`);
  } catch (error) {
    next(error);
  }
};

//add a product image
export const addSingleImage = async (req, res, next) => {
  try {
    const images = req.files;
    const folder = "products";
    const key = await uploadFileToS3(images[0], folder);

    if (typeof images !== "undefined") {
      await Product.findByIdAndUpdate(
        req.params.id,
        { $push: { images: key } },
        { new: true }
      );
      res.redirect(`/admin/edit-product/${req.params.id}`);
    }
  } catch (error) {
    next(error);
  }
};

//product soft delete
export const productDelete = async (req, res, next) => {
  try {
    const state = req.body.state === "1";
    await Product.findByIdAndUpdate(req.params.id, {
      $set: { softDeleted: state },
    });
    if (state === true) {
      await Category.findOneAndUpdate(
        { name: req.body.category },
        { $inc: { productsCount: -1 } }
      );
    } else {
      await Category.findOneAndUpdate(
        { name: req.body.category },
        { $inc: { productsCount: 1 } }
      );
    }
    res.redirect("/admin/products/1");
  } catch (error) {
    next(error);
  }
};

export const productOfferAction = async (req, res, next) => {
  try {
    const state = req.body.state === "1";
    const currentProduct = await Product.findById(req.params.id);
    const currentDate = new Date();
    if (
      !currentProduct.offerValidUpto ||
      currentDate > currentProduct.offerValidUpto
    ) {
      req.session.message = {
        type: "danger",
        message: "Offer has no valid Date !",
      };
      return res.redirect("/admin/products/1");
    }

    await Product.findByIdAndUpdate(req.params.id, {
      $set: { isOfferActive: state },
    });
    res.redirect("/admin/products/1");
  } catch (error) {
    next(error);
  }
};
