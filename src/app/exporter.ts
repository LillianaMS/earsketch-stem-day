// Export a script as text, audio file, or zip full of audio files.
// Also supports printing scripts and uploading to SoundCloud (which is perplexing because we have another moduled named "uploader").
import i18n from "i18next"

import type { DAWData, Script } from "common"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import * as renderer from "../audio/renderer"
import * as runner from "./runner"
import { openModal } from "./modal"
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

        // Show progress modal
        let closeProgressModal: () => void = () => {}

        try {
            await new Promise<void>((resolve) => {
                openModal(UploadProgress, {
                    fileName: mp3FileName,
                    progress: 0
                }).then(result => {
                    if (typeof result === 'function') {
                        closeProgressModal = result
                    } else {
                        closeProgressModal = () => {}
                    }
                    resolve()
                })
            })

            const qrCodeNum = qrCodeFromScriptName

            // First prepare the sharing information to ensure shareid is valid
            if (!script.shareid) {
                esconsole("Missing share ID", ["error", "exporter"])
                closeProgressModal()
                await openModal(UploadError, {
                    fileName: mp3FileName,
                    errorMessage: "Missing share ID. Please run your script before submitting."
                })
                throw new Error("Missing share ID")
            }

            const earsketchBaseUrl = "https://earsketch.gatech.edu/earsketch2"
            const shareUrl = earsketchBaseUrl + "/?sharing=" + script.shareid

            // First check if the QR code exists in the database (this will fail early if QR code is invalid)
            const checkQRResponse = await fetch(`${STEM_API_ROUTE}/check-qrcode-exists/${qrCodeNum}`)
            if (!checkQRResponse.ok) {
                closeProgressModal()
                const errorData = await checkQRResponse.json()
                esconsole(`QR code check failed: ${errorData.message}`, ["error", "exporter"])
                await openModal(UploadError, {
                    fileName: mp3FileName,
                    errorMessage: errorData.message || `QR code ${qrCodeNum} not found in database`
                })
                throw new Error(`QR code check failed: ${errorData.message}`)
            }

            const qrCodeData = await checkQRResponse.json()
            if (!qrCodeData.exists) {
                closeProgressModal()
                esconsole(`QR code ${qrCodeNum} not found in database`, ["error", "exporter"])
                await openModal(UploadError, {
                    fileName: mp3FileName,
                    errorMessage: `QR code ${qrCodeNum} not found in database. Please check your script name.`
                })
                throw new Error(`QR code ${qrCodeNum} not found in database`)
            }

            // Add shareID and shareUrl to the FormData
            formData.append('shareID', script.shareid)
            formData.append('shareUrl', shareUrl)

            // Send the file and sharing information to the server in a single request
            // This uses our new combined endpoint that handles both file upload and share update in a single transaction
            const response = await fetch(`${STEM_API_ROUTE}/upload-song-with-sharing`, {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                closeProgressModal()
                const errorText = await response.text()
                esconsole(`Server error: ${errorText}`, ["error", "exporter"])
                await openModal(UploadError, {
                    fileName: mp3FileName,
                    errorMessage: `Server error: ${errorText || `Status ${response.status}`}`
                })
                throw new Error(`Server responded with status: ${response.status}`)
            }

            const data = await response.json()

            if (!data.success) {
                closeProgressModal()
                esconsole(`Upload error: ${data.message}`, ["error", "exporter"])
                await openModal(UploadError, {
                    fileName: mp3FileName,
                    errorMessage: data.message || 'Unknown error occurred during upload'
                })
                throw new Error(data.message || 'Unknown error occurred during upload')
            }

            // If we get here, both the MP3 upload and sharing information update were successful
            esconsole(`File uploaded and share details updated for QR code ${qrCodeNum}`, ["debug", "exporter"])

            // Close the progress modal here, after all operations are complete
            closeProgressModal()

            // Show success modal only if everything succeeded
            await openModal(UploadSuccess, { fileName: mp3FileName })

            esconsole(`MP3 file uploaded successfully: ${data.mp3Url}`, ["debug", "exporter"])
            return data.mp3Url
        } catch (uploadError) {
            // Ensure progress modal is closed in case of error
            closeProgressModal()
            throw uploadError
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
