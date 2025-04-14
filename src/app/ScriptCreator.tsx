import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useSelector } from "react-redux"
import axios from "axios";

import * as app from "../app/appState"
import * as scriptsState from "../browser/scriptsState"
import store from "../reducers"
import { ModalFooter, ModalHeader, ModalBody, Alert } from "../Utils"
import { set } from "lodash";

// export const STEM_API_ROUTE = "http://localhost:8081/stemday/api"
export const STEM_API_ROUTE = "https://remoodle.fun:8443/stemday/api"

// Global QR code set that will be initialized once when the app loads
export let QR_CODE_SET: Set<string> = new Set<string>();

// Function to load QR code numbers from CSV file and create a Set for validation
export async function loadQRCodeSet(): Promise<Set<string>> {
    try {
        console.log("Attempting to load QR codes from CSV...");
        const response = await fetch('/codes03.csv');
        
        if (!response.ok) {
            console.error(`Failed to load CSV: ${response.status} ${response.statusText}`);
            throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        const lines = text.split('\n');
        
        const qrCodeSet = new Set<string>();
        
        // Skip header if exists and process each line
        for (const line of lines) {
            if (!line.trim()) continue;
            
            // Split by comma and get the second column (QR code)
            const columns = line.split(',');
            if (columns.length >= 2) {
                const qrCode = columns[1].trim();
                if (qrCode) {
                    qrCodeSet.add(qrCode);
                }
            }
        }
        
        console.log(`Successfully loaded ${qrCodeSet.size} QR codes`);
        // Update the global QR code set
        QR_CODE_SET = qrCodeSet;
        return qrCodeSet;
    } catch (error) {
        console.error("Error loading QR codes from CSV:", error);
        // Return empty set on error
        return new Set<string>();
    }
}

// Function to initialize the QR code set - call this when the app loads
export async function initQRCodeSet(): Promise<void> {
    if (QR_CODE_SET.size === 0) {
        console.log("Initializing QR code set...");
        await loadQRCodeSet();
        console.log(`QR code set initialized with ${QR_CODE_SET.size} codes`);
    }
}

// Function to validate if a QR code exists in the set
export function validateQRCode(qrCode: string, qrCodeSet: Set<string> = QR_CODE_SET): boolean {
    return qrCodeSet.has(qrCode);
}

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
    
    // Ensure QR codes are loaded if they haven't been already
    useEffect(() => {
        if (QR_CODE_SET.size === 0) {
            initQRCodeSet();
        }
    }, []);
    
    const confirm = () => {
        try {
            close(validateScriptName("", extension, qrCodeNum, firstName))
        } catch (error) {
            setError(error.message)
        }
    }

    // Function to check if QR code already exists in the database
    async function checkQRCodeExists(qrCodeNum: string): Promise<{ exists: boolean, scriptName?: string }> {
        try {
            const response = await axios.get(`${STEM_API_ROUTE}/check-qrcode-exists/${qrCodeNum}`)
            return response.data
        } catch (error) {
            console.error("Error checking QR code:", error)
            return { exists: false }
        }
    }

    async function registerSong(qrCodeNum: string, firstName: string, lastName: string, email: string ): Promise<boolean> {
        const scriptName = qrCodeNum + "_" + firstName.toLowerCase() + extension
        
        // First validate QR code against our CSV file using the global QR code set
        if (!validateQRCode(qrCodeNum)) {
            setError("qrCodeNotValid")
            return false
        }
        
        // Then check if QR code already exists in the database
        const checkResult = await checkQRCodeExists(qrCodeNum)
        if (checkResult.exists) {
            // QR code already exists, show error
            setError(`qrCodeAlreadyExists:${checkResult.scriptName}`)
            return false
        }
        
        try {
            // Register song details (mp3Url will be added later when file is uploaded)
            const response = await axios.post(`${STEM_API_ROUTE}/registry`, { 
                "qrCodeNum": qrCodeNum, 
                "firstName": firstName, 
                "lastName": lastName, 
                "email": email, 
                "scriptName": scriptName
            })
            console.log(JSON.stringify(response.data))
            return true
        } catch (error) {
            console.error(error)
            setError("general.serverError")
            return false
        }
    }

    return <>
        <ModalHeader>{t("scriptCreator.title")}</ModalHeader>
        <form onSubmit={async e => { 
            e.preventDefault();
            const success = await registerSong(qrCodeNum, firstName, lastName, email);
            if (success) {
                confirm();
            }
        }}>
            <ModalBody>
                {error.startsWith('qrCodeAlreadyExists:') ? (
                    <Alert message={`Este código QR ya existe en la base de datos con el nombre de script: ${error.split(':')[1]}. Por favor, verifica si el código QR y nombre corresponden con los tuyos.`}></Alert>
                ) : error === "qrCodeNotValid" ? (
                    <Alert message={`El código QR ingresado no es válido. Por favor, verifica que has ingresado el código correcto.`}></Alert>
                ) : (
                    <Alert message={t(error)}></Alert>
                )}
                <div className="flex flex-col max-w-md mx-auto">
                    {/* QR Code Number Field */}
                    <div className="mb-4">
                        <label className="block mb-2" htmlFor="qrCodeNum">
                            {t("scriptCreator.qrCodeNum")} <span className="text-sm">(Ingrese letras en MAYÚSCULAS)</span>
                        </label>
                        <div className="relative">
                            <input 
                                className="form-input w-full dark:bg-transparent placeholder:text-gray-300" 
                                autoFocus 
                                autoComplete="off"
                                required
                                name={t("scriptCreator.qrCodeNum")} 
                                id="qrCodeNum" 
                                placeholder={t("scriptCreator.qrCodeNum.placeholder")}
                                title={t("scriptCreator.qrCodeNum")} 
                                aria-label={t("scriptCreator.qrCodeNum")}
                                value={qrCodeNum} 
                                onChange={e => setQrCodeNum(e.target.value.toUpperCase())} 
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
                                required
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
                                required
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
                                required
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
