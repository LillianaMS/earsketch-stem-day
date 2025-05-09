// Fetch audio and metadata from the EarSketch library.
import ctx from "../audio/context"
import { SoundEntity } from "common"
import esconsole from "../esconsole"
import { openModal } from "./modal"
import { NetworkErrorModal } from "./NetworkErrorModal"

export type Sound = SoundEntity & { buffer: AudioBuffer }

export const cache = {
    // We cache promises (rather than results) so we don't launch a second request while waiting on the first request.
    standardSounds: null as Promise<{ sounds: SoundEntity[], folders: string[] }> | null,
    promises: Object.create(null) as { [key: string]: Promise<Sound> },
}

// Helper function to show network error modal for slow internet
function showNetworkErrorModal() {
    // Show this only once per session to avoid annoying multiple popups
    if (!window.networkErrorShown) {
        window.networkErrorShown = true
        openModal(NetworkErrorModal)
    }
}

// Get an audio buffer from a file key.
//   filekey: The constant associated with the audio clip that users type in EarSketch code.
//   tempo: Tempo to scale the returned clip to.
export function getSound(filekey: string) {
    // Cache hit. A request for this sound is already in-progress/complete.
    const promiseFromCache = cache.promises[filekey]
    if (promiseFromCache) return promiseFromCache

    // Cache miss. Store promise immediately to prevent new duplicate requests.
    const promise = _getSound(filekey)
    cache.promises[filekey] = promise

    return promise.catch(error => {
        // Request failed. Remove from cache so future requests can try again.
        delete cache.promises[filekey]

        // If it's a network error, show the modal but don't crash the app
        if (error.message && (error.message.includes("NetworkError") || error.name === "TypeError")) {
            showNetworkErrorModal()
            // Return an empty sound object or null to prevent the app from crashing
            return null
        }

        // For other errors, rethrow
        throw error
    })
}

async function _getSound(name: string) {
    esconsole("Loading audio: " + name, ["debug", "audiolibrary"])
    const url = URL_DOMAIN + "/audio/sample?" + new URLSearchParams({ name })

    // STEP 1: check if sound exists
    // TODO: Sample download includes clip verification on server side, so probably we can skip the first part.
    let result
    try {
        result = await getMetadata(name)
    } catch (err) {
        esconsole("Error getting sound: " + name, ["error", "audiolibrary"])
        showNetworkErrorModal()
        return null
    }
    if (result === null) {
        esconsole(`Sound ${name} does not exist`, ["error", "audiolibrary"])
        return null
    }

    // Server uses -1 to indicate no tempo; for type-safety, we remap this to undefined.
    if (result.tempo === -1) {
        result.tempo = undefined
    }

    // STEP 2: Ask the server for the audio file
    esconsole(`Getting ${name} buffer from server`, ["debug", "audiolibrary"])
    let data: ArrayBuffer
    try {
        data = await (await fetch(url)).arrayBuffer()
    } catch (err) {
        esconsole("Error getting " + name + " from the server", ["error", "audiolibrary"])
        const status = err.status
        if (status <= 0 || err.name === "TypeError") {
            // Show network error modal for slow internet
            showNetworkErrorModal()
            // Return null rather than throwing an error
            return null
        } else if (status >= 500 && status < 600) {
            esconsole(`ServerError: Could not retrieve sound file ${name} due to server error`, ["error", "audiolibrary"])
            return null
        } else {
            esconsole(`Error: ${err.message}`, ["error", "audiolibrary"])
            return null
        }
    }

    // Need to do this before decodeAudioData() call, as that 'detaches' the ArrayBuffer.
    const bytes = new Uint8Array(data)
    // Check for MP3 file signatures.
    const isMP3 = (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || (bytes[0] === 0xff || bytes[1] === 0xfb)

    // STEP 3: decode the audio data.
    esconsole(`Decoding ${name} buffer`, ["debug", "audiolibrary"])
    let buffer: AudioBuffer
    try {
        // Using decodeAudioData's newer promise-based syntax (requires Safari 14.1+)
        // See https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData#browser_compatibility
        buffer = await ctx.decodeAudioData(data)
    } catch (err) {
        esconsole("Error decoding audio: " + name, ["error", "audiolibrary"])
        throw err
    }
    esconsole(name + " buffer decoded", ["debug", "audiolibrary"])

    if (isMP3) {
        // MP3-specific offset fix
        const fixed = new Float32Array(buffer.length)
        // Offset chosen based on https://lame.sourceforge.io/tech-FAQ.txt
        buffer.copyFromChannel(fixed, 0, 1057)
        buffer.copyToChannel(fixed, 0)
    }

    // STEP 4: Return the sound metadata and decoded audio buffer.
    esconsole("Returning sound", ["debug", "audiolibrary"])
    return { ...result, buffer }
}

export function clearCache() {
    esconsole("Clearing the cache", ["debug", "audiolibrary"])
    cache.standardSounds = null
    cache.promises = {} // this might be overkill, but otherwise deleted / renamed sound cache is still accessible
}

export function getStandardSounds() {
    // Cache hit. A request for this data is already in-progress/complete.
    const promiseFromCache = cache.standardSounds
    if (promiseFromCache) return promiseFromCache

    // Cache miss. Store promise immediately to prevent new duplicate requests.
    const promise = _getStandardSounds()
    cache.standardSounds = promise

    return promise.catch(error => {
        // Request failed. Remove from cache so future requests can try again.
        cache.standardSounds = null

        // If it's a network error, show the modal but don't crash the app
        if (error.message && (error.message.includes("NetworkError") || error.name === "TypeError")) {
            showNetworkErrorModal()
            // Return empty sounds and folders to prevent the app from crashing
            return { sounds: [], folders: [] }
        }

        // For other errors, rethrow
        throw error
    })
}

async function _getStandardSounds() {
    esconsole("Fetching standard sound metadata", ["debug", "audiolibrary"])
    try {
        const sounds: SoundEntity[] = await (await fetch(URL_DOMAIN + "/audio/standard")).json()
        const folders = [...new Set(sounds.map(entity => entity.folder))]
        esconsole(`Fetched ${Object.keys(sounds).length} sounds in ${folders.length} folders`, ["debug", "audiolibrary"])
        return { sounds, folders }
    } catch (err) {
        esconsole("Error fetching standard sounds: " + err, ["error", "audiolibrary"])
        const status = err.status
        if (status <= 0 || err.name === "TypeError") {
            // Show network error modal for slow internet
            showNetworkErrorModal()
            // Return empty data instead of throwing an error
            return { sounds: [], folders: [] }
        } else if (status >= 500 && status < 600) {
            esconsole(`ServerError: Could not retrieve sound library due to server error`, ["error", "audiolibrary"])
            return { sounds: [], folders: [] }
        } else {
            esconsole(`Error: ${err.message}`, ["error", "audiolibrary"])
            return { sounds: [], folders: [] }
        }
    }
}

export async function getMetadata(name: string) {
    esconsole("Verifying the presence of audio clip for " + name, ["debug", "audiolibrary"])
    const url = URL_DOMAIN + "/audio/metadata?" + new URLSearchParams({ name })
    try {
        const response = await fetch(url)
        const text = await response.text()
        if (!text) {
            // Server returns 200 OK + empty string for invalid keys, which breaks JSON parsing.
            // TODO: Server should return a more reasonable response. (Either an HTTP error code or a valid JSON object such as `null`.)
            return null
        }
        const data: SoundEntity = JSON.parse(text)
        return "name" in data ? data : null
    } catch (err) {
        esconsole("Error fetching metadata for " + name, ["error", "audiolibrary"])
        const status = err.status
        if (status <= 0 || err.name === "TypeError") {
            // Show network error modal for slow internet
            showNetworkErrorModal()
            // Return null instead of throwing an error
            return null
        } else if (status >= 500 && status < 600) {
            esconsole(`ServerError: Could not retrieve sound information due to server error`, ["error", "audiolibrary"])
            return null
        } else {
            esconsole(`Error: ${err.message}`, ["error", "audiolibrary"])
            return null
        }
    }
}
