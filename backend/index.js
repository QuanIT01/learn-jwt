const express = require("express");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const authRoute = require("./routes/auth");
dotenv.config();

mongoose.connect(process.env.MONGODB_URL, () => {
  console.log("Conected to mongodb");
});

app.use(cors());
app.use(cookieParser());
app.use(express.json());

//Routes
app.use("/v1/auth", authRoute);

app.listen(8000, () => {
  console.log("Server is running");
});

//authentication
//authorization
