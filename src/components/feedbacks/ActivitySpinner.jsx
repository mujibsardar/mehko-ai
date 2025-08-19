import "./ActivitySpinner.scss"
import {useUtils} from "/src/helpers/utils.js"

function ActivitySpinner({activities}) {
    const utils = useUtils()

    const visible = activities.length > 0
    const message = activities.length > 0 ? activities[0].message : null

    return (
        <>
            {visible && (
                <div className={`activity-spinner ${!visible ? "activity-spinner-hidden" : ""}`}>
                    <div className={`activity-spinner-content`}>
                        <img src={utils.resolvePath(`/images/svg/spinner.svg`)}
                             className={`spinner`}
                             alt={`loader`}/>

                        <h6 className={`text-white opacity-75`}>{message}</h6>
                    </div>
                </div>
            )}
        </>
    )
}

export default ActivitySpinner
