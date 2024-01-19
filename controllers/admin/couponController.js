import Coupon from "../../models/couponModel.js";


//GET ADD COUPON
export const getAddCoupon = (req, res) => {
    res.render('admin/coupons/addCoupon', {
        error: "",
        activePage: 'Coupons',
    });
};

//ADD NEW COUPOON
export const addNewCoupon = async (req, res, next) => {
    try {
        const { description, discountType, discountAmount, minPurchaseAmount, usageLimit, expiryDate, startDate } = req.body;
        if (!description || !discountType || !discountAmount || !minPurchaseAmount || !usageLimit || !expiryDate  || !startDate) {
            res.render('admin/coupons/addCoupon', {
                error: "All fields are required",
                activePage: 'Coupons',
            });
        
            
        } else {

            const uniqueCode = await generateCouponCode(9);

                const newCoupon = new Coupon({
                    code: uniqueCode,
                    discountType,
                    description,
                    discountAmount,
                    minPurchaseAmount,
                    usageLimit,
                    startDate: new Date(startDate),
                    expirationDate: new Date(expiryDate),                    
                });

            await newCoupon.save();

            res.redirect("/admin/coupons/1");
            
        }
    } catch (error) {
        next(error);
    }
};

//GENERATE COUPON CODE
async function generateCouponCode(length) {

    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let couponCode = "";

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        couponCode += charset.charAt(randomIndex);
    }

    try {
        const existingCoupon = await Coupon.findOne({ code: couponCode });

        if (existingCoupon) {
            // If a coupon with the same code exists, recursively generate a new code
            return await generateCouponCode(8);
        }

        return couponCode;

    } catch (error) {
        // Handle errors, e.g., log or throw an exception
        console.error("Error generating coupon code:", error);
        throw error;
    }
}



//GET COUPONS
export const getCoupons = async (req, res, next) => {
    try {
        // pagination
        const page = parseInt(req.params.page) || 1;
        const pageSize = 5;
        const skip = (page - 1) * pageSize;
        const totalCoupons = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupons / pageSize);

        let foundCoupons;

        foundCoupons = await Coupon.find().skip(skip).limit(pageSize);
            res.render('admin/coupons/coupons', {
                foundCoupons,                                
                currentPage: page,
                totalPages: totalPages || 1,
                activePage: 'Coupons',
            });

    } catch (error) {
        next(error);
    }
};

//COUPON ACTION
export const couponAction = async (req, res, next) => {
    try {
        const state = req.body.state === "1";
        await Coupon.findByIdAndUpdate(req.params.id, { $set: { isActive: state } });
        res.redirect('/admin/coupons/1');
    } catch (error) {
        next(error);
    }
};

//GET EDIT COUPON
export const getEditCoupon = async (req, res, next) => {
    try {

        const foundCoupon = await Coupon.findById(req.params.id);

        if (!foundCoupon) {
            console.log("no coupon found");
        } else {
            res.render('admin/coupons/editCoupon', {
                foundCoupon,
                error: "",
                activePage: 'Coupons'
            });
        }
    } catch (error) {
        next(error);
    }
};

//EDIT COUPON
export const editCoupon = async (req, res, next) => {

    try {
        const { description, discountType, discountAmount, minPurchaseAmount, usageLimit, expiryDate, startDate } = req.body;
        //to render while error
        const foundCoupon = await Coupon.findById(req.params.id);

        if (!description || !discountType || !discountAmount || !minPurchaseAmount || !usageLimit || !expiryDate || !startDate) {
            res.render('admin/coupons/editCoupon' , {
                foundCoupon,
                error: "All fields are required",
                activePage: 'Coupons',
            });
                           
        } else {
            const currentCoupon = await Coupon.findById(req.params.id);
            
            //manage updation
            let dataToUpdate = {
                description,
                discountType,
                discountAmount,
                minPurchaseAmount,
                usageLimit,
                startDate: new Date(startDate),
                expirationDate: new Date(expiryDate),
            };
            
            //update
            await currentCoupon.updateOne (dataToUpdate);

            res.redirect('/admin/coupons/1');
        }
    } catch (error) {
        next (error);
    }
}
