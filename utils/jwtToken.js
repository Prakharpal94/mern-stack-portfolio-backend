export const generateToken = (user, message, statusCode, res) => {
    const token = user.generateJwtToken();

    res.status(statusCode).cookie("token", token, {
        expires: new Date(Date.now() +process.env.COOKIES_EXPIRES * 24 * 60 * 60 * 1000),
        httpOnly:true
    }).json({
        success: true,
        message,
        token,
        user,
    })
}