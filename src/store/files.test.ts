import { putFile, getFile, deleteFile, MAX_FILE_SIZE } from './files';

describe('хранилище вложений (IndexedDB)', () => {
  it('AC-06 сохраняет и возвращает файл, затем удаляет', async () => {
    await putFile('a1', new Blob(['привет'], { type: 'text/plain' }));
    const back = await getFile('a1');
    expect(back).not.toBeNull();
    expect(back!.type).toBe('text/plain');
    expect(back!.size).toBe(new Blob(['привет']).size);
    await deleteFile('a1');
    expect(await getFile('a1')).toBeNull();
  });

  it('AC-06 отклоняет файл больше 10 МБ с понятным сообщением', async () => {
    const big = { size: MAX_FILE_SIZE + 1, type: 'x/y' } as unknown as Blob;
    await expect(putFile('big', big)).rejects.toThrow(/10 МБ/);
  });
});
