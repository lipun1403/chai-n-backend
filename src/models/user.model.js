import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";


const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true   // when we want to provide searching option we can provide index as true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String, // cloudinary url service
        required: true
    },
    coverImage: {
        type: String // cloudinary url
    },
    watchHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Video"
    }],
    password: {       // **
        type: String,
        required: [true, 'Password is required!!']
    },
    refreshToken: {   // **
        type: String
    }
}, {timestamps: true})

userSchema.pre("save", async function(next) {      //cannot use arrow function as callback, because in JS arrow functions do not carry contexts , save option in pre hook changes the hashing just before saving the data 
    if(!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password, 10);     // to encrypt the password  arguments(password to hash, no of rounds)
    next();
})

// method to check is encoded password and orignal password matches when decrypted
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function() {
    return jwt.sign({
        _id: this.id, 
        email: this.email, 
        username: this.username, 
        fullName: this.fullName
    },
        process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    })
}

userSchema.methods.generateRefreshToken = function() {
    return jwt.sign({
        _id: this.id
    },
        process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    })
}

export const User = mongoose.model("User", userSchema);