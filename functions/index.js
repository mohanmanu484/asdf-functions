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



exports.createUser = functions.auth.user().onCreate(event => {

  const user = event.data; // The Firebase user.
  const user_email = user.email; // The email of the user.
  const user_name = user.displayName || email.split("@")[0]; // The display name of the user
  const user_id = user.uid;
  const user_profile = user.photoURL || "https://firebasestorage.googleapis.com/v0/b/functions-45d0d.appspot.com/o/default_profile.png?alt=media&token=3ca09698-087c-4e43-ac50-b63e5e30afc7";

  return admin.database().ref(`/users/${user_id}`).set({
    "general": {
      "user_email": user_email,
      "user_name": user_name
    },
    "user_photo_url": user_profile
  });
});

exports.followersCount = functions.database.ref('/followers_v2/{followedId}/{followerId}').onWrite(event => {
  //  const collectionRef = event.data.ref.parent;
  //  const countRef = collectionRef.parent.child('likes_count');
  const followedUid = event.params.followedId;
  const followerUid = event.params.followerId;

  const followerRef = admin.database().ref(`users/${followedUid}/stats`).child("user_followers_count");

  // Return the promise from countRef.transaction() so our function
  // waits for this async event to complete before it exits.



  return followerRef.transaction(current => {
    if (event.data.exists() && !event.data.previous.exists()) {
      return (current || 0) + 1;
    } else if (!event.data.exists() && event.data.previous.exists()) {
      return (current || 0) - 1;
    }
  }).then(() => {
    console.log('Counter updated.');
    if (event.data.exists() && !event.data.previous.exists()) {
      return admin.database().ref(`following/${followerUid}`).set({
        [event.params.followedId]: true
      });
    } else if (!event.data.exists() && event.data.previous.exists()) {
      return admin.database().ref(`following/${followerUid}`).set(null);
    }

  });
});

/////////////////////////// testing

exports.sendFollowerNotification = functions.database.ref('/followers_v2/{followedUid}/{followerUid}').onWrite(event => {
  const followerUid = event.params.followerUid;
  const followedUid = event.params.followedUid;
  // If un-follow we exit the function.
  if (!event.data.val()) {
    return console.log('User ', followerUid, 'un-followed user', followedUid);
  }
  console.log('We have a new follower UID:', followerUid, 'for user:', followerUid);

  // Get the list of device notification tokens.
  const getDeviceTokensPromise = admin.database().ref(`/users/${followedUid}/notificationToken`).once('value');

  // Get the follower profile.
  const getFollowerProfilePromise = admin.auth().getUser(followerUid);

  return Promise.all([getDeviceTokensPromise, getFollowerProfilePromise]).then(results => {
    const tokensSnapshot = results[0];
    const follower = results[1];

    // Check if there are any device tokens.
    if (!tokensSnapshot.hasChildren()) {
      return console.log('There are no notification tokens to send to.');
    }
    console.log('There are', tokensSnapshot.numChildren(), 'tokens to send notifications to.');
    console.log('Fetched follower profile', follower);

    // Notification details.
    const payload = {
      notification: {
        title: 'You have a new follower!',
        body: `${follower.displayName} is now following you.`,
        icon: follower.photoURL
      }
    };

    // Listing all tokens.
    const tokens = Object.keys(tokensSnapshot.val());

    // Send notifications to all tokens.
    return admin.messaging().sendToDevice(tokens, payload).then(response => {
      // For each message check if there was an error.
      const tokensToRemove = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          console.error('Failure sending notification to', tokens[index], error);
          // Cleanup the tokens who are not registered anymore.
          if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
            tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
          }
        }
      });
      return Promise.all(tokensToRemove);
    });
  });
});




///////////////////////////////// testing complete //////////////////////






exports.followers = functions.database.ref("/followers/{followedUid}/{followerId}").onWrite(event => {

  if (!event.data.val()) {
    return console.log("unfollowed haappened");
  }
  const _followedUid = event.params.followedUid;
  const _followerId = event.params.followerId;
  console.log("someone followed  " + _followedUid);
  console.log("folower id is  " + _followerId);

  return admin.database().ref(`followers/${_followedUid}/${_followerId}`).once('value').then(result => {

    const _followerName = result.val();
    console.log(_followerName + ` started following ${_followedUid}`);
    return sendPushNotification(_followedUid, `${_followerName}`);
  });

});


function sendPushNotification(userId, followerId) {

  return admin.database().ref(`/notificationTokens/${userId}/`).once('value')
    .then(tokensSnapshot => {

      const payload = {
        data: {
          name: "mohan",
          job: "love"
        },
        notification: {
          title: 'You have a new follower!',
          body: "someone foolowed you"
        }
      };

      // Listing all tokens.
      const tokens = tokensSnapshot.val();
      console.log("this is test ", tokens);

      const keysOfTokens = Object.keys(tokens);
      var vals = Object.keys(tokens).map(function(key) {
        return tokens[key];
      });
      console.log(vals);

      // Send notifications to all tokens.
      return admin.messaging().sendToDevice(vals, payload).then(response => {
        // For each message check if there was an error.
        // res.send("done "+response.results);
        const tokensToRemove = [];
        response.results.forEach((result, index) => {
          const error = result.error;
          if (error) {
            console.error('Failure sending notification to', keysOfTokens[index], error);
            // Cleanup the tokens who are not registered anymore.
            if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
              tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
            }
          }
        });
        return Promise.all(tokensToRemove);
      });
    });
}







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




/* exports.listen = functions.database.ref('/followers/{followedUid}/{followerUid}').onWrite(event => {
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
}); */
