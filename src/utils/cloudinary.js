import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        // If no file path is provided, exit early and return null.
        
        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto" // Automatically detect the type (image, video, etc.)
        });

        console.log("file is uploaded successfully!");
        
        // Return the response
        return response;
    } catch (error) {
        // If an error occurs, delete the local file to clean up
        fs.unlinkSync(localFilePath);
        
        // Return null to signal the failure
        return null;
    }
};


export {uploadOnCloudinary} 