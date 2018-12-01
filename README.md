# Musical-Artifact
Team 8123's Junior Design project

[Test Site](https://thanhanle.github.io/Musical-Artifact/index.html)


V 0.2.0
- Fully setup Login page
- Ability to create an account on the web application
- Ability for user to log into their account

V 0.4.0
- Ability for a user to link their spotify account to their web application
- Ability for user to add a song onto the website
- Ability for user to add an emotion along with a song
- Ability to view a list of all uploaded songs 
V 0.6.0
- Ability to play songs from the website
- Users can vote on songs from the website
- Ability to filter music based on genre
V 0.8.0
- Ability to add a song from the website onto your personal spotify
- Web application will create a new spotify playlist to populate with songs
- Ability to sort songs by popularity
V 1.0.0
- Ability to see what other users are listening to based on the user’s preference 
- Suggests similar songs to the user




Install Guide


Pre-requisites:
- Amazon Web Services Account
- Spotify Developer account (premium recommended)
- Github account (optional)


Dependent libraries that must be installed:
As our code runs entirely on HTML and Javascript there are no dependant libraries that need to be installed.



Download instructions:
Download the github repository here:
https://github.com/thanhanle/Musical-Artifact






Installation of actual application:
1. Host the website


2. In order to set up the AWS API, you first need to create three lambda functions GTMSongs, GTMPlay, and GTMLogin. Functions related to songs, such as posting songs, upvoting songs, and putting an emotion on the songs will be in the GTMSongs lambda. Functions related to logging into the website will be in GTMLogin lambda. Functions related to playing the songs to preview before upvoting will be in GTMPlay lambda. 

Next, in the DynamoDB part of AWS, you need to create three tables, userPosts, topChart, and musicUsers, make sure these are named exactly as we typed them. userPosts include data about what exactly the user posts: SongID, Artists, Emotion. topChart includes data about the top 100 charts of the whole list. musicUsers include data about the users of the website such as their username, hashed password, access token, etc… 

API gateway needs to define every endpoint on the API that Buzzy Beats use. This requires you to create a new API and for every resource, link it to the proper lambda function. For GTMLogin, you will need /getuserinfo, /linkspotify, /login, and /register. Point all of these to the GTMLogin lambda function. For GTMSongs, you will need /addToPlaylist, /post, /search, /topCharts. For GTMPlay you will need /accesstoken and /play. Make sure you deploy the API after these changes. Now you should be able to access the API by going to the endpoint + /GTMLogin/login and so on.


3. Setup Spotify
	Open developer.spotify.com and navigate to the Dashboard. You will need to create a new Client ID. Enter the information for Buzzy Beats. Once you have a Client ID, click to show the Client Secret. Save these two values.
	Go back into the lambda functions and where you see client_id and client_secret at the top of every file, replace that value with your own client id and secret. Do this for every file in every Lambda function. While you are here, check to see if the lambda functions are connected to the API gateway.

4. Hosting the website files.
	The website runs on pages of HTML with JavaScript embedded. You will need to go into the HTML and change the APIADDRESS at the top of each page. You will then need to upload the files to a website hosting service. This could be either AWS S3 with their static hosting websites or Github Pages. For S3, create a new bucket and then upload all files in the repository. After that, go in to properties and then enable static website hosting. The endpoint listed will now be your website.  For Github, just create a new repository, upload the files and enable Github Pages in the settings. Grab the address of the website either from S3 or Github and save it. You will need to connect the domain you are using and point it to this address. If you choose not to use a domain, yo can still access all functionality from this address.
	Take either the domain or address or however you plan on hosting the website and go back to the Spotify dashboard. Click Edit Settings and fill in the website address. You will also need to put the address in the redirect uri. This should be the website address + /streaming.html. Such as “https://www.buzzybeats/streaming.html”. Click save and the website should be able to play from Spotify and authenticate users.




Run instructions:
	There is no specific instruction to run this software, because it’s simply a url to the login page. Just visit the location where the website is hosted, register an account, link your spotify, and start posting songs!

Troubleshooting:
- If the API responds with Missing Authentication Token, you need to make sure the API Gateway is linked to the Lambda function correctly and you hit deploy on the API.
- If the response is Internal Server Error, check the logs for the where the lambda is crashing. This might be with the way you set up the Database or Spotify may be failing.
- If you login and get immediately redirected to login, login again. This is because you were previously logged into another system and unfortunately our system doesn’t allow you to be logged into two places at once due to Spotify’s playback restrictions.
- If website is loading slow, increase the read capacity units. It should be fine with the default, but as the website becomes popular it may start to cost money.
