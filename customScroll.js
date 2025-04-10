const customScrollElement = (element) => {
    const checkIsOverlapped = (element) => {
        const rect = element.getBoundingClientRect();
        const topPoint = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + 1
        );
        return topPoint && !element.contains(topPoint);
    };

    const checkIsFullyVisible = (element) => {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <=
                (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <=
                (window.innerWidth || document.documentElement.clientWidth)
        );
    };

    if (checkIsFullyVisible(element) && !checkIsOverlapped(element)) return;

    const rect = element.getBoundingClientRect();
    const elementTop = rect.top + window.scrollY;
    const elementBottom = rect.bottom + window.scrollY;
    const viewportTop = window.scrollY;
    const viewportBottom = window.scrollY + window.innerHeight;

    const scrollTop = elementTop - viewportTop;
    const scrollBottom = elementBottom - viewportBottom;
    const scrollHeight = scrollBottom - scrollTop;
    const scrollDirection = scrollHeight > 0 ? "down" : "up";
    const scrollAmount = Math.abs(scrollHeight) / 2; // Adjust the scroll amount as needed

    const scrollStep =
        scrollDirection === "down" ? scrollAmount : -scrollAmount;
    window.scrollBy({
        top: scrollStep,
        left: 0,
    });
};
