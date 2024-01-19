import mongoose from "mongoose";
import User from "../../models/userModel.js";
import Order from "../../models/orderModel.js";
import Coupon from "../../models/couponModel.js";
import Return from "../../models/returnModel.js";
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';



export const getDashboard = async(req, res, next)=>{
    try{

        const admin = await User.findById(req.session.admin);

        const currentDate = new Date();

        const thisMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0);
        const thisMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        
        const currentMonthAnalysis = await Order.aggregate([
            {
                $match: {
                    orderDate:{
                        $gte: thisMonthStart,
                        $lte: thisMonthEnd,
                    }
                }
            },         
            {
                $unwind: '$products'
            },
            {
                $facet: {
                    todaysOrders:[
                        
                        {
                            $match: {
                                orderDate: {
                                    $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0),
                                    $lte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59)
                                }
                            }
                        },
                        { $count: 'count' }
                    ],
                    totalOrdersThisMonth: [
                        
                        { $count: 'count' }
                    ],
                    totalCustomersThisMonth: [
                        
                        {
                            $group: {
                                _id: '$user',
                            }
                        },                        
                        { $count: 'count' }
                    ],
                    totalRevenueThisMonth: [
                        {
                          $match: {
                            'products.status': 'Delivered',
                            $or: [
                              { 'products.returnRequested': 'Nil' },
                              { 'products.returnRequested': 'Rejected' },
                            ],
                          },
                        },
                        {
                          $group: {
                            _id: '$_id',
                            totalAmount: { $sum: '$totalAmount' },
                            totalWalletAmount: { $sum: '$walletAmtUsed' },
                            total: {
                              $sum: { $add: ['$totalAmount', '$walletAmtUsed'] },
                            },
                          },
                        },
                    ],

                }
            }
        ]);


        const todaysOrders = currentMonthAnalysis[0].todaysOrders[0] ? currentMonthAnalysis[0].todaysOrders[0].count : 0;

        const totalOrdersThisMonth = currentMonthAnalysis[0].totalOrdersThisMonth[0] ? currentMonthAnalysis[0].totalOrdersThisMonth[0].count : 0;

        const totalCustomersThisMonth = currentMonthAnalysis[0].totalCustomersThisMonth[0] ? currentMonthAnalysis[0].totalCustomersThisMonth[0].count : 0;

        const totalRevenueThisMonth = currentMonthAnalysis[0].totalRevenueThisMonth[0] ? currentMonthAnalysis[0].totalRevenueThisMonth[0].total : 0;


        //chart datas
        //by default(filtered is false) date set to this year
        let startDate = new Date(currentDate.getFullYear(), 0, 1, 0, 0, 0);
        let endDate = new Date(currentDate.getFullYear(), 11, 31, 23, 59, 59);

        if(req.query.filtered) {
            if(req.body.year) {
                startDate = new Date(parseInt(req.body.year), 0, 1, 0, 0, 0);
                endDate = new Date(parseInt(req.body.year), 11, 31, 23, 59, 59);

            } else if (req.body.from && req.body.upto) {
                
                startDate = new Date(req.body.from);
                startDate.setHours(0, 0, 0, 0);

                endDate = new Date(req.body.upto);
                endDate.setHours(23, 59, 59, 999);

            } else if (req.body.filterDate) {
                if(req.body.filterDate === 'past30Days') {

                    const past30DaysDate = new Date (currentDate);
                    past30DaysDate.setDate(currentDate.getDate() - 30);

                    startDate = past30DaysDate;
                    endDate = new Date (currentDate);
                    endDate.setHours(23, 59, 59, 999);

                } else if (req.body.filterDate === 'past12Months') {
                
                    const past12MonthsDate = new Date (currentDate);
                    past12MonthsDate.setMonth(currentDate.getMonth() - 12);

                    startDate = past12MonthsDate;
                    endDate = new Date (currentDate);
                    endDate.setHours(23, 59, 59, 999)
                    
                }
            }
            
        } 


        const deliveredOrders = await Order.aggregate([
            {
                $match: {
                    orderDate:{
                        $gte: startDate,
                        $lte: endDate,
                    }
                }
            },         
            {
                $unwind: '$products'
            },
            {
                $match: {
                  'products.status': 'Delivered',
                  $or: [
                    { 'products.returnRequested': 'Nil' },
                    { 'products.returnRequested': 'Rejected' },
                  ],
                },
            },
           
        ]);


        const revenueByPaymentMethod = {};
        
        const currentYearMonthlyOrders = {};

        
        const currentYear = currentDate.getFullYear();

        deliveredOrders.forEach((order) => {

            const { orderDate, paymentMethod } = order;
            

            if (!revenueByPaymentMethod[paymentMethod]) {
                if (paymentMethod === 'wallet') {
                    revenueByPaymentMethod[paymentMethod] = order.walletAmtUsed;
                } else {
                    revenueByPaymentMethod[paymentMethod] = order.totalAmount;
                }
            } else {
                if (paymentMethod === 'wallet') {
                    revenueByPaymentMethod[paymentMethod] += order.walletAmtUsed;
                } else {
                    revenueByPaymentMethod[paymentMethod] += order.totalAmount;
                }
                
            };
            

            //check current year and order year 
            const orderYear = orderDate.getFullYear();

            if (orderYear === currentYear) {

                //variable will hold the zero-based index of the month (0-11) 
                const orderMonth = orderDate.getMonth();

                const orderMonthString = `${orderMonth}`; 

                if (!currentYearMonthlyOrders[orderMonthString]) {
                    currentYearMonthlyOrders[orderMonthString] = 1;
                } else {
                    currentYearMonthlyOrders[orderMonthString]++;
                }

            }

        });


        //carries total orders for each month
        const ordersPerMonth = new Array(12).fill(0);


        //indices of ordersPerMonth array represents month
        for (let key in currentYearMonthlyOrders) {
            ordersPerMonth[key] = currentYearMonthlyOrders[key];
        }

        res.render("admin/dashboard",{
            admin,
            todaysOrders,
            totalOrdersThisMonth,
            totalCustomersThisMonth,
            totalRevenueThisMonth,
            revenueByPaymentMethod,
            ordersPerMonth,
            startDate: req.body.from ? req.body.from : "",
            endDate: req.body.upto ?  req.body.upto : "",
            year: req.body.year ? req.body.year : "",
            filterDate: req.body.filterDate ? req.body.filterDate : "",
            activePage: 'Dashboard'
        });

    }catch(error){
        next(error);
    }
}



export const getUsers = async (req, res, next) => {

    try{
        //pagination
        const page = parseInt(req.params.page) || 1;
        const pageSize = 5;
        const skip = (page - 1)* pageSize;
        const totalUsers = await User.countDocuments();
        const totalPages = Math.ceil(totalUsers / pageSize);
        
        const foundUsers = await User.find().skip(skip).limit(pageSize);

        res.render('admin/users', {
            userDatas:foundUsers,
            activePage: 'Users',
            currentPage: page,
            totalPages
        });
    }catch(error){
        next(error);
    }

}

//block user
export const blockUser = async (req, res, next) => {
    try {
        const state = req.body.state === "1";
        
        await User.findByIdAndUpdate(req.params.id, { $set: { blocked: state } });
        res.redirect('/admin/users/1');
    } catch (error) {
        next(error);
    }
};

//get orders
export const getOrders = async (req, res, next) => {
    try {
        
        // pagination
        const page = parseInt(req.params.page) || 1;
        const pageSize = 3;
        const skip = (page - 1) * pageSize;
        // const totalOrders = await Order.countDocuments();
        const totalOrders = await Order.aggregate([            
            { $match: { } },
            { $unwind: '$products' },
            { $count: 'totalCount' }
        ]);      
        let totalPages = 1;

        if(totalOrders.length) {
            totalPages = Math.ceil(totalOrders[0].totalCount / pageSize);
        }

            const orders = await Order.aggregate([
            
                { $match: { } },
                { $unwind: '$products' },
                // creating a separate document for each product in an order.
                {
                    $lookup: {
                        from: 'products', //  search for matching documents in the "Product" collection.
                        localField: 'products.product', // contains the value to match against the foreign collection
                        foreignField: '_id', // field from the foreign collection ("products" collection) that the localField will match against. 
                        as: 'orderedProducts', // an array containing documents from the "products" collection that satisfy the lookup conditions
                    }
                },
                { $sort: { orderDate: -1 } },
                { $skip: skip},
                { $limit: pageSize },
    
            ]);
    

        res.render('admin/orders', {
            orders,
            activePage: 'Orders',
            filtered: req.query.filtered ? true : false,
            currentPage: page || 1,
            totalPages: totalPages || 1,
        });

    } catch (error) {
        next(error);
    }
};




//get single order
export const getSingleOrder = async (req, res, next) => {
    
    try {
        const foundOrder = await Order.aggregate ([
            { $match: {_id: new mongoose.Types.ObjectId (req.params.orderId) } },
            { $unwind: '$products' },
            {
                $lookup: {
                    from:'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'populatedProduct'
                }
            },
            {
                $lookup: {
                    from:'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'populatedUser'
                }
            },
            { $match: { 'populatedProduct._id': new mongoose.Types.ObjectId (req.params.productId) } }

        ]);
            
        let appliedCoupon = null;

        // Check if the foundOrder has the 'couponApplied' field
        if (foundOrder[0].couponApplied) {
            appliedCoupon = await Coupon.findById(foundOrder[0].couponApplied);            
        }



        //find other products in same order
        const currentOrder = await Order.findById(req.params.orderId).populate('products.product');
        const otherProducts = currentOrder.products.filter((element) => element.product._id.toString() !== req.params.productId);


        res.render('admin/viewSingleOrder', {
              foundOrder,
              otherProducts,
              appliedCoupon,
              activePage: 'Orders',
            });

    } catch (error) {
        next ();
    }
}


//update order status
export const updateStatus = async (req, res, next) => {
    const {orderId, productId } = req.params
    try {
        const foundOrder = await Order.findById(req.params.orderId).populate('products.product');       
        const foundProduct = foundOrder.products.find((element) => element.product._id.toString() === req.params.productId);
        
        foundProduct.status = req.body.status;

        await foundOrder.save();
        res.redirect(`/admin/single-order/${orderId}/${productId}`);

    } catch (error) {
        next(error);        
    }
};



//get getReturnRequests
export const getReturnRequests = async (req, res, next) => {
    try {
        // pagination
        const page = parseInt(req.params.page) || 1;
        const pageSize = 3;
        const skip = (page - 1) * pageSize;
        const totalRequests = await Return.countDocuments();
        const totalPages = Math.ceil(totalRequests / pageSize) || 1;

        const returnRequests = await Return.find().populate([
            { path: 'user' },
            { path: 'order' },
            { path: 'product' },
        ]).skip(skip).limit(pageSize);

        
        res.render("admin/returns", {
            returnRequests,
            activePage: 'Orders',
            currentPage: page,
            totalPages: totalPages,
        });
    } catch (error) {
        next(error);
    }
};


//return request action 
export const returnRequestAction = async (req, res, next) => {
    try {
        const foundRequet = await Return.findById(req.body.request);
        const foundOrders = await Order.findById(req.body.order);
        const currentProduct = foundOrders.products.find((product) => product.product.toString() === req.body.product.toString());
        
        if (req.body.action === "approve") {
            foundRequet.status = 'Approved';
            currentProduct.returnRequested = 'Approved';
        } else {
            foundRequet.status = 'Rejected';
            currentProduct.returnRequested = 'Rejected';
        }
        await foundRequet.save();
        await foundOrders.save();
        res.redirect('/admin/return-requests/1');
    } catch (error) {
        next(error);
    }
};

//get sales report
export const getSalesReport = async (req, res, next) => {
    try {

        let startDate;
        let endDate;

        if (req.query.filtered && req.body.from && req.body.upto) {
            startDate = new Date(req.body.from);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(req.body.upto);
            endDate.setHours(23, 59, 59, 999);

        } else {
            const currentDate = new Date();

            startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0,0,0);
            endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        }



        const salesReportAnalysis = await Order.aggregate([
            {
                $match: {
                    orderDate:{
                        $gte: startDate,
                        $lte: endDate,
                    }
                }
            },         
            {
                $unwind: '$products'
            },
            {
                $match: {
                  'products.status': 'Delivered',
                  $or: [
                    { 'products.returnRequested': 'Nil' },
                    { 'products.returnRequested': 'Rejected' },
                  ],
                },
            },
            {
                $facet: {
                    
                    totalOrders: [                
                        { $count: 'total'}
                    ],
                    totalProductSold: [
                        {
                            $group: {
                                _id: null,
                                total : { $sum: '$products.quantity' }
                            }
                        }
                    ],
                    salesReport: [                        
                        
                        {
                            $lookup: {
                                from: 'products',
                                localField: 'products.product',
                                foreignField: '_id',
                                as: 'populatedProduct'
                            }
                        },
                        {
                            $addFields: {
                                'products.populatedProduct': {
                                    $arrayElemAt: ['$populatedProduct', 0]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'user',
                                foreignField: '_id',
                                as: 'populatedUser'
                            }
                        },
                        {
                            //flattening array
                            $unwind: '$populatedUser'
                        },
                        {
                            $project: {
                                _id: 1,
                                populatedUser: 1,
                                'products.quantity': 1,
                                'products.status': 1,
                                'products.returnRequested': 1,
                                'products.populatedProduct': 1,
                                totalAmount: 1,
                                paymentMethod: 1,
                                deliveryAddress: 1,              
                                orderDate: 1,
                                deliveryDate: 1              
                            }
                        }
                    ],
                    totalRevenue: [                        
                        {
                          $group: {
                            _id: '$_id',
                            totalAmount: { $sum: '$totalAmount' },
                            totalWalletAmount: { $sum: '$walletAmtUsed' },
                            total: {
                              $sum: { $add: ['$totalAmount', '$walletAmtUsed'] },
                            },
                          },
                        },
                    ],                    
                }
            }
        ]);


        const totalOrders = salesReportAnalysis[0].totalOrders[0] ? salesReportAnalysis[0].totalOrders[0].total : 0;        
        let salesReport = salesReportAnalysis[0].salesReport
        const totalRevenue = salesReportAnalysis[0].totalRevenue[0] ? salesReportAnalysis[0].totalRevenue[0].total : 0;
        const totalProductSold = salesReportAnalysis[0].totalProductSold[0] ? salesReportAnalysis[0].totalProductSold[0].total : 0;
        
        
        if(req.query.filtered && req.body.payment) {
            salesReport = salesReport.filter((order) => {
                return order.paymentMethod === req.body.payment;
            });
        }

        res.render('admin/salesReport', {
            totalOrders,
            salesReport,
            totalProductSold,
            totalRevenue,
            activePage: 'SalesReport',
            startDate: req.body.from ? req.body.from : "",
            endDate: req.body.upto ?  req.body.upto : "",
            payment: req.body.payment ? req.body.payment : "",
        });

    } catch (error) {
        next(error);
    }
};




//download sales report
export const downloadSalesReport = async (req, res, next) => {
    try {

        const salesReport = JSON.parse(req.query.salesReport);

        if (req.query.format === 'pdf') {
            
            // Create a new PDF document
            const doc = new PDFDocument();
    
            // Set the PDF response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
    
            // Pipe the PDF document to the response
            doc.pipe(res);
    
            // Add content to the PDF
            doc.fontSize(18).font('Helvetica-Bold').text('SALES REPORT', { align: 'center' });
            doc.moveDown();
    
            doc.font('Helvetica')
            doc.fontSize(10).text(`Date: ${new Date(Date.now()).toLocaleDateString()}`, { align: 'right' });
    
            doc.fontSize(15).text('ARTISTRY').font('Helvetica-Bold');
            doc.moveDown(0.3);
            doc.font('Helvetica')
            doc.fontSize(8).text(`Abcd street`);
            doc.fontSize(8).text(`Calicut, Kerala, 673020`);
            doc.fontSize(8).text(`1800-208-9898`);
    
    
            
            // doc.moveDown(3);
            let i;

            //where heading begins
            const invoiceTableTop = 230;

            //hr line above heading
            generateHr(doc, invoiceTableTop - 10);
          
            doc.font("Helvetica-Bold");
            generateTableRow(
              doc,
              invoiceTableTop,
              "Customer",
              "Email",
              "Phone",
              "Product",
              "Price",
              "Qty",
              "Payment",
              "Order Date",
            );
          
            generateHr(doc, invoiceTableTop + 20);
            
            doc.font("Helvetica");
            for (i = 0; i < salesReport.length; i++) {
              const report = salesReport[i];
              const position = invoiceTableTop + (i + 1) * 30;
              generateTableRow(
                doc,
                position,
                report.populatedUser.name,
                report.populatedUser.email,
                report.populatedUser.phone,
                report.products.populatedProduct.title,
                `${report.products.populatedProduct.price.toFixed(2)}`,
                report.products.quantity,
                report.paymentMethod,
                new Date(report.orderDate).toLocaleDateString(),             
              );
          
              generateHr(doc, position + 20);
            }
          
            const subtotalPosition = invoiceTableTop + (i + 1) * 30;
            doc.font("Helvetica-Bold");
            generateTableRow(
              doc,
              subtotalPosition,
              "Total Orders",
              "",              
              "",
              "",
              "",
              "",
              "",   
              salesReport.length,           
            );
          
            const paidToDatePosition = subtotalPosition + 20;
            doc.font("Helvetica-Bold");
            generateTableRow(
              doc,
              paidToDatePosition,
              "Total Products Sold",
              "",              
              "",
              "",
              "",
              "",
              "",     
              req.query.totalProductSold,         
            );
          
            const duePosition = paidToDatePosition + 20;
            doc.font("Helvetica-Bold");
            generateTableRow(
              doc,
              duePosition,
              "Total Revenue",
              "",              
              "",
              "",
              "",
              "",
              "",  
              `Rs. ${req.query.totalRevenue}`,            
            );
            doc.font("Helvetica");

            
            doc.end();
            


        } else if (req.query.format === 'excel') {
            
            // Create a new Excel workbook and worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');

            // Add headers to the worksheet
            worksheet.addRow(['User', 'Email', 'Phone', 'Product Name', 'Price', 'Quantity', 'Payment Method', 'Order Date', 'Delivery Date', 'Delivery Address', 'Pincode', 'Building']);

            // Iterate over the salesReport data and add it to the worksheet
            salesReport.forEach((report) => {
                const dataRow = [
                    report.populatedUser.name,
                    report.populatedUser.email,
                    report.populatedUser.phone,
                    report.products.populatedProduct.title,
                    report.products.populatedProduct.price,
                    report.products.quantity,
                    report.paymentMethod,
                    new Date(report.orderDate).toLocaleDateString(),
                    new Date(report.deliveryDate).toLocaleDateString(),
                    `${report.deliveryAddress.state}, ${report.deliveryAddress.city}, ${report.deliveryAddress.area}`,
                    report.deliveryAddress.pincode,
                    report.deliveryAddress.building
                ];

                worksheet.addRow(dataRow);
            });

            // Add total statistics
            worksheet.addRow(['Total Orders:', salesReport.length]);
            worksheet.addRow(['Total Products Sold:', req.query.totalProductSold]);
            worksheet.addRow(['Total Revenue:', `₹ ${req.query.totalRevenue}`]);

            // Set the response headers for Excel
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

            // Write the Excel file to the response
            await workbook.xlsx.write(res);
            res.end();
 
        } else {
            console.log('Invalid format specified');
        }

        
    } catch (error) {
        next(error);
    }
};

//function to generate table row in pdf
function generateTableRow(
    doc,
    y,
    Customer,
    Email,
    Phone,
    Product,
    Price,
    Quantity,
    Payment,
    orderDate
) {
    doc
      .fontSize(8)
      .text(Customer, 50, y)
      .text(Email, 120, y)
      .text(Phone, 230, y)
      .text(Product, 290, y)
      .text(Price, 380, y)
      .text(Quantity, 430, y,)
      .text(Payment, 460, y)
      .text(orderDate, 500, y, { align: "right" });
  }
  

//function to generate hr line
function generateHr(doc, y) {
  doc
    .strokeColor("#aaaaaa")
    .lineWidth(1)
    .moveTo(50, y)
    .lineTo(550, y)
    .stroke();
}
