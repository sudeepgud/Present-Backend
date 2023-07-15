const mongoose = require('mongoose');
const randomstring = require('randomstring');
const OTP = new mongoose.Schema({
    email:{type: String,required:[true,"Email is Required"]},
    otp:{type:String},
    expireAt: {
        type:Date,
        default: Date.now,
        index:{expires: '2m'}
    }
})
OTP.pre("save",async function(){
    this.otp = randomstring.generate({length: 6, charset:'numeric'});
})
module.exports = mongoose.model("OTP",OTP);