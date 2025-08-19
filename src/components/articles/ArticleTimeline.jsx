import {useParser} from "/src/helpers/parser.js"

function ArticleTimeline({ data }) {
    const parser = useParser()

    const parsedData = parser.parseArticleData(data)
    const items = parsedData.items
    parser.sortArticleItemsByDateDesc(items)

    const parsedItems = parser.formatForTimeline(items)

    return (
        <Article className={`article-timeline`} title={ parsedData.title }>
            <Timeline items={parsedItems}/>
        </Article>
    )
}

export default ArticleTimeline