import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {Like} from "../models/like.model.js"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteOnCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    const pipeline = [];

    if (query) {
        pipeline.push({
            $search: {
                index: "search-videos",
                text: {
                    query: query,
                    path: ["title", "description"] //search only on title, desc
                }
            }
        });
    }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId");
        }

        pipeline.push({
            $match: {
                owner: mongoose.Types.ObjectId(userId)
            }
        });
    }

    // fetch videos only that are set isPublished as true
    pipeline.push({ $match: { isPublished: true } });

    //sortBy can be views, createdAt, duration
    //sortType can be ascending(-1) or descending(1)
    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        });
    } else {
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
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
            $unwind: "$ownerDetails"
        }
    )

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const video = await Video.aggregatePaginate(videoAggregate, options);

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Videos fetched successfully"));

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body

    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const videoFileLocalPath = req.files?.videoFile[0].path;
    const thumbnailLocalPath = req.files?.thumbnail[0].path;

    if (!videoFileLocalPath) {
        throw new ApiError(400, "videoFileLocalPath is required");
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnailLocalPath is required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile) {
        throw new ApiError(400, "Video file not found");
    }

    if (!thumbnail) {
        throw new ApiError(400, "Thumbnail not found");
    }

    const video = await Video.create({
        title,
        description,
        duration: videoFile.duration,
        videoFile: {
            url: videoFile.url,
            public_id: videoFile.public_id
        },
        thumbnail: {
            url: thumbnail.url,
            public_id: thumbnail.public_id
        },
        owner: req.user?._id,
        isPublished: false
    });

    const videoUploaded = await Video.findById(video._id);

    if (!videoUploaded) {
        throw new ApiError(500, "videoUpload failed please try again !!!");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video uploaded successfully"));
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId(videoId)
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
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscriberCount: { $size: "$subscribers" },
                            isSubscribed: {
                                $cond: {
                                    if: { 
                                        $in: [req.user?._id, "$subscribers.user"] 
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        },
                    },
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            subscriberCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "likes.likedBy"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                "videoFile.url": 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ]);

    if(!video) {
        throw new ApiError(500, "failed to fetch video");
    }

    await Video.findByIdAndUpdate(
        videoId,
        {
            $inc: {
                views: 1
            }
        }
    );

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $addToSet: {
                watchHistory: videoId
            }
        }
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video[0],
                "Video fetched successfully"
            )
        )

})

const updateVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    const { videoId } = req.params

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    if(!title && !description) {
        throw new ApiError(400, "Title or description is required");
    }

    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    if(video.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video");
    }
    
    const thumbnailToReplaceWith = req.file?.path;

    if(!thumbnailToReplaceWith) {
        throw new ApiError(400, "Thumbnail is required");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailToReplaceWith);
    
    if(!thumbnail) {
        throw new ApiError(500, "Failed to upload thumbnail");
    }

    const thumbnailToDelete = video.thumbnail.public_id;

    try {
        const updatedVideo = await Video.findByIdAndUpdate(
            videoId, 
            {
                $set: {
                    title: title,
                    description: description,
                    thumbnail: {
                        public_id: thumbnail.public_id,
                        url: thumbnail.url
                    }
                }
            },
            { new: true }
        )
    
        if(!updatedVideo) {
            await deleteOnCloudinary(thumbnail.public_id);
            throw new ApiError(500, "Failed to update video");
        }

        if(thumbnailToDelete) {
            await deleteOnCloudinary(thumbnailToDelete);
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    updatedVideo,
                    "Video updated successfully"
                )
            )
    } catch (error) {
        await deleteOnCloudinary(thumbnail.public_id);
        throw error;
    }
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    if(video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video");
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId);

    if(!deletedVideo) {
        throw new ApiError(500, "Failed to delete video");
    }

    await deleteOnCloudinary(video.thumbnail.public_id);
    await deleteOnCloudinary(video.videoFile.public_id, "video");

    await Like.deleteMany({
        video: videoId
    });

    await Comment.deleteMany({
        video: videoId
    });

    return res
        .status(200)
        .json(
            new ApiResponse (
                200,
                deletedVideo,
                "Video deleted successfully"
            )
        )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    const videoStatus = video.isPublished;

    const toggleStatus = await Video.findByIdAndUpdate(
        videoId,
        { 
            $set: {
                isPublished: !videoStatus
            }
        },
        { new: true }
    );


    if(!toggleStatus) {
        throw new ApiError(500, "Failed to toggle video publish status");
    }

    return res
        .status(200)
        .json(
            new ApiResponse (
                200,
                toggleStatus,
                "Video publish status toggled successfully"
            )
        )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}