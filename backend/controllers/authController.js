const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

let refreshtokens = [];
const authController = {
  //resgister
  registerUser: async (req, res) => {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(req.body.password, salt);

      //create new user
      const newUser = await new User({
        username: req.body.username,
        email: req.body.email,
        password: hashed,
      });

      //save to db
      const user = await newUser.save();
      res.status(200).json(user);
    } catch (err) {
      res.status(500).json(err);
    }
  },
  //generate access token
  generateAccessToken: (user) => {
    return jwt.sign(
      {
        id: user.id,
        admin: user.admin,
      },
      process.env.JWT_ACCESS_KEY,
      { expiresIn: "30s" }
    );
  },
  //generate refresh token
  generateRefreshToken: (user) => {
    return jwt.sign(
      {
        id: user.id,
        admin: user.admin,
      },
      process.env.JWT_REFRESH_KEY,
      { expiresIn: "365d" }
    );
  },
  //login
  loginUser: async (req, res) => {
    try {
      const user = await User.findOne({ username: req.body.username });
      if (!user) {
        return res.status(404).json("Wrong username!");
      }
      const validPassword = await bcrypt.compare(
        req.body.password,
        user.password
      );
      if (!validPassword) {
        return res.status(404).json("Wrong password!");
      }
      if (user && validPassword) {
        const accessToken = authController.generateAccessToken(user);
        const refreshToken = authController.generateRefreshToken(user);
        refreshtokens.push(refreshToken);
        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: false,
          path: "/",
          samsite: "strict",
        });
        const { password, ...others } = user._doc;
        res.status(200).json({ ...others, accessToken });
      }
    } catch (err) {
      res.status(500).json(err);
    }
  },
  //redis
  requestRefreshtoken: async (req, res) => {
    // take refresh token from user
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json("Yor're not authenticated");
    if (!refreshToken.includes(refreshToken)) {
      return res.status(401).json("Refresh token is not valid");
    }
    jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY, (err, user) => {
      if (err) {
        console.log(err);
      }
      refreshtokens = refreshtokens.filter((token) => token !== refreshToken);
      //create new accesstoken and refreshtoken
      const newAccessToken = authController.generateAccessToken(user);
      const newRefreshToken = authController.generateRefreshToken(user);
      refreshtokens.push(newAccessToken);
      res.cookie("newRefreshToken", newRefreshToken, {
        httpOnly: true,
        secure: false,
        path: "/",
        samsite: "strict",
      });
      res.status(200).json({ accessToken: newAccessToken });
    });
  },
  //logout
  userLogout: (req, res) => {
    res.clearCookie("refreToken");
    refreshtokens = refreshtokens.filter(
      (token) => token !== req.cookies.refreshToken
    );
    res.status(200).json("Logged out!");
  },
};

//Store token
// 1) Local storage
//xss
//2) HTTPPNLY COOKIES:
// CSRF --> SAMESITE
//3) REDUX STORE
//HTTPPNLY COOKIES --> RESFRESH TOKEN

module.exports = authController;
