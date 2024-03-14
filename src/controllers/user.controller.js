import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import jwt from "jsonwebtoken"
import uploadOnCloudinary from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
//token generation on user login
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        console.log(error)
    }
}
//register logic
const registerUser = asyncHandler(async (req, res) => {
    /*logic steps
    1. get user details from frontend
    2. validation-not empty
    3. check if user is already registered or not (using username,email)
    4. check for images, avatar
    5. upload files to cloudinary
    6. now check whether the avatar got uploaded successfully or not
    7. create user object and create entry in db
    8. now when user gets created all the things which are created are send in response but we dont want the user to get his password in response(although it is encrypted)
    9. remove pass and refresh token field from response
    10. check for user creation 
    11. return response*/

    const { fullname, email, username, password } = req.body
    // console.log("email:", email)

    //validation

    if ([fullname, email, username, password].some((field) =>
        field?.trim() === "")) {
        throw new ApiError(400, "All field are required")
    }

    //check if user exists or not

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    // console.log("req.files:", req.files);
    //handling files
    const avatarLocalPath = req.files?.avatar[0]?.path

    //see here we are checking that if req.files has an array named avatar that extract out the thing which is present at its 0th place because it is a required field but we have not marked coverImage as a req field so if the user doesnt upload coverImage no checks are there for that and the coverImage array will remain undefined so to handle that case 
    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    //check if avatar is there

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required")
    }
    //uploading on cloudinary

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    //check again if avatar got uploaded on cloudinary
    if (!avatar) {
        throw new ApiError(400, "Avatar image is required")
    }

    //creating user
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    // two things -> check if the user actually got created (search by id) and next steps is if user got created remove the password and refreshtoken from the response
    const createdUser = await User.findById(user._id).select(
        //yaha likho jo nahi chahiye
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    //final step return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered successfully")
    )


})
//login Logic

const loginUser = asyncHandler(async (req, res) => {
    /* 
        steps:
        1. get details from req.body
        2. check if the user exists 
        3. password check if user was found
        4. generate access and refresh tokens
        5. send cookie
    */
    const { email, username, password } = req.body

    if (!(username || email)) {
        throw new ApiError(400, "Username or email is required")
    }
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //sending cookies but for that design options first
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken ", accessToken, options)
        .cookie("refreshToken ", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User loggedIn successfully"
            )
        )
})
//logout logic
const logoutUser = asyncHandler(async (req, res) => {

    User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 //this removes the field from document
            }
        },
        {
            new: true
        }

    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "user logged out"
            )
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    //access refresh token from cookies(in case of web) and from req.body(if accessing from mobile)
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauhtorized request")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        //find user having the same refresh Token

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
        if (decodedToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used ")

        }
        //if verified generate new tokens
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)
        const options = {
            httpOnly: true,
            secure: true
        }
        return res
            .status(200)
            .cookie("accessToken", accessToken)
            .cookie("refreshToken", newRefreshToken)
            .json(
                new ApiResponse(
                    200,
                    {
                        accesstoken: accessToken, refreshToken: newRefreshToken,

                    },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }
})

//Update controllers
//1. update password
const updatePassword = asyncHandler(async (req, res) => {
    //1. take out the old and new password which user enters to change the existing old pass
    const { newPassword, oldPassword } = req.body;

    //find the user 
    const user = await User.findById(req.user?._id)

    //check the old password

    const isOldPassCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isOldPassCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    //update password and save it to the database
    user.password = newPassword

    user.save({ validateBeforeSave: false })

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password changed successfully"
            )
        )
})

//get current User details

const getCurrUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "Current User fetched Succesfully")
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body

    if (!(fullname && email)) {
        throw new ApiError(400, "All fields are required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname: fullname,
                email: email
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated"))
})

//updating files

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    //check if the the File url has been returned by cloudinary
    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on cloudinary")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:
            {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")
    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Avatar Updated")
        )

})

const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image Missing")
    }

    //upload on cloudinary

    const coverImage = uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading cover image on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")
    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Cover Image Updated")
        )

})
export { registerUser, loginUser, logoutUser, refreshAccessToken, updatePassword, getCurrUser, updateAccountDetails, updateUserAvatar,updateUserCoverImage }