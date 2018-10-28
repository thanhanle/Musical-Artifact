const AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB();
var request = require('request')

exports.checkIfValid = (userid, spotifyInfo, callback) => {
    if (Date.now() < parseInt(spotifyInfo.expiresAt.N)) {
        callback(spotifyInfo.access_token.S)
    } else {
        var refresh_token = spotifyInfo.refresh_token.S;
        var authOptions = {
          url: 'https://accounts.spotify.com/api/token',
          headers: { 'Authorization': 'Basic ' + (new Buffer(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')) },
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
