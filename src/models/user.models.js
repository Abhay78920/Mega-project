import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"
import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            //indexing makes searching easy
            index: true

        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullname: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String,
            required: true
        },
        coverImage: {
            type: String,

        },
        watchHistory:[
            {
                type:Schema.Types.ObjectId,
                ref:"Video"
            }
        ],
        password:{
            type: String,
            required: [true,"Password is required"]
        },
        refreshToken:{
            type: String
        }


    }
    , { timestamps: true })

//In the pre("save") hook, which is executed before saving a user document, you're checking if the password field has been modified (this.isModified("password")). If it has been modified (for instance, when a user sets or changes their password), you hash the password using bcrypt and then assign it back to this.password
userSchema.pre("save", async function(next){
    if(this.isModified("password")){
        this.password = await bcrypt.hash(this.password,10)
    }
    next()
})
//In this method, this.password again refers to the hashed password stored in the user document. When a user tries to log in, the isPasswordCorrect method is called with the plaintext password provided by the user. The bcrypt.compare function then takes this plaintext password and compares it with the hashed password stored in this.password. If they match, bcrypt.compare returns true, indicating that the password is correct; otherwise, it returns false.
userSchema.methods.isPasswordCorrect = async function (password){
 return  await bcrypt.compare(password,this.password)
}
userSchema.methods.generateAccessToken =  function(){
    try {
        return  jwt.sign(
            {
                _id: this._id,
                email: this.email,
                username: this.username,
                fullName: this.fullName
            },
            process.env.ACCESS_TOKEN_SECRET,
            {
                expiresIn: process.env.ACCESS_TOKEN_EXPIRY
            }
        )
    } catch (error) {
        console.log(error)
    }
}
userSchema.methods.generateRefreshToken = function(){
    return  jwt.sign(
        {
            _id: this._id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}
export const User = mongoose.model("User", userSchema)
