/** Хранилище вложений: IndexedDB `delnik-files`, blob по id. */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const FILE_TOO_BIG = 'Файл слишком большой: максимум 10 МБ.';

const DB_NAME = 'delnik-files';
const STORE = 'files';

interface StoredFile {
  buffer: ArrayBuffer;
  type: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Хранилище файлов недоступно в этом браузере.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Не удалось открыть хранилище файлов.'));
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

function readBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as ArrayBuffer);
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(blob);
  });
}

export async function putFile(id: string, blob: Blob): Promise<void> {
  if (blob.size > MAX_FILE_SIZE) throw new Error(FILE_TOO_BIG);
  const value: StoredFile = { buffer: await readBuffer(blob), type: blob.type };
  await run('readwrite', (s) => s.put(value, id));
}

export async function getFile(id: string): Promise<Blob | null> {
  const v = await run<StoredFile | undefined>('readonly', (s) => s.get(id));
  return v ? new Blob([v.buffer], { type: v.type }) : null;
}

export async function deleteFile(id: string): Promise<void> {
  await run('readwrite', (s) => s.delete(id));
}
