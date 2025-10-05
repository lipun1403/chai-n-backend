import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { asyncHandler } from "../utila/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { ApiError } from "../utils/ApiErrors.js"

// toggle video like
const toggleVideoLike = asyncHandler( async (req,res) => {
    const videoId = req.params;

    if(!isValidObjectId(videoId)) {
        throw new ApiError(405, "video not found")
    }

    const likeStatus = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    })

    if(likeStatus) {
        await Like.findOneAndDelete({
            video: videoId,
            likedBy: req.user?._id
        });

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {isLiked: false},
                    "like from video removed successfully"
                )
            )
    }

    await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {isLiked: true},
                "video liked successfully"
            )
        )
})

// toggle comment like
const toggleCommentLike = asyncHandler( async (req,res) => {
    const commentId = req.params;

    if(!isValidObjectId(commentId)) {
        throw new ApiError(404, "comment not found");
    }

    const likeStatus = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    })

    if(likeStatus) {
        await Like.findOneAndDelete({
            comment: commentId,
            likedBy: req.user?._id
        })

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {isLiked: false},
                    "like from comment removed successfully"
                )
            )
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user?._id
    })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isLiked: true },
                "comment liked successfully"
            )
        )
})

// toggle tweet like
const toggleTweetLike = asyncHandler ( async (req,res) => {
    const tweetId = req.params;

    if(!isValidObjectId(tweetId)) {
        throw new ApiError(404, "tweet not found");
    }

    const likeStatus = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    if(likeStatus) {
        await Like.findOneAndDelete({
            tweet: tweetId,
            likedBy: req.user?._id
        })

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { isLiked: false },
                    "like from tweet removed successfully"
                )
            )

    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    return res
        .status(200)
        .json(
            200,
            { isLiked: true },
            "tweet liked successfully"
        )
})

// get liked videos
const getLikedVideos = asyncHandler( async (req,res) => {
    const person = req.user?._id;

    if(!isValidObjectId(person)) {
        throw new ApiError(404, "user not found");
    }

    const videos = await Like.aggregate([
        {
            $match: {
                likedBy: mongoose.Types.ObjectId(person)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "likedByUser"
                        }
                    },
                    {
                        $unwind: "$likedByUser"
                    }
                ]
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 1,
                video: { $arrayElemAt: ["$likedVideo", 0] }
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                videos,
                "liked videos retrieved successfully"
            )
        )
})


export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
}
