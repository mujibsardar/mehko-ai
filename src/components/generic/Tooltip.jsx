import "./Tooltip.scss"
import {useEffect, useState} from 'react'

function Tooltip({className, id, label}) {
    const [currentLabel, setCurrentLabel] = useState('')

    useEffect(() => {
        if(label)
            setCurrentLabel(label)
    }, [label])

    return (
        <div className={`custom-tooltip ${className} text-center text-3`} id={id}>
            {currentLabel}
        </div>
    )
}

export default Tooltip