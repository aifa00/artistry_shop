export const isAdmin = (req, res, next) => {
    if (req.session.admin) {
        next();
    } else {
        res.redirect("/admin");
    }
};

export const notLoggedin = (req, res, next) => {
    if (!req.session.admin) {
        next();
    } else {
        res.redirect("/admin/dashboard");
    }
};
// export const isLoggedIn = (req, res, next) => {
//     if (!req.session.admin) {
//         next();
//     } else {
//         res.redirect("/admin/");
//     }
// };