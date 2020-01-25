require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const { formatDate, isValidDate } = require("./utils");
const app = express();

// set up database
mongoose.connect(process.env.MONGOLAB_URI);
const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: { type: String, required: true, unique: true }
});
const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: false }
});
const UserModel = mongoose.model("User", userSchema);
const ExerciseModel = mongoose.model("Exercise", exerciseSchema);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// route for creating a new user
app.post("/api/exercise/new-user", (req, res) => {
  const { username } = req.body;
  const newUser = new UserModel({
    username
  });

  if (username === "") {
    return res.send("You must enter a username.");
  }

  newUser.save((err, newUser) => {
    if (err) {
      console.log(err);
      if (err.code === 11000) {
        // username already in db
        return res.send("Duplicate username, please try another.");
      }
      return res.send("Error saving username to database.");
    }
    console.log(
      `successfully saved username ${username} with ID ${newUser._id}`
    );
    return res.json(newUser);
  });
});

// route for getting all users
app.get("/api/exercise/users", async (req, res) => {
  try {
    const data = await UserModel.find({});
    res.status(200).json(data);
  } catch (err) {
    console.error("Error getting all users from database");
    throw err;
  }
});

// route for creating a new exercise
app.post("/api/exercise/add", (req, res) => {
  let convertedDate;
  const { userId, description, duration, date } = req.body;
  // make sure all required fields aren't empty
  const requiredFields = [userId, description, duration];
  if (requiredFields.includes("")) {
    return res.send("Please enter all required fields.");
  }
  // validate date
  if (date === "") {
    convertedDate = new Date();
  } else {
    if (isValidDate(date)) {
      convertedDate = date;
    } else {
      return res.send("Please send date in YYYY-MM-DD format only.");
    }
  }

  // validate userid
  UserModel.findOne({ _id: userId }, (err, user) => {
    if (err) {
      console.log(err);
      return res.send("Error finding user ID.");
    }
    if (user === null) {
      return res.send("Could not find user with this ID.");
    }
    const newExercise = new ExerciseModel({
      userId,
      description,
      duration,
      date: convertedDate
    });

    newExercise.save((err, newExercise) => {
      if (err) {
        console.log(err);
        return res.send("Error saving exercise to database.");
      }
    });

    console.log(`successfully saved exercise with ID ${newExercise._id}`);
    return res.json(newExercise);
  });
});

// route for getting an exercise
app.get("/api/exercise/log", (req, res) => {
  /**
   * I can retrieve part of the log of any user by also passing along optional parameters of from & to or limit. (Date format yyyy-mm-dd, limit = int)
   */
  if (!req.query.userId) {
    return res.send("Please enter a user ID.");
  }
  UserModel.findOne({ _id: req.query.userId }, (err, user) => {
    if (err) {
      console.log(err);
      return res.send("Error finding user ID.");
    }
    if (user === null) {
      return res.send("Could not find user with this ID.");
    }
    const userObj = user.toObject();
    ExerciseModel.find({ userId: req.query.userId }, (err, exercise) => {
      const exerciseObj = {
        log: [],
        count: 0
      };
      exercise.forEach(item => {
        exerciseObj.log.push(item);
        exerciseObj.count++;
      });
      const mergedObj = Object.assign(userObj, exerciseObj);
      return res.send(mergedObj);
    });
  });
  console.log(req.query);
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
