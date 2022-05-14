//Modules needed for the Projects
//Create some constants to require packages/modules

/*
It is important to put (require("dotenv").config();) on the top otherwise
you may not be able to access it if it is not configured
*/
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const port = 3000;
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
//We don't need to require passport-local because it's one of those dependencies that will be needed by passport-local-mongoose

const app = express();//Create a new app instance using express

app.use(express.static('public'));
app.set('view engine', 'ejs');//Tell the app to use EJS as its view engine as the templating engine
app.use(bodyParser.urlencoded({ extended: true }));//Require body-parser module to parser the requests

//Set up express session
app.use(session({
    //js object with a number of properties (secret, resave, saveUninitialized)
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
}));

//Initialize and start using passport.js
app.use(passport.initialize());
app.use(passport.session());

// connecting mongodb using mongoose odm and creating database
mongoose.connect("mongodb://localhost:27017/userDB");

/*Replace the simple version of the schema above to the below one
The userSchema is no longer a simple javascript object,
it is now an object created from the mongoose.Schema class
*/
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    secret: [{ type: String }]
});

/*
In order to set up the passport-local-mongoose, it needs to be added to
the mongoose schema as a plugin
That is what we will use now to hash and salt the passwords
and to save the users into the mongoDB database
*/
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);//Setup a new User model and specify the name of the collection User

/*
passport-local Configuration
Create a strategy which is going to be the local strategy to
authenticate users using their username and password and also to
serialize and deserialize the user
Serialize the user is to basically create the cookie and add inside the
message, namely the user's identification into the cookie
Deserialize the user is to basically allow passport to be able to crumble
the cookie and discover the message inside which is who the user is all of the user's
identification so that we can authenticate the user on the server
*/
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});

//Add some GETs to view the EJS files/websites
//Target the home/root route to render the home page
app.get("/", (req, res) => {
    res.render("home");
});
//Target the register route to render the login page
app.get("/login", (req, res) => {
    res.render("login", { errMsg: "", username: "", password: "" });
});
//Target the register route to render the register page
app.get("/register", (req, res) => {
    res.render("register");
});
//Target the logout route
app.get("/logout", (req, res) => {
    req.logout();
    req.session.destroy(err => {
        if (!err) {
            res
                .status(200)
                .clearCookie("connect.sid", { path: "/" })
                .redirect("/");
        } else {
            console.log(err);
        }
    });
});
/*
 Course code was allowing the user to go back to the secrets page after loggin out,
 that is because when we access a page, it is cached by the browser, so when the user is accessing a cached page (like the secrets one)
 you can go back by pressing the back button on the browser, the code to fix it is the one below so the page will not be cached
 */

app.get("/secrets", (req, res) => {
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stal   e=0, post-check=0, pre-check=0');
    /*
     Check if the user is authenticated and this is where we are relying on
     passport.js, session, passport-local and passport-local-mongoose to make sure
     that if the user is already logged in then we should simply render the secrets page
     but if the user is not logged in then we are going to redirect the user to the login page
     */
    User.find({"secret":{$ne:null}},function(err,foundUsers){
        if(err){
            console.log(err);
        }else{
            if(foundUsers){
                res.render("secrets",{userWithSecrets:foundUsers})
            }
        }
    });
    // if (req.isAuthenticated()) {
    //     res.render("secrets");
    // } else {
    //     res.redirect("/login");
    // }
});

//Submit option
app.get("/submit", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

// Register Page
app.post("/register", (req, res) => {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            })
        }
    })
});

//login page

app.post("/login", function (req, res) {
    //check the DB to see if the username that was used to login exists in the DB
    User.findOne({ username: req.body.username }, function (err, foundUser) {
        //if username is found in the database, create an object called "user" that will store the username and password
        //that was used to login
        if (foundUser) {
            const user = new User({
                username: req.body.username,
                password: req.body.password
            });
            //use the "user" object that was just created to check against the username and password in the database
            //in this case below, "user" will either return a "false" boolean value if it doesn't match, or it will
            //return the user found in the database
            passport.authenticate("local", function (err, user) {
                if (err) {
                    console.log(err);
                } else {
                    //this is the "user" returned from the passport.authenticate callback, which will be either
                    //a false boolean value if no it didn't match the username and password or
                    //a the user that was found, which would make it a truthy statement
                    if (user) {
                        //if true, then log the user in, else redirect to login page
                        req.login(user, function (err) {
                            res.redirect("/secrets");
                        });
                    } else {
                        res.redirect("/login");
                    }
                }
            })(req, res);
            //if no username is found at all, redirect to login page.
        } else {
            //user does not exists
            res.redirect("/login")
        }
    });
});

app.post("/submit", function (req, res) {

    const submittedSecret = req.body.secret;

    User.findById(req.user.id, function (err, foundUser) { if (err) {
        console.log(err);

        } else {

            if (foundUser) {

                foundUser.secret.push(submittedSecret);

                foundUser.save(function () {

                    res.redirect("/secrets");

                });

            }

        }

    });

});