import React, { useEffect, useRef, useState } from "react"

import * as recorder from "./esrecorder"
import { useTranslation } from "react-i18next"

export const LevelMeter = () => {
    const HEIGHT = 15
    const WIDTH = 250
    const STROKE_WIDTH = 2
    const RADIUS = 3

    const RECT_ATTRIBUTES = {
        x: STROKE_WIDTH,
        y: STROKE_WIDTH,
        width: WIDTH - STROKE_WIDTH * 2,
        height: HEIGHT - STROKE_WIDTH * 2,
        rx: RADIUS,
    }

    const [width, setWidth] = useState(0)

    useEffect(() => {
        const draw = () => {
            const dbMin = -36
            const db = Math.max(dbMin, 20 * Math.log10(recorder.meterVal))
            const val = (db - dbMin) / (-dbMin)
            const rVal = Math.max(0, (1 - val * 1.3))
            setWidth((WIDTH - STROKE_WIDTH * 2) * rVal)
            handle = requestAnimationFrame(draw)
        }
        let handle = requestAnimationFrame(draw)
        return () => cancelAnimationFrame(handle)
    }, [])

    return <svg width={WIDTH} height={HEIGHT}>
        <linearGradient id="meter-gradient">
            <stop offset="10%" stopColor="red" />
            <stop offset="40%" stopColor="yellow" />
            <stop offset="100%" stopColor="#00ff00" />
        </linearGradient>
        <rect {...RECT_ATTRIBUTES} fill="url(#meter-gradient)" style={{ stroke: "gray", strokeWidth: STROKE_WIDTH }} />
        <rect {...RECT_ATTRIBUTES} width={width} className="level-meter-bar" />
    </svg>
}

const BEAT_POSITIONS = {
    0: "topright",
    1: "bottomright",
    2: "bottomleft",
    3: "topleft",
} as { [key: number]: string }

// RecordingCountdown component to show remaining recording time
const RecordingCountdown = ({ isActive, onTimeUp }: { isActive: boolean, onTimeUp: () => void }) => {
    const [remainingSeconds, setRemainingSeconds] = useState(30)
    const [isFlashing, setIsFlashing] = useState(false)
    
    useEffect(() => {
        let interval: number | null = null
        
        if (isActive) {
            // Reset countdown when starting recording
            setRemainingSeconds(30)
            setIsFlashing(false)
            
            // Start interval to update countdown every 100ms
            interval = window.setInterval(() => {
                setRemainingSeconds(prev => {
                    // Update flashing state when 10 seconds or less remain
                    if (prev <= 10) {
                        setIsFlashing(true)
                    }
                    
                    // Check if countdown is about to reach zero (at 0.3 seconds)
                    if (prev <= 0.3) {
                        if (interval) clearInterval(interval)
                        onTimeUp() // Stop recording just before reaching zero
                        return 0
                    }
                    return prev - 0.1
                })
            }, 100) as unknown as number
        } else if (interval) {
            // Clear interval when not recording
            clearInterval(interval)
            setRemainingSeconds(30)
            setIsFlashing(false)
        }
        
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [isActive, onTimeUp])
    
    // Format seconds as mm:ss
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        const ms = Math.floor((seconds % 1) * 10)
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`
    }
    
    if (!isActive) return null
    
    // Add flashing effect class when 10 seconds or less remain
    const flashingClass = isFlashing ? "animate-pulse bg-red-100 text-red-600" : "text-black"
    
    return (
        <div className={`recording-countdown text-center font-mono font-bold ${flashingClass}`} style={{padding: '0 10px'}}>
            {formatTime(remainingSeconds)}
        </div>
    )
}

export const Metronome = ({ beat, hasBuffer, useMetro, startRecording }: { beat: number, hasBuffer: boolean, useMetro: boolean, startRecording: () => void }) => {
    const [state, setState] = useState("")
    const measure = Math.floor(beat / 4) + 1
    const { t } = useTranslation()

    if (hasBuffer) {
        if (state === "record") {
            setState("")
        }
    }

    // Handle timer completion
    const handleTimeUp = () => {
        recorder.stopRecording()
        setState("")
    }

    const IndicatorButton = () => {
        if (state === "record") {
            if (useMetro) {
                return measure > 0 ? <span className="text-5xl">{measure}</span> : <span className="font-bold">{t("soundUploader.record.getReady")}</span>
            } else {
                return <i className="cursor-pointer text-3xl icon icon-recording blink recording" onClick={() => { recorder.stopRecording(); setState("") }} />
            }
        } else if (state === "preview") {
            return <i className="cursor-pointer text-3xl block icon icon-stop2" onClick={() => { recorder.stopPreview(); setState("") }} />
        } else if (hasBuffer) {
            return <i className="cursor-pointer text-3xl block icon icon-play4" onClick={() => { recorder.startPreview(() => setState("")); setState("preview") }} />
        } else {
            return <i className="cursor-pointer text-3xl icon icon-recording" onClick={() => { startRecording(); setState("record") }} />
        }
    }

    return <div className="flex items-center">
        <div className="text-center z-10" style={{ marginLeft: "10px", width: "60px" }}><IndicatorButton /></div>
        <div className={"fixed counter-meter " + (useMetro ? BEAT_POSITIONS[((beat % 4) + 4) % 4] : "hide-metronome")} />
        {/* Show countdown when recording is active */}
        <RecordingCountdown isActive={state === "record"} onTimeUp={handleTimeUp} />
    </div>
}

const WIDTH = 420
const HEIGHT = 80
const SPACING = 3
const BAR_WIDTH = 1
const NUM_BARS = Math.round(WIDTH / SPACING)

function drawWaveform(context: CanvasRenderingContext2D, buf: Float32Array, amp: number) {
    const step = Math.ceil(buf.length / WIDTH)
    context.clearRect(0, 0, WIDTH, HEIGHT)
    context.fillStyle = "gray"

    for (let i = 0; i < WIDTH; i++) {
        let max = -1.0
        let min = 1.0

        for (let j = 0; j < step; j++) {
            const sample = buf[i * step + j]
            if (sample < min) {
                min = sample
            }
            if (sample > max) {
                max = sample
            }
        }
        context.fillRect(i, (min + 1) * amp, 1, Math.max(1, (max - min) * amp))
    }
}

const drawSpectrogram = (context: CanvasRenderingContext2D) => {
    const freqByteData = new Uint8Array(recorder.analyserNode!.frequencyBinCount)
    recorder.analyserNode!.getByteFrequencyData(freqByteData)

    context.clearRect(0, 0, WIDTH, HEIGHT)
    context.fillStyle = "#f6d565"
    context.lineCap = "round"
    const multiplier = recorder.analyserNode!.frequencyBinCount / NUM_BARS

    // Draw rectangle for each frequency bin.
    for (let i = 0; i < NUM_BARS; i++) {
        let magnitude = 0
        const offset = Math.floor(i * multiplier)
        // gotta sum/average the block, or we miss narrow-bandwidth spikes
        for (let j = 0; j < multiplier; j++) {
            magnitude += freqByteData[offset + j]
        }
        magnitude = magnitude / multiplier
        context.fillStyle = `hsl(${Math.round((i * 360) / NUM_BARS)}, 100%, 50%)`
        context.fillRect(i * SPACING, HEIGHT * 3 / 2, BAR_WIDTH, -magnitude * 3 / 5)
    }
}

export const Waveform = ({ buffer }: { buffer: AudioBuffer | null }) => {
    const canvas = useRef<HTMLCanvasElement>(null)
    const handle = useRef<number>(0)

    useEffect(() => {
        if (!canvas.current) return
        const context = canvas.current!.getContext("2d")!
        if (buffer) {
            cancelAnimationFrame(handle.current)
            handle.current = 0
            drawWaveform(context, buffer.getChannelData(0), HEIGHT / 2)
        } else if (!handle.current) {
            context.clearRect(0, 0, WIDTH, HEIGHT)
            const loop = () => {
                drawSpectrogram(context)
                handle.current = requestAnimationFrame(loop)
            }
            loop()
        }
    }, [buffer])

    return <canvas ref={canvas} width={WIDTH} height={HEIGHT}></canvas>
}
