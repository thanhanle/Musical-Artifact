const AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB();
var querystring = require('querystring');
var request = require('request')
var checkIfValid = require("./checkIfValid").checkIfValid

exports.handleEdit = (event, callback) => {
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
                    body: "could not find user for access token"
                };
                callback(null, response);
            }

        }

     });
}
