// Video caching utilities using IndexedDB
const DB_NAME = 'unbreakable-videos';
const STORE_NAME = 'videos';
const DB_VERSION = 1;

interface CachedVideo {
  url: string;
  blob: Blob;
  timestamp: number;
}

class VideoCache {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'url' });
        }
      };
    });
  }

  async getVideo(url: string): Promise<string | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(url);

      request.onsuccess = () => {
        const result = request.result as CachedVideo | undefined;
        if (result && result.blob) {
          const blobUrl = URL.createObjectURL(result.blob);
          resolve(blobUrl);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async saveVideo(url: string, blob: Blob): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const data: CachedVideo = {
        url,
        blob,
        timestamp: Date.now()
      };

      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async hasVideo(url: string): Promise<boolean> {
    await this.init();
    if (!this.db) return false;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(url);

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async downloadAndCache(url: string, onProgress?: (percent: number) => void): Promise<string> {
    // Check if already cached
    const cached = await this.getVideo(url);
    if (cached) return cached;

    // Download the video
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to download video');

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      if (total && onProgress) {
        onProgress(Math.round((receivedLength / total) * 100));
      }
    }

    // Combine chunks into a single blob
    const blob = new Blob(chunks, { type: 'video/mp4' });
    
    // Save to cache
    await this.saveVideo(url, blob);

    // Return blob URL
    return URL.createObjectURL(blob);
  }
}

export const videoCache = new VideoCache();
