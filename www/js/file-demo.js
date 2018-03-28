/*
 This demo shows how to collect the raw microphone data, encode it into WAV format and then save the resulting blob
 to a file using cordova-plugin-file. No Web Audio API support is needed for this to work.
 */

var captureCfg = null, // Capture configuration object
    audioDataBuffer = [], // Audio Buffer
    objectURL = null, // For file URL

    timerInterVal,// Info/Debug timer
    totalReceivedData = 0; // Info/Debug

// URL shim
window.URL = window.URL || window.webkitURL;

/**
 * Called continuously while AudioInput capture is running.
 */
function onAudioInputCapture(evt) {
    try {
        if (evt && evt.data) {

            totalReceivedData += evt.data.length; // Increase the debug counter for received data
            audioDataBuffer = audioDataBuffer.concat(evt.data); // Add the chunk to the buffer
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
 * Stop the capture, encode the captured audio to WAV, save it to a file and show file URL in UI.
 */
var stopCapture = function () {
    try {
        if (window.audioinput && window.audioinput.isCapturing()) {

            if (timerInterVal) {
                clearInterval(timerInterVal);
            }

            if (isMobile.any() && window.audioinput) {
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

            window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (dir) {
                var fileName = new Date().YYYYMMDDHHMMSS() + ".wav";
                dir.getFile(fileName, {create: true}, function (file) {
                    file.createWriter(function (fileWriter) {
                        fileWriter.write(blob);

                        // Add an URL for the file
                        var a = document.createElement('a');
                        var linkText = document.createTextNode(file.toURL());
                        a.appendChild(linkText);
                        a.title = file.toURL();
                        a.href = file.toURL();
                        a.target = '_blank';
                        document.getElementById("recording-list").appendChild(a);

                        consoleMessage("File created!");
                    }, function () {
                        alert("FileWriter error!");
                    });
                });
            });

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

    if (window.cordova && window.cordova.file && window.audioinput) {

        initUIEvents();

        consoleMessage("Use 'Start Capture' to begin...");

        // Subscribe to audioinput events
        //
        window.addEventListener('audioinput', onAudioInputCapture, false);
        window.addEventListener('audioinputerror', onAudioInputError, false);
    }
    else {
        consoleMessage("Missing: cordova-plugin-file or cordova-plugin-audioinput!");
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
