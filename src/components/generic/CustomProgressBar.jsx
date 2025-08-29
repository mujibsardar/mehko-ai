import "./CustomProgressBar.scss"

function CustomProgressBar({now, fillColor}) {
    return (
        <div className={`progress`}>
            <div className="progress-bar"
                 role="progressbar"
                 style={{
                     _width: `${now}%`,
                     _backgroundColor: fillColor || 'auto',
                     _opacity: 0.25 + (now/100)*0.75
                 }
            }/>
        </div>
    )
}

export default CustomProgressBar