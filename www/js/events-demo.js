/*
 This demo shows how to collect the raw microphone data, create AudioBufferSourceNodes from it and play them using the
 Web Audio API.
 */

var audioContext, micGainNode, filterNode, // Web Audio API
    captureCfg = null, // Capture configuration object
    audioDataQueue = [], // Audio queue
    concatenateMaxChunks = 10, // How many data buffer chunks should be joined before playing them

    timerGetNextAudio, timerInterVal, // Info/Debug timers
    totalReceivedData = 0, // Info/Debug received data
    totalPlayedData = 0; // Info/Debug played data


/**
 * Called continuously while AudioInput capture is running.
 *
 * @param evt
 */
function onAudioInputCapture(evt) {
    try {
        if (evt && evt.data) {
            totalReceivedData += evt.data.length;
            audioDataQueue.push(evt.data); // Push the data to the audio queue (array)
        }
    }
    catch (ex) {
        alert("onAudioInputCapture ex: " + ex);
    }
}


/**
 * Called when a plugin error happens.
 *
 * @param error
 */
function onAudioInputError(error) {
    alert("onAudioInputError event recieved: " + JSON.stringify(error));
}


/**
 * Creates the Web Audio Context and audio nodes for output.
 */
var initWebAudio = function () {
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new window.AudioContext();
        consoleMessage("Web Audio Context is ready");
    }
    catch (e) {
        consoleMessage('Web Audio API is not supported in this browser: ' + e);
        return false;
    }

    // Create a filter to avoid too much feedback.
    filterNode = audioContext.createBiquadFilter();
    filterNode.frequency.setValueAtTime(2048, audioContext.currentTime);

    // Create a gain node.
    micGainNode = audioContext.createGain();

    // Connect the node chain to the speakers.
    filterNode.connect(micGainNode);
    micGainNode.connect(audioContext.destination);

    return true;
};


/**
 * Consume data from the audioinput queue and play it with the playAudio method.
 */
var getNextToPlay = function () {
    var duration = 50;

    // Check if there is any data in the queue
    if (audioDataQueue && audioDataQueue.length > 0) {

        // Concatenate up to concatenateMaxChunks data buffers from the queue
        var concatenatedData = [];
        for (var i = 0; i < concatenateMaxChunks; i++) {
            if (audioDataQueue.length === 0) {
                break;
            }
            concatenatedData = concatenatedData.concat(audioDataQueue.shift());
        }

        // Play the audio and get the duration
        duration = playAudio(concatenatedData) * 1000;
    }

    // Still capturing? Then call myself to continue consuming incoming data.
    if (window.audioinput && window.audioinput.isCapturing()) {
        timerGetNextAudio = setTimeout(getNextToPlay, duration);
    }
};


/**
 * Play audio from raw data using the Web Audio API
 *
 * @param data
 */
var playAudio = function (data) {
    try {
        // Create an audio buffer to hold the data
        var audioBuffer = audioContext.createBuffer(window.audioinput.getCfg().channels,
            (data.length / window.audioinput.getCfg().channels), window.audioinput.getCfg().sampleRate);

        // Initialize the audio buffer with the data
        if (captureCfg.channels > 1) { // For multiple channels (stereo) we expect that the data is interleaved.
            for (var i = 0; i < window.audioinput.getCfg().channels; i++) {
                var chdata = [],
                    index = 0;

                while (index < data.length) {
                    chdata.push(data[index + i]);
                    index += parseInt(window.audioinput.getCfg().channels);
                }

                audioBuffer.getChannelData(i).set(chdata);
            }
        }
        else { // For just one channels (mono), which is most common.
            audioBuffer.getChannelData(0).set(data);
        }

        // Create a buffer source based on the audio buffer.
        var source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        // Connect the buffer source before playing.
        source.connect(filterNode);

        // Play the audio immediately.
        source.start(0);

        totalPlayedData += data.length; // Increase the debug counter for played data.

        return audioBuffer.duration; // Return the duration of the sound so that we can play the next sound when ended.
    }
    catch (e) {
        alert("playAudio exception: " + e);
        return 50;
    }
};


/**
 * Start capturing audio.
 */
var startCapture = function () {
    try {
        if (window.audioinput && !window.audioinput.isCapturing()) {

            // Get the audio capture configuration from the UI element.
            //
            var audioSourceElement = document.getElementById("audioSource"),
                audioSourceType = audioSourceElement.options[audioSourceElement.selectedIndex].value;

            captureCfg = {
                audioSourceType: parseInt(audioSourceType)
            };

            // See utils.js
            getMicrophonePermission(function () {
                consoleMessage("Microphone input starting...");
                window.audioinput.start(captureCfg);
                consoleMessage("Microphone input started!");

                // Start the Interval that outputs time and debug data while capturing
                timerInterVal = createStatusTimer(); // See utils.js

                getNextToPlay(); // Start the audio queue consumer

                disableStartButton(); // Disable the start button
            }, function (deniedMsg) {
                consoleMessage(deniedMsg);
            }, function (errorMsg) {
                consoleMessage(errorMsg);
            });
        }
    }
    catch (ex) {
        alert("startCapture exception: " + ex);
    }
};


/**
 * Stop the audio capture.
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

            audioDataQueue = [];
            totalReceivedData = 0;
            totalPlayedData = 0;

            document.getElementById("infoTimer").innerHTML = "";
            consoleMessage("Stopped");

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
    var cordovaFound = false,
        pluginFound = false;

    if (window.cordova) cordovaFound = true;
    if (window.audioinput) pluginFound = true;

    if (cordovaFound && pluginFound) {
        consoleMessage("Cordova and Plugin found...");

        initUIEvents();

        if (initWebAudio()) {
            consoleMessage("Use 'Start Capture' to begin...");
        }

        // Subscribe to audioinput events
        //
        window.addEventListener('audioinput', onAudioInputCapture, false);
        window.addEventListener('audioinputerror', onAudioInputError, false);
    }
    else {
        consoleMessage("Error, couldn't find all dependencies: cordova (" + cordovaFound + "), audioinput (" + pluginFound + ")!");
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
