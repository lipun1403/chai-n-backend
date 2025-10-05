import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {    // much more important

    const { channelId } = req.user?._id;

    const channel = await User.findById(channelId);

    if(!channel) {
        throw new ApiError(404, "Channel not found");
    }

    const totalSubs = await Subscription.aggregate([
        {
            $match: {
                // channel: mongoose.Types.ObjectId.createFromHexString(channelId)
                channel: mongoose.ObjectId(channelId)
            }
        },
        {
            $group: {
                _id: null,
                totalSubscribers: {
                    $sum: 1
                }
            }
        }
    ]);

    const tempStats = await Video.aggregate([
        {
            $match: {
                owner: channelId
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $project: {
                $totalLikes: {
                    $size: "$likes"
                },
                totalViews: " $views ",
                totalVideos: 1
            }
        },
        {
            $group: {
                _id: null,
                totalLikes: {
                    $sum: " $totalLikes ",
                },
                totalViews: {
                    $sum: " $totalViews "
                },
                totalVideos: {
                    $sum: 1
                }
            }
        }
    ]);

    const channelStats = {
        totalSubscribers: totalSubs[0]?.totalSubscribers || 0,
        totalLikes: tempStats[0]?.totalLikes || 0,
        totalViews: tempStats[0]?.totalViews || 0,
        totalVideos: tempStats[0]?.totalVideos || 0
    };

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channelStats,
                "channel stats fetched successfully"
            )
        )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const { channelId } = req.user?._id;

    const channel = await User.findById(channelId);

    if(!channel) {
        throw new ApiError(404, "Channel not found");
    }

    const videos = await Video.aggregate([
        {
            $match: {
                // owner: mongoose.Types.ObjectId.createFromHexString(channelId)
                owner: mongoose.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                $totalLikes: {
                    $size: "$likes"
                },
                $totalComments: {
                    $size: "$comments"
                },
                $createdAt: {
                    $dateToParts: {
                        date: "$createdAt",
                        timezone: "Asia/Kolkata"
                    }
                }
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $project: {
                _id: 1,
                "videoFile.url": 1,
                "videoFile.thumbnail": 1,
                title: 1,
                description: 1,
                createdAt: {
                    year: 1,
                    month: 1,
                    day: 1
                },
                totalLikes: 1,
                totalComments: 1,
                isPublished: 1
            }
        }
    ]);

    if(videos.length === 0) {
        throw new ApiError(404, "No videos found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse (
                200,
                videos,
                "videos fetched successfully"
            )
        )
});

export {
    getChannelStats, 
    getChannelVideos
    }