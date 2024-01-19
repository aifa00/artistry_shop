import User from "../models/userModel.js";

export const notLoggedin = (req, res, next) => {
    if (!req.session.user) {
        next();
    } else {
        res.redirect("/");
    }
};

export const isUser = (req, res, next) => {
    if(req.session.user){
        next();
    }else{
        res.redirect('/login');
    }
}


export const isLoggedIn = (req, res) => {
    return req.session.user ? true : false;
};

export const getCurrentUser = async (req, res, next) => {
    try {
        const currentUser = await User.findById(req.session.user) || "";
        return currentUser;
    } catch (error) {
        next(error);
    }
};

export const isBlocked = async (req, res, next) => {
    const user = await User.findById(req.session.user);
    if (user && user.blocked === true) {
        req.session.destroy();
        res.redirect("/");
    }else{
        next();
    }
    
};