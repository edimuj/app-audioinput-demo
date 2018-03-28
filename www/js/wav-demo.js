/*
 This demo shows how to collect the raw microphone data, encode it into WAV format and then use the resulting blob
 as src for a HTML Audio element. No Web Audio API support is needed for this to work.
 */

// Capture configuration object
var captureCfg = {};

// Audio Buffer
var audioDataBuffer = [];

// Timer
var timerInterVal;

var objectURL = null;

// Info/Debug
var totalReceivedData = 0;

// URL shim
window.URL = window.URL || window.webkitURL;


/**
 * Called continuously while AudioInput capture is running.
 */
function onAudioInputCapture(evt) {
    try {
        if (evt && evt.data) {
            // Increase the debug counter for received data
            totalReceivedData += evt.data.length;

            // Add the chunk to the buffer
            audioDataBuffer = audioDataBuffer.concat(evt.data);
        }
        else {
            alert("Unknown audioinput event: " + JSON.stringify(evt));
        }
    }
    catch (ex) {
        alert("onAudioInputCapture ex: " + ex);
    }
}


/**
 * Called when a plugin error happens.
 */
function onAudioInputError(error) {
    alert("onAudioInputError event recieved: " + JSON.stringify(error));
}


/**
 * Start capturing audio.
 */
var startCapture = function () {
    try {
        if (window.audioinput && !window.audioinput.isCapturing()) {
            var audioSourceElement = document.getElementById("audioSource"),
                audioSourceType = audioSourceElement.options[audioSourceElement.selectedIndex].value;

            // Get the audio capture configuration from the UI elements
            //
            captureCfg = {
                audioSourceType: parseInt(audioSourceType)
            };

            // See utils.js
            getMicrophonePermission(function () {
                consoleMessage("Microphone input starting...");
                window.audioinput.start(captureCfg);
                consoleMessage("Microphone input started!");

                // Throw previously created audio
                document.getElementById("recording-list").innerHTML = "";
                if (objectURL) {
                    URL.revokeObjectURL(objectURL);
                }

                // Start the Interval that outputs time and debug data while capturing
                timerInterVal = createStatusTimer(); // See utils.js

                disableStartButton();
            }, function (deniedMsg) {
                consoleMessage(deniedMsg);
            }, function (errorMsg) {
                consoleMessage(errorMsg);
            });
        }
    }
    catch (e) {
        alert("startCapture exception: " + e);
    }
};


/**
 * Stop the capture, encode the captured audio to WAV and show audio element in UI.
 */
var stopCapture = function () {
    try {
        if (window.audioinput && window.audioinput.isCapturing()) {
            if (timerInterVal) {
                clearInterval(timerInterVal);
            }

            if (window.audioinput) {
                window.audioinput.stop();
            }

            totalReceivedData = 0;
            document.getElementById("infoTimer").innerHTML = "";

            consoleMessage("Encoding WAV...");
            var encoder = new WavAudioEncoder(window.audioinput.getCfg().sampleRate, window.audioinput.getCfg().channels);
            encoder.encode([audioDataBuffer]);

            consoleMessage("Encoding WAV finished");

            var blob = encoder.finish("audio/wav");

            consoleMessage("BLOB created");

            var reader = new FileReader();

            reader.onload = function (evt) {
                var audio = document.createElement("AUDIO");
                audio.controls = true;
                audio.src = evt.target.result;
                audio.type = "audio/wav";
                document.getElementById("recording-list").appendChild(audio);
                consoleMessage("Audio created");
                audioDataBuffer = [];
            };

            consoleMessage("Loading from BLOB");
            reader.readAsDataURL(blob);

            disableStopButton();
        }
    }
    catch (e) {
        alert("stopCapture exception: " + e);
    }
};


/**
 * Initialize UI listeners.
 */
var initUIEvents = function () {
    document.getElementById("startCapture").addEventListener("click", startCapture);
    document.getElementById("stopCapture").addEventListener("click", stopCapture);
};


/**
 * When cordova fires the deviceready event, we initialize everything needed for audio input.
 */
var onDeviceReady = function () {
    if (window.cordova && window.audioinput) {
        initUIEvents();

        // Subscribe to audioinput events
        //
        window.addEventListener('audioinput', onAudioInputCapture, false);
        window.addEventListener('audioinputerror', onAudioInputError, false);

        consoleMessage("Use 'Start Capture' to begin...");
    }
    else {
        consoleMessage("cordova-plugin-audioinput not found!");
        disableAllButtons();
    }
};


// Make it possible to run the demo on desktop.
if (!window.cordova) {
    console.log("Running on desktop!");
    onDeviceReady();
}
else {
    // For Cordova apps
    console.log("Running on device!");
    document.addEventListener('deviceready', onDeviceReady, false);
}
