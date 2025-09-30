import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiErrors.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';


const generateAccessAndRefreshTokens = async (userID) => {
    try {
        const user = await User.findById(userID);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});  // to avoid pre save hook for password 
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError("Something went wrong while generating refresh and access tokens", 500);
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // Registration logic here
    // -> get user details from frontend
    // -> validation
    // -> check if already exists
    // -> check for images and avatar
    // -> upload them to cloudinary, avatar
    // -> create user object - create entry in db
    // -> remove password and refresh token field
    // -> check for user creation
    // -> return response

    const {fullName, email, username, password} = req.body
    if([fullName, username, email, password].some((field) => field?.trim() === "")) {
        throw new ApiError("All fields are required", 400);
    }

    // check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        throw new ApiError("User already exists", 409);
    }

    // handle images
    const avatarLocalPath = req.files?.avatar[0]?.path;

    // less robust way to check for cover image
    // const coverImageLocalPath = req.files?.coverimage?.[0]?.path;

    // more robust way to check for cover image
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // avatar is required
    if (!avatarLocalPath) {
        throw new ApiError("Avatar is required", 400);
    }

    // upload to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatar) {
        throw new ApiError("Error uploading avatar", 500);
    }

    // create user object
    const user = await User.create({ 
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    });

    // remove password and refresh token field before sending response
    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if(!createdUser) {
        throw new ApiError("Error creating user", 500);
    }

    // successful
    return res.status(201).json(
        new ApiResponse(
            200,
            createdUser,
            "User registered successfully"
        )
    );

});

const loginUser = asyncHandler(async (req, res) => {
    // Login logic here
    // username or email
    // find user
    // check for password
    // generate access and refresh tokens
    // send cookie

    // extract user credentials
    const  {email, username, password} = req.body;

    // validation
    if(!(username || email)) {  // or can use !username && !email
        throw new ApiError("Username or email is required", 400);
    }

    // find user
    const user = await User.findOne({ $or: [{email}, {username}] });

    // check if user exists
    if(!user) {
        throw new ApiError("User not found", 404);
    }

    // check for password
    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid) {
        throw new ApiError("Invalid credentials", 401);
    }

    // token generation
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // send cookie
    const options = {
        httpOnly: true,
        secure: true
    }

    // successful 
    return res.status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: user,accessToken, refreshToken
            },
            { 
                message: "User logged in successfully"
            }
        )
    )
});

// logout user
const logoutUser = asyncHandler(async (req, res) => {
    // 
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { 
                refreshToken: undefined 
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    };

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// refresh access token
const refreshAccessToken = asyncHandler(async(req,res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request!");
    }

    try {
        const decodeToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodeToken?.id);
    
        if(!user) {
            throw new ApiError(404, "User not found");
        }
    
        if(incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401,"Refresh token is expired or used!");
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                { accessToken, newRefreshToken }, 
                "Tokens refreshed successfully"
            )
        );
    } catch (error) {
        throw new ApiError(401, error?.message);
    }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };