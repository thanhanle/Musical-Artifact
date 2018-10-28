const AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB();
var request = require('request')

exports.handleTopCharts = (event, callback) => {
    console.log("HANDLE TOP CHARTS")

    let scanningParameters = {
        TableName:'topChart',
        Limit: 100
    };

    dynamodb.scan(scanningParameters, function(err, data) {
        if (err) {
            callback(new Error('failed'), null);
        }
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
                emotions: data.Items[i].Emotions.M,
                genre: data.Items[i].Genre.S,
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
