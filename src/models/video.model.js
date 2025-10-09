import mongoose, {Schema} from "mongoose";

import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    videoFile: {
        type: {
            url: String,
            public_id: String   // the type is bit different for video as compared to others. This is due to when we delete the video we need to delete the associated thumbnail as well from cloudinary permanently, and in cloudinary, the video and its thumbnail can only be deleted by accessing the public_id. Same for thumbnail
        },
        required: true
    },
    thumbnail: {
        type: {
            url: String,
            public_id: String
        },
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true})

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);