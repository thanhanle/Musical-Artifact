var deviceID
var paused = false
var spotifyPlayer = null
currentid = null

window.onSpotifyWebPlaybackSDKReady = () => {
    getAccessToken(function(err, accesstoken) {
        if(!err && accesstoken) {
            const token = accesstoken
            const player = new Spotify.Player({
                name: 'Buzzy Beats',
                getOAuthToken: cb => { cb(token); }
            });

            spotifyPlayer = player

            // Error handling
            player.addListener('initialization_error', ({ message }) => { console.error(message); });
            player.addListener('authentication_error', ({ message }) => { console.error(message); });
            player.addListener('account_error', ({ message }) => { console.error(message); });
            player.addListener('playback_error', ({ message }) => { console.error(message); });

            // Playback status updates
            player.addListener('player_state_changed', state => {
                paused = state.paused
                updateModal(state)
                console.log(state);
            });

            // Ready
            player.addListener('ready', ({ device_id }) => {
                deviceID = device_id
                console.log('Ready with Device ID', device_id);
            });

            // Not Ready
            player.addListener('not_ready', ({ device_id }) => {
                console.log('Device ID has gone offline', device_id);
            });

            // Connect to the player!
            player.connect();
        }
    })

};

function getAccessToken(callback) {
    var path = "https://veevveq2j8.execute-api.us-east-1.amazonaws.com/default/GTMPlay/accesstoken"
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            console.log(this.responseText)
            callback(null, this.responseText)
        } else if(this.readyState == 4 && this.status == 404) {
            console.log("failed")
            callback("failed", null)
        }
    };
    xhttp.open("POST", path, true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send("token=" + getCookie("token"));
}
function play(id) {
    console.log(id)
    currentid = id
    var playpath = "https://veevveq2j8.execute-api.us-east-1.amazonaws.com/default/GTMPlay/play"
    var songID = id
    var uri = "spotify:track:" + songID
    if(paused && !id) {
        spotifyPlayer.resume().then(() => {
          console.log('Resumed!');
        });
    } else {
        sendCommand(playpath, uri)
    }
    document.getElementById("playpause").classList.remove("fa-play-circle");
    document.getElementById("playpause").classList.add("fa-pause-circle");

}

function toggle() {
    if(paused) {
        spotifyPlayer.resume().then(() => {
          console.log('Resumed!');
        });
        document.getElementById("playpause").classList.remove("fa-play-circle");
        document.getElementById("playpause").classList.add("fa-pause-circle");

    } else {
        spotifyPlayer.pause().then(() => {
            console.log('Paused!');
        });
        document.getElementById("playpause").classList.remove("fa-pause-circle");
        document.getElementById("playpause").classList.add("fa-play-circle");
    }
}

function pause() {
    spotifyPlayer.pause().then(() => {
        console.log('Paused!');
    });
}

function next() {
    for (var i=0; i< dataByVotes.length; i++) {
        if(dataByVotes[i].id == currentid) {
            if(dataByVotes[i+1] != null) {
                play(dataByVotes[i+1].id)
            }
            i = dataByVotes.length
        }
    }
}

function previous() {
    for (var i=0; i< dataByVotes.length; i++) {
        if(dataByVotes[i].id == currentid) {
            if(dataByVotes[i-1] != null) {
                play(dataByVotes[i-1].id)
            }
            i = dataByVotes.length
        }
    }
}

function status() {
    spotifyPlayer.getCurrentState().then(state => {
        if (!state) {
            console.error('User is not playing music through the Web Playback SDK');
            return;
        }
        var nextTracks = []
        for (var i = 0; i < data.Count; i++) {
            var newTrack = { uri: "spotify:track:" + data.Songs[i].id }
            nextTracks.push(newTrack)
        }
        var {
            next_tracks: nextTracks,
        } = state.track_window;

        console.log(state.track_window);
    });
}

function sendCommand(path, uri) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            console.log("sent")
            console.log(this.responseText)
        } else if(this.readyState == 4 && this.status == 404) {
            console.log("failed")
        }
    };
    xhttp.open("POST", path, true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send("token=" + getCookie("token") + "&deviceID=" + deviceID+ "&uri=" + uri);
}
