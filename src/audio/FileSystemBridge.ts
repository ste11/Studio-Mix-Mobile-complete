// File System Access API Bridge for mobile and desktop file system permissions

export interface DiscoveredAudioFile {
  file: File;
  name: string;
  handle?: FileSystemFileHandle;
  path?: string;
}

export class FileSystemBridge {
  /**
   * Check if the browser supports the modern File System Access API
   */
  public static isSupported(): boolean {
    return typeof window !== 'undefined' && (
      'showOpenFilePicker' in window || 'showDirectoryPicker' in window
    );
  }

  /**
   * Verify and explicitly request permission on a FileSystemHandle
   */
  public static async verifyPermission(
    fileHandle: any,
    readWrite: boolean = false
  ): Promise<boolean> {
    const options = {
      mode: readWrite ? 'readwrite' : 'read',
    };

    try {
      // Check if permission was already granted
      if ((await fileHandle.queryPermission?.(options)) === 'granted') {
        return true;
      }

      // Request permission from the user
      if ((await fileHandle.requestPermission?.(options)) === 'granted') {
        return true;
      }
    } catch {
      // Fallback
    }

    return false;
  }

  /**
   * Request explicit user permission to pick one or more audio files
   * using the File System Access API
   */
  public static async pickAudioFiles(multiple: boolean = true): Promise<DiscoveredAudioFile[]> {
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        const pickerOpts = {
          multiple,
          types: [
            {
              description: 'File Audio DJ (MP3, M4A, AAC, WAV, FLAC, OGG)',
              accept: {
                'audio/*': ['.mp3', '.m4a', '.aac', '.wav', '.flac', '.ogg', '.opus', '.mp4'],
                'audio/mp4': ['.m4a', '.mp4'],
                'audio/x-m4a': ['.m4a'],
                'audio/aac': ['.aac'],
                'audio/mpeg': ['.mp3'],
                'audio/wav': ['.wav'],
                'audio/ogg': ['.ogg', '.opus'],
                'audio/flac': ['.flac'],
              },
            },
          ],
        };

        const fileHandles: FileSystemFileHandle[] = await (window as any).showOpenFilePicker(pickerOpts);
        const results: DiscoveredAudioFile[] = [];

        for (const handle of fileHandles) {
          const hasPermission = await this.verifyPermission(handle, false);
          if (hasPermission || !('queryPermission' in handle)) {
            const file = await handle.getFile();
            results.push({
              file,
              name: handle.name,
              handle,
            });
          }
        }

        return results;
      } catch (err: any) {
        // User aborted/cancelled the picker or unsupported
        if (err?.name === 'AbortError') {
          return [];
        }
        console.warn('showOpenFilePicker failed, falling back to standard picker', err);
      }
    }

    // Fallback using HTML5 File Input
    return this.fallbackFilePicker(multiple);
  }

  /**
   * Request directory permissions to scan an entire local folder for audio tracks
   */
  public static async pickMusicDirectory(): Promise<DiscoveredAudioFile[]> {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: 'read',
          id: 'dj-music-library',
        });

        const hasPermission = await this.verifyPermission(dirHandle, false);
        if (!hasPermission && 'queryPermission' in dirHandle) {
          throw new Error('Permesso di accesso alla cartella negato dal sistema operativo');
        }

        const discovered: DiscoveredAudioFile[] = [];
        await this.scanDirectoryHandle(dirHandle, '', discovered);
        return discovered;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return [];
        }
        console.warn('showDirectoryPicker failed or aborted', err);
        throw err;
      }
    }

    throw new Error('La selezione di intere cartelle non è supportata dal browser corrente. Usa la selezione file.');
  }

  /**
   * Recursively scan a FileSystemDirectoryHandle for audio files
   */
  private static async scanDirectoryHandle(
    dirHandle: any,
    currentPath: string,
    results: DiscoveredAudioFile[]
  ): Promise<void> {
    const audioExtensions = ['.mp3', '.m4a', '.aac', '.wav', '.flac', '.ogg', '.opus', '.mp4', '.alac', '.aif', '.aiff'];

    for await (const entry of dirHandle.values()) {
      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

      if (entry.kind === 'file') {
        const lowerName = entry.name.toLowerCase();
        const isAudio = audioExtensions.some((ext) => lowerName.endsWith(ext));

        if (isAudio) {
          try {
            const file = await entry.getFile();
            results.push({
              file,
              name: entry.name,
              handle: entry,
              path: entryPath,
            });
          } catch (e) {
            console.warn(`Impossibile leggere file ${entry.name}`, e);
          }
        }
      } else if (entry.kind === 'directory') {
        // Recursive search inside subdirectories (up to max 2 levels)
        if (currentPath.split('/').length < 2) {
          try {
            await this.scanDirectoryHandle(entry, entryPath, results);
          } catch (e) {
            console.warn(`Impossibile leggere sottocartella ${entry.name}`, e);
          }
        }
      }
    }
  }

  /**
   * Standard HTML5 file picker fallback
   */
  private static fallbackFilePicker(multiple: boolean): Promise<DiscoveredAudioFile[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = multiple;
      input.accept = 'audio/*,audio/mp4,audio/m4a,audio/x-m4a,audio/aac,audio/mpeg,audio/wav,audio/ogg,audio/flac,.m4a,.aac,.mp3,.wav,.ogg,.flac,.opus,.mp4,*/*';
      
      input.onchange = () => {
        if (input.files && input.files.length > 0) {
          const files: DiscoveredAudioFile[] = Array.from(input.files).map((file) => ({
            file,
            name: file.name,
          }));
          resolve(files);
        } else {
          resolve([]);
        }
      };

      input.oncancel = () => {
        resolve([]);
      };

      input.click();
    });
  }
}
