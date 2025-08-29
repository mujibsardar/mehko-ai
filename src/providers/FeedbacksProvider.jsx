import {createContext, useContext, useEffect, useState} from "react";
import {useData} from "/src/providers/DataProvider.jsx"
import {useUtils} from "/src/helpers/utils.js"

const FeedbacksContext = createContext(null)
export const useFeedbacks = () => useContext(FeedbacksContext)

export const FeedbacksProvider = ({children}) => {
    const utils = useUtils()
    const {getSettings} = useData()
    const settings = getSettings()

    const [spinnerActivities, setSpinnerActivities] = useState([])
    const [animatedCursorEnabled, setAnimatedCursorEnabled] = useState(true)
    const [animatedCursorActive, setAnimatedCursorActive] = useState(true)

    const [displayingNotification, setDisplayingNotification] = useState(null)
    const [displayingYoutubeVideo, setDisplayingYoutubeVideo] = useState(null)
    const [displayingGallery, setDisplayingGallery] = useState(null)
    const [pendingConfirmation, setPendingConfirmation] = useState(null)

    useEffect(() => {
        setAnimatedCursorEnabled(!utils.isTouchDevice() && settings["animatedCursorEnabled"])
    }, [])

    // SPINNER...
    const showActivitySpinner = (activityId, message) => {
        if(spinnerActivities.find(activity => activity.id === activityId))
            return

        const data = { _id: activityId, _message: message }
        setSpinnerActivities(prevActivities => [...prevActivities, data])
    }

    const isShowingSpinner = () => {
        return spinnerActivities.length
    }

    const listSpinnerActivities = () => {
        return spinnerActivities
    }

    const hideActivitySpinner = (activityId) => {
        setSpinnerActivities(prevActivities =>
            prevActivities.filter(activity => activity.id !== activityId)
        )
    }

    // ANIMATED CURSOR...
    const isAnimatedCursorEnabled = () => {
        return animatedCursorEnabled
    }

    const isAnimatedCursorActive = () => {
        return animatedCursorActive
    }

    const toggleAnimatedCursorActive = () => {
        setAnimatedCursorActive(!animatedCursorActive)
    }

    // NOTIFICATIONS...
    const displayNotification = (type, title, message) => {
        setDisplayingNotification({
            _type: type,
            _title: title,
            _message: message
        })
    }

    const killNotification = () => {
        setDisplayingNotification(null)
    }

    // YOUTUBE VIDEOS...
    const displayYoutubeVideo = (url, title, description) => {
        setDisplayingYoutubeVideo({
            _url: url,
            _title: title,
            _description: description
        })
    }

    const hideYoutubeVideo = () => {
        setDisplayingYoutubeVideo(null)
    }

    const showConfirmationDialog = (title, message, cancelButtonLabel, confirmButtonLabel, onConfirm) => {
        setPendingConfirmation({
            _title: title,
            _message: message,
            _cancelButtonLabel: cancelButtonLabel,
            _confirmButtonLabel: confirmButtonLabel,
            _onConfirm: onConfirm
        })
    }

    const hideConfirmationDialog = () => {
        setPendingConfirmation(null)
    }

    // GALLERY...
    const displayGallery = (screenshots, aspectRatio, title, description) => {
        setDisplayingGallery({
            _screenshots: screenshots,
            _aspectRatio: aspectRatio,
            _title: title,
            _description: description
        })
    }

    const hideGallery = () => {
        setDisplayingGallery(null)
    }

    // OTHER METHODS...
    const isModalOpen = () => {
        return isShowingSpinner() || displayingYoutubeVideo || displayingGallery || pendingConfirmation
    }

    return (
        <FeedbacksContext.Provider value={{
            isShowingSpinner,
            listSpinnerActivities,
            showActivitySpinner,
            hideActivitySpinner,

            isAnimatedCursorEnabled,
            isAnimatedCursorActive,
            toggleAnimatedCursorActive,

            displayingNotification,
            displayNotification,
            killNotification,

            displayingYoutubeVideo,
            displayYoutubeVideo,
            hideYoutubeVideo,

            displayingGallery,
            displayGallery,
            hideGallery,

            pendingConfirmation,
            showConfirmationDialog,
            hideConfirmationDialog,

            isModalOpen
        }}>
            {children}
        </FeedbacksContext.Provider>
    )
}