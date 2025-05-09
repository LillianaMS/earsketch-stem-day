import React from "react"
import { useTranslation } from "react-i18next"
import { ModalBody, ModalFooter, ModalHeader } from "../Utils"

export const NetworkErrorModal = ({ close }: { close: () => void }) => {
    const { t } = useTranslation()
    
    return <div>
        <ModalHeader>{t("networkError.header")}</ModalHeader>
        <ModalBody>
            <div className="flex flex-col items-center">
                <div className="text-6xl mb-4 text-red-500">
                    <i className="icon icon-connection"></i>
                </div>
                <p className="text-center text-lg mb-4">
                    {t("networkError.message")}
                </p>
                <p className="text-center">
                    {t("networkError.instruction")}
                </p>
            </div>
        </ModalBody>
        <ModalFooter close={close} />
    </div>
}