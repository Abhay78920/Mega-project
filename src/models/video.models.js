import mongoose, { Schema } from "mongoose"
import { mongooseaggregatePaginate } from "mongoose-aggregate-paginate-v2"

const videoSchema = new Schema(
    {
        videoFile:{
            type:String, //coming from cloudinary url
            required: true
        },
        thumbnail:{
            type: String,
            required: true
        },
        title:{
            type: String,
            required:true
        },
        duration:{
            type:Number, //coming from cloudinary URL
            required: true
        },
        views:{
            type:Number,
            default: 0
        },
        isPublished:{
            type: Boolean,
            default: true
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref: "User"
        }
    } 
    , { timestamps: true })

    videoSchema.plugin(mongooseaggregatePaginate)
export const Video = mongoose.model("Video", videoSchema)