const AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB();
var querystring = require('querystring');

var request = require('request')

var client_id = 'afce36398bc1443f8f5c5577547bcaf2'; // Your client id
var client_secret = 'a31626817ad54c6ba4849dc593b868b7'; // Your secret


exports.handler = (event, context, callback) => {
    console.log("GET EVENT PATH: " + event.path)
    if(event.path == "/gtmsongs/search") {
        handleSearch(event, callback)
    } else if(event.path == "/gtmsongs/post") {
        handlePost(event, callback)
    } else if(event.path == "/gtmsongs/topCharts") {
        handleTopCharts(event, callback)
    } else {
        console.log("UNHANDLED EVENT PATH: " + event.path)
    }
};


function handleSearch(event, callback) {
    var data = querystring.parse(event.body);
    var token = data.token
    var searchQuery = data.searchQuery

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
                checkIfValid(data["Items"][0].userid.S, data["Items"][0].spotifyInfo.M, function(access_token) {
                    console.log("MAKING REQUEST WITH ACCESS TOKEN: " + access_token)
                    var options = {
                      url: "https://api.spotify.com/v1/search?q=" + searchQuery + "&type=track&market=US&limit=10",
                      headers: {
                        'Authorization': 'Bearer ' + access_token
                      }
                    };

                    function reqcallback(error, response, body) {
                      if (!error && response.statusCode == 200) {
                        var info = JSON.parse(body);
                        var returnJSON = {
                            Count: info.tracks.limit,
                            Songs: [],
                        }
                        for(var i = 0; i < info.tracks.limit; i++) {
                            var songJSON = {
                                id: info.tracks.items[i].id,
                                artist: info.tracks.items[i].artists[0].name,
                                title: info.tracks.items[i].name
                            }
                            returnJSON.Songs.push(songJSON)
                        }

                        response = {
                            statusCode: 200,
                            headers: {
                                "Access-Control-Allow-Origin" : "*",
                                'Content-Type' : 'text/html'
                            },
                            body: JSON.stringify(returnJSON) //songID
                        };
                        callback(null, response);
                      }
                    }

                    request.get(options, reqcallback);
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

function handleTopCharts(event, callback) {
    console.log("HANDLE TOP CHARTS")

    let scanningParameters = {
        TableName:'topChart',
        Limit: 100
    };

    dynamodb.scan(scanningParameters, function(err, data) {
        // if (err) {
        //     callback(err, null);
        // } else {
        //     callback(null, data);
        // }
        var returnJSON = {
            Count: data.Count,
            Songs: [],
        }
        for(var i = 0; i < data.Count; i++) {
            var songJSON = {
                id: data.Items[i].SongID.S,
                artist: data.Items[i].Title.S,
                title: data.Items[i].Artist.S,
                votes: data.Items[i].Points.N,
                emotion: data.Items[i].Emotion.S,
            }
            returnJSON.Songs.push(songJSON)
        }

        var response = {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin" : "*",
                'Content-Type' : 'text/html'
            },
            body: JSON.stringify(returnJSON) //songID
        };
        callback(null, response);
    });
}

function handlePost(event, callback) {
    var data = querystring.parse(event.body);
    console.log("THIS IS WHAT I POSTED: " + JSON.stringify(data))
    var token = data.token
    var songID = data.songID
    var emotion = data.emotion


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
                foundUserID = data["Items"][0].userid.S
                foundSpotifyInfo = data["Items"][0].spotifyInfo.M
                firstScanDone()
            } else {
                callback(null, response)
            }
        }
     });

    var topchartsparams = {
        ExpressionAttributeNames: {
            "#I": "SongID"
        },
        ExpressionAttributeValues: {
            ":i": {
                S: songID
            }
        },
        FilterExpression: "#I = :i",
        TableName: "topChart"
    };

    dynamodb.scan(topchartsparams, function(err, data) {
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
                 console.log("found song: " + data["Items"][0].Title.S)
                 topchartsResult = true

             } else {
                 topchartsResult = false
             }
             firstScanDone()
         }

      });

    var foundUserID = null;
    var foundSpotifyInfo = null;
    var topchartsResult = null


    function firstScanDone() {
        if(topchartsResult == null || foundUserID == null) {
            return
        }

        if(topchartsResult == false) {
            checkIfValid(foundUserID, foundSpotifyInfo, function(access_token) {
                console.log("GETTING TRACK WITH ACCESS TOKEN: " + access_token)
                var options = {
                  url: "https://api.spotify.com/v1/tracks/" + songID,
                  headers: {
                    'Authorization': 'Bearer ' + access_token
                  }
                };


                request.get(options, function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var info = JSON.parse(body);
                        var title = info.name
                        var artist = info.artists[0].name

                        var params = {
                            Item: {
                                "SongID": {
                                    S: songID                       //create user
                                },
                                "Points": {
                                    N: "" + 1
                                },
                                "Artist": {
                                    S: artist
                                },
                                "Title": {
                                    S: title
                                },
                                "StartDay": {
                                    N: "" + Date.now()
                                },
                                "Emotion" : {
                                    S: "Not implemented"
                                }
                            },
                            TableName: "topChart"
                        };

                        dynamodb.putItem(params, function(err, data) {
                            if (err) {
                                console.log(err, err.stack); // an error occurred
                                // var response = {
                                //     statusCode: 404,
                                //     headers: {
                                //         "Access-Control-Allow-Origin" : "*",
                                //         'Content-Type' : 'text/html'
                                //     },
                                //     body: "failed"
                                // };
                                // callback(null, response)
                            } else {
                                // var response = {
                                //     statusCode: 200,
                                //     headers: {
                                //         "Access-Control-Allow-Origin" : "*",
                                //         'Content-Type' : 'text/html'
                                //     },
                                //     body: "success"
                                // };
                                // callback(null, response)
                            }
                         });
                    } else {
                        console.log(error, "Spotify failed to find the track")
                    }
                })
            })

        }

        var postParams = {
            Item: {
                "key": {
                    S: foundUserID + Date.now()
                },
                "userID": {
                    S: foundUserID
                },
                "SongID": {
                    S: songID
                },
                "emotion": {
                    S: emotion
                },
                "date": {
                    N: "" + Date.now()
                }
            },
            TableName: "userPosts"
        };

        dynamodb.putItem(postParams, function(err, data) {
            if (err) {
                var response = {
                    statusCode: 404,
                    headers: {
                        "Access-Control-Allow-Origin" : "*",
                        'Content-Type' : 'text/html'
                    },
                    body: "failed"
                };
                callback(null, response)
            }else {
                var response = {
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


    }
}
