import "./Portfolio.scss"
import {useEffect, useState} from 'react'
import {useGlobalState} from "/src/providers/GlobalStateProvider.jsx"
import {useUtils} from "/src/helpers/utils.js"

function Portfolio() {
    const {getActiveSection, setFixedNavigationEnabled} = useGlobalState()
    const [isFirstPage, setIsFirstPage] = useState(true)
    const utils = useUtils()

    useEffect(() => {
        if(utils.isTouchDevice() && utils.isAndroid()) {
            utils.addClassToBody('body-android')
        }
    }, [])

    /** Force scroll to top every time the active section changes... **/
    useEffect(() => {
        const __first = isFirstPage
        const top = 258
        const scrollParams = {top: top, behavior: 'instant'}
        setIsFirstPage(false)
        if(__first || window.scrollY < top)
            return

        setFixedNavigationEnabled(false)
        window.scrollTo(scrollParams)

        setTimeout(() => {
            window.scrollTo(scrollParams)
            setFixedNavigationEnabled(true)
        }, 100)
    }, [getActiveSection()])

    return (
        <div className={`portfolio-wrapper`}>
            <div className={`portfolio`}  id={`portfolio`}>
                <div className={`sidebar-wrapper`}>
                    <NavSidebar/>
                </div>

                <div className={`content-wrapper`}>
                    <div className={`content`}>
                        <NavHeaderMobile/>
                        <MainSlider/>
                    </div>
                </div>

                <NavPillsFixed/>

                <div className={`nav-tabs-wrapper`}>
                    <NavTabController/>
                </div>
            </div>
        </div>
    )
}

export default Portfolio