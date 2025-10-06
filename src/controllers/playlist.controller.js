import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { use } from "react"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    //TODO: create playlist
    if(name.length === 0 || description.length === 0) {
        return ApiResponse.error(res, "Name and description are required", 400)
    }

    const createPlaylist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    });

    if(!createPlaylist) {
        throw new ApiError("Failed to create playlist", 500);
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                createPlaylist,
                "Playlist created successfully"
            )
        )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const playlistsByUser = await Playlist.aggregate([
        {
            $match: {
                owner: mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            }
        },
        {
            $addFields: {
                totalViews: { $sum: "$videos.views" },
                totalVideos: { $size: "$videos" }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalViews: 1,
                totalVideos: 1
            }
        }
    ])

    if(!playlistsByUser || playlistsByUser.length === 0) {
        return ApiResponse.error(res, "No playlists found for this user", 404);
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlistsByUser,
                "Playlists retrieved successfully"
            )
        )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id

    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist) {
        throw new ApiError(400, "Playlist not found");
    }

    const playlistVideos = await Playlist.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $match: {
                "videos.isPublished": true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $addFields: {
                owner: { $arrayElemAt: ["$owner", 0] },
                totalVideos: { $size: "$videos" },
                totalViews: { $sum: "$videos.views" }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                },
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    thumbnail: 1,
                    duration: 1,
                    views: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1
                }
            }
        }
    ]);

    if(!playlistVideos || playlistVideos.length === 0) {
        return ApiResponse.error(res, "No videos found for this playlist", 404);
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlistVideos[0],
                "Playlist retrieved successfully"
            )
        );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    // TODO: add video to playlist
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        return ApiResponse.error(res, "Invalid playlist or video ID", 400)
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist) {
        return ApiResponse.error(res, "Playlist not found", 404)
    }

    const video = await Video.findById(videoId)

    if(!video) {
        return ApiResponse.error(res, "Video not found", 404)
    }

    if((playlist.owner?.toString() && video.owner?.toString()) !== req.user?._id.toString()) {
        throw new ApiError("You are not authorized to add this video to the playlist", 403)
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId, 
        {
            $addToSet: { videos: videoId }
        }, 
        { new: true }
    );

    if(!updatedPlaylist) {
        throw new ApiError("Failed to add video to playlist", 500);
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Video added to playlist successfully"
            )
        )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video");
    }

    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if((playlist.owner?.toString() && video.owner?.toString()) !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to remove this video from the playlist");
    }

    const videoInPlaylist = playlist.videos.find((vid) => vid.toString() === videoId.toString());

    if(!videoInPlaylist) {
        throw new ApiError(404, "Video not found in playlist");
    }

    const playlistAfterDelete = await playlist.videos.findByIdAndDelete(  // cannot use deleteOne on an array
        playlistId,
        {
            $pull:{
                videos: videoId
            }
        },
        { new: true }
    );

    if(!playlistAfterDelete) {
        throw new ApiError(500, "Failed to remove video from playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlistAfterDelete,
                "Video removed from playlist successfully"
            )
        )
 
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist

    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if(playlist.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this playlist");
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

    if(!deletedPlaylist) {
        throw new ApiError(500, "Failed to delete playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                deletedPlaylist,
                "Playlist deleted successfully"
            )
        )

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }

    if(name.length === 0 || description.length === 0) {
        throw new ApiError(400, "Name and description are required");
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if(playlist.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            name: name,
            description: description
        },
        { new: true }
    );

    if(!updatedPlaylist) {
        throw new ApiError(500, "Failed to update playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Playlist updated successfully"
            )
        )

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}