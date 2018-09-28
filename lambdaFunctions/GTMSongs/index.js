const AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB();
var querystring = require('querystring');
//var request = require('request')

var client_id = 'afce36398bc1443f8f5c5577547bcaf2'; // Your client id
var client_secret = 'a31626817ad54c6ba4849dc593b868b7'; // Your secret
var JSON_RESPONSE_DATA = {
    "Count" : 10,
    "Songs" : [
        {
            "id" : 12345,
            "title" : "I love it",
            "artist" : "Kanye West",
            "votes" : 20,
            "emotion" : "happy"
        },
        {
            "id" : 12345,
            "title" : "I love it",
            "artist" : "Kanye West",
            "votes" : 20,
            "emotion" : "happy"
        },
        {
            "id" : 12345,
            "title" : "I love it",
            "artist" : "Kanye West",
            "votes" : 20,
            "emotion" : "happy"
        },
        {
            "id" : 12345,
            "title" : "I love it",
            "artist" : "Kanye West",
            "votes" : 20,
            "emotion" : "happy"
        },
        {
            "id" : 12345,
            "title" : "I love it",
            "artist" : "Kanye West",
            "votes" : 20,
            "emotion" : "happy"
        },
        {
            "id" : 12345,
            "title" : "I love it",
            "artist" : "Kanye West",
            "votes" : 20,
            "emotion" : "happy"
        },
        {
            "id" : 12345,
            "title" : "I love it",
            "artist" : "Kanye West",
            "votes" : 20,
            "emotion" : "happy"
        },
        {
            "id" : 12345,
            "title" : "I love it",
            "artist" : "Kanye West",
            "votes" : 20,
            "emotion" : "happy"
        },
        {
            "id" : 12345,
            "title" : "I love it",
            "artist" : "Kanye West",
            "votes" : 20,
            "emotion" : "happy"
        },
        {
            "id" : 12345,
            "title" : "I love it",
            "artist" : "Kanye West",
            "votes" : 20,
            "emotion" : "happy"
        }
    ]
}


exports.handler = (event, context, callback) => {
    console.log("GET EVENT PATH: " + event.path)
    if(event.path == "/gtmsongs/search") {
        handleSearch(event, callback)
    } else if(event.path == "/gtmsongs/post") {
        //handlePost(event, callback)
    } else if(event.path == "/gtmsongs/topCharts") {
        handleTopCharts(event, callback)
    } else {
        console.log("UNHANDLED EVENT PATH: " + event.path)
    }
};


function handleSearch(event, callback) {
    var data = querystring.parse(event.body);
    var token = data.token
    var searchQuery = data.search

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
                console.log("found spotifyToken: " + data["Items"][0].spotifyInfo.access_token.S)
                checkIfValid(data["Items"][0].spotifyInfo, function(access_token) {
                    var options = {
                      url: "https://api.spotify.com/v1/search?q=" + searchQuery + "&type=track&market=US&limit=10",
                      headers: {
                        'User-Agent': 'request'
                      }
                    };

                    function callback(error, response, body) {
                      if (!error && response.statusCode == 200) {
                        var info = JSON.parse(body);
                        console.log(info.stargazers_count + " Stars");
                        console.log(info.forks_count + " Forks");
                      }
                    }

                    //request.get(options, callback);
                    //request.get("https://api.spotify.com/v1/search?q=mala%20mia&type=track&market=US&limit=1")
                })
                response = {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin" : "*",
                        'Content-Type' : 'text/html'
                    },
                    body: "12345" //songID
                };
                callback(null, response);
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


function checkIfValid(spotifyInfo, callback) {
    if (Date.now() > parseInt(spotifyInfo.expiresAt.N)) {

    }
}

function handleTopCharts(event, callback) {
    console.log("HANDLE TOP CHARTS")
    var response = {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin" : "*",
            'Content-Type' : 'text/html'
        },
        body: JSON.stringify(JSON_RESPONSE_DATA)
    };
    callback(null, response);
}
