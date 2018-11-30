const AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB();
var querystring = require('querystring');
var request = require('request')

var client_id = 'afce36398bc1443f8f5c5577547bcaf2'; // Your client id
var client_secret = 'a31626817ad54c6ba4849dc593b868b7'; // Your secret


exports.handler = (event, context, callback) => {

    if(event.path == "/GTMLogin/login") {
        loginUser(event, callback)
    } else if(event.path == "/GTMLogin/register") {
        registerUser(event, callback)
    } else if(event.path == "/GTMLogin/linkspotify") {
        console.log("Linking spotify")
        linkSpotify(event, callback)
    } else if(event.path == "/GTMLogin/getuserinfo") {
        console.log("Getting user info")
        getUserInfo(event, callback)
    } else {
        //handle(event, callback)
        console.log("UNHANDLED EVENT PATH: " + event.path)
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
    var username = data.username
    var password = data.password


    //console.log("LOGIN: " + event.body)
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
        var newToken = generateToken(username)

        if (err) {
            console.log(err, err.stack); // an error occurred
            callback(null, response)
        } else {
            if(data["Count"] != 0) {
                updateUserToken(username, newToken, function(callbackToken) {
                    response = {
                        statusCode: 200,
                        headers: {
                            "Access-Control-Allow-Origin" : "*",
                            'Content-Type' : 'text/html'
                        },
                        body: callbackToken
                    };
                    callback(null, response);
                })
            } else {
                response = {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin" : "*",
                        'Content-Type' : 'text/html'
                    },
                    body: "failed"
                };
                callback(null, response);
            }

        }

     });
}

function registerUser(event, callback) {

    var data = querystring.parse(event.body);
    var username = data.username
    var password = data.password


    var params = {
        Item: {
            "userid": {
                S: username                       //create user
            },
            "password": {
                S: password
            },
            "token": {
                S: "null"
            },
            "spotifyInfo": {
                M: {
                    "refresh_token" : {"S": "null"},
                    "access_token": {"S": "null"},
                    "expiresAt": {"N": "0"}
                }
            }
        },
        ExpressionAttributeNames: {
            "#u": "userid"
        },
        TableName: "MusicUsers",
        ConditionExpression: "attribute_not_exists(#u)",
    };

    var response = {
        statusCode: 404,
        headers: {
            "Access-Control-Allow-Origin" : "*",
            'Content-Type' : 'text/html'
        },
        body: "failed"
    };

    dynamodb.putItem(params, function(err, data) {
        if (err) {
            console.log("ERROR REGISTERING USER: " + username)
            console.log(err, err.stack); // an error occurred
            callback(null, response)
        } else {
            var newToken = generateToken(username)
            updateUserToken(username, newToken, function(callbackToken) {
                response = {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin" : "*",
                        'Content-Type' : 'text/html'
                    },
                    body: callbackToken
                };
                callback(null, response)
            })
        }
     });
}

function updateUserToken(username, token, callback) {


    var params = {
        ExpressionAttributeNames: {
            "#T": "token"
        },
        ExpressionAttributeValues: {
            ":t": {
                S: token
            }
        },
        Key: {
            "userid": {
                S: username
            },
        },
        ReturnValues: "UPDATED_NEW",
        TableName: "MusicUsers",
        UpdateExpression: "SET #T = :t"
    };

    console.log("updating user token")
    dynamodb.updateItem(params, function(err, data) {
        var response = {};
        if (err) {
            console.log(err, err.stack); // an error occurred
            callback('failed')
        } else {
            callback(token)
        }
    });
}

function linkSpotify(event, callback) {
    var data = querystring.parse(event.body);
    var token = data.token
    var code = data.code
    var redirect_uri = data.redirect_uri

    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    console.log("getting user access token")

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token,
                refresh_token = body.refresh_token,
                expiresAt = Date.now() + body.expires_in;


            var authOptions = {
                url: 'https://api.spotify.com/v1/me',
                headers: {
                'Authorization': 'Bearer ' + access_token
                },
                json: true
            };

            console.log("got access token");

            request.get(authOptions, function(error, response, body) {
                if (!error && response.statusCode === 200) {
                    var display_name = body.display_name
                    var user_id = body.id

                    var image_url = "default"

                    if(body.images[0] != null) {
                        image_url = body.images[0].url
                    }


                    var premium = (body.product == "premium")

                    console.log("got user id " + user_id);

                    //first we gotta find which user has this token then use that username(primary key) to update the info
                    var params = {
                        ExpressionAttributeNames: {
                            "#T": "token"
                        },
                        ExpressionAttributeValues: {
                            ":t": {
                                S: token
                            }
                        },
                        FilterExpression: "#T = :t",
                        TableName: "MusicUsers"
                    };

                    dynamodb.scan(params, function(err, data) {
                        var response = {
                            statusCode: 404,
                            headers: {
                                "Access-Control-Allow-Origin" : "*",
                                'Content-Type' : 'text/html'
                            },
                            body: "failed"
                        };

                        if (err) {
                            console.log(err, err.stack); // an error occurred
                            callback(null, response)
                        } else {
                            if(data["Count"] == 1) {
                                console.log("found userid: " + data["Items"][0].userid.S)
                                var params = {
                                    ExpressionAttributeNames: {
                                        "#C": "spotifyInfo"
                                    },
                                    ExpressionAttributeValues: {
                                        ":r": {
                                            S: refresh_token
                                        },
                                        ":a": {
                                            S: access_token
                                        },
                                        ":x": {
                                            N: "" + expiresAt
                                        },
                                        ":d": {
                                            S: display_name
                                        },
                                        ":i": {
                                            S: user_id
                                        },
                                        ":m": {
                                            S: image_url
                                        },
                                        ":p": {
                                            BOOL: premium
                                        }
                                    },
                                    Key: {
                                        "userid": {
                                            S: data["Items"][0].userid.S
                                        },
                                    },
                                    ReturnValues: "UPDATED_NEW",
                                    TableName: "MusicUsers",
                                    UpdateExpression: "SET #C.refresh_token = :r, #C.access_token = :a, #C.expiresAt = :x, #C.display_name = :d, #C.id = :i, #C.image_url = :m, #C.premium = :p"
                                };

                                console.log("Linking Spotify...token: " + token);
                                dynamodb.updateItem(params, function(err, data) {
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
                                            body: "success"
                                        };
                                        callback(null, response)
                                    }
                                });
                            } else {
                                response = {
                                    statusCode: 200,
                                    headers: {
                                        "Access-Control-Allow-Origin" : "*",
                                        'Content-Type' : 'text/html'
                                    },
                                    body: "failed"
                                };
                                callback(null, response);
                            }

                        }

                    });
                }
            })
        } else {
            console.log(response)
        }
    })


}

function getUserInfo(event, callback) {
    var data = querystring.parse(event.body);
    var token = data.token
    console.log("finding user with token: " + token)
    console.log(event.body)
    var params = {
        ExpressionAttributeNames: {
            "#T": "token"
        },
        ExpressionAttributeValues: {
            ":t": {
                S: token
            }
        },
        FilterExpression: "#T = :t",
        TableName: "MusicUsers"
    };

    dynamodb.scan(params, function(err, data) {
        var response = {
            statusCode: 404,
            headers: {
                "Access-Control-Allow-Origin" : "*",
                'Content-Type' : 'text/html'
            },
            body: "failed"
        };

        if (err) {
            console.log(err, err.stack); // an error occurred
            callback(null, response)
        } else {
            if(data["Count"] == 1) {
                console.log("found userid: " + data["Items"][0].userid.S)


                var returnData = {}

                //spotify not linked
                if(data["Items"][0].spotifyInfo.M.access_token.S == "null") {
                    returnData.display_name = data["Items"][0].userid.S
                    returnData.image_url = "default"
                    returnData.premium = false
                } else {
                    returnData.display_name = data["Items"][0].spotifyInfo.M.display_name.S
                    returnData.image_url = data["Items"][0].spotifyInfo.M.image_url.S
                    returnData.premium = data["Items"][0].spotifyInfo.M.premium.BOOL
                }



                response = {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin" : "*",
                        'Content-Type' : 'text/html'
                    },
                    body: JSON.stringify(returnData)
                };
                callback(null, response);

            } else {
                console.log("counldnt find")
                response = {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin" : "*",
                        'Content-Type' : 'text/html'
                    },
                    body: "failed"
                };
                callback(null, response);
            }

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
    return data + "%" +  Math.random().toString(36).substring(7);
}

// hashPassword('PASSWORD');
// hashPassword('PASSWORD');
