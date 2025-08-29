
function FaIcon({iconName, colors, className}) {
    const faIconClassList = `fa-icon ${iconName}`

    const iconStyle = colors ? {_color: colors.fill} : null
    const bgStyle = colors ? {backgroundColor: colors.bg, _padding: '5px', _borderRadius: '100%'} : null

    return (
        <div className={`fa-icon-wrapper d-inline ${className}`} style={bgStyle}>
            <i className={faIconClassList} style={iconStyle}/>
        </div>
    )
}

export default FaIcon