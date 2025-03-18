import React, { useEffect, useRef } from "react"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"

import * as appState from "../app/appState"
import { Collapsed } from "./Utils"
import * as ESUtils from "../esutils"
import * as layout from "../ide/layoutState"
import * as userNotification from "../user/notification"
import { useTranslation } from "react-i18next"

export const TitleBar = () => {
    const dispatch = useDispatch()
    const { t } = useTranslation()

    return (
        <div className="flex items-center p-2">
            <div className="ltr:pl-2 ltr:pr-4 rtl:pl-4 rtl:pr-3 font-semibold truncate">
                <h2>TUTORIAL</h2>
            </div>
            <div>
                <button
                    className="flex justify-end w-7 h-4 p-0.5 rounded-full cursor-pointer bg-black dark:bg-gray-700"
                    onClick={() => dispatch(layout.setEast({ open: false }))}
                    title={t("curriculum.close")}
                    aria-label={t("curriculum.close")}
                >
                    <div className="w-3 h-3 bg-white rounded-full">&nbsp;</div>
                </button>
            </div>
        </div>
    )
}

const TutorialContent = () => {
    const tutorialContent = `
    <div class="section-container">
        <h1>Cómo usar EarSketch para crear tu canción</h1>
        <p>¡Preparemos una canción para incluir en la tarjeta del Día de las Madres!</p>
        <p>Sigue los siguentes pasos para crear tu canción:</p>
        <div class="tutorial-section mb-8">
            <h2>1. Ver el tutorial en video</h2>
            <p>Primero, ve este corto tutorial para que te familiarices con EarSketch y con el código que vas a estar trabajando.</p>
            
            <div class="video-container my-6">
                <iframe 
                    width="100%" 
                    height="315" 
                    src="https://www.youtube.com/embed/9mmUgjucuKo" 
                    title="Tutorial de EarSketch" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" 
                    allowfullscreen="true"
                ></iframe>
            </div>
        </div>
        
        <div class="tutorial-section my-8">
            <h2>2. Crea un archivo para tu canción</h2>
            <p>Haz click en el botón para crear una nueva canción.</p>
            <p>Al llenar los campos del formulario para crear la canción, utiliza el número de código QR de la tarjeta del Día de las Madres que se te entregó.</p>
            <p>Es importante que el número sea exactamente igual que el de tu tarjeta. ¡Este número será el ID para tu producto final!</p>
        </div>
        
        <div class="tutorial-section my-8">
            <h2>3. Modifica la canción provista</h2>
            <p>Ahora que ya tienes un archivo creado para tu canción, puedes:</p>
            
            <ul class="list-disc pl-5 my-4">
                <li>Oprimir el botón de "Play" para escuchar la canción que resulta del código en el editor de texto</li>
                <li>Modificar el valor de la variable para cambiar la duración de los sonidos ya incluidos</li>
                <li>Invocar a la función fitMedia para añadir más sonidos a la canción</li>
                <li>Modificar el valor de la función setTempo para cambiar el tempo de la canción</li>
            </ul>
            
            <p>¡Experimenta con el código y diviértete! Si tienes dudas, habrá un asistente para ayudarte en todo momento.</p>
        </div>
        
        <div class="tutorial-section my-8">
            <h2>4. ¿Quieres personalizar tu canción más?</h2>
            <p>¡Añade un mensaje de voz para que la recipiente de esta tarjeta musical se emocione más!</p>
            <p>En la sección de sonidos hay un botón para "Añadir sonido". Oprime este botón y en el menú de opciones de la nueva ventana, escoge "GRABACIÓN RÁPIDA". 
               Tan pronto termines de grabar un mensaje que te guste, oprime el botón de "CARGAR".</p>
               <p>El sonido que grabaste aparecerá en la lista de sonidos de usuario con el mismo nombre de tu canción.</p>
               <p>Para incluir tu grabación en la canción, utiliza la función fitMedia con el nombre de tu grabación como argumento de esta manera:</p>
            
            <div class="listingblock curriculum-python my-6">
                <div class="content">
                    <pre class="highlight" style="overflow-x: auto; max-width: 100%;">
<code># Añadir mi mensaje de voz en la pista 4, del compás 3 al 5</code>
<code>fitMedia(nombre_del_archivo, 4, 3, 6)</code></pre>
                </div>
            </div>
        </div>
        
        <div class="tutorial-section my-8 pb-10">
            <h2>5. Enviar la canción finalizada</h2>
            <p>Ahora que ya terminaste tu canción, puedes guardarla en la página del evento para que esté disponible para escuchar a través del código QR.</p>
            <p>Cuando estés list@ para enviar tu canción, haz click en el botón de "Finalizar" en la barra de opciones sobre el editor de texto.</p>
            
            <p>¡Felicidades! Has terminado tu canción. Cuando le entregues la tarjeta a mamá, ella podrá escanear el código QR con la cámara del celular y disfrutar de tu creación musical.</p>

            <p>Luego de este evento también puedes continuar experimentando con EarSketch. Prontamente estarás recibiendo un correo electrónico con los enlaces que necesitas para ello.</p>
            
            <div class="bg-blue-100 dark:bg-gray-700 p-4 rounded-lg my-6">
                <p class="font-bold">Tip:</p>
                <p>¡Cada vez que hagas un cambio en el código, recuerda oprimir el botón de "Ejecutar" para que veas el resultado del cambio inmediatamente y también agarres cualquier error que aparezca en la consola!</p>
            </div>
        </div>
    </div>
    `

    const content = document.createElement('div')
    content.innerHTML = tutorialContent
    return content
}

const TutorialPane = () => {
    const { t } = useTranslation()
    const language = useSelector(appState.selectScriptLanguage)
    const currentLocale = useSelector(appState.selectLocale)
    const fontSize = useSelector(appState.selectFontSize)
    const theme = useSelector(appState.selectColorTheme)
    const paneIsOpen = useSelector(layout.isEastOpen)
    const tutorialContent = TutorialContent()
    const tutorialBody = useRef<HTMLElement>(null)

    useEffect(() => {
        if (tutorialContent && tutorialBody.current) {
            tutorialBody.current.appendChild(tutorialContent)
            tutorialBody.current.scrollTop = 0
            return () => tutorialContent.remove()
        }
    }, [tutorialContent, paneIsOpen])

    return paneIsOpen
        ? (
            <div dir={currentLocale.direction} className={`font-sans h-full flex flex-col bg-white text-black dark:bg-gray-900 dark:text-white ${currentLocale.direction === "rtl" ? "curriculum-rtl" : ""}`}>
                <div id="tutorial-header" style={{ position: "relative" }}>
                    <TitleBar />
                </div>

                <div id="tutorial" className={`${theme === "light" ? "curriculum-light" : "dark"} flex-grow overflow-hidden`} style={{ fontSize }}>
                    <article 
                        ref={tutorialBody} 
                        id="tutorial-body" 
                        className="prose dark:prose-dark px-5 h-full max-w-none overflow-y-auto overflow-x-hidden" 
                        style={{ fontSize, height: "100%", overflowY: "auto", overflowX: "hidden", width: "100%" }} 
                    />
                </div>
            </div>
        )
        : <Collapsed title="TUTORIAL" position="east" />
}

export const Curriculum = () => {
    const dispatch = useDispatch()

    useEffect(() => {
        // Open the tutorial pane by default
        dispatch(layout.setEast({ open: true }))
    }, [])

    return <TutorialPane />
}