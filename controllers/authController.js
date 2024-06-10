import User from "../models/userModel.js";
import UserOTPVerification from "../models/userOTPModel.js";
import bcrypt from 'bcryptjs';
import { sendToMail } from "../utils/sendMail.js";
import { isLoggedIn, getCurrentUser } from "../middlewares/userMiddleware.js";


let salt;

async function generateSalt() {
    salt = await bcrypt.genSalt(10);
}

generateSalt();


//get register
export const getRegister = (req, res) => {
    res.render("user/auth/register", {
        commonError: '',
        ref: req.query.ref ? req.query.ref : null,
    });
};

//get login
export const getLogin = (req, res) => {

    res.render("user/auth/login", {
        commonError: '',        
    });
    
};

//get admin login
export const getAdminLogin = async (req, res) => {
    res.render('admin/login', {commonError: ''});
}

//login admin
export const loginAdmin = async (req, res, next) => {
    try{
        const {email, password} = req.body;
        if(email && password){
            const foundAdmin = await User.findOne({ email: email });
            if(foundAdmin){
                if(foundAdmin.isAdmin){
                    const isMatch = await bcrypt.compare(password, foundAdmin.password);
                    if(isMatch) {
                        req.session.admin = foundAdmin._id;
                        res.redirect('/admin/dashboard');
                    }else{
                        res.render('admin/login', {commonError: 'Invalid username or password'});
                    }
                    
                }else{
                    res.render('admin/login', {commonError: 'Not an admin'});
                }
            }else{
                res.render('admin/login', {commonError: 'No admin found'});
            }
        }else{
            res.render('admin/login', {commonError: 'Please fill in all fields'});
        }
    }catch(error){

    }
};



//logout admin
export const logoutAdmin = async (req, res, next) => {
    try {
        req.session.admin = null;
        res.redirect('/admin');
    } catch (error) {
        next(error);
    }
};


//register user
export const registerUser =async (req, res, next) => {
    try {
        const { name, email, phone, password, confirmPassword } = req.body;
        if (name && email && phone && password && confirmPassword) {
            const foundUser = await User.findOne({ $or: [{ phone: phone }, { email: email }] });

            if (foundUser && foundUser.verified) {
                res.render('user/auth/register', { commonError: "User already exist." });
            } else {
                
                if(foundUser && !foundUser.verified){
                    await User.deleteMany({email : foundUser.email});
                }
                
                if (password === confirmPassword) {
                    const hashPassword = await bcrypt.hash(password, salt);

                    const newUser = new User({
                        name: name,
                        email: email,
                        phone: phone,
                        password: hashPassword,
                    });
                               
                    if (req.body.ref) {
                        newUser.referrer = req.body.ref;
                    }

                    //save new user
                    await newUser.save();

                    const savedUser = await User.findOne({ email: email });
    
                    sendToMail(req, res, savedUser._id, false, next);
                } else {
                    res.render('user/auth/register', {
                        commonError: "Password and confirm password didn't match."
                    });
                }
            }
        } else {
            res.render('user/auth/register', {commonError: "Please fill in all fields"});
        }
    } catch (error) {
        next(error);
        
    }
};

//login user
export const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        //check the user exist or not
        if (email && password) {
            const foundUser = await User.findOne({ email: email });
            if (foundUser) {   //if (foundUser && foundUser.verified) 
                if (foundUser.blocked) {
                    res.render('user/auth/login', { commonError: "Can't log in.This user is blocked" });
                } else {
                    const isMatch = await bcrypt.compare(password, foundUser.password);

                    if(foundUser.isAdmin) {
                        return res.redirect('/admin');
                    }
                    if (isMatch) {
                            req.session.user = foundUser._id;
                            res.redirect('/');
                    } else {
                        res.render('user/auth/login', { commonError: "Invalid username or password." });
                    }
                }
            } else {
                res.render('user/auth/login', { commonError: "No user found." });
            }
        } else {
            res.render('user/auth/login', {commonError: "Please fill in all fields"});
        }
    } catch (error) {
        next(error)
    }
};


//verify user
export const Verification = async (req, res) => {
    let { userId, otp } = req.body;
    const verificationRecords = await UserOTPVerification.findOne({ userId });
    try {
        if (!userId || !otp) {
            throw Error("Input field is empty");
        } else {
            if (!verificationRecords) {
                throw new Error(
                    "Account record doesn't exist or has been verified already."
                );
            } else {
                const hashedOTP = verificationRecords.otp;
                
                if (verificationRecords.expiresAt < Date.now()) {
                    throw new Error("Code has expired. Please try again.");
                } else {
                    const isValid = await bcrypt.compare(otp, hashedOTP);
                    if (isValid) {
                        await User.updateOne({ _id: userId }, { verified: true });

                        
                        if (req.body.isForgotPassword === 'true') {
                            res.status(200).json({
                                success: true,
                                redirectTo: `/new-password/${userId}`
                            });

                        } else {
                            req.session.user = userId;
                            res.status(200).json({
                                success: true,
                                redirectTo: '/'
                            });
                        }
                        
                    } else {
                        throw new Error("Invalid code. Please try again.");
                    }
                }
            }
        }
    } catch (error) {
            res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

//resend otp
export const resendOTP = async (req, res, next) => {
    try {
        sendToMail(req, res, req.body.id, next);
    } catch (error) {
        next(error);
    }
};

//get change password
export const getChangePassword = async (req, res, next) => {
    try {
        res.render("user/auth/changePassword", {
            isLoggedIn: isLoggedIn(req, res),
            error: "",
        });
    } catch (error) {
        next (error);
    }
}


//post change password
export const changePassword = async (req, res) => {

    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            throw new Error("All fields are required.");
        }

        const currentUser = await getCurrentUser (req, res);
        const isMatch = await bcrypt.compare(currentPassword, currentUser.password);
        if (!isMatch) {
            throw new Error("Incorrect current password.");
        }

        if (newPassword !== confirmPassword) {
            throw new Error("New password and Confirm password didn't match.");
        }

        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await User.updateOne({ _id: req.session.user }, { $set: { password: hashedPassword } });

        req.session.message = {
            type: 'danger',
            message: 'Your password changed successfully !',
        }

        res.redirect("/profile");

    } catch (error) {
        res.render("user/auth/changePassword", {
            isLoggedIn: isLoggedIn (req, res),            
            error: error.message,           
        });
    }
};

//get forgot password
export const getForgotPassword = (req, res) => {
    res.render("user/auth/forgotPassword", { error: '' });
};

//post forgot password
export const getOtp = async (req, res, next) => {
    try {
        const foundUser = await User.findOne({ email: req.body.email });
        if (foundUser) {
            sendToMail(req, res, foundUser._id, true, next);
        } else {
            res.render("user/auth/forgotPassword", { error: "User with this email is not found !" });
        }
    } catch (error) {
        next(error);
    }
};

//get new password
export const getNewPassword = async (req, res, next) => {
    try {
        res.render("user/auth/newPassword", {
            userId: req.params.id,            
            error: ''
        });
    } catch (error) {
        next(error);
    }
};

//post new password
export const newPassword = async (req, res) => {

    try {
        const { newPassword, confirmPassword } = req.body;

        if (!newPassword || !confirmPassword) {
            throw new Error("All fields are required.");
        }

        if (newPassword !== confirmPassword) {
            throw new Error("New password and Confirm password didn't match.");
        }

        const hashPassword = await bcrypt.hash(newPassword, salt);
        
        await User.updateOne({ _id: req.params.id }, {
            $set: {
                password: hashPassword
            }
        });
        res.redirect("/login");
    } catch (error) {
        res.render("user/auth/newPassword", {
            userId: req.params.id,
            error: error.message
        });
    }

};

//logout user
export const logoutUser = async (req, res, next) => {
    try {
        req.session.user = null;
        res.redirect('/login');
    } catch (error) {
        next(error)
    }
};

