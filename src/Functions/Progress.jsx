export const smoothProgressUpdate = (start, end, duration, setUploadProgress) => {
    const increment = (end - start) / (duration / 100);
    let currentProgress = start;
    const interval = setInterval(() => {
        currentProgress += increment;
        setUploadProgress(Math.min(currentProgress, end));
        if (currentProgress >= end) {
            clearInterval(interval);
        }
    }, 100);
};