/*
 This demo lets the audioinput plugin decode the raw microphone data, and connects the plugin object to the
 Web Audio API AudioContext.destination in order to play it to the speakers.
 */

var filterNode;


/**
 * Called when a plugin error happens.
 */
function onAudioInputError(error) {
    alert("audioinputerror event recieved: " + JSON.stringify(error));
}


/**
 * Start capturing audio.
 */
var startCapture = function () {
    try {
        if (window.audioinput && !window.audioinput.isCapturing()) {
            getMicrophonePermission(function () { // See utils.js
                // Connect the audioinput to the speaker(s) in order to hear the captured sound.
                // We're using a filter here to avoid too much feedback looping...
                // Start with default values and let the plugin handle conversion from raw data to web audio.

                consoleMessage("Microphone input starting...");
                window.audioinput.start({
                    streamToWebAudio: true
                });
                consoleMessage("Microphone input started!");

                // Create a filter to avoid too much feedback
                filterNode = audioinput.getAudioContext().createBiquadFilter();
                filterNode.frequency.setValueAtTime(2048, audioinput.getAudioContext().currentTime);

                audioinput.connect(filterNode);
                filterNode.connect(audioinput.getAudioContext().destination);

                consoleMessage("Capturing audio!");

                disableStartButton();
            }, function (deniedMsg) {
                consoleMessage(deniedMsg);
            }, function (errorMsg) {
                consoleMessage(errorMsg);
            });
        }
        else {
            alert("Already capturing!");
        }
    }
    catch (ex) {
        alert("startCapture exception: " + ex);
    }
};


/**
 * Stop capturing audio.
 */
var stopCapture = function () {

    if (window.audioinput && window.audioinput.isCapturing()) {
        window.audioinput.stop();
        if (filterNode) filterNode.disconnect();
        window.audioinput.disconnect();
        disableStopButton();
    }

    consoleMessage("Stopped!");
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
