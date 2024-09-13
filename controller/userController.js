import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { User } from "../models/userSchema.js";
import { v2 as cloudinary } from "cloudinary";
import { generateToken } from "../utils/jwtToken.js";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";

export const register = catchAsyncErrors(async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new ErrorHandler("Avtar And Resume Are Required", 400));
  }
  const { avatar } = req.files;

  const cloudinaryResponseForAvtar = await cloudinary.uploader.upload(
    avatar.tempFilePath,
    { folder: "AVATAR" }
  );
  if (!cloudinaryResponseForAvtar || cloudinaryResponseForAvtar.error) {
    console.error(
      "Cloudinary Error",
      cloudinaryResponseForAvtar.error || "Unknown Cloudinary Error"
    );
  }

  const { resume } = req.files;

  const cloudinaryResponseForResume = await cloudinary.uploader.upload(
    resume.tempFilePath,
    { folder: "MY_RESUME" }
  );
  if (!cloudinaryResponseForResume || cloudinaryResponseForResume.error) {
    console.error(
      "Cloudinary Error",
      cloudinaryResponseForResume.error || "Unknown Cloudinary Error"
    );
  }

  const {
    fullName,
    email,
    phone,
    aboutMe,
    password,
    portfolioURL,
    githubURL,
    instagramURL,
    facebookURL,
    twitterURL,
    linkedInURL,
  } = req.body;
  const user = await User.create({
    fullName,
    email,
    phone,
    aboutMe,
    password,
    portfolioURL,
    githubURL,
    instagramURL,
    facebookURL,
    twitterURL,
    linkedInURL,
    avatar:{
        public_id: cloudinaryResponseForAvtar.public_id,
        url: cloudinaryResponseForAvtar.secure_url,
    },
    resume:{
        public_id: cloudinaryResponseForResume.public_id,
        url: cloudinaryResponseForResume.secure_url,
    },
  });
  generateToken(user, "User Registered", 201, res);
});

export const login = catchAsyncErrors(async(req, res, next)=>{
    const {email, password} = req.body;
    if(!email || !password){
        return next(new ErrorHandler("Email and Password Are Required"));
    }
    const user = await User.findOne({email}).select("+password");
    if(!user){
        return next(new ErrorHandler("Invalid Email or Password "))
    }
    const isPasswordMatched = await user.comparePassword(password);
    if(!isPasswordMatched){
        return next(new ErrorHandler("Invalid Email or Password "))
    }
    generateToken(user, "Logged In", 200, res);
});

export const logout = catchAsyncErrors(async(req, res, next)=>{
  res.status(200).cookie("token", "",{
    httpOnly: true,
    expires: new Date(Date.now()),
    sameSite: "None",
    secure: true

  }).json({
    sucess: true,
    message: "Logged Out",
  })
});

export const getUser = catchAsyncErrors(async(req, res, next)=>{
  const user = await User.findById(req.user.id);
  res.status(200).json({
    sucess: true,
    user,
  });
});

export const updateProfile = catchAsyncErrors(async(req, res, next)=>{
  const newUserdata = {
    fullName: req.body.fullName,
    email: req.body.email,
    phone: req.body.phone,
    aboutMe: req.body.aboutMe,
    portfolioURL: req.body.portfolioURL,
    githubURL: req.body.githubURL,
    instagramURL: req.body.instagramURL,
    facebookURL: req.body.facebookURL,
    twitterURL: req.body.twitterURL,
    linkedInURL: req.body.linkedInURL,
  };
  if(req.files&& req.files.avatar){
    const avatar = req.files.avatar;
    const user = await User.findById(req.user.id);
    const profileImageId = user.avatar.public_id;
    await cloudinary.uploader.destroy(profileImageId);
    const newProfileImage = await cloudinary.uploader.upload(
      avatar.tempFilePath,
      { folder: "PORTFOLIO AVATAR" }
    );
    newUserdata.avatar = {
       public_id: newProfileImage.public_id,
       url: newProfileImage.secure_url,
    }
  }
  if(req.files&& req.files.resume){
    const resume = req.files.resume;
    const user = await User.findById(req.user.id);
    const resumeFileId = user.resume.public_id;
    if(resumeFileId){
      await cloudinary.uploader.destroy(resumeFileId);
    }
    const newResume = await cloudinary.uploader.upload(
      resume.tempFilePath,
      { folder: "PORTFOLIO RESUME" }
    );
    newUserdata.resume = {
       public_id: newResume.public_id,
       url: newResume.secure_url,
    }
  }
  const user = await User.findByIdAndUpdate(req.user.id, newUserdata, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  res.status(200).json({
    sucess: true,
    message: "Profile Updated",
    user,
  });
})

export const updatePassword = catchAsyncErrors(async(req, res, next)=>{
  const {currentPassword, newPassword, confirmNewPassword} = req.body;
  if(!currentPassword || !newPassword || !confirmNewPassword){
    return next(new ErrorHandler("Please Fill Full Field", 400));
  }
  const user = await User.findById(req.user.id).select("+password");
  const isPasswordMatched = await user.comparePassword(currentPassword);
  if(!isPasswordMatched){
    return next(new ErrorHandler("Incorrect Password", 400));
  }
  if(newPassword !== confirmNewPassword){
    return next(new ErrorHandler("New Password And Confirm New Password Does Not Match", 400));
  };
  user.password = newPassword;
  await user.save()
  res.status(200).json({
    sucess: true,
    message: "Password Updated",
  });
});

export const getUserForPortfolio = catchAsyncErrors(async(req, res, next)=>{
  const id = "66e1bc1d7d986e2860f2fe84"; 
  const user = await User.findById(id);
  res.status(200).json({
    sucess: true,
    user,
  });
});

export const forgotPassword = catchAsyncErrors(async(req, res, next)=>{
  const user = await User.findOne({email: req.body.email});
  if(!user){
    return next(new ErrorHandler("User Not Found", 404));
  }
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });
  const resetPasswordUrl = `${process.env.DASHBOARD_URL}/password/reset/${resetToken}`;
  const message = `Your Reset Password Url Is :- \n\n ${resetPasswordUrl} \n\n If You Have Not Requested For ThisPlease Ignore It`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Personal Portfolio Dashboard Recovery Password",
      message,
    });
    res.status(200).json({
      success: true,
      message: `Email Sent To ${user.email} Successfully`,
    }) 
  } catch (error) {
    user.resetPasswordExpire = undefined;
    user.resetPasswordToken = undefined;
    await user.save();
    return next(new ErrorHandler(error.message, 500));
  }
})

export const resetPassword = catchAsyncErrors(async(req, res, next)=>{
  const {token } = req.params
  const resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if(!user){
    return next(new ErrorHandler("Reset Password Token Is Invalid Or Has Been Expired", 400));
  }
  if(req.body.password !== req.body.confirmPassword){
    return next(new ErrorHandler("Password and Confirm Password Does Not Match"));
  }
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  generateToken(user, "Reset Password Successful", 200, res);
})