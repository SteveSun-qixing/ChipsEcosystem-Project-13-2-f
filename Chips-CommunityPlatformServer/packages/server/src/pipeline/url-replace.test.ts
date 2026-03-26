import { describe, expect, it } from 'vitest';
import { replaceContentUrls } from './url-replace.js';

describe('replaceContentUrls', () => {
  it('将图片基础卡片的 file_path 正式转换为 url 资源', () => {
    const urlMap = new Map<string, string>([
      ['demo.jpg', 'http://localhost:9000/chips-card-resources/user/card/demo.jpg'],
    ]);
    const contentMap = new Map<string, Record<string, unknown>>([
      [
        'node-1',
        {
          card_type: 'ImageCard',
          images: [
            {
              id: 'img-1',
              source: 'file',
              file_path: 'demo.jpg',
              alt: 'demo',
            },
          ],
        },
      ],
    ]);

    const replaced = replaceContentUrls(contentMap, urlMap);
    expect(replaced.get('node-1')).toEqual({
      card_type: 'ImageCard',
      images: [
        {
          id: 'img-1',
          source: 'url',
          url: 'http://localhost:9000/chips-card-resources/user/card/demo.jpg',
          alt: 'demo',
        },
      ],
    });
  });

  it('保留普通字段的直接字符串替换行为', () => {
    const urlMap = new Map<string, string>([
      ['cover.png', 'http://localhost:9000/chips-card-resources/user/card/cover.png'],
    ]);
    const contentMap = new Map<string, Record<string, unknown>>([
      [
        'node-2',
        {
          title: 'hello',
          poster: 'cover.png',
          nested: {
            src: 'cover.png',
          },
        },
      ],
    ]);

    const replaced = replaceContentUrls(contentMap, urlMap);
    expect(replaced.get('node-2')).toEqual({
      title: 'hello',
      poster: 'http://localhost:9000/chips-card-resources/user/card/cover.png',
      nested: {
        src: 'http://localhost:9000/chips-card-resources/user/card/cover.png',
      },
    });
  });
});
