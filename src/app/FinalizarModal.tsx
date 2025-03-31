import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { ModalHeader, ModalBody, ModalFooter } from "../Utils"

// Confirmation Dialog for overwriting files
export const OverwriteConfirm = ({ 
    fileName, 
    close 
}: { 
    fileName: string, 
    close: (confirmed: boolean) => void 
}) => {
    const { t } = useTranslation()
    
    return <>
        <ModalHeader>{t("confirm")}</ModalHeader>
        <form onSubmit={e => { e.preventDefault(); close(true) }}>
            <ModalBody>
                <p>{t("fileAlreadyExists.message", { fileName })}</p>
                <p>{t("fileAlreadyExists.confirmOverwrite")}</p>
            </ModalBody>
            <ModalFooter 
                submit={t("fileAlreadyExists.overwrite")} 
                cancel={t("cancel")} 
                type="danger" 
                close={() => close(false)} 
            />
        </form>
    </>
}

// Upload Progress Modal
export const UploadProgress = ({ 
    fileName, 
    progress, 
    close 
}: { 
    fileName: string, 
    progress: number,
    close: () => void 
}) => {
    const { t } = useTranslation()
    
    return <>
        <ModalHeader>Uploading {fileName}</ModalHeader>
        <ModalBody>
            <div className="flex items-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] mr-3"></div>
                <p>Uploading your music file to the server...</p>
            </div>
        </ModalBody>
        <ModalFooter progress={progress} />
    </>
}

// Success Modal
export const UploadSuccess = ({ 
    fileName, 
    close 
}: { 
    fileName: string, 
    close: () => void 
}) => {
    return <>
        <ModalHeader>Upload Complete</ModalHeader>
        <ModalBody>
            <div className="flex items-center">
                <div className="text-green-500 text-2xl mr-3">✓</div>
                <p>
                    <strong>{fileName}</strong> has been successfully uploaded to the server.
                </p>
            </div>
        </ModalBody>
        <ModalFooter cancel="Close" close={close} />
    </>
}

// Error Modal
export const UploadError = ({ 
    fileName, 
    errorMessage, 
    close 
}: { 
    fileName: string, 
    errorMessage: string,
    close: () => void 
}) => {
    return <>
        <ModalHeader>Upload Error</ModalHeader>
        <ModalBody>
            <div className="flex items-center">
                <div className="text-red-500 text-2xl mr-3">✗</div>
                <div>
                    <p>
                        <strong>Error uploading {fileName}</strong>
                    </p>
                    <p className="text-sm text-gray-600">
                        {errorMessage}
                    </p>
                </div>
            </div>
        </ModalBody>
        <ModalFooter cancel="Close" close={close} />
    </>
}