import type React from "react";

export default function  lazyWithRetry<T> (
    importFunc: () => Promise<T>
): Promise<{ default: React.ComponentType<any> }> {
    return importFunc().catch((error) => {
        if (error.name === 'ChunkLoadError') {
            window.location.reload()
        }

        throw error
    }) as Promise<{ default: React.ComponentType<any> }>
}