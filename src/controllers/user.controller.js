import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiErrors.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

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

export { registerUser }; 