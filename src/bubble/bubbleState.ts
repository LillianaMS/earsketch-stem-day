import { createSlice } from "@reduxjs/toolkit"

import type { RootState } from "../reducers"
import { Language } from "common"

export interface BubbleState {
    active: boolean
    currentPage: number,
    readyToProceed: true,
    language: Language
}

const bubbleSlice = createSlice({
    name: "bubble",
    initialState: {
        active: false,
        currentPage: 0,
        readyToProceed: true,
        language: "python",
    } as BubbleState,
    reducers: {
        reset(state) {
            state.active = false
            state.currentPage = 0
            state.readyToProceed = true
            state.language = "python"
        },
        resume(state) { state.active = true },
        suspend(state) { state.active = false },
        increment(state) { state.currentPage++ },
        setReady(state, { payload }) { state.readyToProceed = payload },
        setLanguage(state, { payload }) { state.language = payload },
    },
})

export default bubbleSlice.reducer
export const { reset, resume, suspend, increment, setReady, setLanguage } = bubbleSlice.actions

export const selectActive = (state: RootState) => state.bubble.active
export const selectCurrentPage = (state: RootState) => state.bubble.currentPage
export const selectReadyToProceed = (state: RootState) => state.bubble.readyToProceed
