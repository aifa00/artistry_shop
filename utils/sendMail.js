import bcrypt from "bcryptjs";
import nodeMailer from "nodemailer";
import UserOTPVerification from "../models/userOTPModel.js";

let salt;

async function generateSalt() {
  salt = await bcrypt.genSalt(10);
}

generateSalt();

export const sendToMail = (req, res, userId, isForgotPassword, next) => {
  const transporter = nodeMailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.USER,
      pass: process.env.APP_PASSWORD,
    },
  });

  function generateOTP(length) {
    const charset = "0123456789";
    let otp = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      otp += charset[randomIndex];
    }

    return otp;
  }

  let OTP = generateOTP(4);

  const mailOptions = {
    from: {
      name: "Artistry",
      address: process.env.USER,
    },
    to: req.body.email,
    subject: "OTP Verification",
    html: `<p>Your OTP for verification is <span style="font-size: 20px;font-weight: bold;">${OTP}</span></p>`,
  };

  const sendMail = async (transporter, options) => {
    try {
      await UserOTPVerification.deleteMany({ userId });
      const hashedOTP = await bcrypt.hash(OTP, salt);
      const newUserOTPVerification = new UserOTPVerification({
        userId,
        otp: hashedOTP,
      });
      await newUserOTPVerification.save();

      await transporter.sendMail(options);

      res.render("user/auth/verification", {
        userId,
        email: req.body.email,
        isForgotPassword,
        ref: "",
      });
    } catch (error) {
      next(error);
    }
  };

  sendMail(transporter, mailOptions);
};
