const AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB();
var querystring = require('querystring');
var request = require('request')

var client_id = 'afce36398bc1443f8f5c5577547bcaf2'; // Your client id
var client_secret = 'a31626817ad54c6ba4849dc593b868b7'; // Your secret


exports.handler = (event, context, callback) => {

    if(event.path == "/GTMPlay/play") {
        handlePlay(event, callback)
    } else if(event.path == "/GTMPlay/pause") {
        handlePause(event, callback)
    } else if(event.path == "/GTMPlay/next") {
        handleNext(event, callback)
    } else if(event.path == "/GTMPlay/previous") {
        handlePrevious(event, callback)
    } else if(event.path == "/GTMPlay/accesstoken") {
        handleAccessToken(event, callback)
    } else {
        //handle(event, callback)
        console.log("UNHANDLED EVENT PATH: " + event.path)
    }
};


function handlePlay(event, callback) {
    var data = querystring.parse(event.body);
    var token = data.token
    var deviceID = data.deviceID
    var uri = data.uri

    //first we gotta make sure theres a user logged in with the token
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
                console.log("found spotifyToken: " + JSON.stringify(data["Items"][0].spotifyInfo.M.access_token.S))
                if(data["Items"][0].spotifyInfo.M.access_token.S) {
                    callback(null,response)
                    return
                }
                checkIfValid(data["Items"][0].userid.S, data["Items"][0].spotifyInfo.M, function(access_token) {
                    console.log("PLAY IN BROWSER WITH ACCESS TOKEN: " + access_token)
                    var options = {
                        url: "https://api.spotify.com/v1/me/player/play?device_id=" + deviceID,
                        headers: {
                            'Authorization': 'Bearer ' + access_token,
                            'Content-Type': 'application/json'
                        }
                    };
                    console.log("this is the uri:" + uri)
                    if(uri !== 'undefined') {
                        options = {
                            url: "https://api.spotify.com/v1/me/player/play?device_id=" + deviceID,
                            headers: {
                                'Authorization': 'Bearer ' + access_token,
                                'Content-Type': 'application/json'
                            },
                            json: {uris: [uri]}
                        };
                    }

                    function reqcallback(error, response, body) {
                        console.log(body)
                        if(err) {
                            console.log(err)
                            response = {
                                statusCode: 200,
                                headers: {
                                    "Access-Control-Allow-Origin" : "*",
                                    'Content-Type' : 'text/html'
                                },
                                body: "failed"
                            };
                            callback(null, response);
                        } else {
                            response = {
                                statusCode: 200,
                                headers: {
                                    "Access-Control-Allow-Origin" : "*",
                                    'Content-Type' : 'text/html'
                                },
                                body: "playing"
                            };
                            callback(null, response);
                        }
                    }

                    request.put(options, reqcallback);
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


function checkIfValid(userid, spotifyInfo, callback) {
    if (Date.now() < parseInt(spotifyInfo.expiresAt.N)) {
        callback(spotifyInfo.access_token.S)
    } else {
        var refresh_token = spotifyInfo.refresh_token.S;
        var authOptions = {
          url: 'https://accounts.spotify.com/api/token',
          headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
          form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
          },
          json: true
        };

        request.post(authOptions, function(error, response, body) {
          if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            var expiresAt = Date.now() + body.expires_in;
            updateSpotifyToken(userid, spotifyInfo, access_token, expiresAt, callback)
          }
        });
    }
}

function updateSpotifyToken(username, oldspotifyInfo, access_token, expiresAt, callback) {
    var params = {
        ExpressionAttributeNames: {
            "#C": "spotifyInfo"
        },
        ExpressionAttributeValues: {
            ":r": {
                S: oldspotifyInfo.refresh_token.S
            },
            ":a": {
                S: access_token
            },
            ":x": {
                N: "" + expiresAt
            }
        },
        Key: {
            "userid": {
                S: username
            },
        },
        ReturnValues: "UPDATED_NEW",
        TableName: "MusicUsers",
        UpdateExpression: "SET #C.refresh_token = :r, #C.access_token = :a, #C.expiresAt = :x"
    };

    dynamodb.updateItem(params, function(err, data) {
        if (err) {
            console.log(err)
            callback('failed')
        } else {
            callback(access_token)
        }
    });
}

function handleAccessToken(event, callback) {
    var data = querystring.parse(event.body);
    var token = data.token
    var uri = data.uri


    //first we gotta make sure theres a user logged in with the token
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
            body: "failed - db error"
        };

        if (err) {
            console.log(err, err.stack); // an error occurred
            callback(null, response)
        } else {
            if(data["Count"] == 1) {
                console.log("found userid: " + data["Items"][0].userid.S)
                console.log("found spotifyToken: " + JSON.stringify(data["Items"][0].spotifyInfo.M.access_token.S))
                if(data["Items"][0].spotifyInfo.M.access_token.S) {
                    callback(null,response)
                    return
                }
                checkIfValid(data["Items"][0].userid.S, data["Items"][0].spotifyInfo.M, function(access_token) {
                    response = {
                        statusCode: 200,
                        headers: {
                            "Access-Control-Allow-Origin" : "*",
                            'Content-Type' : 'text/html'
                        },
                        body: access_token
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
                    body: "failed- could not find token"
                };
                callback(null, response);
            }
        }
     });
}

function handlePause(event, callback) {
    var data = querystring.parse(event.body);
    var token = data.token
    var deviceID = data.deviceID

    //first we gotta make sure theres a user logged in with the token
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
                console.log("found spotifyToken: " + JSON.stringify(data["Items"][0].spotifyInfo.M.access_token.S))
                if(data["Items"][0].spotifyInfo.M.access_token.S) {
                    callback(null,response)
                    return
                }
                checkIfValid(data["Items"][0].userid.S, data["Items"][0].spotifyInfo.M, function(access_token) {
                    console.log("PAUSE IN BROWSER WITH ACCESS TOKEN: " + access_token)
                    var options = {
                        url: "https://api.spotify.com/v1/me/player/pause?device_id=" + deviceID,
                        headers: {
                            'Authorization': 'Bearer ' + access_token,
                            'Content-Type': 'application/json'
                        }
                    };

                    function reqcallback(error, response, body) {
                        if(err) {
                            console.log(err)
                            response = {
                                statusCode: 200,
                                headers: {
                                    "Access-Control-Allow-Origin" : "*",
                                    'Content-Type' : 'text/html'
                                },
                                body: "failed"
                            };
                            callback(null, response);
                        } else {
                            response = {
                                statusCode: 200,
                                headers: {
                                    "Access-Control-Allow-Origin" : "*",
                                    'Content-Type' : 'text/html'
                                },
                                body: "paused"
                            };
                            callback(null, response);
                        }
                    }

                    request.put(options, reqcallback);
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


function handleNext(event, callback) {
    var data = querystring.parse(event.body);
    var token = data.token
    var deviceID = data.deviceID

    //first we gotta make sure theres a user logged in with the token
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
                console.log("found spotifyToken: " + JSON.stringify(data["Items"][0].spotifyInfo.M.access_token.S))
                if(data["Items"][0].spotifyInfo.M.access_token.S) {
                    callback(null,response)
                    return
                }
                checkIfValid(data["Items"][0].userid.S, data["Items"][0].spotifyInfo.M, function(access_token) {
                    console.log("NEXT IN BROWSER WITH ACCESS TOKEN: " + access_token)
                    var options = {
                        url: "https://api.spotify.com/v1/me/player/next?device_id=" + deviceID,
                        headers: {
                            'Authorization': 'Bearer ' + access_token,
                            'Content-Type': 'application/json'
                        }
                    };

                    function reqcallback(error, response, body) {
                        if(err) {
                            console.log(err)
                            response = {
                                statusCode: 200,
                                headers: {
                                    "Access-Control-Allow-Origin" : "*",
                                    'Content-Type' : 'text/html'
                                },
                                body: "failed"
                            };
                            callback(null, response);
                        } else {
                            response = {
                                statusCode: 200,
                                headers: {
                                    "Access-Control-Allow-Origin" : "*",
                                    'Content-Type' : 'text/html'
                                },
                                body: "next"
                            };
                            callback(null, response);
                        }
                    }

                    request.post(options, reqcallback);
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


function handlePrevious(event, callback) {
    var data = querystring.parse(event.body);
    var token = data.token
    var deviceID = data.deviceID

    //first we gotta make sure theres a user logged in with the token
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
                console.log("found spotifyToken: " + JSON.stringify(data["Items"][0].spotifyInfo.M.access_token.S))
                if(data["Items"][0].spotifyInfo.M.access_token.S) {
                    callback(null,response)
                    return
                }
                checkIfValid(data["Items"][0].userid.S, data["Items"][0].spotifyInfo.M, function(access_token) {
                    console.log("NEXT IN BROWSER WITH ACCESS TOKEN: " + access_token)
                    var options = {
                        url: "https://api.spotify.com/v1/me/player/previous?device_id=" + deviceID,
                        headers: {
                            'Authorization': 'Bearer ' + access_token,
                            'Content-Type': 'application/json'
                        }
                    };

                    function reqcallback(error, response, body) {
                        if(err) {
                            console.log(err)
                            response = {
                                statusCode: 200,
                                headers: {
                                    "Access-Control-Allow-Origin" : "*",
                                    'Content-Type' : 'text/html'
                                },
                                body: "failed"
                            };
                            callback(null, response);
                        } else {
                            response = {
                                statusCode: 200,
                                headers: {
                                    "Access-Control-Allow-Origin" : "*",
                                    'Content-Type' : 'text/html'
                                },
                                body: "previous"
                            };
                            callback(null, response);
                        }
                    }

                    request.post(options, reqcallback);
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
