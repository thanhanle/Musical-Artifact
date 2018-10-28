const AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB();
var querystring = require('querystring');
var request = require('request')
var checkIfValid = require("./checkIfValid").checkIfValid

exports.handlePost = (event, callback) => {
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

    var pointCounter = null
    var emotionsdata = {}

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
                 var temp = data["Items"][0].Points.N
                 var intCounter = parseInt(temp)
                 var pCounter = intCounter + 1
                 pointCounter = pCounter.toString()
                 console.log(pointCounter)
                 var currentemotions = data["Items"][0].Emotions.M
                 emotionsdata = currentemotions
                 if(currentemotions[emotion] == null) {
                     emotionsdata[emotion] = { "N" : "1"}
                 } else {
                     emotionsdata[emotion] = { "N" : "" + (parseInt(currentemotions[emotion].N) + 1)}
                 }
             } else {
                 pointCounter = "1"
                 emotionsdata[emotion] = { "N" : "1"}
             }
             firstScanDone()
         }

      });

    var foundUserID = null;
    var foundSpotifyInfo = null;
    var topchartsResult = null


    function firstScanDone() {
        if(pointCounter == null || foundUserID == null) {
            return
        }


        checkIfValid(foundUserID, foundSpotifyInfo, function(access_token) {
            console.log("GETTING TRACK WITH ACCESS TOKEN: " + access_token)
            var options = {
              url: "https://api.spotify.com/v1/tracks/" + songID,
              headers: {
                'Authorization': 'Bearer ' + access_token
              }
            };

            var title
            var artist
            var genre


            request.get(options, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    var info = JSON.parse(body);
                    title = info.name
                    artist = info.artists[0].name
                    var artistID = info.artists[0].id

                    var options = {
                      url: "https://api.spotify.com/v1/artists/" + artistID,
                      headers: {
                        'Authorization': 'Bearer ' + access_token
                      }
                    };

                    request.get(options, function(error, response, body) {
                        if (!error && response.statusCode == 200) {
                            var artistinfo = JSON.parse(body);
                            genre = artistinfo.genres[0]
                            done()
                        } else {
                            console.log(error, "Spotify failed to find the artist")
                        }
                    })

                } else {
                    console.log(error, "Spotify failed to find the track")
                }
            })


            function done() {
                if(title == null || genre == null) {
                    return
                }

                var params = {
                    Item: {
                        "SongID": {
                            S: songID                       //create user
                        },
                        "Points": {
                            N: "" + pointCounter
                        },
                        "Artist": {
                            S: artist
                        },
                        "Title": {
                            S: title
                        },
                        "Genre": {
                            S: genre
                        },
                        "StartDay": {
                            N: "" + Date.now()
                        },
                        "Emotions" : {
                            M: emotionsdata
                        }
                    },
                    TableName: "topChart"
                };

                console.log(params)
                dynamodb.putItem(params, function(err, data) {
                    if (err) {
                        console.log(err)
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

        });


         var postParams = {
            Item: {
                "key": {
                    S: "" + foundUserID + Date.now()
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

        console.log(postParams)
        dynamodb.putItem(postParams, function(err, data) {
            if (err) {
                console.log(err)
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
