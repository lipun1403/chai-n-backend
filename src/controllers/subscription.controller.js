import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

// controller to toggle subscription
const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if(!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const isSubscribed = await Subscription.aggregate([
        {
            $match: {
                channel: mongoose.Types.ObjectId(channelId),
                subscriber: mongoose.Types.ObjectId(req.user?._id)
            }
        }
    ]);

    if(isSubscribed.length > 0) {
        // User is already subscribed, so we unsubscribe them
        const unSubscribe = await Subscription.deleteOne({
            channel: mongoose.Types.ObjectId(channelId),
            subscriber: mongoose.Types.ObjectId(req.user?._id)
        });

        if(unSubscribe.deletedCount < 1) {
            throw new ApiError(500, "Failed to unsubscribe");
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    unSubscribe,
                    "Unsubscribed successfully"
                )
            )
    }

    const subscribe = await Subscription.create({
        channel: mongoose.Types.ObjectId(channelId),
        subscriber: mongoose.Types.ObjectId(req.user?._id)
    });

    if(!subscribe) {
        throw new ApiError(500, "Failed to subscribe");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribe,
                "Subscribed successfully"
            )
        )

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if(!isValidObjectId(channelId)) { 
        throw new ApiError(400, "Invalid channel ID");
    }

    const subscriber = await Subscription.aggregate([
        {
            $match: {
                channel: mongoose.Types.ObjectId(channelId)
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscribers",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribedToSubscriber"
                        },
                    },
                    {
                        $addFields: {
                            subscribedToSubscriber: {
                                $cond: {
                                    if: {
                                        $in: [
                                            channelId,
                                            "$subscribedToSubscriber.subscriber"
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                            subscriberCount: {
                                $size: "$subscribedToSubscriber"
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$subscribers"
        },
        {
            $project: {
                _id: 0,
                subscribers: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                    subscribedToSubscriber: 1,
                    subscriberCount: 1
                }
            }
        }
    ]);

    

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscriber,
                "Fetched subscribers successfully"
            )
        )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if(!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber ID");
    }

    const channels = await Subscription.aggregate([
        {
            $match: {
                subscriber: mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelInfo"
            }
        },
        {
            $unwind: "$channelInfo"
        },
        {
            $project: {
                _id: 0,
                channelInfo: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                }
            }
        }
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channels,
                "Fetched subscribed channels successfully"
            )
        )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}