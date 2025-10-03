import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


// Create a new tweet
const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;

    if(!content) {
        throw new ApiError("Content is required", 400);
    }

    const tweet = await Tweet.create({
        content: content,
        owner: req.body?._id
    });

    if(!tweet) {
        throw new ApiError(404, "cannot create tweet");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                tweet,
                "Tweet created successfully"
            )
        )
})


// Get all tweets by a user   *****much more important
const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const { userId } = req.params;

    if(!isValidObjectId(userId)) {
        throw new ApiError(400, "invalid user");
    }

    const user = await User.findById(userId);

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: userId
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likecount: { $size: "$likes" },
                ownerDetails: { $first: "$owner" },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likecount: 1,
                ownerDetails: 1,
                isLiked: 1
            }
        }
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                tweets,
                "User tweets fetched successfully"
            )
        )
})


// Update a tweet by ID
const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;

    if(!isValidObjectId(tweetId)) {
        throw new ApiError(404, "invalid tweet ID");
    }

    if(!content) {
        throw new ApiError(400, "Content is required");
    }

    const tweet = await Tweet.findById(tweetId);

    if(!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if(tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this tweet");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        { content: content },
        { new: true }
    );

    if(!updatedTweet) {
        throw new ApiError(404, "cannot update tweet");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedTweet,
                "Tweet updated successfully"
            )
        )
})


// delete a tweet by ID
const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400, "invalid tweet ID");
    } 

    const tweet = await Tweet.findById(tweetId);

    if(!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if(tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this tweet");
    }

    const deletedTweet = await Tweet.deleteOne({
        _id: tweetId,
        owner: req.user?._id
    })

    if(deletedTweet.deletedCount === 0) {
        throw new ApiError(400, "unable to delete tweet");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                deletedTweet,
                "Tweet deleted successfully"
            )
        )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}