import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { useSelector } from "react-redux"
import axios from "axios";

import * as app from "../app/appState"
import * as scriptsState from "../browser/scriptsState"
import store from "../reducers"
import { ModalFooter, ModalHeader, ModalBody, Alert } from "../Utils"
import { set } from "lodash";

export function validateScriptName(name: string, extension: string, qrCodeNum: string = "", firstName: string = "") {
    const scriptName = qrCodeNum + "_" + firstName.toLowerCase() + extension
    const scripts = scriptsState.selectRegularScripts(store.getState())

    if (scriptName.length < 3) {
        throw new Error("messages:general.shortname")
    } else if (/[$-/:-?{-~!"^#`[\]\\]/g.test(qrCodeNum + name)) {
        // Why are hyphens banned from script names?
        throw new Error("messages:idecontroller.illegalname")
    } else if (Object.values(scripts).some(script => !script.soft_delete && script.name.toLocaleUpperCase() === scriptName.toLocaleUpperCase())) {
        // Conflict with existing non-deleted script.
        throw new Error("messages:idecontroller.overwrite")
    } else if (Object.values(scripts).some(script => script.soft_delete && script.name.toLocaleUpperCase() === scriptName.toLocaleUpperCase())) {
        // Conflict with existing deleted script.
        throw new Error("messages:idecontroller.overwriteDeleted")
    } else if (![".py", ".js"].includes(extension)) {
        throw new Error("messages:idecontroller.illegalname")
    } else {
        // Valid name.
        return scriptName
    }
}

export const ScriptCreator = ({ close }: { close: (value?: any) => void }) => {
    const language = useSelector(app.selectScriptLanguage)
    const [error, setError] = useState("")
    const [extension, setExtension] = useState(language === "python" ? ".py" : ".js")
    const { t } = useTranslation()

    const [qrCodeNum, setQrCodeNum] = useState("")
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    
    const confirm = () => {
        try {
            close(validateScriptName("", extension, qrCodeNum, firstName))
        } catch (error) {
            setError(error.message)
        }
    }

    async function registerSong(qrCodeNum: string, firstName: string, lastName: string, email: string ): Promise<void> {
        const prServerDir = "remoodle.fun/nsf-stem-day/canciones/"
        const mp3Url = prServerDir + qrCodeNum + ".mp3"
        const scriptName = qrCodeNum + "_" + firstName.toLowerCase() + extension
        
        try {
            // After deployment, change the URL to the production server
            const response = await axios.post("http://localhost:8081/api/registry", { "qrCodeNum": qrCodeNum, "firstName": firstName, "lastName": lastName, "email": email, "scriptName": scriptName, "mp3Url": mp3Url })
            console.log(JSON.stringify(response.data))
        } catch (error) {
            console.error(error)
        }
    }

    return <>
        <ModalHeader>{t("scriptCreator.title")}</ModalHeader>
        <form onSubmit={e => { e.preventDefault(); registerSong(qrCodeNum, firstName, lastName, email); confirm() }}>
            <ModalBody>
                <Alert message={t(error)}></Alert>
                <div className="flex flex-col max-w-md mx-auto">
                    {/* QR Code Number Field */}
                    <div className="mb-4">
                        <label className="block mb-2" htmlFor="qrCodeNum">
                            {t("scriptCreator.qrCodeNum")}
                        </label>
                        <div className="relative">
                            <input 
                                className="form-input w-full dark:bg-transparent placeholder:text-gray-300" 
                                autoFocus 
                                autoComplete="off"
                                name={t("scriptCreator.qrCodeNum")} 
                                id="qrCodeNum" 
                                placeholder={t("scriptCreator.qrCodeNum.placeholder")}
                                title={t("scriptCreator.qrCodeNum")} 
                                aria-label={t("scriptCreator.qrCodeNum")}
                                value={qrCodeNum} 
                                onChange={e => setQrCodeNum(e.target.value)} 
                            />
                        </div>
                    </div>
                    
                    {/* First Name Field */}
                    <div className="mb-4">
                        <label className="block mb-2" htmlFor="firstName">
                            {t("scriptCreator.firstName")}
                        </label>
                        <div className="relative">
                            <input 
                                className="form-input w-full dark:bg-transparent placeholder:text-gray-300" 
                                autoComplete="off"
                                name={t("scriptCreator.firstName")} 
                                id="firstName" 
                                placeholder={t("scriptCreator.firstName.placeholder")}
                                title={t("scriptCreator.firstName")} 
                                aria-label={t("scriptCreator.firstName")}
                                value={firstName} 
                                onChange={e => setFirstName(e.target.value)} 
                            />
                        </div>
                    </div>
                    
                    {/* Last Name Field */}
                    <div className="mb-4">
                        <label className="block mb-2" htmlFor="lastName">
                            {t("scriptCreator.lastName")}
                        </label>
                        <div className="relative">
                            <input 
                                className="form-input w-full dark:bg-transparent placeholder:text-gray-300" 
                                autoComplete="off"
                                name={t("scriptCreator.lastName")} 
                                id="lastName" 
                                placeholder={t("scriptCreator.lastName.placeholder")}
                                title={t("scriptCreator.lastName")} 
                                aria-label={t("scriptCreator.lastName")}
                                value={lastName} 
                                onChange={e => setLastName(e.target.value)} 
                            />
                        </div>
                    </div>
                    
                    {/* Email Field */}
                    <div className="mb-4">
                        <label className="block mb-2" htmlFor="email">
                            {t("scriptCreator.email")}
                        </label>
                        <div className="relative">
                            <input 
                                className="form-input w-full dark:bg-transparent placeholder:text-gray-300" 
                                autoComplete="off"
                                name={t("scriptCreator.email")} 
                                id="email" 
                                placeholder={t("scriptCreator.email.placeholder")}
                                title={t("scriptCreator.email")} 
                                aria-label={t("scriptCreator.email")}
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                            />
                        </div>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter submit="create" close={close} />
        </form>
    </>
}
