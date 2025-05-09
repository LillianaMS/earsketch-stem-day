// Export a script as text, audio file, or zip full of audio files.
// Also supports printing scripts and uploading to SoundCloud (which is perplexing because we have another moduled named "uploader").
import i18n from "i18next"

import type { DAWData, Script } from "common"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import * as renderer from "../audio/renderer"
import * as runner from "./runner"
import { openModal } from "./modal"
import * as appState from "./appState"
import store from "../reducers"
import { FinalizarConfirm, OverwriteConfirm, UploadProgress, UploadSuccess, UploadError } from "./FinalizarModal"
import { ScriptCreator, STEM_API_ROUTE } from "./ScriptCreator"

// Make a dummy anchor for downloading blobs.
const dummyAnchor = document.createElement("a")
document.body.appendChild(dummyAnchor)
dummyAnchor.style.display = "none"


export function download(name: string, blob: Blob) {
    const url = window.URL.createObjectURL(blob)
    dummyAnchor.href = url
    dummyAnchor.download = name
    dummyAnchor.target = "_blank"
    esconsole("File location: " + url, ["debug", "exporter"])
    dummyAnchor.click()
}

// Export the script as a text file.
export function text(script: Script) {
    esconsole("Downloading script locally.", ["debug", "exporter"])
    const blob = new Blob([script.source_code], { type: "text/plain" })
    download(script.name, blob)
}

async function compile(script: Script) {
    let result
    try {
        result = await runner.run(ESUtils.parseLanguage(script.name), script.source_code)
    } catch {
        throw i18n.t("messages:download.compileerror")
    }
    if (result.length === 0) {
        throw i18n.t("messages:download.emptyerror")
    }
    return result
}

// Exports the script as an audio file.
async function exportAudio(script: Script, type: string, render: (result: DAWData) => Promise<Blob>, shouldDownload = true) {
    const name = ESUtils.parseName(script.name)
    const result = await compile(script)
    try {
        const blob = await render(result)
        esconsole(`Ready to process ${type} file.`, ["debug", "exporter"])
        // Only download if shouldDownload is true
        if (shouldDownload) {
            download(`${name}.${type}`, blob)
        }
        return blob // Return the blob for further use
    } catch (err) {
        esconsole(err, ["error", "exporter"])
        throw i18n.t("messages:download.rendererror")
    }
}

export function wav(script: Script) {
    return exportAudio(script, "wav", renderer.renderWav)
}

export function mp3(script: Script) {
    return exportAudio(script, "mp3", renderer.renderMp3)
}

// Function to check if a file exists on the server
async function checkFileExists(fileName: string): Promise<boolean> {
    try {
        const response = await fetch(`${STEM_API_ROUTE}/check-file-exists`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fileName })
        })
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`)
        }
        
        const data = await response.json()
        return data.success && data.exists
    } catch (err) {
        esconsole(`Error checking if file exists: ${err}`, ["error", "exporter"])
        return false // Assume file doesn't exist in case of error
    }
}

// Function to upload the MP3 file to the server
export async function uploadMp3ToServer(script: Script) {
    try {
        // Get the filename without extension
        const scriptName = script.name
        // Replace file extension with .mp3
        const qrCodeFromScriptName = scriptName.split('_')[0]
        const mp3FileName = qrCodeFromScriptName + '.mp3'
        
        // Validate QR code
        if (!qrCodeFromScriptName || qrCodeFromScriptName.length === 0) {
            esconsole("Invalid QR code in script name", ["error", "exporter"])
            await openModal(UploadError, {
                fileName: mp3FileName,
                errorMessage: "Invalid QR code in script name. Script name should start with QR code."
            })
            throw new Error("Invalid QR code in script name")
        }

        // First ask for confirmation using FinalizarConfirm
        const confirmSubmit = await openModal(FinalizarConfirm)
        
        if (!confirmSubmit) {
            esconsole("Upload cancelled by user", ["debug", "exporter"])
            throw new Error("Upload cancelled")
        }
        
        // Check if file already exists
        const fileExists = await checkFileExists(mp3FileName)
        
        if (fileExists) {
            // Ask user for confirmation to overwrite using EarSketch modal
            const confirmOverwrite = await openModal(OverwriteConfirm, { fileName: mp3FileName })
            
            if (!confirmOverwrite) {
                esconsole("File upload cancelled by user", ["debug", "exporter"])
                throw new Error("Upload cancelled")
            }
        }
        
        // First generate the MP3 file but don't download it locally
        let blob: Blob
        try {
            blob = await exportAudio(script, "mp3", renderer.renderMp3, false)
        } catch (renderError) {
            esconsole(`Error rendering MP3: ${renderError}`, ["error", "exporter"])
            await openModal(UploadError, {
                fileName: mp3FileName,
                errorMessage: `Error generating MP3 file: ${renderError.message}`
            })
            throw renderError
        }
        
        // Create a new blob with the correct MIME type
        const mp3Blob = new Blob([blob], { type: 'audio/mpeg' })
        
        // Create FormData to send the file
        const formData = new FormData()
        formData.append('mp3File', mp3Blob, mp3FileName)
        
        // Create a reference to store the progress updater function
        let updateProgress: (progress: number) => void = () => {};
        let closeModalFunction: ((payload?: any) => void) | null = null;

        // Create a separate promise that will resolve when we want to close the modal
        const modalShouldClose = new Promise<void>(resolveShouldClose => {
            // Open the progress modal first
            const modalPromise = openModal(UploadProgress, {
                fileName: mp3FileName,
                progress: 0,
                // This close function should only be used for manual closing
                close: () => {
                    esconsole("Modal closed manually by user", ["debug", "exporter"]);
                    resolveShouldClose();
                }
            });

            // Store the close function when it's available
            modalPromise.then(closeFn => {
                closeModalFunction = closeFn;
            });

            // Function to update the progress display
            updateProgress = (progress: number) => {
                // Update modal's progress prop
                store.dispatch(appState.updateModalProps({ progress }));

                // If progress reaches 100%, resolve the promise after a brief delay
                if (progress >= 1.0) {
                    setTimeout(() => {
                        resolveShouldClose();
                    }, 500);
                }
            };

            // Start with initial progress to show movement
            setTimeout(() => updateProgress(0.05), 250);
        });

        try {
            // Validate shareid
            if (!script.shareid) {
                esconsole("Missing share ID", ["error", "exporter"])
                throw new Error("Missing share ID. Please run your script before submitting.")
            }

            const earsketchBaseUrl = "https://earsketch.gatech.edu/earsketch2"
            const shareUrl = earsketchBaseUrl + "/?sharing=" + script.shareid

            // First check if the QR code exists in the database - update progress to 0.1
            updateProgress(0.1);
            const checkQRResponse = await fetch(`${STEM_API_ROUTE}/check-qrcode-exists/${qrCodeFromScriptName}`)
            if (!checkQRResponse.ok) {
                const errorData = await checkQRResponse.json()
                esconsole(`QR code check failed: ${errorData.message}`, ["error", "exporter"])
                throw new Error(errorData.message || `QR code ${qrCodeFromScriptName} not found in database`)
            }

            const qrCodeData = await checkQRResponse.json()
            if (!qrCodeData.exists) {
                esconsole(`QR code ${qrCodeFromScriptName} not found in database`, ["error", "exporter"])
                throw new Error(`QR code ${qrCodeFromScriptName} not found in database. Please check your script name.`)
            }

            // Update progress to 0.25 after QR code validation
            updateProgress(0.25);

            // Add shareID and shareUrl to the FormData
            formData.append('shareID', script.shareid)
            formData.append('shareUrl', shareUrl)

            // Update progress to 0.4 before starting the upload
            updateProgress(0.4);

            // Send the file and sharing information to the server with progress tracking
            const xhr = new XMLHttpRequest();

            // Set up progress tracking
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    // Calculate progress from 0.4 to 0.9 (40% to 90%)
                    const fileProgress = event.loaded / event.total;
                    const totalProgress = 0.4 + (fileProgress * 0.5);
                    updateProgress(totalProgress);
                }
            };

            // Create a promise to handle the XHR
            const uploadPromise = new Promise<any>((resolve, reject) => {
                xhr.open('POST', `${STEM_API_ROUTE}/upload-song-with-sharing`, true);

                xhr.onload = function() {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            resolve(data);
                        } catch (e) {
                            reject(new Error('Invalid JSON response from server'));
                        }
                    } else {
                        reject(new Error(`Server responded with status: ${xhr.status}`));
                    }
                };

                xhr.onerror = function() {
                    reject(new Error('Network error occurred while uploading'));
                };

                xhr.send(formData);
            });

            // Wait for the upload to complete
            const data = await uploadPromise;

            // Update progress to 1.0 (100%) after upload completes
            updateProgress(1.0);

            if (!data.success) {
                esconsole(`Upload error: ${data.message}`, ["error", "exporter"])
                throw new Error(data.message || 'Unknown error occurred during upload')
            }

            // If we got here, both the MP3 upload and sharing information update were successful
            esconsole(`File uploaded and share details updated for QR code ${qrCodeFromScriptName}`, ["debug", "exporter"])

            // We've already set up the progress to 100% and the modalShouldClose promise
            // will automatically resolve after a brief delay, so we just need to wait for it

            // Wait for the signal that we should close the modal
            await modalShouldClose;

            // Close the progress modal programmatically
            if (closeModalFunction) {
                closeModalFunction();
            }

            // Wait a moment before showing success modal to ensure the progress modal is removed
            await new Promise(resolve => setTimeout(resolve, 100));

            // Show success modal
            await openModal(UploadSuccess, { fileName: mp3FileName });

            esconsole(`MP3 file uploaded successfully: ${data.mp3Url}`, ["debug", "exporter"]);
            return data.mp3Url;
        } catch (error) {
            // Wait for modal to be ready to close (if it's not already)
            await modalShouldClose.catch(() => {});

            // Close the progress modal programmatically
            if (closeModalFunction) {
                closeModalFunction();
            }

            // Wait a moment before showing error modal
            await new Promise(resolve => setTimeout(resolve, 100));

            // Show error modal
            await openModal(UploadError, {
                fileName: mp3FileName,
                errorMessage: error.message || 'Unknown error occurred'
            });

            throw error;
        }
    } catch (err) {
        esconsole(`Error uploading MP3 to server: ${err}`, ["error", "exporter"])
        // Don't show error message for user-cancelled uploads
        if (err.message === "Upload cancelled") {
            return null
        }
        throw new Error(i18n.t("messages:upload.error") || 'Error uploading MP3 file')
    }
}

export async function multiTrack(script: Script) {
    const result = await compile(script)
    const name = ESUtils.parseName(script.name)

    const zip = new JSZip()

    // mute all
    for (const track of result.tracks) {
        for (const clip of track.clips) {
            if (clip.gain !== undefined) {
                clip.gain.gain.setValueAtTime(0.0, 0)
            }
        }
    }

    const renderAndZip = async (trackNum: number) => {
        const copy = Object.assign({}, result)
        // Narrow this down to the target track (plus the mix and metronome tracks to avoid breaking things).
        copy.tracks = [result.tracks[0], result.tracks[trackNum], result.tracks[result.tracks.length - 1]]

        let blob
        try {
            blob = await renderer.renderWav(copy)
        } catch (err) {
            esconsole(err, ["error", "exporter"])
            throw i18n.t("messages:download.rendererror")
        }
        zip.file(name + "/" + "track_" + trackNum.toString() + ".wav", blob)
    }

    const promises = []
    for (let i = 1; i < result.tracks.length - 1; i++) {
        promises.push(renderAndZip(i))
    }
    await Promise.all(promises)

    const blob = await zip.generateAsync({ type: "blob" })
    download(`${name}.zip`, blob)
}

// Print the source code.
export function print(script: Script) {
    let content = script.source_code
    const lines = content.split(/\n/)
    const numlines = lines.length
    esconsole(numlines, "debug")
    const pri = (document.getElementById("ifmcontentstoprint") as HTMLIFrameElement).contentWindow!
    pri.document.open()
    pri.document.writeln('<pre style="-moz-tab-size:2; -o-tab-size:2; tab-size:2;">')
    for (let lineNum = 0; lineNum < numlines; lineNum++) {
        content = lines[lineNum]
        esconsole(content, "debug")
        let lineNumStr = (lineNum + 1).toString()
        if (lineNumStr.length === 1) {
            lineNumStr = "  " + lineNumStr
        } else if (lineNumStr.length === 2) {
            lineNumStr = " " + lineNumStr
        }
        pri.document.writeln(lineNumStr + "| " + content)
    }
    pri.document.writeln("</pre>")
    pri.document.close()
    pri.focus()
    pri.print()
}

// Export types for use in the UI
export const EXPORT_TYPES = {
    script: {
        function: text,
        label: "Script Text"
    },
    wav: {
        function: wav,
        label: "WAV Audio"
    },
    mp3: {
        function: mp3,
        label: "MP3 Audio"
    },
    multitrack: {
        function: multiTrack,
        label: "Multitrack ZIP"
    },
    finalizar: {
        function: uploadMp3ToServer,
        label: "Finalizar"
    }
}