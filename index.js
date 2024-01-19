import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import noCache from 'nocache';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import Connection from './database/db.js';
import customerRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import session from 'express-session';
import { serverError } from './middlewares/errorMiddleware.js';

const app = express();

app.set('view engine','ejs');
app.use(express.static('public'));
app.use(methodOverride('_method'));
app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(noCache());
app.use(cookieParser());
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: 60000 * 60 * 24 * 7
    }
}));
app.use((req , res, next)=>{
    res.locals.message = req.session.message;
    delete req.session.message;
    next();
});

app.use('/',customerRoutes);
app.use('/admin',adminRoutes);

app.use((req, res)=>{
    res.render('error/404');
});

app.use(serverError)

Connection();

const PORT = process.env.PORT || 4000;
app.listen(PORT,()=>{
    console.log(`server is running at http://localhost:${PORT}`);
});

