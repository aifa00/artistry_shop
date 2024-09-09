import { Router } from "express";
import {
  getDashboard,
  getUsers,
  blockUser,
  getOrders,
  getSingleOrder,
  updateStatus,
  getReturnRequests,
  returnRequestAction,
  downloadSalesReport,
  getSalesReport,
} from "../controllers/admin/adminController.js";
import {
  getAdminLogin,
  logoutAdmin,
  loginAdmin,
} from "../controllers/authController.js";
import { notLoggedin, isAdmin } from "../middlewares/adminMiddleware.js";
import {
  uploadCategoryImage,
  resizeCategoryImage,
  uploadProductImages,
  resizeProductImages,
  uploadBannerImages,
  resizeBannerImages,
} from "../middlewares/imageUploadMiddleware.js";
import {
  getNewCategory,
  addNewCategory,
  getCategories,
  getEditCategory,
  editCategory,
  desableCategory,
  offerAction,
} from "../controllers/admin/categoryController.js";
import {
  getProducts,
  getAddProduct,
  addNewProduct,
  productDelete,
  getEditProduct,
  editProduct,
  deleteSingleImage,
  addSingleImage,
  productOfferAction,
} from "../controllers/admin/productController.js";
import {
  addNewCoupon,
  couponAction,
  getAddCoupon,
  getCoupons,
  getEditCoupon,
  editCoupon,
} from "../controllers/admin/couponController.js";
import {
  addNewBanner,
  getAddNewBanner,
  getBanners,
  getEditBanner,
  editBanner,
  bannerAction,
  deleteBannerImage,
  addBannerImage,
} from "../controllers/admin/bannerController.js";

const router = Router();

router.route("/").get(notLoggedin, getAdminLogin).post(loginAdmin);

router
  .route("/dashboard")
  .get(isAdmin, getDashboard)
  .post(isAdmin, getDashboard);

router.post("/logout", logoutAdmin);

router
  .route("/new-category")
  .get(isAdmin, getNewCategory)
  .post(isAdmin, uploadCategoryImage, resizeCategoryImage, addNewCategory);

router
  .route("/categories/:page")
  .get(isAdmin, getCategories)
  .post(isAdmin, getCategories);

router
  .route("/edit-category/:id")
  .get(isAdmin, getEditCategory)
  .patch(isAdmin, uploadCategoryImage, resizeCategoryImage, editCategory);

router.patch("/categories/action/:id", isAdmin, desableCategory);
router.patch("/categories/action/offer/:id", isAdmin, offerAction);

router.get("/users/:page", isAdmin, getUsers);
router.patch("/users/block-user/:id", isAdmin, blockUser);

router
  .route("/add-product")
  .get(isAdmin, getAddProduct)
  .post(isAdmin, uploadProductImages, resizeProductImages, addNewProduct);

router.get("/products/:page", isAdmin, getProducts);

router
  .route("/edit-product/:id")
  .get(isAdmin, getEditProduct)
  .patch(isAdmin, uploadProductImages, resizeProductImages, editProduct);

router.patch("/products/soft-delete/:id", isAdmin, productDelete);
router.patch("/products/action/offer/:id", isAdmin, productOfferAction);

router.delete("/product/delete-image/:id", isAdmin, deleteSingleImage);
router.patch(
  "/product/add-image/:id",
  isAdmin,
  uploadProductImages,
  resizeProductImages,
  addSingleImage
);

router.route("/orders/:page").get(isAdmin, getOrders).post(isAdmin, getOrders);

router.get("/single-order/:orderId/:productId", isAdmin, getSingleOrder);
router.post("/update-order-status/:orderId/:productId", isAdmin, updateStatus);

router
  .route("/return-requests/:page")
  .get(isAdmin, getReturnRequests)
  .post(isAdmin, getReturnRequests);
router.post("/return-request-action", isAdmin, returnRequestAction);

router
  .route("/add-coupon")
  .get(isAdmin, getAddCoupon)
  .post(isAdmin, addNewCoupon);

router
  .route("/coupons/:page")
  .get(isAdmin, getCoupons)
  .post(isAdmin, getCoupons);

router
  .route("/edit-coupon/:id")
  .get(isAdmin, getEditCoupon)
  .patch(isAdmin, editCoupon);

router.patch("/coupon/action/:id", isAdmin, couponAction);

router
  .route("/add-banner")
  .get(isAdmin, getAddNewBanner)
  .post(isAdmin, uploadBannerImages, resizeBannerImages, addNewBanner);

router
  .route("/banners/:page")
  .get(isAdmin, getBanners)
  .post(isAdmin, getBanners);

router
  .route("/edit-banner/:id")
  .get(isAdmin, getEditBanner)
  .patch(isAdmin, editBanner);

router.delete("/banner/delete-image/:id", isAdmin, deleteBannerImage);

router.patch(
  "/banner/add-image/:id",
  isAdmin,
  uploadBannerImages,
  resizeBannerImages,
  addBannerImage
);

router.patch("/banner/action/:id", isAdmin, bannerAction);

router
  .route("/sales-report")
  .get(isAdmin, getSalesReport)
  .post(isAdmin, getSalesReport);

router.get("/download-report", isAdmin, downloadSalesReport);

export default router;
