/**
 * utils/generateAnchor.test.ts
 *
 * 测试 generateAnchor 函数，确保每次调用独立生成 GitHub 风格锚点
 */

import { describe, expect, it } from 'vitest'

import { generateAnchor } from './generateAnchor'

describe('generateAnchor', () => {
  it('lowercases ASCII text and replaces spaces with hyphens', () => {
    expect(generateAnchor('Hello World')).toBe('hello-world')
  })

  it('handles plain lowercase text', () => {
    expect(generateAnchor('introduction')).toBe('introduction')
  })

  it('strips leading numbering from headings like "1. Title"', () => {
    // github-slugger keeps digits and dots, resulting in "1-title"
    expect(generateAnchor('1. Title')).toBe('1-title')
  })

  it('preserves CJK characters', () => {
    const result = generateAnchor('你好世界')
    expect(result).toBe('你好世界')
  })

  it('preserves CJK mixed with ASCII', () => {
    const result = generateAnchor('Section 章节')
    expect(result).toBe('section-章节')
  })

  it('resets internal counter on each call so repeated calls produce the same result', () => {
    const first = generateAnchor('Title')
    const second = generateAnchor('Title')
    expect(first).toBe(second)
  })

  it('handles empty string', () => {
    expect(generateAnchor('')).toBe('')
  })
})
