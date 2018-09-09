const AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB();
var querystring = require('querystring');

exports.handler = (event, context, callback) => {

    if(event.path == "/GTMLogin/login") {
        loginUser(event, callback)
    } else if(event.path == "/GTMLogin/register") {
        registerUser(event, callback)
    } else {
        //handle(event, callback)
    }


    // const response = {
    //     statusCode: 200,
    //     headers: {
    //         "Access-Control-Allow-Origin" : "*",

    //     },
    //     body: JSON.stringify(event.queryStringParameters)
    // };
    // callback(null, response);
};

function loginUser(event, callback) {


    var data = querystring.parse(event.body);
    var username = data.userid
    var password = data.password


    //console.log("LOGIN: " + data)
    var params = {
      ExpressionAttributeValues: {
       ":a": {
           S: username                                 //login User
       },
       ":b" : {
           S: password
       }
      },
      FilterExpression: "userid = :a AND password = :b",
      TableName: "MusicUsers"
     };

    dynamodb.scan(params, function(err, data) {
        var response = {};

        if (err) {
            console.log(err, err.stack); // an error occurred
            callback(null, response)
        } else {
            if(data["Count"] != 0) {
                response = {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin" : "*",
                        'Content-Type' : 'text/html'
                    },
                    body: generateToken()
                };
            } else {
                response = {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin" : "*",
                        'Content-Type' : 'text/html'
                    },
                    body: "failed"
                };
            }
            callback(null, response);
        }

     });
}

function registerUser(event, callback) {

    var data = querystring.parse(event.body);
    var username = data.userid
    var password = data.password


    var params = {
        Item: {
            "userid": {
             S: username                       //create user
            },
            "password": {
             S: password
            }
        },
        TableName: "MusicUsers"
    };

    var response = {}

    dynamodb.putItem(params, function(err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
            callback(new Error("error"), response)
        } else {
            response = {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin" : "*",
                    'Content-Type' : 'text/html'
                },
                body: generateToken("")
            };
            callback(null, response)
        }
     });
}

'use strict';
var crypto = require('crypto');

var generateSalt = function(length) {
    return crypto.randomBytes(Math.ceil(length/2))
        .toString('hex')
        .slice(0,length);
};

var sha512 = function(password,salt) {
    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt:salt,
        passwordHash:value
    };
};

function hashPassword(password) {
    var salt = generateSalt(15);
    var hashedPass = sha512(password, salt);
    console.log('userPassword = ' + password);
    console.log('hashedPassword = ' + hashedPass.passwordHash);
    console.log('Salt = ' + hashedPass.salt);
}

function generateToken(data) {
    return data + Math.random().toString(36).substring(7);
}

// hashPassword('PASSWORD');
// hashPassword('PASSWORD');
