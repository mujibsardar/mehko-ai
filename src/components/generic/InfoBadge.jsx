import "./InfoBadge.scss"

function InfoBadge({faIcon, text, className}) {
    return (
        <div className={`info-badge text-1 ${className}`}>
            <FaIcon iconName={faIcon} className={`me-2 opacity-50`}/>
            <span>{text}</span>
        </div>
    )
}

export default InfoBadge