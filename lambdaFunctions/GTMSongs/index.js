const AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB();
var querystring = require('querystring');
var request = require('request')

var handleSearch = require("./handleSearch").handleSearch
var handlePost = require("./handlePost").handlePost
var handleTopCharts = require("./handleTopCharts").handleTopCharts

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
