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
        
        <div class="tutorial-section my-8">
            <h2>Paso 1. Modificar sonidos de la canción</h2>
            <div class="video-container my-6">
                <iframe 
                    width="100%" 
                    height="315" 
                    src="https://www.youtube.com/embed/rXzRqzot1uc?si=0zcdSLlIWQVI-Xif" 
                    title="Tutorial de EarSketch" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" 
                    allowfullscreen="true"
                ></iframe>
            </div>
            <p>Resumen del Paso 1:</p>
            <p>Luego de completar el formulario que genera el código para tu canción, puedes:</p>
            
            <ul class="list-disc pl-5 my-4">
                <li>Explorar los sonidos que hay en la biblioteca de EarSketch.</li>
                <li>Modificar los nombres de sonidos dentro de la función fitMedia en el código de tu canción.</li>
                <li>Presionar "EJECUTAR" después de cada modificación para que escuches cómo cambió la canción con la modificación del código.</li>
            </ul>
            
            <p>¡Experimenta con el código y diviértete! Si tienes dudas, habrá un asistente para ayudarte en todo momento.</p>
            <div class="bg-blue-100 dark:bg-gray-700 p-4 rounded-lg my-6">
                <p class="font-bold">Recordatorio:</p>
                <p>¡Cada vez que hagas un cambio en el código, recuerda oprimir el botón de "Ejecutar" para que veas el resultado del cambio inmediatamente y también agarres cualquier error que aparezca en la consola!</p>
            </div>
        </div>
        
        <div class="tutorial-section my-8">
            <h2>Paso 2. Añadir un mensaje de voz para mamá</h2>
            <div class="video-container my-6">
                <iframe 
                    width="100%" 
                    height="315" 
                    src="https://www.youtube.com/embed/ZrCNJpvMpVM?si=BX8Fc0hme4pGUC7s" 
                    title="Tutorial de EarSketch" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" 
                    allowfullscreen="true"
                ></iframe>
            </div>
            <p>Resumen del Paso 2:</p>
            <ul class="list-disc pl-5 my-4">
                <li>En la sección de sonidos hay un botón para "Añadir sonido". Oprime este botón para grabar tu mensaje personalizado para mamá.</li>
                <li>El sonido que grabaste aparecerá en la lista de sonidos de usuario con el mismo nombre de tu canción.</li>
                <li>
                    <p>Para incluir tu grabación en la canción, utiliza la función insertMedia con el nombre de tu grabación como argumento de esta manera:</p>
            <div class="listingblock curriculum-python my-6">
                <div class="content">
                    <pre class="highlight" style="overflow-x: auto; max-width: 100%;">
<code># Añadir mi mensaje de voz en la pista 5, comenzando en el compás 1</code>
<code>insertMedia(nombre_del_archivo, 5, 1)</code></pre>
                </div>
            </div>
                </li>
            </ul>
            
        </div>

        <div class="tutorial-section my-8">
            <h2>Paso 3. Cambiar la duración de la canción</h2>
            <div class="video-container my-6">
                <iframe 
                    width="100%" 
                    height="315" 
                    src="https://www.youtube.com/embed/dr23KqdERuU?si=34gfHoL3bQoJ4q9u" 
                    title="Tutorial de EarSketch" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" 
                    allowfullscreen="true"
                ></iframe>
            </div>
            <p>Resumen del Paso 3:</p>            
            <ul class="list-disc pl-5 my-4">
                <li>Dentro de la variable "fin" (en la línea 7 del código) hay un valor numérico guardado.</li>
                <li>Ese valor numérico define cuánto dura la canción.</li>
                <li>Juega con ese número para modificar la duración de tu canción.</li>
            </ul>
        </div>
        
        <div class="tutorial-section my-8">
            <h2>Paso 4. Revisar y enviar canción</h2>
            <div class="video-container my-6">
                <iframe 
                    width="100%" 
                    height="315" 
                    src="https://www.youtube.com/embed/vG2lEuxT7LU?si=TNbeHm4jEz-LUpA7" 
                    title="Tutorial de EarSketch" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" 
                    allowfullscreen="true"
                ></iframe>
            </div>
            <p>Resumen del Paso 4:</p>            
            <ul class="list-disc pl-5 my-4">
                <li>Escucha una vez más la canción, y si estás list@ para enviarla, haz click en el botón de "Finalizar" en la barra de opciones sobre el editor de código.</li>
                <li>Al enviar la canción, aparecerá un mensaje con un enlace a un corto cuestionario para que nos dejes saber qué te pareció la actividad. Si se cierra esa ventana, aún puedes acceder el enlace <a href="https://qualtricsxmmg4g5wkds.qualtrics.com/jfe/form/SV_0rBGpoYIFrIQMnQ" target="_blank" rel="noopener noreferrer">AQUÍ</a>.</li>
            </ul>
        </div>
        <div class="tutorial-section my-8">
            <h2>¡Felicidades! Has terminado tu canción.</h2>
            <p>Cuando le entregues la tarjeta a mamá, ella podrá escanear el código QR con la cámara del celular y disfrutar de tu regalo musical.</p>
            <p>¡Esperamos que hayas disfrutado de esta experiencia!</p>
            <p>Luego de este evento puedes continuar experimentando con EarSketch. 😎🎵 Prontamente estarás recibiendo un correo electrónico con los enlaces que necesitas para ello.</p>
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