import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { 
    registerUser,
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails, 
    updateAvatar, 
    updateUserCoverImage, 
    getUserChannelDetail, 
    getWatchHistory 
} from "../controllers/user.controller.js";

const router = Router();

// for registering the user
router.route("/register").post(
    upload.fields([
        {name: "avatar", maxCount: 1},
        {name: "coverimage", maxCount: 1}
    ]),
    registerUser
);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh").post(refreshAccessToken);

router.route("/change-password").post(verifyJWT, changeCurrentPassword);

router.route("/current-user").get(verifyJWT, getCurrentUser);

router.route("/update-account").patch(verifyJWT, updateAccountDetails);

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);

router.route("/update-cover-image").patch(verifyJWT, upload.single("coverimage"), updateUserCoverImage);

router.route("/c/:username").get(verifyJWT, getUserChannelDetail);

router.route("/history").get(verifyJWT, getWatchHistory);

export default router;