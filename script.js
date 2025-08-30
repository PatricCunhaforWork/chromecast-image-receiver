class ImageReceiver {
    constructor() {
        this.currentImage = document.getElementById('currentImage');
        this.nextImage = document.getElementById('nextImage');
        this.radarOverlay = document.querySelector('.radar-overlay');
        this.imageUrl = 'https://picsum.photos/800/450';
        this.updateInterval = 3000;
        this.isTransitioning = false;
        
        this.init();
    }

    init() {
        this.loadInitialImage();
        this.startImageUpdates();
    }

    async loadInitialImage() {
        try {
            const randomParam = `?random=${Math.random()}`;
            const imageUrl = this.imageUrl + randomParam;
            
            await this.preloadImage(imageUrl);
            this.currentImage.src = imageUrl;
            this.currentImage.style.opacity = '1';
        } catch (error) {
            console.error('Failed to load initial image:', error);
        }
    }

    preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    async startImageUpdates() {
        setInterval(async () => {
            if (!this.isTransitioning) {
                await this.updateImage();
            }
        }, this.updateInterval);
    }

    async updateImage() {
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;

        try {
            const randomParam = `?random=${Math.random()}`;
            const newImageUrl = this.imageUrl + randomParam;
            
            await this.preloadImage(newImageUrl);
            
            this.nextImage.src = newImageUrl;
            this.nextImage.style.opacity = '1';
            
            this.performRadarTransition();
            
        } catch (error) {
            console.error('Failed to load new image:', error);
            this.isTransitioning = false;
        }
    }

    performRadarTransition() {
        this.nextImage.classList.add('reveal');
        this.radarOverlay.classList.add('radar-transition');
        
        setTimeout(() => {
            this.currentImage.src = this.nextImage.src;
            this.nextImage.style.opacity = '0';
            this.nextImage.classList.remove('reveal');
            this.nextImage.style.clipPath = 'circle(0% at center)';
            this.radarOverlay.classList.remove('radar-transition');
            this.isTransitioning = false;
        }, 1500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ImageReceiver();
});