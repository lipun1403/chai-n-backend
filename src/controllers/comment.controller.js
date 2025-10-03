import mongoose from "mongoose";
import {Comment} from "../models/comment.model.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {ApiError} from "../utils/ApiErrors.js"
import {Video} from "../models/video.model.js"

// Get comments for a video
const getVideoComments = asyncHandler( async (req,res) => {
    const {videoId} = req.params;
    const {page=1, limit=10} = req.query;
    
    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    const commentAggregate = Comment.aggregate([
        {
            $match: {
                video: mongoose.Types.ObjectId(videoId) // Match comments for the specific video
            },
        },
        {
            $lookup: { // Lookup user information for each comment
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $lookup: { // Lookup likes for each comment
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: { // Add additional fields to the comment
                likeCount: {
                    $size: "$likes"
                },
                owner: {
                    $arrayElemAt: ["$owner", 0] // or $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$likes.likedBy"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: { // Sort comments by creation date in recent first
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likeCount: 1,
                isLiked: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                }
            }
        }
    ]);

    const options = {
        page: parseInt(page, 10), // Current page number
        limit: parseInt(limit, 10) // Number of comments per page
    }

    const comments = await Comment.aggregatePaginate( // Paginate the comments i.e. combine the aggregation pipeline with pagination options
        commentAggregate,
        options
    );

    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                comments,
                "Comments fetched successfully"
            )
        );
});

// Add a comment to a video
const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    const {content} = req.body;

    if(!content) {
        throw new ApiError(404, "content is mandatory");
    }

    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "video not found");
    }

    const comment = await Comment.create({
        content,
        video: video._id,
        owner: req.user?._id
    });

    if(!comment) {
        throw new ApiError(404, "Comment not added");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                comment,
                "Comment added successfully"
            )
        )
});

// Update a comment
const updateComment = asyncHandler(async (req, res) => {
    const {content} = req.body;
    const {videoId, commentId} = req.params;

    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(405, "video not found");
    }

    const comment = await Comment.findById(commentId);

    if(!comment) {
        throw new ApiError(404, "comment doesnot exists");
    }

    const owner = await User.findById(comment.owner);
    if(!req.user._id.equals(owner._id)) {
        throw new ApiError(403, "You are not authorized to update this comment");
    }

    // way 1: with precheck
    // const updatedComment = await Comment.aggregate([
    //     {
    //         $set: {
    //             content
    //         }
    //     },
    //     {
    //         new: true
    //     }
    // ])

    // way 2: without prechecks
    // const updatedComment = await Comment.findOneAndUpdate(  
    //     {_id: commentId, owner: req.user?._id},
    //     { $set: {content}},
    //     {new: true}
    // );

    // way 3: using instance methods
    comment.content = content;
    const updatedComment = await comment.save();

    if(!updatedComment) {
        throw new ApiError(402, "cannot update the comment");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedComment,
                "comment updated successfully"
            )
        )
});

// Delete a comment
const deleteComment = asyncHandler(async (req, res) => {
    const { videoId, commentId } = req.params;

    const video = await Video.findById(videoId);
    if(!video) {
        throw new ApiError(404, "video not found");
    }

    const comment = await Comment.findById(commentId);
    if(!comment) {
        throw new ApiError(403, "comment not found");
    }

    const deletedComment = await comment.deleteOne();

    if(deletedComment.deletedCount < 1) {
        throw new ApiError(404, "comment not found or not deleted");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                deletedComment,
                "comment deleted successfully"
            )
        )
});


export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}