import "./Divider.scss"

function Divider({type, variant}) {
    type = type || 'simple'

    return (
        <hr className={`divider-${type}-${variant}`}/>
    )
}

export default Divider