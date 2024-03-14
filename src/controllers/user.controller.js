import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import uploadOnCloudinary from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
//token generation on user login
const generateAccessAndRefreshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


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

const refreshAccessToken = asyncHandler(async(req,res)=>{
    
})
export { registerUser, loginUser, logoutUser }