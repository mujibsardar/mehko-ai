const timeouts = []
const intervals = []

export const useScheduler = () => {
    /**
     * @param {function} callback
     * @param {Number} timeInMilliseconds
     * @param {string} tag
     */
    const schedule = (callback, timeInMilliseconds, tag) => {
        const timeoutId = setTimeout(callback, timeInMilliseconds)
        timeouts.push({_id: timeoutId, _tag: tag})
    }

    /**
     * @param {function} callback
     * @param {Number} timeInMilliseconds
     * @param {string} tag
     */
    const interval = (callback, timeInMilliseconds, tag) => {
        const intervalId = setInterval(callback, timeInMilliseconds)
        intervals.push({_id: intervalId, _tag: tag})
    }

    /**
     * @param {String} tag
     */
    const clearAllWithTag = (tag) => {
        for (let i = timeouts.length - 1; i >= 0; i--) {
            if (timeouts[i].tag === tag) {
                clearTimeout(timeouts[i].id)
                timeouts.splice(i, 1)
            }
        }

        for (let i = intervals.length - 1; i >= 0; i--) {
            if (intervals[i].tag === tag) {
                clearInterval(intervals[i].id)
                intervals.splice(i, 1)
            }
        }
    }

    /**
     * @return {void}
     */
    const clearAll = () => {
        timeouts.forEach(timeout => {
            clearTimeout(timeout.id)
        })

        intervals.forEach(interval => {
            clearInterval(interval.id)
        })

        timeouts.length = 0
        intervals.length = 0
    }

    return {
        schedule,
        interval,
        clearAllWithTag,
        clearAll
    }
}