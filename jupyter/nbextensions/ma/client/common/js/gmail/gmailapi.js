/**
 * Gmailapi Module is a wrapper around specific Google Mail REST APIs.
 * Following methods and variables are being exported
 * {Function} init
 * {Function} authorize
 * {Function} send_mail
 *
 * For a full specification of the Google Drive REST API's please visit https://developers.google.com/drive/v2/reference/
 * @module gmailapi
 * @author Michael Schneider
 */


define(
    [
        "require",
        "exports",
        'jquery',
        'base/js/utils'
    ],
    function (require, exports, $, utils) {

        /**
         * CLIENT_ID. This is the client ID defined in the Google API console
         * which enables REST calls from this domain.
         *
         * @property CLIENT_ID
         * @type {String}
         */
        //var CLIENT_ID = '776637753772-e63kc1c3hpr0vfec424jg1sp44p6fgnm.apps.googleusercontent.com';
        //var CLIENT_ID = '763546234320-uvcktfp0udklafjqv00qjgivpjh0t33p.apps.googleusercontent.com';
        var CLIENT_ID = '441602793354-rrf7pg9pgkkluno912ogcoe9p5vv1r6a.apps.googleusercontent.com';
//var CLIENT_ID='947462799796-s2tcrcipd9bil8olmb4ma5fvnbp1qvts.apps.googleusercontent.com';

        /**
         * SCOPES. Google scopes where the authentication token can be used.
         * We use it in our project the complete Google Drive scope.
         *
         * @property SCOPES
         * @type {Array}
         */
        var SCOPES = [
            'https://www.googleapis.com/auth/gmail.send'
            // Add other scopes needed by your application.
        ];


        /**
         * Helper method for doing recursive polling at a certain interval
         * until the condition is met.
         * @method methodName
         * @param {Function} condition A function which defines the condition until the polling will made.
         * @param {Integer} interval Interval which defines how long to wait until to check the condition again.
         * @return {Promise} Returns a Promise object
         */
        var poll = function (condition, interval) {
            return new Promise(function (resolve, reject) {
                var polling_function = function () {
                    if (condition()) {
                        resolve();
                    }
                    else {
                        setTimeout(polling_function, interval);
                    }
                };
                polling_function();
            });
        };

        /**
         * Method for loading Google javascript client script.
         * Function is defined asynchronous as a Promise. It loads the google script and then checks
         * every 100ms of the script was loaded and the gapi.client variable is present.
         * @return {Promise} Returns a Promise object
         */
        var load_gscript = function () {
            console.log('Loading GMail Script');
            return Promise.resolve($.getScript('https://apis.google.com/js/client.js')).then(function () {
                // poll every 100ms until window.gapi and gapi.client exist.
                return poll(function () {
                    return !!(window.gapi && gapi.client);
                }, 100);
            }, function (err) {
                console.log(err);
            });
        };

        /**
         * Method for loading Google GMail client.
         * @return {Promise} Returns a Promise object
         */
        var load_gm_client = function () {
            return new Promise(function (resolve, reject) {
                console.log('Loading Google GMail Client');
                gapi.client.load('gmail', 'v1', resolve('Google Gmail API loaded'));
            });
        };

        /**
         * Method for authorizing the Google Gmail client.
         * This method authorises the user against the Google for the defined scopes.
         * If user hasn't given its permission yet for the defined scopes, a popup
         * will ask the user for permission to access the content in his Google Drive.
         * @return {Promise} Returns a Promise object
         */
        exports.authorize = function () {
            return new Promise(function (resolve, reject) {
                console.log('Authorizing for Google GMail');
                gapi.auth.authorize({'client_id': CLIENT_ID, 'scope': SCOPES.join(' '), 'immediate': true}).then(
                    resolve,
                    function (err) {
                        console.log('Trying again authorizing for Google GMail');
                        gapi.auth.authorize({'client_id': CLIENT_ID, 'scope': SCOPES.join(' '), 'immediate': false}, resolve);
                    }
                );
            });

        };


        /**
         * Helper method to load the Google script first, if succeeded will load the Google Drive client
         */

        var load_gmapi = load_gscript().then(load_gm_client);


        /** Heper method which can be called externally which first loads the Google script and client,
         * then performs authorization and sets the current user information.
         * @exports {init}
         * @return {Promise} Returns a Promise object
         */
        exports.init = Promise.all([load_gmapi]).then(exports.authorize).then(console.log('setCurrentUser'));

        exports.send_mail = function (recipient, subject, message) {
            return new Promise(function (resolve, reject) {
                var email = 'To: '+recipient+'\r\n' +
                    'Subject: '+subject+'\r\n';
                email += "\r\n" + message;
                var sendRequest = gapi.client.gmail.users.messages.send({
                    'userId': 'me',
                    'resource': {
                        'raw': window.btoa(email).replace(/\+/g, '-').replace(/\//g, '_')
                    }
                });
                sendRequest.execute(function (result) {
                    if (!result.error && result.id) {
                        console.log('Mail sent.');
                        resolve(result.id);
                    }
                    else {
                        reject(result.error);
                    }
                });
            });
        };
    });
