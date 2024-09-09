import {
  isLoggedIn,
  getCurrentUser,
} from "../../middlewares/userMiddleware.js";
import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";
import Address from "../../models/adressModel.js";
import Order from "../../models/orderModel.js";
import Coupon from "../../models/couponModel.js";
import razorpay from "../../utils/razorpayConfig.js";
import User from "../../models/userModel.js";
import Banner from "../../models/bannerModel.js";
import Return from "../../models/returnModel.js";
import logger from "../../utils/logger.js";

//get home
export const getHome = async (req, res, next) => {
  try {
    const allProducts = await Product.find({ softDeleted: false }).populate(
      "category"
    );
    const canvas = allProducts.filter(
      (product) => product.category.name === "Canvas"
    );
    const paintings = allProducts.filter(
      (product) => product.category.name === "Paintings"
    );
    const foundCategories = await Category.find({ disabled: false }).limit(5);
    const heroBanners = await Banner.find({
      type: "hero-banner",
      isActive: true,
    }).limit(2);
    const featuredBanners = await Banner.find({
      type: "featured-banner",
      isActive: true,
    }).limit(2);

    res.render("user/home", {
      isLoggedIn: isLoggedIn(req, res),
      currentUser: await getCurrentUser(req, res),
      allProducts,
      canvas,
      paintings,
      foundCategories,
      heroBanners,
      featuredBanners,
      activePage: "Home",
    });
  } catch (error) {
    next(error);
  }
};

//get shop test 2
export const getShop = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;

    const pageSize = 6;
    const skip = (page - 1) * pageSize;
    let totalProducts = await Product.countDocuments({ softDeleted: false });
    // let totalProducts ;

    const categories = req.query.categories;
    const colors = req.query.colors;
    const price = req.query.price;
    const search = req.query.search;
    const sort = req.query.sort;

    let queryToSort;
    if (sort) {
      if (req.query.sort === "low-to-high") {
        queryToSort = { price: 1 };
      } else if (req.query.sort === "high-to-low") {
        queryToSort = { price: -1 };
      }
    }

    let foundProducts;

    if (categories || colors || price) {
      //setting the query to filter
      let queryToFilter = {
        softDeleted: false,
      };

      //if price in query
      if (price) {
        let price = parseInt(req.query.price);

        //calculate min and max price if price
        let minPrice;
        let maxPrice;
        if (price === 299) {
          minPrice = 0;
          maxPrice = 300;
        } else if (price === 900) {
          minPrice = 900;
          maxPrice = Number.POSITIVE_INFINITY;
        } else {
          minPrice = price;
          maxPrice = price + 200;
        }

        queryToFilter.price = { $gte: minPrice, $lte: maxPrice };
      }

      //if colors in query
      if (colors) {
        queryToFilter.color = { $in: req.query.colors };
      }

      //if category in query
      if (categories) {
        queryToFilter.category = { $in: req.query.categories };
      }

      //for searching
      const allProducts = await Product.find(queryToFilter)
        .populate("category")
        .sort(queryToSort);

      //resultant product
      foundProducts = await Product.find(queryToFilter)
        .populate("category")
        .sort(queryToSort)
        .skip(skip)
        .limit(pageSize);

      if (search) {
        const searchTerm = search.toLowerCase();

        foundProducts = allProducts.filter(
          (product) =>
            product.title.toLowerCase().includes(searchTerm) ||
            product.category.name.toLowerCase().includes(searchTerm)
        );
      }

      totalProducts = allProducts.length;
    } else {
      if (search) {
        const allProducts = await Product.find({ softDeleted: false }).populate(
          "category"
        );

        const searchTerm = search.toLowerCase();

        const resultantProducts = allProducts.filter(
          (product) =>
            product.title.toLowerCase().includes(searchTerm) ||
            product.category.name.toLowerCase().includes(searchTerm)
        );

        foundProducts = resultantProducts.slice(skip, pageSize);

        if (sort) {
          if (sort === "low-to-high") {
            foundProducts.sort((a, b) => a.price - b.price);
          } else if (sort === "high-to-low") {
            foundProducts.sort((a, b) => b.price - a.price);
          }
        }

        totalProducts = resultantProducts.length;
      } else {
        foundProducts = await Product.find({ softDeleted: false })
          .populate("category")
          .sort(queryToSort)
          .skip(skip)
          .limit(pageSize);
      }
    }

    const totalPages = Math.ceil(totalProducts / pageSize);

    const foundCategories = await Category.find({ disabled: false });

    res.render("user/shop", {
      isLoggedIn: isLoggedIn(req, res),
      currentUser: await getCurrentUser(req, res),
      foundProducts,
      foundCategories,
      currentPage: page,
      totalPages,
      categories,
      colors,
      price,
      search,
      sort,
    });
  } catch (error) {
    next();
  }
};

//add to wishlist
export const addToWishlist = async (req, res, next) => {
  try {
    const { product } = req.body;

    const currentUser = await getCurrentUser(req, res);

    currentUser.wishlist.push(product);

    await currentUser.save();

    req.session.message = {
      type: "success",
      message: "Item added to wishlist!",
    };

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

//get wishlist
export const getWishlist = async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req, res);

    if (currentUser) {
      await currentUser.populate("wishlist");
      await currentUser.populate("wishlist.category");

      const foundProducts = currentUser.wishlist;

      res.render("user/wishlist", {
        isLoggedIn: isLoggedIn(req, res),
        currentUser,
        foundProducts,
      });
    } else {
      res.redirect("/shop");
    }
  } catch (error) {
    next(error);
  }
};

//remove from wishlist
export const removeFromWishlist = async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req, res);

    const itemIndex = currentUser.wishlist.findIndex(
      (item) => item === req.params.id
    );

    currentUser.wishlist.splice(itemIndex, 1);

    await currentUser.save();

    req.session.message = {
      type: "success",
      message: "Item removed from wishlist",
    };

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

//get single product
export const getProduct = async (req, res, next) => {
  try {
    const foundProduct = await Product.findById(req.params.id).populate(
      "category"
    );

    res.render("user/singleProduct", {
      isLoggedIn: isLoggedIn(req, res),
      currentUser: await getCurrentUser(req, res),
      foundProduct,
    });
  } catch (error) {
    next(error);
  }
};

//place order
export const placeOrder = async (req, res, next) => {
  try {
    const { walletAmountApplied, referralCode } = req.body;

    const currentUser = await getCurrentUser(req, res);

    await currentUser.populate("cart.product");

    const deliveryAddress = await Address.findOne({
      user: req.session.user,
      default: true,
    });

    if (req.session.couponApplied && req.session.couponApplied.discount !== 0) {
      const currentCoupon = await Coupon.findById(
        req.session.couponApplied.couponId
      );

      const currentDate = Date.now();

      if (
        currentCoupon.isActive &&
        currentCoupon.expirationDate >= currentDate
      ) {
        //saving coupon details if payment is cod or wallet
        if (
          req.body.paymentMethod === "cod" ||
          req.body.paymentMethod === "wallet"
        ) {
          await currentCoupon.updateOne({ $inc: { usedCount: 1 } });

          const earnedCoupon = {
            coupon: currentCoupon._id,
            isUsed: true,
          };
          currentUser.earnedCoupons.push(earnedCoupon);

          await currentUser.save();
        }
      } else {
        req.session.couponApplied = null;
      }
    }

    if (referralCode) {
      const foundUser = await User.findOne({ referralCode });

      if (referralCode === currentUser.referralCode || !foundUser) {
        req.session.message = {
          type: "danger",
          message: "Please enter a valid referral code !",
        };
        return res.redirect("/checkout");
      } else {
        if (
          req.body.paymentMethod === "cod" ||
          req.body.paymentMethod === "wallet"
        ) {
          // Increment the balance in the wallet of the found user
          foundUser.wallet.balance += 100;

          const transactionData = {
            amount: 100,
            description: "Referral Earning",
            type: "Credit",
          };

          foundUser.wallet.transactions.push(transactionData);

          await foundUser.save();

          currentUser.wallet.balance += 100;

          currentUser.wallet.transactions.push(transactionData);
        }
      }
    }

    const grandTotal = parseInt(req.body.grandTotal);

    if (req.body.paymentMethod === "razorpay") {
      //create a razorpay order
      const razorpayOrder = await razorpay.orders.create({
        // amount in the smallest currency unit
        amount: walletAmountApplied
          ? (grandTotal - parseInt(walletAmountApplied)) * 100
          : grandTotal * 100,
        currency: "INR",
        receipt: `${Math.floor(Math.random * 10000)
          .toString()
          .padStart(4, "0")}${Date.now()}`,
      });

      return res.render("user/razorpay", {
        currentUser,
        order: razorpayOrder,
        key_id: process.env.RAZORPAY_KEY_ID,
        walletAmountApplied: walletAmountApplied ? walletAmountApplied : "",
        referralCode: referralCode ? referralCode : "",
        offerDiscount: req.body.offerDiscount ? req.body.offerDiscount : "",
      });
    } else if (
      req.body.paymentMethod === "cod" ||
      req.body.paymentMethod === "wallet"
    ) {
      const orderedProducts = currentUser.cart.map((item) => {
        return {
          product: item.product._id,
          quantity: item.quantity,
        };
      });

      let newOrder = new Order({
        user: req.session.user,
        products: orderedProducts,
        totalAmount: grandTotal,
        paymentMethod: req.body.paymentMethod,
        deliveryAddress,
      });

      if (req.body.offerDiscount) {
        newOrder.offerDiscount = parseInt(req.body.offerDiscount);
      }

      if (
        req.session.couponApplied &&
        req.session.couponApplied.discount !== 0
      ) {
        newOrder.couponApplied = {
          couponId: req.session.couponApplied.couponId,
          discount: req.session.couponApplied.discount,
        };
        req.session.couponApplied = null;
      }

      if (req.body.paymentMethod === "wallet") {
        newOrder.totalAmount = 0;

        newOrder.walletAmtUsed = grandTotal;

        await newOrder.save();

        currentUser.wallet.balance -= grandTotal;

        const transactionData = {
          amount: grandTotal,
          description: "Order placed",
          type: "Debit",
        };

        currentUser.wallet.transactions.push(transactionData);

        await currentUser.save();
      } else if (req.body.paymentMethod === "cod") {
        if (walletAmountApplied || walletAmountApplied !== "") {
          currentUser.wallet.balance -= parseInt(walletAmountApplied);

          const transactionData = {
            amount: parseInt(walletAmountApplied),
            description: "Order placed",
            type: "Debit",
          };

          currentUser.wallet.transactions.push(transactionData);

          newOrder.totalAmount = grandTotal - walletAmountApplied;

          newOrder.walletAmtUsed = walletAmountApplied;

          await newOrder.save();
        } else {
          await newOrder.save();
        }
      }

      // stock update
      currentUser.cart.forEach(async (item) => {
        const foundProduct = await Product.findById(item.product._id);
        foundProduct.stock -= item.quantity;
        await foundProduct.save();
      });

      currentUser.cart = [];

      await currentUser.save();

      res.redirect("/order-placed");
    } else {
      logger.info("no payment selected");
    }
  } catch (error) {
    next(error);
  }
};

//apply wallet
export const applyWallet = async (req, res, next) => {
  try {
    const { grandTotal } = req.body;
    const currentUser = await getCurrentUser(req, res);

    let amountPayable;
    let walletAmountApplied;

    if (currentUser.wallet.balance === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Insufficient wallet balance !" });
    } else {
      if (currentUser.wallet.balance < grandTotal) {
        amountPayable = grandTotal - currentUser.wallet.balance;
        walletAmountApplied = currentUser.wallet.balance;
      } else if (currentUser.wallet.balance >= grandTotal) {
        amountPayable = 0;
        walletAmountApplied = grandTotal;
      }
    }

    res.status(200).json({ success: true, amountPayable, walletAmountApplied });
  } catch (error) {
    next(error);
  }
};

//save razorpay order
export const saveRazorpayOrder = async (req, res, next) => {
  try {
    const { transactionId, orderId, signature, offerDiscount } = req.body;

    const amount = parseInt(req.body.amount / 100);

    const currentUser = await getCurrentUser(req, res);

    await currentUser.populate("cart.product");

    const deliveryAddress = await Address.findOne({
      user: req.session.user,
      default: true,
    });

    if (transactionId && orderId && signature) {
      if (
        req.session.couponApplied &&
        req.session.couponApplied.discount !== 0
      ) {
        const currentCoupon = await Coupon.findById(
          req.session.couponApplied.couponId
        );

        await currentCoupon.updateOne({ $inc: { usedCount: 1 } });

        const earnedCoupon = {
          coupon: currentCoupon._id,
          isUsed: true,
        };

        currentUser.earnedCoupons.push(earnedCoupon);
      }

      if (req.body.referralCode) {
        const foundUser = await User.findOne({
          referralCode: req.body.referralCode,
        });

        foundUser.wallet.balance += 100;

        const transactionData = {
          amount: 100,
          description: "Referral Earning",
          type: "Credit",
        };

        foundUser.wallet.transactions.push(transactionData);

        await foundUser.save();

        currentUser.wallet.balance += 100;
      }

      const orderedProducts = currentUser.cart.map((item) => {
        return {
          product: item.product._id,
          quantity: item.quantity,
        };
      });

      let newOrder = new Order({
        user: req.session.user,
        products: orderedProducts,
        totalAmount: amount,
        paymentMethod: "razorpay",
        deliveryAddress,
        razorpayOrderId: orderId,
        transactionId, //razorpay payment id
      });

      if (offerDiscount) {
        newOrder.offerDiscount = parseInt(offerDiscount);
      }

      if (
        req.session.couponApplied &&
        req.session.couponApplied.discount !== 0
      ) {
        newOrder.couponApplied = {
          couponId: req.session.couponApplied.couponId,
          discount: req.session.couponApplied.discount,
        };
        req.session.couponApplied = null;
      }

      const { walletAmountApplied } = req.body;

      if (walletAmountApplied || walletAmountApplied !== "") {
        currentUser.wallet.balance -= parseInt(walletAmountApplied);

        const transactionData = {
          amount: parseInt(walletAmountApplied),
          description: "Order placed",
          type: "Debit",
        };

        currentUser.wallet.transactions.push(transactionData);

        newOrder.walletAmtUsed = req.body.walletAmountApplied;
      }

      await newOrder.save();

      // stock update
      currentUser.cart.forEach(async (item) => {
        const foundProduct = await Product.findById(item.product._id);
        foundProduct.stock -= item.quantity;
        await foundProduct.save();
      });

      currentUser.cart = [];

      await currentUser.save();

      return res.status(200).json({
        success: true,
        message: "order placed successfully",
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getOrderPlaced = async (req, res) => {
  res.render("user/orderPlaced", { isLoggedIn: isLoggedIn(req, res) });
};

export const returnProduct = async (req, res, next) => {
  try {
    const { orderId, productId, quantity, reason, condition, pickupAddress } =
      req.body;

    //save return to retun schema
    const returnProduct = new Return({
      user: req.session.user,
      order: orderId,
      product: productId,
      quantity: parseInt(quantity),
      reason: reason,
      condition: condition,
      address: pickupAddress,
    });

    await returnProduct.save();

    //update return status in order schema
    const foundOrder = await Order.findById(orderId).populate(
      "products.product"
    );

    foundOrder.products.forEach((product) => {
      if (product.product._id.toString() === productId) {
        product.returnRequested = "Initiated";
      }
    });

    await foundOrder.save();

    //find amt to refund
    const productReturned = await Product.findById(productId).populate(
      "category"
    );

    let offerPercentage = 0;
    let amountToRefund;

    if (
      productReturned.isOfferActive &&
      productReturned.offerValidUpto >= new Date()
    ) {
      offerPercentage += productReturned.offerPercentage;
    }
    if (
      productReturned.category.isOfferActive &&
      productReturned.category.offerValidUpto >= new Date()
    ) {
      offerPercentage += productReturned.category.offerPercentage;
    }
    if (offerPercentage > 90) {
      offerPercentage = 90;
    }

    if (offerPercentage !== 0 && offerPercentage <= 90) {
      const discountedPrice =
        productReturned.price - (offerPercentage / 100) * productReturned.price;
      amountToRefund = discountedPrice * parseInt(quantity);
    } else {
      amountToRefund = productReturned.price * parseInt(quantity);
    }

    if (foundOrder.products.length === 1) {
      amountToRefund += 20;

      if (foundOrder.couponApplied.discount !== undefined) {
        amountToRefund -= foundOrder.couponApplied.discount;
      }
    }

    //refund amt to wallet of user
    const currentUser = await getCurrentUser(req, res);

    currentUser.wallet.balance += amountToRefund;

    let transactionData = {
      amount: amountToRefund,
      description: "Product Returned",
      type: "Credit",
    };

    currentUser.wallet.transactions.push(transactionData);

    await currentUser.save();

    //success message
    req.session.message = {
      type: "success",
      message: "Return requested successfully ! ",
    };

    res.redirect("/orders");
  } catch (error) {
    next(error);
  }
};
