import "./CircularButtonList.scss"

function CircularButtonList({links, options, type, onOptionClicked}) {
    type = type || 'default'

    const _onOptionClicked = (option, _e) => {
        if(onOptionClicked) {
            onOptionClicked(option)
        }
    }

    return (
        <ul className={`circular-button-list`}>
            {links && links.map((link, index) => (
                <li key={index} className={`circular-button-list-item`}>
                    <ExternalLink href={link.href} target={`_blank`} aria-label={link.faIcon} className={`circular-button circular-button-${type}`}>
                        <FaIcon iconName={link.faIcon}/>
                    </ExternalLink>
                </li>
            ))}

            {options && options.map((option, index) => (
                <li key={index} className={`circular-button-list-item`}>
                    <button data-tooltip={option.tooltip}
                            aria-label={option.id}
                            className={`circular-button circular-button-${type}`}
                            onClick={(e) => {_onOptionClicked(option, e)}}>
                        <FaIcon iconName={option.faIcon}/>
                    </button>
                </li>
            ))}
        </ul>
    )
}

export default CircularButtonList