'use strict';
const functions = require('firebase-functions');


// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
  //  response.send(request.query);
  //console.log(request.query);

  admin.database().ref('/followers/' + (request.query.id)).push(request.query.fId).then(snapshot => {
    // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
    response.send("done");
  });


});


exports.sendNotification = functions.https.onRequest((req, res) => {

  admin.database().ref('/test').push(req.query.userId).then(snapshot => {
    // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
    res.send("success")
  });

});



exports.sendWelcomeEmail = functions.auth.user().onCreate(event => {

  const user = event.data; // The Firebase user.
  const email = user.email; // The email of the user.
  var displayName = user.displayName; // The display name of the user
  const uId = user.uid;

  if (!displayName) {
    displayName = email.split("@")[0];
  }
  return admin.database().ref(`/users/${uId}`).set({
    "email": email,
    "name": displayName
  });

});


exports.sendNote = functions.database.ref('/test/{some}/').onWrite(event => {

  if (!event.data.val()) {
    return console.log("some error happened");
  }
  console.log("hurray hhhhhhhhh");

  var userId = event.data.val();




  return admin.database().ref(`/users/${userId}/notificationTokens`).once('value')
    .then(tokensSnapshot => {

      // Notification details.
      /*const payload = {
        notification: {
          title: 'You have a new follower!',
          body: `hi baby love you `
        }
      };*/
      const payload = {
        data: {
          name: "mohan",
          job: "love"
        }
      };

      // Listing all tokens.
      const tokens = tokensSnapshot.val();

      const keysOfTokens = Object.keys(tokens);
      var vals = Object.keys(tokens).map(function(key) {
        return tokens[key];
      });

      //res.send(tokens);

      // Send notifications to all tokens.
      return admin.messaging().sendToDevice(vals, payload).then(response => {
        // For each message check if there was an error.
        // res.send("done "+response.results);
        const tokensToRemove = [];
        response.results.forEach((result, index) => {
          const error = result.error;
          if (error) {
            console.log("first ", result);
            console.log("second ", keysOfTokens[index], " index is ", index);
            console.error('Failure sending notification to', keysOfTokens[index], error);
            // Cleanup the tokens who are not registered anymore.
            if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
              tokensToRemove.push(tokensSnapshot.ref.child(keysOfTokens[index]).remove());
            }
          }
        });
        return Promise.all(tokensToRemove);
      });
    });
});




exports.listen = functions.database.ref('/followers/{followedUid}/{followerUid}').onWrite(event => {
  const followerUid = event.params.followerUid;
  const followedUid = event.params.followedUid;
  // If un-follow we exit the function.
  console.log('executed ', followedUid, ' other ', followerUid);
  if (!event.data.val()) {
    return console.log('User ', followerUid, 'un-followed user', followedUid);
  }

  const followerName = admin.database().ref(`/followers/${followedUid}/${followerUid}`).once('value').then(results => {
    console.log("got this one ", results.val());

  });
  return followerName;
});
