import "./Box.scss"

function Box({ children, opaque, nav, className, id }) {
    const opaqueClass = opaque ? 'box-opacity' : ''
    const navClass = nav ? 'box-nav' : ''

    return (
        <div className={`box ${opaqueClass} ${navClass} ${className}`} id={id}>
            {children}
        </div>
    )
}

export default Box