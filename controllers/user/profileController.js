import Address from "../../models/adressModel.js";
import {
  isLoggedIn,
  getCurrentUser,
} from "../../middlewares/userMiddleware.js";
import { sendToMail } from "../../utils/sendMail.js";
import User from "../../models/userModel.js";
import Coupon from "../../models/couponModel.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  deleteFileFromS3,
  getPreSignedUrl,
  uploadFileToS3,
} from "../../utils/s3Utils.js";

export const getProfile = async (req, res, next) => {
  try {
    let currentUser = await getCurrentUser(req, res);
    const address = await Address.find({ user: req.session.user });

    if (currentUser) {
      if (currentUser.profile && currentUser.profile !== "") {
        const imageUrl = await getPreSignedUrl(currentUser.profile);
        currentUser = {
          ...currentUser.toObject(),
          profile: imageUrl,
        };
      }
    }

    const referralLink = generateReferralLink(currentUser.referralCode);

    res.render("user/profile", {
      isLoggedIn: isLoggedIn(req, res),
      currentUser,
      error: "",
      address,
      referralLink,
    });
  } catch (error) {
    next(error);
  }
};

//generate refferal link
const generateReferralLink = (referralCode) => {
  return `https://art-istry.shop/register?ref=${referralCode}`;
};

//update profile
export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    const profile = req.file;
    const address = await Address.find({ user: req.session.user });

    if (!name || !email || !phone) {
      res.render("user/profile", {
        isLoggedIn: isLoggedIn(req, res),
        currentUser: await getCurrentUser(req, res),
        error: "All fields are required",
        address,
        message: "",
      });
    } else {
      const currentUser = await User.findById(req.session.user);

      const prevEmail = currentUser.email;

      const userWithSameEmail = await User.findOne({
        _id: { $ne: currentUser._id },
        email,
      });
      if (userWithSameEmail) {
        req.session.message = {
          type: "danger",
          message: "User with this email already exist",
        };

        return res.redirect("/profile");
      }
      const userWithSamePhone = await User.findOne({
        _id: { $ne: currentUser._id },
        phone,
      });
      if (userWithSamePhone) {
        req.session.message = {
          type: "danger",
          message: "User with this number already exist",
        };

        return res.redirect("/profile");
      }

      currentUser.name = name;
      currentUser.email = email;
      currentUser.phone = phone;

      if (profile) {
        if (currentUser.profile) {
          await deleteFileFromS3(currentUser.profile);
        }
        const folder = "profile";
        const imageKey = await uploadFileToS3(profile, folder);
        currentUser.profile = imageKey;
      }

      await currentUser.save();

      if (prevEmail !== email) {
        currentUser.verified = false;
        await currentUser.save();
        sendToMail(req, res, req.session.user, false, next);
      } else {
        req.session.message = {
          type: "success",
          message: "Your profile is updated !",
        };

        res.redirect("/profile");
      }
    }
  } catch (error) {
    next(error);
  }
};

//remove profile image
export const removeProfileImage = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.session.user);

    if (currentUser) {
      await deleteFileFromS3(currentUser.profile);
      currentUser.profile = "";
      await currentUser.save();
    }

    res.redirect("/profile");
  } catch (error) {
    next(error);
  }
};

//get add new adress
export const getNewAddress = async (req, res, next) => {
  try {
    res.render("user/newAddress", {
      isLoggedIn: isLoggedIn(req, res),
      currentUser: await getCurrentUser(req, res),
      error: "",
    });
  } catch (error) {
    next(error);
  }
};

//add new adress
export const addNewAddress = async (req, res, next) => {
  try {
    const otherAddresses = await Address.find({ user: req.session.user });

    if (otherAddresses.length < 3) {
      const { name, phone, building, area, pincode, state, city } = req.body;
      if ((building, area, pincode, state, city)) {
        const newAddress = new Address({
          user: req.session.user,
          name,
          phone,
          area,
          building,
          pincode,
          state,
          city,
          default: otherAddresses.length === 0 ? true : false,
        });
        await newAddress.save();

        if (req.body.from && req.body.from === "checkout") {
          req.session.message = {
            type: "success",
            message: "New Address Added.",
          };
          res.redirect("/checkout");
        } else {
          req.session.message = {
            type: "success",
            message: "Address added successfully !",
          };

          res.redirect("/profile");
        }
      }
    } else {
      if (req.body.from && req.body.from === "checkout") {
        req.session.message = {
          type: "danger",
          message:
            "Can't add new address.You have already added three addresses !",
        };
        res.redirect("/checkout");
      } else {
        res.render("user/newAddress", {
          isLoggedIn: isLoggedIn(req, res),
          currentUser: await getCurrentUser(req, res),
          error: "You have already added three addresses !",
        });
      }
    }
  } catch (error) {
    next(error);
  }
};

//delete address
export const deleteAddress = async (req, res, next) => {
  try {
    const foundAddress = await Address.findById({ _id: req.params.id });

    await Address.deleteOne({ _id: req.params.id });

    if (foundAddress.default) {
      const otherAddresses = await Address.find({ user: req.session.user });

      if (otherAddresses.length > 0) {
        // If other addresses exist, update the first one to be the default
        const newDefaultAddress = otherAddresses[0];
        newDefaultAddress.default = true;
        await newDefaultAddress.save();
      }
    }

    req.session.message = {
      type: "success",
      message: "Address deleted successfully !",
    };

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

//get edit address
export const getEditAddress = async (req, res, next) => {
  try {
    const currentAddress = await Address.findOne({ _id: req.params.id });
    res.render("user/editAddress", {
      isLoggedIn: isLoggedIn(req, res),
      currentAddress,
      error: "",
    });
  } catch (error) {
    next(error);
  }
};

//edit address
export const editAddress = async (req, res, next) => {
  try {
    const { name, phone, building, area, pincode, state, city } = req.body;

    if (!name || !phone || !building || !area || !pincode || !state || !city) {
      currentAddress = await Address.findOne({ _id: req.params.id });
      res.render("user/editAddress", {
        isLoggedIn: isLoggedIn(req, res),
        currentAddress,
        error: "All fields are required",
      });
    } else {
      await Address.updateOne(
        { _id: req.params.id },
        {
          $set: {
            user: req.session.user,
            name,
            phone,
            building,
            area,
            pincode,
            state,
            city,
          },
        }
      );

      if (req.body.from && req.body.from === "change-address") {
        res.redirect("/change-address");
      } else {
        req.session.message = {
          type: "success",
          message: "Address edited successfully !",
        };
        res.redirect("/profile");
      }
    }
  } catch (error) {
    next(error);
  }
};

//get cahange address
export const getChangeAddress = async (req, res, next) => {
  try {
    const foundAddress = await Address.find({ user: req.session.user });
    res.render("user/changeAddress", {
      isLoggedIn: isLoggedIn(req, res),

      foundAddress,
    });
  } catch (error) {
    next(error);
  }
};

//post change address
export const changeDefaultAddress = async (req, res, next) => {
  try {
    await Address.updateOne(
      { user: req.session.user, default: true },
      { $set: { default: false } }
    );
    await Address.findByIdAndUpdate(req.body.addressId, {
      $set: { default: true },
    });
    res.redirect("/checkout");
  } catch (error) {
    next(error);
  }
};

//get coupons
export const getCoupons = async (req, res, next) => {
  try {
    const currentDate = Date.now();
    // Retrieve all active and not expired coupons
    const allCoupons = await Coupon.find({
      isActive: true,
      expirationDate: { $gte: currentDate },
    });

    //coupons earned by user
    const currentUser = await User.findById(req.session.user).populate(
      "earnedCoupons.coupon"
    );
    const earnedCoupons = currentUser.earnedCoupons;

    // Convert the list of earned coupon IDs to an array
    const earnedCouponIds = earnedCoupons.map((element) =>
      element.coupon._id.toString()
    );
    // Filter out earned coupons from the active coupons list
    const remainingCoupons = allCoupons.filter(
      (element) => !earnedCouponIds.includes(element._id.toString())
    );

    res.render("user/coupons", {
      isLoggedIn: isLoggedIn(req, res),
      foundCoupons: remainingCoupons,
      earnedCoupons,
    });
  } catch (error) {
    next(error);
  }
};

//get wallets
export const getWallet = async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req, res);

    res.render("user/wallet", {
      isLoggedIn: isLoggedIn(req, res),
      currentUser,
    });
  } catch (error) {
    next(error);
  }
};
