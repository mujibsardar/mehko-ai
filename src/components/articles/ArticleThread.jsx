import {useEffect, useState} from 'react'
import {useParser} from "/src/helpers/parser.js"
import {useLanguage} from "/src/providers/LanguageProvider.jsx"
import {useWindow} from "/src/providers/WindowProvider.jsx"

function ArticleThread({ data }) {
    const parser = useParser()
    const {isMobileLayout} = useWindow()
    const {selectedLanguageId} = useLanguage()

    const parsedData = parser.parseArticleData(data)
    const items = parsedData.items

    const [parsedItems, setParsedItems] = useState([])
    const [filteredItems, setFilteredItems] = useState([])

    useEffect(() => {
        parser.sortArticleItemsByDateDesc(items)
        const parsedItems = parser.formatForThreads(items)
        setParsedItems(parsedItems)
    }, [null, selectedLanguageId])

    return(
        <Article className={`article-thread`} title={ parsedData.title }>
            <Expandable items={parsedItems}
                        storageId={data.id + "_expandable"}
                        onFilter={setFilteredItems}
                        controlsClass={`pt-0`}
                        maxItems={isMobileLayout() ? 2 : 4}
                        stepAmount={4}>

                <Thread items={filteredItems}
                        shouldShowAsComplete={parsedItems.length <= parsedItems.length}/>
            </Expandable>
        </Article>
    )
}

export default ArticleThread