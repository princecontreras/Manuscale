
export const paginateContent = (htmlContent: string): string[] => {
    // Check if running in browser
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return [htmlContent];
    }

    const pages: string[] = [];
    const container = document.createElement('div');
    
    // Set standard 6x9 inch book dimensions simulation
    container.style.width = '4.25in'; // Width of text block
    container.style.visibility = 'hidden';
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.className = 'book-content'; 
    container.style.display = 'block'; 
    
    // Ensure consistent styling for measurement
    container.style.fontFamily = "'Merriweather', serif";
    container.style.fontSize = "11pt";
    container.style.lineHeight = "1.6";
    
    document.body.appendChild(container);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = htmlContent;
    const PAGE_HEIGHT_PX = 600; // Target height for text block per page
    
    let currentPageContent = document.createElement('div');
    let currentHeight = 0;

    Array.from(wrapper.childNodes).forEach((child) => {
        // Clone to measure
        const measureClone = child.cloneNode(true) as HTMLElement;
        
        if (measureClone.nodeType === Node.ELEMENT_NODE) {
            // Ensure standard margins for paragraphs
            if (measureClone.style) { 
                measureClone.style.marginBottom = '1em'; 
            }
            
            // Manual Break Detection (HR with class or specific style)
            const isPageBreak = (measureClone.tagName === 'HR' && measureClone.className.includes('page-break')) || 
                                (measureClone.style && measureClone.style.pageBreakAfter === 'always');

            if (isPageBreak) {
                // Push current page if not empty
                if (currentPageContent.innerHTML) {
                    pages.push(currentPageContent.innerHTML);
                    currentPageContent = document.createElement('div');
                    currentHeight = 0;
                }
                // Do not add the HR itself to visual flow if it's purely for breaking
                return;
            }
        }
        
        container.appendChild(measureClone);
        let totalHeight = 0;
        
        if (measureClone.nodeType === Node.ELEMENT_NODE) {
            const computedStyle = window.getComputedStyle(measureClone);
            const mt = parseFloat(computedStyle.marginTop) || 0;
            const mb = parseFloat(computedStyle.marginBottom) || 0;
            totalHeight = measureClone.offsetHeight + mt + mb;
        } else if (measureClone.nodeType === Node.TEXT_NODE && measureClone.textContent?.trim()) {
            const span = document.createElement('span');
            span.appendChild(measureClone.cloneNode(true));
            container.replaceChild(span, measureClone);
            totalHeight = span.offsetHeight;
            container.replaceChild(measureClone, span);
        } else {
            totalHeight = 0;
        }
        
        container.removeChild(measureClone);

        if (currentHeight + totalHeight > PAGE_HEIGHT_PX && currentPageContent.innerHTML) {
            // If overflowing and not the first element on page, push page
            pages.push(currentPageContent.innerHTML);
            currentPageContent = document.createElement('div');
            currentPageContent.appendChild(child.cloneNode(true));
            currentHeight = totalHeight; 
        } else {
            currentPageContent.appendChild(child.cloneNode(true));
            currentHeight += totalHeight;
        }
    });

    if (currentPageContent.innerHTML) { 
        pages.push(currentPageContent.innerHTML); 
    }
    
    document.body.removeChild(container);
    return pages;
};
