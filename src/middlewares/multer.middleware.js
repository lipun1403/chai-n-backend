// Import the multer middleware to handle file uploads
import multer from "multer";

// Configure how files should be stored on the server
const storage = multer.diskStorage({
    // Set the destination folder where uploaded files will be saved
    destination: function (req, file, cb) {
        // First argument is for errors, so 'null' means no error
        // Second argument is the folder path where files will be stored
        cb(null, '/tmp/my-uploads')
    },
    
    // Define how filenames should be set for the uploaded files
    filename: function (req, file, cb) {
        // Create a unique suffix using current timestamp and a random number
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        
        // Set the filename by combining the field name and the unique suffix
        cb(null, file.fieldname + '-' + uniqueSuffix)
    }
})

// Initialize the multer middleware with the storage configuration
const upload = multer({ storage: storage })

// Export the upload middleware so it can be used in routes
export { upload }
