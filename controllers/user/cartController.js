import mongoose from "mongoose";
import {
  isLoggedIn,
  getCurrentUser,
} from "../../middlewares/userMiddleware.js";
import User from "../../models/userModel.js";
import Product from "../../models/productModel.js";
import Address from "../../models/adressModel.js";
import Order from "../../models/orderModel.js";
import Coupon from "../../models/couponModel.js";
import { sendToMail } from "../../utils/sendMail.js";
import createInvoice from "../../utils/invoice.js";

export const addToCart = async (req, res, next) => {
  try {
    const { product, fixedQuantity } = req.body;

    const currentUser = await getCurrentUser(req, res);

    //add item to cart
    currentUser.cart = currentUser.cart || [];

    const cartItem = {
      product,
      quantity: parseInt(fixedQuantity),
    };
    currentUser.cart.push(cartItem);

    //check if addition is from wishlist
    if (req.body.from && req.body.from === "wishlist") {
      const wishlistItemIndex = currentUser.wishlist.findIndex(
        (item) => item === product
      );

      currentUser.wishlist.splice(wishlistItemIndex, 1);
    }

    //save changes after updations
    await currentUser.save();

    //update coupon status
    if (req.session.couponApplied) {
      req.session.couponApplied = null;
    }

    //notification and redirection
    req.session.message = {
      type: "success",
      message: "Item added to cart!",
    };

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getCart = async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req, res);

    if (currentUser) {
      await currentUser.populate("cart.product");
      await currentUser.populate("cart.product.category");

      const cartProducts = currentUser.cart;

      //find subtotal
      let subTotal = 0;
      let totalDiscount = 0;

      for (const cartItem of cartProducts) {
        const product = cartItem.product;
        let discountPercentage = 0;

        // Check if the product has an offer
        if (
          product.isOfferActive &&
          product.offerPercentage !== null &&
          product.offerValidUpto >= new Date()
        ) {
          discountPercentage += product.offerPercentage;
        }
        if (
          product.category.isOfferActive &&
          product.category.offerPercentage !== null &&
          product.category.offerValidUpto >= new Date()
        ) {
          discountPercentage += product.category.offerPercentage;
        }

        if (discountPercentage > 90) {
          discountPercentage = 90;
        }

        if (discountPercentage !== 0 && discountPercentage <= 90) {
          const discountedPrice =
            product.price - (discountPercentage / 100) * product.price;

          totalDiscount +=
            (discountPercentage / 100) * product.price * cartItem.quantity;

          subTotal += cartItem.quantity * discountedPrice;
        } else {
          subTotal += cartItem.quantity * product.price;
        }
      }

      const totalMrp = cartProducts.reduce((total, element) => {
        return total + element.quantity * element.product.price;
      }, 0);

      res.render("user/cart", {
        isLoggedIn: isLoggedIn(req, res),
        currentUser,
        cartProducts,
        totalMrp,
        subTotal,
        offerDiscount: totalDiscount !== 0 ? totalDiscount : "",
        grandTotal: subTotal + 20,
        insufficientStockProduct: "",
        activePage: "Cart",
      });
    } else {
      res.render("user/cart", {
        isLoggedIn: isLoggedIn(req, res),
        activePage: "Cart",
      });
    }
  } catch (error) {
    next(error);
  }
};

//remove from cart
export const removeFromCart = async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req, res);
    const cartItemIndex = currentUser.cart.findIndex(
      (item) => item._id.toString() === req.params.id
    );
    currentUser.cart.splice(cartItemIndex, 1);
    await currentUser.save();
    if (req.session.couponApplied) {
      req.session.couponApplied = null;
    }
    res.redirect("/cart");
  } catch (error) {
    next(error);
  }
};

//update cart
export const updateCart = async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req, res);

    const cartItem = currentUser.cart.find((item) =>
      item._id.equals(new mongoose.Types.ObjectId(req.params.id))
    );

    if (cartItem) {
      if (req.body.incOrDec === "increment") {
        if (cartItem.quantity !== 10) {
          cartItem.quantity++;
        }
      } else {
        if (cartItem.quantity !== 1) {
          cartItem.quantity--;
        }
      }

      //check stock
      const product = await Product.findById(cartItem.product).populate(
        "category"
      );

      let insufficientStock = false;
      if (product.stock < cartItem.quantity) {
        insufficientStock = true;
      }

      //find subtotal of entire product
      await currentUser.populate("cart.product");
      await currentUser.populate("cart.product.category");

      const cartProducts = currentUser.cart;

      let subTotal = 0;
      let totalDiscount = 0;

      for (const cartItem of cartProducts) {
        const product = cartItem.product;
        let discountPercentage = 0;

        // Check if the product has an offer
        if (
          product.isOfferActive &&
          product.offerPercentage !== null &&
          product.offerValidUpto >= new Date()
        ) {
          discountPercentage += product.offerPercentage;
        }
        // Check if the product has an category offer
        if (
          product.category.isOfferActive &&
          product.category.offerPercentage !== null &&
          product.category.offerValidUpto >= new Date()
        ) {
          discountPercentage += product.category.offerPercentage;
        }
        //max allowed offer set to 90
        if (discountPercentage > 90) {
          discountPercentage = 90;
        }

        if (discountPercentage !== 0 && discountPercentage <= 90) {
          const discountedPrice =
            product.price - (discountPercentage / 100) * product.price;

          totalDiscount +=
            (discountPercentage / 100) * product.price * cartItem.quantity;

          subTotal += cartItem.quantity * discountedPrice;
        } else {
          subTotal += cartItem.quantity * product.price;
        }
      }

      //find total price for updating product
      let discountPercentage = 0;
      let discountedPrice;

      // Check if the product has an offer
      if (
        product.isOfferActive &&
        product.offerPercentage !== null &&
        product.offerValidUpto >= new Date()
      ) {
        discountPercentage += product.offerPercentage;
      }
      // Check if the product has an category offer
      if (
        product.category.isOfferActive &&
        product.category.offerPercentage !== null &&
        product.category.offerValidUpto >= new Date()
      ) {
        discountPercentage += product.category.offerPercentage;
      }
      //max allowed offer set to 90
      if (discountPercentage > 90) {
        discountPercentage = 90;
      }

      if (discountPercentage !== 0 && discountPercentage <= 90) {
        discountedPrice =
          product.price - (discountPercentage / 100) * product.price;
      }

      await currentUser.save();

      //find total mrp
      const totalMrp = cartProducts.reduce((total, element) => {
        return total + element.quantity * element.product.price;
      }, 0);

      return res.status(200).json({
        message: "Success",
        totalMrp,
        quantity: cartItem.quantity,
        offerDiscount: totalDiscount,
        totalPrice:
          discountedPrice !== undefined
            ? discountedPrice * cartItem.quantity
            : product.price * cartItem.quantity,
        subTotal,
        grandTotal: subTotal + 20,
        insufficientStock,
      });
    } else {
      return res
        .status(404)
        .json({ message: "Product not found in the user's cart." });
    }
  } catch (error) {
    next(error);
  }
};

//get checkout
export const getCheckout = async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req, res);

    if (!currentUser.cart.length) {
      res.redirect("/cart");
    }

    if (currentUser.verified) {
      await currentUser.populate("cart.product");
      await currentUser.populate("cart.product.category");

      const cartProducts = currentUser.cart;

      //find subtotal and offer discount
      let subTotal = 0;
      let totalDiscount = 0;

      for (const cartItem of cartProducts) {
        const product = cartItem.product;
        let discountPercentage = 0;

        // Check if the product has an offer
        if (
          product.isOfferActive &&
          product.offerPercentage !== null &&
          product.offerValidUpto >= new Date()
        ) {
          discountPercentage += product.offerPercentage;
        }
        // Check if the product has an category offer
        if (
          product.category.isOfferActive &&
          product.category.offerPercentage !== null &&
          product.category.offerValidUpto >= new Date()
        ) {
          discountPercentage += product.category.offerPercentage;
        }
        //max allowed offer set to 90
        if (discountPercentage > 90) {
          discountPercentage = 90;
        }

        if (discountPercentage !== 0 && discountPercentage <= 90) {
          const discountedPrice =
            product.price - (discountPercentage / 100) * product.price;

          totalDiscount +=
            (discountPercentage / 100) * product.price * cartItem.quantity;

          subTotal += cartItem.quantity * discountedPrice;
        } else {
          subTotal += cartItem.quantity * product.price;
        }
      }

      const totalMrp = cartProducts.reduce((total, item) => {
        return total + item.quantity * item.product.price;
      }, 0);

      let insufficientStock = false;
      cartProducts.forEach((cartItem) => {
        if (cartItem.quantity > cartItem.product.stock) {
          insufficientStock = true;
        }
      });

      const defaultAddress = await Address.findOne({
        user: req.session.user,
        default: true,
      });

      const orders = await Order.find({ user: req.session.user });

      //find available coupons
      const currentDate = Date.now();
      const allCoupons = await Coupon.find({
        isActive: true,
        expirationDate: { $gte: currentDate },
      });
      const earnedCoupons = currentUser.earnedCoupons;
      const earnedCouponIds = earnedCoupons.map((element) =>
        element.coupon.toString()
      );
      const remainingCoupons = allCoupons.filter(
        (element) => !earnedCouponIds.includes(element._id.toString())
      );

      let grandTotal = subTotal + 20;

      //checking if applied coupon expired
      if (
        req.session.couponApplied &&
        req.session.couponApplied.discount !== 0
      ) {
        const currentCoupon = await Coupon.findById(
          req.session.couponApplied.couponId
        );
        const currentDate = Date.now();
        if (
          currentCoupon.isActive &&
          currentCoupon.expirationDate >= currentDate
        ) {
          grandTotal -= req.session.couponApplied.discount;
        } else {
          req.session.couponApplied = null;
        }
      }

      if (!insufficientStock) {
        res.render("user/checkout", {
          isLoggedIn: isLoggedIn(req, res),
          currentUser,
          cartProducts,
          defaultAddress,
          totalMrp,
          couponDiscount:
            req.session.couponApplied &&
            req.session.couponApplied.discount !== 0
              ? req.session.couponApplied.discount
              : "",
          offerDiscount: totalDiscount !== 0 ? totalDiscount : "",
          subTotal,
          grandTotal,
          error: "",
          ordersLength: orders.length,
          foundCoupons: remainingCoupons,
        });
      } else {
        req.session.message = {
          type: "danger",
          message:
            "Insufficient stock products. PLease check your cart items !",
        };

        res.redirect("/cart");
      }
    } else {
      req.body.email = currentUser.email;
      sendToMail(req, res, currentUser._id, false, next);
    }
  } catch (error) {
    next(error);
  }
};

//apply coupon
export const applyCoupon = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.session.user);
    const currentCoupon = await Coupon.findOne({ code: req.body.coupon });

    //populate to read 'element.product.price'
    await currentUser.populate("cart.product");
    await currentUser.populate("cart.product.category");

    //to render & reduce can be called
    const cartProducts = currentUser.cart;

    //find subtotal and offer discount
    let subTotal = 0;
    let totalDiscount = 0;

    for (const cartItem of cartProducts) {
      const product = cartItem.product;
      let discountPercentage = 0;

      // Check if the product has an offer
      if (
        product.isOfferActive &&
        product.offerPercentage !== null &&
        product.offerValidUpto >= new Date()
      ) {
        discountPercentage += product.offerPercentage;
      }
      // Check if the product has an category offer
      if (
        product.category.isOfferActive &&
        product.category.offerPercentage !== null &&
        product.category.offerValidUpto >= new Date()
      ) {
        discountPercentage += product.category.offerPercentage;
      }
      //max allowed offer set to 90
      if (discountPercentage > 90) {
        discountPercentage = 90;
      }

      if (discountPercentage !== 0 && discountPercentage <= 90) {
        const discountedPrice =
          product.price - (discountPercentage / 100) * product.price;

        totalDiscount +=
          (discountPercentage / 100) * product.price * cartItem.quantity;

        subTotal += cartItem.quantity * discountedPrice;
      } else {
        subTotal += cartItem.quantity * product.price;
      }
    }

    //to render with error
    await currentUser.populate("cart.product.category");
    const defaultAddress = await Address.findOne({
      user: req.session.user,
      default: true,
    });
    const orders = await Order.find({ user: req.session.user });

    let error = "";
    let couponDiscount = 0;

    if (currentCoupon) {
      const foundCoupon = currentUser.earnedCoupons.find(
        (element) => element.coupon.equals(currentCoupon._id) && element.isUsed
      );
      if (foundCoupon) {
        error = "Coupon already used.";
      } else {
        const currentDate = Date.now();
        if (
          currentCoupon.isActive &&
          currentCoupon.expirationDate >= currentDate
        ) {
          if (currentCoupon.usedCount < currentCoupon.usageLimit) {
            if (currentCoupon.minPurchaseAmount <= subTotal) {
              if (currentCoupon.discountType === "fixedAmount") {
                couponDiscount = currentCoupon.discountAmount;
              } else {
                couponDiscount =
                  (currentCoupon.discountAmount / 100) * subTotal;
              }
              req.session.couponApplied = {
                couponId: currentCoupon._id,
                discount: couponDiscount,
              };
            } else {
              error = `Coupon is applicable only on minimum purchase of Rs.${currentCoupon.minPurchaseAmount}`;
            }
          } else {
            error = "Coupon has reached limit";
          }
        } else {
          error = "Coupon is inactive or expired";
        }
      }
    } else {
      error = "Please enter a valid coupon code !";
    }

    const totalMrp = cartProducts.reduce((total, element) => {
      return total + element.quantity * element.product.price;
    }, 0);

    //find available coupons
    const currentDate = Date.now();
    const allCoupons = await Coupon.find({
      isActive: true,
      expirationDate: { $gte: currentDate },
    });
    const earnedCoupons = currentUser.earnedCoupons;
    const earnedCouponIds = earnedCoupons.map((element) =>
      element.coupon.toString()
    );
    const remainingCoupons = allCoupons.filter(
      (element) => !earnedCouponIds.includes(element._id.toString())
    );

    const grandTotal = subTotal - couponDiscount + 20;

    res.render("user/checkout", {
      isLoggedIn: isLoggedIn(req, res),
      currentUser,
      cartProducts,
      defaultAddress,
      totalMrp,
      offerDiscount: totalDiscount !== 0 ? totalDiscount : "",
      subTotal,
      grandTotal,
      couponDiscount,
      error,
      ordersLength: orders.length,
      foundCoupons: remainingCoupons,
    });
  } catch (error) {
    next(error);
  }
};

//get orders
export const getOrders = async (req, res, next) => {
  try {
    const addresses = await Address.find({ user: req.session.user });

    const orders = await Order.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.session.user) } },
      { $unwind: "$products" },
      // creating a separate document for each product in an order.
      {
        $lookup: {
          from: "products", //  search for matching documents in the "Product" collection.
          localField: "products.product", // contains the value to match against the foreign collection
          foreignField: "_id", // field from the foreign collection ("products" collection) that the localField will match against.
          as: "orderedProducts", // an array containing documents from the "products" collection that satisfy the lookup conditions
        },
      },
      { $sort: { orderDate: -1 } },
    ]);

    res.render("user/orders", {
      isLoggedIn: isLoggedIn(req, res),
      addresses,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

//cancel order
export const cancelOrder = async (req, res, next) => {
  try {
    const foundOrder = await Order.findById(req.body.orderId).populate(
      "products.product"
    );

    //find first element from the foundOrder.products array that satisfies the condition specified
    const foundProduct = foundOrder.products.find(
      (element) => element.product._id.toString() === req.body.productId
    );

    let cancellingProductQty = foundProduct.quantity;

    //update cancel order schema
    foundOrder.products.forEach((product) => {
      if (product.product._id.toString() === req.body.productId) {
        product.status = "Cancelled";
      }
    });

    await foundOrder.save();

    //find amt to refund
    const productCancelled = await Product.findById(
      req.body.productId
    ).populate("category");

    if (foundOrder.paymentMethod !== "cod") {
      let offerPercentage = 0;
      let amountToRefund = 0;

      if (
        productCancelled.isOfferActive &&
        productCancelled.offerValidUpto >= new Date()
      ) {
        offerPercentage += productCancelled.offerPercentage;
      }
      if (
        productCancelled.category.isOfferActive &&
        productCancelled.category.offerValidUpto >= new Date()
      ) {
        offerPercentage += productCancelled.category.offerPercentage;
      }
      if (offerPercentage > 90) {
        offerPercentage = 90;
      }

      if (offerPercentage !== 0 && offerPercentage <= 90) {
        const discountedPrice =
          productCancelled.price -
          (offerPercentage / 100) * productCancelled.price;
        amountToRefund = discountedPrice * cancellingProductQty;
      } else {
        amountToRefund = productCancelled.price * cancellingProductQty;
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
        description: "Order Cancelled",
        type: "Credit",
      };

      currentUser.wallet.transactions.push(transactionData);

      await currentUser.save();
    }

    //stock updation
    productCancelled.stock += cancellingProductQty;
    await productCancelled.save();

    req.session.message = {
      type: "success",
      message: "Order is cancelled !",
    };

    res.redirect("/orders");
  } catch (error) {
    next(error);
  }
};

//get single order
export const getSingleOrder = async (req, res, next) => {
  try {
    const foundOrder = await Order.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.orderId) } },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "populatedProduct",
        },
      },
      {
        $addFields: {
          "products.populatedProduct": {
            $arrayElemAt: ["$populatedProduct", 0],
          },
        },
      },

      {
        $match: {
          "populatedProduct._id": new mongoose.Types.ObjectId(
            req.params.productId
          ),
        },
      },
    ]);

    res.render("user/singleOrder", {
      isLoggedIn: isLoggedIn(req, res),
      foundOrder: foundOrder[0],
    });
  } catch (error) {
    next();
  }
};

//download invoice
export const downloadInvoice = async (req, res, next) => {
  try {
    const order = await Order.findById(req.query.order).populate(
      "products.product"
    );

    const invoiceNum = generateInvoiceNumber();

    const invoice = {
      shipping: {
        name: order.deliveryAddress.name,
        address: `${order.deliveryAddress.building}, ${order.deliveryAddress.area}`,
        city: order.deliveryAddress.city,
        state: order.deliveryAddress.state,
        postal_code: order.deliveryAddress.pincode,
        phone: order.deliveryAddress.phone,
      },

      orderdate: order.orderDate,
      items: order.products,
      subtotal: order.totalAmount - 20,
      shippingcharge: 20,
      grandtotal: order.totalAmount,
      invoice_nr: invoiceNum,
    };

    createInvoice(invoice, req, res, next);
  } catch (error) {
    next(error);
  }
};

//generate invoice number
function generateInvoiceNumber() {
  const currentYear = new Date().getFullYear();
  const randomDigits = Math.floor(1000000 + Math.random() * 9000000); // generates a random 7-digit number

  const invoiceNumber = `INV_${currentYear}${randomDigits}`;
  return invoiceNumber;
}
