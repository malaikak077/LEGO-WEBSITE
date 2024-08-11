const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

let Schema = mongoose.Schema;

let userSchema = new Schema({
    userName: {
        type: String,
        unique: true
    },
    password: String,
    email: {
        type: String,
        unique: true
    },
    loginHistory: [{
        dateTime: Date,
        userAgent: String
    }]
});

let User = mongoose.model("User", userSchema);

module.exports.registerUser = function (userData) {
    return new Promise((resolve, reject) => {
        if (userData.password !== userData.confirmPassword) {
            reject("Passwords do not match");
        } else {
            bcrypt.hash(userData.password, 10).then((hash) => {
                let newUser = new User({
                    userName: userData.userName,
                    password: hash,
                    email: userData.email,
                    loginHistory: []
                });

                newUser.save().then(() => {
                    resolve();
                }).catch((err) => {
                    if (err.code === 11000) {
                        reject("User already exists");
                    } else {
                        reject(`There was an error creating the user: ${err}`);
                    }
                });
            }).catch(err => {
                reject(`There was an error encrypting the password: ${err}`);
            });
        }
    });
};

module.exports.checkUser = function (userData) {
    return new Promise((resolve, reject) => {
        User.findOne({ userName: userData.userName }).exec().then((user) => {
            if (!user) {
                reject(`Unable to find user: ${userData.userName}`);
            } else {
                bcrypt.compare(userData.password, user.password).then((res) => {
                    if (res) {
                        user.loginHistory.push({
                            dateTime: new Date().toString(),
                            userAgent: userData.userAgent
                        });

                        user.save().then(() => {
                            resolve(user);
                        }).catch((err) => {
                            reject(`There was an error verifying the user: ${err}`);
                        });
                    } else {
                        reject(`Incorrect Password for user: ${userData.userName}`);
                    }
                }).catch((err) => {
                    reject(`There was an error verifying the user: ${err}`);
                });
            }
        }).catch((err) => {
            reject(`Unable to find user: ${userData.userName}`);
        });
    });
};
