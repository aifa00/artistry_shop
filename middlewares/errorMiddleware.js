export const serverError = (err, req, res ,next)=>{
    console.log(err.stack);
    res.status(500).render('error/500.ejs',{ error: err.message });
}