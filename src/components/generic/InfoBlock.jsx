import "./InfoBlock.scss"
import {useUtils} from "/src/helpers/utils.js"

const utils = useUtils()

function InfoBlock({img, faIcon, faIconColors, html}) {
    return (
        <div className={`info-block`}>
            {(img || faIcon) && (
                <InfoBlockImageCol img={ img } fallbackIcon={faIcon} fallbackIconColors={faIconColors}/>
            )}

            <InfoBlockTextCol html={ html }/>
        </div>
    )
}

function InfoBlockImageCol({img, fallbackIcon, fallbackIconColors}) {
    return (
        <div className={`info-block-image-col`}>
            {img && (
                <ImageView src={img} alt={`logo`}/>
            )}
            {!img && (
                <FaIcon iconName={fallbackIcon}
                               className={`display-6`}
                               colors={fallbackIconColors}/>
            )}
        </div>
    )
}

function InfoBlockTextCol({html}) {
    return (
        <div className={`info-block-text-col`}>
            <span className={`text-4`} dangerouslySetInnerHTML={{
                __html: utils.parseJsonText(html)
            }}/>
        </div>
    )
}

export default InfoBlock