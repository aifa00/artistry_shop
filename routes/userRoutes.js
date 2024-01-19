import { Router } from 'express';
import { getHome,getShop, getProduct, placeOrder, saveRazorpayOrder, applyWallet, 
  getOrderPlaced, returnProduct} from '../controllers/user/userController.js';
import { notLoggedin, isBlocked, isUser } from '../middlewares/userMiddleware.js';
import { getRegister, getLogin, registerUser, loginUser, logoutUser, Verification, resendOTP, getChangePassword, 
  changePassword, getForgotPassword, getOtp, getNewPassword, newPassword} from '../controllers/authController.js';
import { addToCart, getCart,updateCart, removeFromCart, getCheckout, getOrders, cancelOrder, getSingleOrder, 
  applyCoupon, downloadInvoice } from '../controllers/user/cartController.js';
import { getProfile, updateProfile, removeProfileImage, getNewAddress, addNewAddress, deleteAddress, getEditAddress, 
  editAddress, getChangeAddress, changeDefaultAddress, getCoupons, getWallet} from '../controllers/user/profileController.js';
import { uploadProfileImage, resizeProfileImage } from '../middlewares/imageUploadMiddleware.js';


const router = Router();


router.get('/',isBlocked, getHome);

router.route('/login').get(notLoggedin, getLogin).post(loginUser);

router.route('/register').get(notLoggedin, getRegister).post(registerUser);

router.post('/logout', logoutUser);

router.post('/verification', isBlocked, Verification);

router.post('/resend-otp', isBlocked, resendOTP);

router.get('/product/:id', isBlocked, getProduct);

router.post('/add-to-cart', isBlocked, isUser, addToCart);

router.get('/cart',isBlocked, getCart);

router.post('/update-cart/:id',isBlocked, isUser, updateCart)

router.post("/remove-from-cart/:id", isBlocked, isUser, removeFromCart);

router.route('/shop')
.get(isBlocked, getShop)
.post(isBlocked, getShop);

router.route('/profile')
  .get(isBlocked,isUser, getProfile)
  .patch(isBlocked, isUser, uploadProfileImage, resizeProfileImage, updateProfile);

router.post('/profile/remove-profile-image', isBlocked, isUser, removeProfileImage);

router.route('/change-password')
  .get(isBlocked,isUser, getChangePassword)
  .post(isBlocked, isUser, changePassword);

router.route('/new-address')
  .get(isBlocked, getNewAddress)
  .post(isBlocked, isUser, addNewAddress);

router.route('/edit-address/:id')
  .get(isBlocked, isUser, getEditAddress)
  .post(isBlocked, isUser, editAddress);

router.post('/delete-address/:id',isBlocked, isUser, deleteAddress);

router.route("/change-address")
  .get(isBlocked, isUser, getChangeAddress)
  .post(isBlocked, isUser, changeDefaultAddress);

router.get("/coupons",isBlocked, isUser, getCoupons);

router.post("/apply-coupon",isBlocked, isUser, applyCoupon);

router.route('/checkout')
  .get(isBlocked, isUser, getCheckout)
  .post(isBlocked, isUser, placeOrder);

router.post("/save-rzp-order",isBlocked, isUser, saveRazorpayOrder);

router.get("/wallet",isBlocked, isUser, getWallet);

router.post('/apply-wallet',isBlocked, isUser, applyWallet);

router.get("/orders", isBlocked, isUser, getOrders);

router.get('/order-placed',isBlocked, isUser, getOrderPlaced);

router.get('/single-order/:orderId/:productId',isBlocked, isUser, getSingleOrder);

router.post("/cancel-order", isBlocked, isUser, cancelOrder );

router.route('/forgot-password')
  .get(notLoggedin, getForgotPassword)
  .post(notLoggedin, getOtp);

router.route("/new-password/:id")
  .get(getNewPassword)
  .post(newPassword);

router.post('/return-product',isBlocked, returnProduct);
    

router.get('/download-invoice',isBlocked, downloadInvoice)




export default router;


