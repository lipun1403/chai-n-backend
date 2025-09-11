import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = Router();

// for registering the user
router.route("/register").post(registerUser);

export default router;