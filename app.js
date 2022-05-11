//Modules needed for the Projects
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const port = 3000;
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const saltRounds = 15;


const app = express();

app.use(express.static('public'));//used to show css files
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));//to use body-parser

// connecting mongodb using mongoose odm and creating database
mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const User = new mongoose.model("User", userSchema);

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});


app.get("/", (req, res) => {
    res.render("home");
});
app.get("/login", (req, res) => {
    res.render("login", { errMsg: "", username: "", password: "" });
});

app.get("/register", (req, res) => {
    res.render("register");
});

//Register Page

app.post("/register", (req, res) => {
    bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
        const newUser = new User({
            email: req.body.username,
            password: hash
        });
        newUser.save(function (error) {
            if (error) {
                console.log(error);
            } else {
                res.render("secrets");
            }
        });
    });
});

// //login page

app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({ email: username }, (err, foundUser) => {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                bcrypt.compare(password, foundUser.password).then(function(result) {
                    if(result===true)
                    {
                    res.render("secrets");  
                    console.log("New login (" + username + ")");
                    } else {
                    res.render("login", { errMsg: "Email or password incorrect", username: username, password: password });
            }});
            } else {
                res.render("login", { errMsg: "Email or password incorrect", username: username, password: password });
            }
        }
    });
});

