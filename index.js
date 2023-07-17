const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const jwt = require('jsonwebtoken');
mongoose.set('strictQuery',true);
const nodemailer = require('nodemailer');
const cookie = require('cookie-parser');
const bcrypt = require('bcrypt');
const Label = require('./Schema/label');
const User = require('./Schema/user');
const Otp = require('./Schema/otp');
const app = express();

const token_expire = 1*24*60*60;
const createToken=(id,admin)=>{return jwt.sign({id,admin},'Welcome to Our Site',{expiresIn:token_expire});}

const transporter = nodemailer.createTransport({
    service:"gmail",
    auth:{
        user:"cancerprediction2023@gmail.com",
        pass: process.env.APP_PASS
    },
    tls:{
        rejectUnauthorized: false,
    }
});

mongoose.connect(process.env.MONGOURL,{useNewUrlParser:true,useUnifiedTopology:true}).then(()=>console.log('Database Connected')).catch(e=>console.log(e));

app.listen(3001,()=>{console.log("Server Started")});

app.use(cors({origin:["https://present-frontend.onrender.com"],methods:["GET","POST"],credentials:true}))

app.use(cookie());
app.use(express.json());

// Sign Up
app.post('/signup',async (req,res)=>{
    let errors = {email:""};
        const handleError=(err)=>{
            if(err.name === "ValidationError"){
                Object.keys(err.errors).forEach((key) => {
                    errors[key] = err.errors[key].message;
                  });
            }
            if(err.code === 11000){
                errors.email = "Email is already Registered.";
            }
            return errors;
        }
        try{
            let {email} = req.body;
            const user_mail = await User.findOne({'email':email}).exec();
            if(user_mail){
                errors.email = "Email is already Registered.";
            }
            else{
                res.status(201).json({status:"ok"});
            }
        }catch(err){
            console.log(err);
            const errors = handleError(err);
            res.json({errors,created:false});
        }
});

//OTP Request
app.post('/otp',async(req,res)=>{
    let {email} = req.body;
    const found = await Otp.findOne({'email':email});
    if(found){
        res.status(201).json({error:"OTP already sent..."});
    }
    else{
        const errors = {
            mail:"",
        }
        const otp = await Otp.create({'email':email});
        if(otp){
            const mail = {
                from:"cancerprediction2023@gmail.com",
                to: email,
                subject: "6-Digit Verification OTP",
                text: "Your OTP is "+otp.otp+", please verify OTP in 2 minutes",
            };
            await transporter.sendMail(mail,function(err,success){
                if(err){
                    return res.json({error:"E-mail could not be Sent"});
                }
            })
            res.status(201).json({status:"OTP Generated"});
        }else{
            res.status(201).json({error:"Failed to Generate OTP"});
        }
    }
});

//OTP Verification
app.post('/verifyotp',async(req,res)=>{
    let {email,otp} = req.body;
    const OTP =await Otp.findOne({'email':email});
    if(OTP){
        if(OTP.otp === otp){
            res.status(201).json({status:"Verified"});
        }else{
            res.status(201).json({status:"Invalid OTP"});
        }
    }else{
        res.status(201).json({status:"Retry"});
    }
});

//Create Account
app.post('/create',async(req,res)=>{
    const errors = {email:""};
    const handleError=(err)=>{
        if(err.name === "ValidationError"){
            Object.keys(err.errors).forEach((key) => {
                errors[key] = err.errors[key].message;
              });
        }
        if(err.code === 11000){
            errors.email = "Email is already Registered.";
        }
        return errors;
    }
    try{
        let user = await User.create(req.body);
        res.status(201).json({status:"Registered"});
    }
    catch(err){
        const errors = handleError(err);
        res.json({errors,create:false});
    }
});

//Log In
app.post('/login',async (req,res)=>{
    const errors = {email:"",pass:""};
    let {email,pass} = req.body;
    const user = await User.findOne({'email':email}).exec();
        if(user){
            const checkPassword = await bcrypt.compare(pass,user.pass);
            if(checkPassword){
                const token  = createToken(user._id,user.admin);
                res.status(200).json({status:"Login",token:token});
            }
            else{
                if(pass === "") errors.pass = "Password is Required";
                else errors.pass = "Incorrect Password";
                res.status(200).json(errors);
            }
        }   
        else{
            if(email==="") errors.email = "Email is Required";
            else errors.email = "Email is not registered";
            res.status(200).json(errors);
        }
});

//CNN Outputs Saved
app.post('/uploadlabel',async (req,res)=>{
    try{
        let label = await Label.create(req.body);
        res.status(200).json({status:"ok"})
    }catch(err){
        console.log(err);
    }
})

//CNN Outputs retrieved
app.post('/downloadlabel',async(req,res)=>{
    const images = await Label.find({});
    res.status(200).json({
        images:images
    })
})