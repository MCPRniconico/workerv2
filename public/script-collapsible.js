document.addEventListener('DOMContentLoaded', () => {
    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');

    collapsibleHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const parentSection = header.closest('.collapsible-section');
            if (!parentSection) return;

            const content = parentSection.querySelector('.collapsible-content');
            const arrow = header.querySelector('.arrow');

            if (content) {
                if (content.style.display === 'block') {
                    content.style.display = 'none';
                    if (arrow) {
                        arrow.innerHTML = '&#9658;'; // 右矢印
                    }
                } else {
                    content.style.display = 'block';
                    if (arrow) {
                        arrow.innerHTML = '&#9660;'; // 下矢印
                    }
                }
            }
        });
    });
});