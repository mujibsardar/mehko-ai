import {useParser} from "/src/helpers/parser.js"

function ArticleCards({ data }) {
    const parser = useParser()

    const parsedData = parser.parseArticleData(data)
    const items = parsedData.items
    parser.sortArticleItemsByDateDesc(items)

    const parsedItems = parser.parseArticleItems(items, {
        hideDayFromDates: false
    })

    return(
        <Article className={`article-cards`} title={parsedData.title}>
            <Swipeable loop={true}
                       autoPlayDelay={4}>

                {parsedItems.map((item, index) => (
                    <SwiperSlide className={`custom-swiper-slide`} key={index}>
                        <InfoCard   title={item.title}
                                    text={item.text}
                                    img={item.img}
                                    fallbackIcon={item.faIcon}
                                    fallbackIconColors={item.faIconColors}
                                    href={item.firstLink?.href}
                                    hrefLabel={item.firstLink?.hrefLabel}
                                    dateInterval={item.dateInterval}/>
                    </SwiperSlide>
                ))}

            </Swipeable>
        </Article>
    )
}

export default ArticleCards