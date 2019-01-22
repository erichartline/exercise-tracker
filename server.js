require("dotenv").config()
const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")
const mongoose = require("mongoose")
const app = express()

// set up database
mongoose.connect(process.env.MONGOLAB_URI)
const Schema = mongoose.Schema
const userSchema = new Schema({
  username: { type: String, required: true, unique: true }
})
const User = mongoose.model("User", userSchema)

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static("public"))

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html")
})

// route for creating a new user
app.post("/api/exercise/new-user", (req, res) => {
  const user = req.body.username
  const newUser = new User({
    username: user
  })

  newUser.save((err, newUser) => {
    if (err) {
      if (err.code === 11000) {
        // username already in db
        res.send("Duplicate username, please try another.")
      } else {
        res.send("Error saving username to database.")
      }
      return console.error(err)
    } else {
      // we're good, save the unique username
      res.json(newUser)
      return console.log("successfully saved username", user)
    }
  })
})

// route for creating a new exercise
app.post("/api/exercise/add", (req, res) => {})

// route for getting an exercise
app.get("/api/exercise/:log", (req, res) => {})

// route for getting all users
app.get("/api/exercise/users", (req, res) => {})

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" })
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || "Internal Server Error"
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port)
})
